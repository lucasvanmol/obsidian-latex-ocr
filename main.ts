/* TODO:
- add functionality to insert latex directly from clipboard
- add check to see if GPU is being used
*/

import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, FileSystemAdapter, normalizePath } from 'obsidian';
import { ChildProcess, spawn } from 'child_process';
import clipboard from 'clipboardy';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProtoGrpcType } from './protos/service';
import { LatexOCRClient } from 'protos/latexocr/LatexOCR';
import 'protos/latexocr/LatexRequest';

interface LatexOCRSettings {
	pythonPath: string;
	delimiters: string;
	port: string;
	startServerOnLoad: boolean;
}

const DEFAULT_SETTINGS: LatexOCRSettings = {
	pythonPath: 'python3',
	delimiters: '$$',
	port: '50051',
	startServerOnLoad: true,
}

// https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html
const IMG_EXTS = ["png", "jpg", "jpeg", "bmp", "dib", "eps", "gif", "ppm", "pbm", "pgm", "pnm", "webp"]

export default class LatexOCR extends Plugin {
	settings: LatexOCRSettings;
	vaultPath: string;
	pluginPath: string;
	client: LatexOCRClient;
	serverProcess: ChildProcess;
	last_download_update: string;

	// Check if the user specified pythonPath is working,
	// and check if the required libraries can be imported using a test script
	checkPythonInstallation() {
		return new Promise<void>(
			(resolve, reject) => {
				const pythonProcess = spawn(this.settings.pythonPath, [path.join(this.pluginPath, "latex_ocr/test_packages.py")])

				pythonProcess.stdout.on('data', data => {
					console.log(data.toString())
				})
				pythonProcess.stderr.on('data', data => {
					console.error(data.toString())
				})

				pythonProcess.on('close', code => {
					if (code === 0) {
						resolve()
					} else {
						reject(new Error(`Couldn't import necessary libraries using ${this.settings.pythonPath}`))
					}
				})

				pythonProcess.on('error', (err) => {
					if (err.message.includes("ENOENT")) {
						reject(new Error(`Couldn't locate python install "${this.settings.pythonPath}", please change it in the plugin settings`))
					} else {
						reject(new Error(`${err}`))
					}

				})
			})
	}

	// Start the latex_ocr_python script using user specified settings.
	// Prefer `startServer` for user feedback
	spawnLatexOcrServer(port: string): Promise<ChildProcess> {
		return new Promise<ChildProcess>((resolve, reject) => {
			const args = [
				path.resolve(this.pluginPath, "latex_ocr/server.py"),
				"--port", port,
				"--cache_dir", path.resolve(this.pluginPath, "model_cache")]
			const pythonProcess = spawn(this.settings.pythonPath, args)

			pythonProcess.on('spawn', () => {
				console.log(`latex_ocr_server: spawned`)
				resolve(pythonProcess)
			})
			pythonProcess.on('error', (err) => {
				reject(err)
			})

			pythonProcess.stdout.on('data', data => {
				if (data.toString().toLowerCase().includes("downloading")) {
					this.last_download_update = data.toString()
				}
				console.log(`latex_ocr_server: ${data.toString()}`)
			})
			pythonProcess.stderr.on('data', data => {
				if (data.toString().toLowerCase().includes("downloading")) {
					this.last_download_update = data.toString()
				}
				console.error(`latex_ocr_server: ${data.toString()}`)
			})

			pythonProcess.on('close', code => {
				console.log(`latex_ocr_server: closed (${code})`)
			})

		})
	}

	// Start the python server, informing the user with `Notice`s
	async startServer() {
		new Notice("⚙️ Starting LatexOCR server")
		try {
			this.serverProcess = await this.spawnLatexOcrServer(this.settings.port)
			this.checkLatexOCRServer(0)
				.then(() => new Notice("✅ LatexOCR server started"))
		} catch (err) {
			console.error(err)
			this.checkPythonInstallation().then(() => {
				new Notice(`❌ ${err}`, 10000)
			}).catch((pythonErr) => {
				new Notice(`❌ ${pythonErr}`, 10000)
			})
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LatexOCRSettingsTab(this.app, this));

		// Right click menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && IMG_EXTS.contains(file.extension)) {
					menu.addItem((item) => {
						item
							.setTitle("Generate Latex")
							.setIcon("sigma")
							.onClick(async () => {
								this.fileToTex(path.join(this.vaultPath, file.path))
							});
					});
				}
			})
		)

		// Modal
		this.addRibbonIcon('sigma', 'LatexOCR', (evt) => {
			new LatexOCRModal(this.app, this).open()
		})

		this.vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath()
		this.pluginPath = path.join(this.vaultPath, ".obsidian/plugins/obsidian-latex-ocr")


		// RPC Client
		console.log(`latex_ocr: initializing RPC client at port ${this.settings.port}`)
		const packageDefinition = protoLoader.loadSync(this.pluginPath + '/latex_ocr/service.proto');
		const proto = (grpc.loadPackageDefinition(
			packageDefinition
		) as unknown) as ProtoGrpcType;
		this.client = new proto.latexocr.LatexOCR(`localhost:${this.settings.port}`, grpc.credentials.createInsecure());


		// LatexOCR Python Server
		if (this.settings.startServerOnLoad) {
			await this.startServer()
		}
	}

	onunload() {
		// shutdown server
		this.serverProcess.kill()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	checkLatexOCRServer(timeout_msecs: number) {
		let timeout: Date | number;
		if (timeout_msecs === 0) {
			timeout = Infinity
		} else {
			timeout = new Date(new Date().getTime() + timeout_msecs);
		}

		return new Promise<void>((resolve, reject) => this.client.waitForReady(timeout, (err) => {
			if (err) {
				if (this.last_download_update) {
					reject(`The server is still downloading the model: ${this.last_download_update}`)
				} else {
					reject(`The server wasn't reachable before the deadline (${timeout_msecs}ms)`)
				}
			} else {
				resolve()
			}
		}));
	}

	async fileToTex(filepath: string) {
		const file = path.parse(filepath)
		if (!IMG_EXTS.contains(file.ext.substring(1))) {
			new Notice(`⚠️ Unsupported image extension ${file.ext}`, 5000)
			return
		}
		const notice = new Notice(`⚙️ Generating Latex for ${file.base}...`, 0);
		const d = this.settings.delimiters;

		this.client.GenerateLatex({ imagePath: filepath }, async function (err, latex) {
			if (err) {
				console.error(`Error getting response from latex_ocr_server: ${err}`)
				new Notice(`⚠️ ${err}`, 5000)
			} else {
				console.log(`latex_ocr_server: ${latex?.latex}`);
				let result = latex?.latex

				result = `${d}${result}${d}`

				try {
					await clipboard.write(result)
				} catch (err) {
					console.error(err);
					new Notice(`⚠️ Couldn't copy to clipboard because document isn't focused`)
				}
				new Notice(`🪄 Latex copied to clipboard`)
			}
			setTimeout(() => notice.hide(), 1000)
		});
	}
}

class LatexOCRModal extends Modal {
	plugin: LatexOCR
	imagePath: string

	constructor(app: App, plugin: LatexOCR) {
		super(app);
		this.plugin = plugin
	}

	onOpen() {
		this.containerEl.addClass('latex-ocr-modal')
		const { contentEl, titleEl } = this;
		titleEl.setText("Latex OCR");

		const imageContainer = contentEl.createDiv({
			cls: 'image-container',
		})
		const img = imageContainer.createEl("img")

		const fileIn: any = contentEl.createEl("input", { type: "file", attr: { style: "display: none;", accept: "image/*" } })

		new Setting(contentEl)
			.setName("Open image")
			.addButton(button => button
				.setButtonText("Browse")
				.onClick(evt => {
					fileIn.click()
				}));


		fileIn.addEventListener('change', () => {
			const selectedFile = fileIn.files[0];
			if (selectedFile) {
				this.imagePath = selectedFile.path;
				const tfile = this.app.vault.getAbstractFileByPath(path.relative(this.plugin.vaultPath, selectedFile.path));
				img.setAttr("src", this.app.vault.getResourcePath(tfile as TFile))

			}
		});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText("Convert to Latex")
				.onClick(evt => {
					if (this.imagePath) {
						this.plugin.fileToTex(this.imagePath)
					} else {
						new Notice("⚠️ Select an image first")
					}
				}))
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class LatexOCRSettingsTab extends PluginSettingTab {
	plugin: LatexOCR;

	constructor(app: App, plugin: LatexOCR) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Python path')
			.setDesc("Path to Python installation. You need to have the necessary packages installed, see the project's README for more information.\
			Note that changing the path requires a server restart in order to take effect.")
			.addText(text => text
				.setPlaceholder('path/to/python.exe')
				.setValue(this.plugin.settings.pythonPath)
				.onChange(async (value) => {
					this.plugin.settings.pythonPath = normalizePath(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Check Python installation')
			.setDesc("Check if the python installation from above is working, and has the correct packages installed.")
			.addButton(button => button
				.setButtonText("Check")
				.onClick(evt => {
					new Notice("⚙️ Checking python installation...")
					this.plugin.checkPythonInstallation().then(() => {
						new Notice("✅ This python installation seems to be working")
					}).catch((err) => {
						new Notice(`❌ ${err}`)
					})
				}));


		new Setting(containerEl)
			.setName('Server status')
			.setDesc("LatexOCR runs a python script in the background that can process OCR requests. \
			Use these settings to check it's status, or restart it. \
			Note that restarting can take a few seconds. If the model isn't cached, it needs to be downloaded first (~1.4 GB).")
			.addButton(button => button
				.setButtonText("Check status")
				.onClick(evt => {
					this.plugin.checkLatexOCRServer(500).then(() => {
						new Notice("✅ The server is reachable!")
					}).catch((err) => {
						new Notice(`❌ ${err}`)
					})
				})
			)
			.addButton(button => button
				.setButtonText("(Re)start server")
				.onClick(evt => {
					if (this.plugin.serverProcess) {
						this.plugin.serverProcess.kill()
					}
					this.plugin.startServer()
				}))


		new Setting(containerEl)
			.setName('Port')
			.setDesc('Port to run the LatexOCR server on. Note that a server restart is required in order for this to take effect.')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.port)
				.setValue(this.plugin.settings.port)
				.onChange(async (value) => {
					this.plugin.settings.port = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Start server on launch")
			.setDesc("The LatexOCR server consumes quite a lot of memory. If you don't use it often, feel free to disable this.\
			You will need to (re)start the server manually if you wish to use the plugin.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.startServerOnLoad)
				.onChange(async (value) => {
					this.plugin.settings.startServerOnLoad = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Formatting')
			.setDesc('How the LaTeX should be formatted: formula only, $inline$ or $$block$$.')
			.addDropdown(dd => dd
				.addOption('', "Formula only")
				.addOption('$', "Inline")
				.addOption('$$', "Block")
				.setValue(this.plugin.settings.delimiters)
				.onChange(async (value) => {
					this.plugin.settings.delimiters = value
					await this.plugin.saveSettings();
				})
			);
	}
}
