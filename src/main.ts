/* TODO:
- add check to see if GPU is being used
- add command to start server
- allow pasting images in modal
*/

import { Notice, Plugin, TFile, FileSystemAdapter, Editor } from 'obsidian';
import clipboard from 'clipboardy';
import * as path from 'path';
import * as fs from 'fs';
import { LocalModel } from "models/local_model"
import Model, { Status } from 'models/model';
import { LatexOCRModal } from 'modal';
import ApiModel from 'models/online_model';
import LatexOCRSettingsTab from 'settings';

export interface LatexOCRSettings {
	pythonPath: string;
	cacheDirPath: string;
	delimiters: string;
	port: string;
	startServerOnLoad: boolean;
	showStatusBar: boolean;
	useLocalModel: boolean;
	hfApiKey: string | ArrayBuffer;
	obfuscatedKey: string;
}

const DEFAULT_SETTINGS: LatexOCRSettings = {
	pythonPath: 'python3',
	cacheDirPath: '',
	delimiters: '$$',
	port: '50051',
	startServerOnLoad: true,
	showStatusBar: true,
	useLocalModel: false,
	hfApiKey: "",
	obfuscatedKey: "",
}

// https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html
const IMG_EXTS = ["png", "jpg", "jpeg", "bmp", "dib", "eps", "gif", "ppm", "pbm", "pgm", "pnm", "webp"]

export default class LatexOCR extends Plugin {
	settings: LatexOCRSettings;
	vaultPath: string;
	pluginPath: string;
	statusBar: HTMLSpanElement;
	statusBarInterval: number;
	model: Model;

	async onload() {
		// Load settings & initialize path values
		await this.loadSettings();
		this.addSettingTab(new LatexOCRSettingsTab(this.app, this));

		this.vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath()
		this.pluginPath = path.join(this.vaultPath, ".obsidian/plugins/obsidian-latex-ocr")
		if (this.settings.cacheDirPath === "") {
			this.settings.cacheDirPath = path.resolve(this.pluginPath, "model_cache")
			await this.saveSettings()
		}

		if (this.settings.useLocalModel) {
			this.model = new LocalModel(this.settings, this.manifest)
		} else {
			this.model = new ApiModel(this.settings)
		}
		this.model.load()

		// Folder where temporary pasted files are stored
		try {
			await fs.promises.mkdir(path.join(this.pluginPath, "/.clipboard_images/"));
		} catch (err) {
			if (!err.message.contains("EEXIST")) {
				console.error(err)
			}
		}

		// Right-click Generate Latex menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && IMG_EXTS.contains(file.extension)) {
					menu.addItem((item) => {
						item
							.setTitle("Generate Latex")
							.setIcon("sigma")
							.onClick(async () => {
								this.model.imgfileToLatex(path.join(this.vaultPath, file.path)).then(async (latex) => {
									try {
										await clipboard.write(latex)
									} catch (err) {
										console.error(err);
										new Notice(`⚠️ Couldn't copy to clipboard because document isn't focused`)
									}
									new Notice(`🪄 Latex copied to clipboard`)
								}
								).catch((err) => {
									new Notice(`⚠️ ${err}`)
								})
							});
					});
				}
			})
		)

		// Modal
		this.addRibbonIcon('sigma', 'LatexOCR', (evt) => {
			new LatexOCRModal(this.app, this).open()
		})

		// Command to read image from clipboard
		this.addCommand({
			id: 'paste-latex-from-clipboard',
			name: 'Paste Latex from clipboard image',
			editorCallback: (editor, ctx) => {
				this.clipboardToText(editor)
			}
		})

		// Status Bar
		this.statusBar = this.addStatusBarItem();
		this.statusBar.createEl("span", { text: "LatexOCR ❌" });
		this.updateStatusBar()
		this.setStatusBarInterval(200)
		if (!this.settings.showStatusBar || !this.settings.useLocalModel) {
			this.statusBar.hide()
		}
	}

	onunload() {
		this.model.unload()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		if (this.model) {
			this.model.reloadSettings(this.settings)
		}
		await this.saveData(this.settings);
	}

	// Update the status bar based on the connection to the LatexOCR server
	// ✅: LatexOCR is up and accepting requests
	// 🌐: LatexOCR is downloading the model from huggingface
	// ⚙️: LatexOCR is loading the model
	// ❌: LatexOCR isn't reachable
	async updateStatusBar(): Promise<boolean> {
		const [status, message] = await this.model.status()

		switch (status) {
			case Status.Ready:
				this.statusBar.setText("LatexOCR ✅")
				return true;

			case Status.Downloading:
				this.statusBar.setText("LatexOCR 🌐")
				break;

			case Status.Loading:
				this.statusBar.setText("LatexOCR ⚙️")
				break;

			case Status.Misconfigured:
				this.statusBar.setText("LatexOCR ❌")
				break;

			case Status.Unreachable:
				this.statusBar.setText("LatexOCR ❌")
				break;

			default:
				console.error(status)
				break;
		}
		return false
	}

	// Call `updateStatusBar` with an initial delay of `number`.
	// After this, `updateStatusBar` will be called every 5 seconds if the server was ready, 
	// or every 200 ms if the server was not ready.
	setStatusBarInterval(time: number) {
		setTimeout(async () => {
			const ready = await this.updateStatusBar()
			if (ready) {
				this.setStatusBarInterval(5000)
			} else {
				this.setStatusBarInterval(200)
			}
		}, time)
	}


	// Get a clipboard file, save it to disk temporarily,
	// call the LatexOCR client. The result is pasted wherever the cursor is
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
						const from = editor.getCursor("from")
						console.log(`latex_ocr: placing image at ${from}`)
						try {
							fs.writeFileSync(imgpath, buffer)
							this.model.imgfileToLatex(imgpath).then(latex => {
								editor.replaceRange(latex, from);
								editor.scrollIntoView({ from: from, to: from })
								new Notice(`🪄 Latex pasted to note`)
							}).catch((err) => {
								new Notice(`⚠️ ${err}`, 5000)
							});
						} catch (err) {
							console.error(err)
						}
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
