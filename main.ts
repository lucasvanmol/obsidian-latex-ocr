/* TODO:
- add check to see if GPU is being used
- add command to start server
- status bar on bottom right
	- 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	- https://docs.obsidian.md/Plugins/User+interface/Status+bar
- allow pasting images in modal
*/

import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, FileSystemAdapter, normalizePath, Editor } from 'obsidian';
import { ChildProcess, spawn } from 'child_process';
import clipboard from 'clipboardy';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import { ProtoGrpcType } from './protos/latex_ocr';
import { LatexOCRClient } from 'protos/latexocr/LatexOCR';
import 'protos/latexocr/LatexRequest';

interface LatexOCRSettings {
	pythonPath: string;
	cacheDirPath: string;
	delimiters: string;
	port: string;
	startServerOnLoad: boolean;
	showStatusBar: boolean;
}

const DEFAULT_SETTINGS: LatexOCRSettings = {
	pythonPath: 'python3',
	cacheDirPath: '',
	delimiters: '$$',
	port: '50051',
	startServerOnLoad: true,
	showStatusBar: true,
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
	status_bar: HTMLSpanElement;
	statusBarInterval: number;

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
				"--cache_dir", this.settings.cacheDirPath]
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
		try {
			this.serverProcess = await this.spawnLatexOcrServer(this.settings.port)
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

		this.vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath()
		this.pluginPath = path.join(this.vaultPath, ".obsidian/plugins/obsidian-latex-ocr")
		if (this.settings.cacheDirPath === "") {
			this.settings.cacheDirPath = path.resolve(this.pluginPath, "model_cache")
			await this.saveSettings()
		}

		// path where temporary pasted files are stored
		try {
			await fs.promises.mkdir(path.join(this.pluginPath, "/.clipboard_images/"));
		} catch (err) {
			if (!err.message.contains("EEXIST")) {
				console.error(err)
			}
		}

		// Right click menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && IMG_EXTS.contains(file.extension)) {
					menu.addItem((item) => {
						item
							.setTitle("Generate Latex")
							.setIcon("sigma")
							.onClick(async () => {
								this.imgfileToLatex(path.join(this.vaultPath, file.path), async (latex) => {
									try {
										await clipboard.write(latex)
									} catch (err) {
										console.error(err);
										new Notice(`⚠️ Couldn't copy to clipboard because document isn't focused`)
									}
									new Notice(`🪄 Latex copied to clipboard`)
								}
								)
							});
					});
				}
			})
		)

		// Modal
		this.addRibbonIcon('sigma', 'LatexOCR', (evt) => {
			new LatexOCRModal(this.app, this).open()
		})

		// 
		this.addCommand({
			id: 'paste-latex-from-clipboard',
			name: 'Paste Latex from clipboard image',
			editorCallback: (editor, ctx) => {
				this.clipboardToText(editor)
			}
		})


		// RPC Client
		console.log(`latex_ocr: initializing RPC client at port ${this.settings.port}`)
		const packageDefinition = await protoLoader.load(this.pluginPath + '/latex_ocr/protos/latex_ocr.proto');
		const proto = (grpc.loadPackageDefinition(
			packageDefinition
		) as unknown) as ProtoGrpcType;
		this.client = new proto.latexocr.LatexOCR(`localhost:${this.settings.port}`, grpc.credentials.createInsecure());


		// LatexOCR Python Server
		if (this.settings.startServerOnLoad) {
			await this.startServer()
		}

		this.status_bar = this.addStatusBarItem();
		this.status_bar.createEl("span", { text: "LatexOCR ❌" });
		this.updateStatusBar(100)
		this.setStatusBarInterval(200)
		if (!this.settings.showStatusBar) {
			this.status_bar.hide()
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

	async updateStatusBar(timeout: number): Promise<boolean> {
		try {
			await this.checkLatexOCRServer(timeout);
			this.status_bar.setText("LatexOCR ✅")
			return true
		} catch (err) {
			console.log(err)
			if (err.includes("wasn't reachable")) {
				this.status_bar.setText("LatexOCR ❌")
			} else if (err.includes("downloading")) {
				this.status_bar.setText("LatexOCR 🌐")
			} else if (err.includes("loading")) {
				this.status_bar.setText("LatexOCR ⚙️")
			} else {
				console.error(err)
				this.status_bar.setText("LatexOCR ❌")
			}
			return false
		}
	}

	setStatusBarInterval(time: number) {
		setTimeout(async () => {
			const ready = await this.updateStatusBar(100)
			if (ready) {
				this.setStatusBarInterval(5000)
			} else {
				this.setStatusBarInterval(200)
			}
		}, time)
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
				reject(`The server wasn't reachable before the deadline (${timeout_msecs}ms)`)
			} else {
				this.client.IsReady({}, (err, reply) => {
					if (reply?.isReady) {
						resolve()
					} else {
						if (this.last_download_update) {
							reject(`The server is still downloading the model: ${this.last_download_update}`)
						} else {
							reject(`The server is still loading the model.`)
						}
					}
				});
			}
		}));
	}

	// Calls the LatexOCR client, and calls the callback with the result.
	// The latex formula is wrapped in the user specified delimeter e.g. `$$`
	async imgfileToLatex(filepath: string, success_callback: (latex: string) => void) {
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
				if (latex) {
					let result = `${d}${latex.latex}${d}`;
					success_callback(result);
				}
			}
			setTimeout(() => notice.hide(), 1000)
		});
	}

	async clipboardToText(editor: Editor) {
		try {
			const file = await navigator.clipboard.read();
			if (file.length > 0) {
				for (const ext of IMG_EXTS) {
					if (file[0].types.includes(`image/${ext}`)) {
						console.log(`found image in clipboard with mimetype image/${ext}`)
						const blob = await file[0].getType(`image/${ext}`);
						const buffer = Buffer.from(await blob.arrayBuffer());
						const imgpath = path.join(this.pluginPath, `/.clipboard_images/pasted_image.${ext}`);
						fs.writeFile(imgpath, buffer, (err) => {
							if (err) {
								console.error(err)
							} else {
								console.log(`latex_ocr: image saved to ${imgpath}`)
							}
						});
						const from = editor.getCursor("from")
						console.log(`latex_ocr: placing image at ${from}`)
						this.imgfileToLatex(imgpath, latex => {
							editor.replaceRange(latex, from);
						});
						return
					}
				}
			}
			new Notice("Couldn't find image in clipboard")
		} catch (err) {
			new Notice(err.message)
			console.error(err.name, err.message)
		}
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
						this.plugin.imgfileToLatex(this.imagePath, async (latex) => {
							try {
								await clipboard.write(latex)
							} catch (err) {
								console.error(err);
								new Notice(`⚠️ Couldn't copy to clipboard because document isn't focused`)
							}
							new Notice(`🪄 Latex copied to clipboard`)
						})
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

		new Setting(containerEl)
			.setName("Show status bar")
			.setDesc("Emoji meanings: ✅ server online; ⚙️ server loading; 🌐 downloading model; ❌ server unreachable")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					if (value) {
						this.plugin.status_bar.show()
					} else {
						this.plugin.status_bar.hide()
					}
					this.plugin.settings.showStatusBar = value
					await this.plugin.saveSettings()
				}));

		new Setting(containerEl)
			.setName("Cache dir")
			.setDesc("The directory where the model is saved. By default this is in `Vault/.obsidian/plugins/obsidian-latex-ocr/model_cache \
				Note that changing this will not delete the old cache, and require the model to be redownloaded. \
				The server must be restarted for this to take effect.")
			.addText(text => text
				.setValue(this.plugin.settings.cacheDirPath)
				.onChange(async (value) => {
					this.plugin.settings.cacheDirPath = normalizePath(value);
					await this.plugin.saveSettings();
				}));

	}
}
