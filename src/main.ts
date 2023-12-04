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
import Model, { Status, StatusBar } from 'models/model';
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
	statusBar: StatusBar;
	model: Model;

	async onload() {
		// Load settings & initialize path values
		await this.loadSettings();
		this.addSettingTab(new LatexOCRSettingsTab(this.app, this));

		this.vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath()
		this.pluginPath = path.join(this.vaultPath, ".obsidian/plugins/latex-ocr")
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

		// Right-click "Generate Latex" menu on image files
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && IMG_EXTS.contains(file.extension)) {
					menu.addItem((item) => {
						item
							.setTitle("Generate Latex")
							.setIcon("sigma")
							.setSection("info")
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

		// Status bar, will automatically start based on settings
		this.statusBar = new StatusBar(this)
	}

	onunload() {
		this.model.unload()
		this.statusBar.stop()
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

	// Get a clipboard file, save it to disk temporarily,
	// call the LatexOCR client.
	async clipboardToText(editor: Editor) {
		try {
			const file = await navigator.clipboard.read();
			if (file.length === 0) {
				throw new Error("Couldn't find image in clipboard")
			}
			let filetype = null;
			for (const ext of IMG_EXTS) {
				if (file[0].types.includes(`image/${ext}`)) {
					console.log(`latex_ocr: found image in clipboard with mimetype image/${ext}`)
					filetype = ext;
					break
				}
			}

			if (filetype === null) {
				throw new Error("Couldn't find image in clipboard")
			}

			const from = editor.getCursor("from")
			const waitMessage = `\\LaTeX \\text{ is being generated... } \\vphantom{${from.line}}`
			const fullMessage = `${this.settings.delimiters}${waitMessage}${this.settings.delimiters}`

			try {
				console.log(`latex_ocr: recieved paste command at line ${from.line}`)

				// Abort if model isn't ready
				const status = await this.model.status()
				if (status.status !== Status.Ready) {
					throw new Error(status.msg)
				}

				// Write generating message
				editor.replaceSelection(fullMessage)

				// Save image to file
				const blob = await file[0].getType(`image/${filetype}`);
				const buffer = Buffer.from(await blob.arrayBuffer());
				const imgpath = path.join(this.pluginPath, `/.clipboard_images/pasted_image.${filetype}`);
				fs.writeFileSync(imgpath, buffer)

				// Get latex
				const latex = await this.model.imgfileToLatex(imgpath)

				// Find generating message again, starting search from original line
				// (it may have moved up or down)
				const firstLine = 0;
				const lastLine = editor.lineCount() - 1;
				let currLine = from.line;
				let currOffset = 0; // 0, +1, -1, +2, -2

				while (currLine >= firstLine && currLine <= lastLine) {
					const text = editor.getLine(currLine);
					const from = text.indexOf(fullMessage)
					if (from !== -1) {
						editor.replaceRange(latex, { line: currLine, ch: from }, { line: currLine, ch: from + fullMessage.length })
						new Notice(`🪄 Latex pasted to note`)
						return
					}
					currLine += currOffset;
					if (currOffset <= 0) {
						currOffset = (-currOffset + 1)
					} else {
						currOffset = -currOffset
					}
				}

				// If the message isn't found, abort
				throw new Error("Couldn't find paste target")
			} catch (err) {
				new Notice(`⚠️ ${err} `, 5000)
				console.error(err)
			}
			return
		} catch (err) {
			new Notice(err.message)
			console.error(err.name, err.message)
		}
	}
}
