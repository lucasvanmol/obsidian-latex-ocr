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
import { StatusBar } from "status_bar";
import { LatexOCRModal } from 'modal';
import ApiModel from 'models/online_model';
import LatexOCRSettingsTab from 'settings';

export interface LatexOCRSettings {
	/** Enables/disables debug logs */
	debug: boolean;

	/** Path to look for python installation */
	pythonPath: string;

	/** Path where local model is cached */
	cacheDirPath: string;

	/** String to put around Latex code, usually `$` or `$$` for math mode */
	delimiters: string;

	/** Port for latex-ocr-server */
	port: string;

	/** Start latex-ocr-server when Obsidian is loaded */
	startServerOnLoad: boolean;

	/** Toggle status bar */
	showStatusBar: boolean;

	/** Use local model or HF API */
	useLocalModel: boolean;

	/** Hugging face API key */
	hfApiKey: string | ArrayBuffer;

	/** Obfuscated key shown in settings */
	obfuscatedKey: string;
}

const DEFAULT_SETTINGS: LatexOCRSettings = {
	debug: false,
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

		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.vaultPath = this.app.vault.adapter.getBasePath()
		}
		if (this.manifest.dir) {
			this.pluginPath = this.manifest.dir
		}
		if (this.settings.cacheDirPath === "") {
			this.settings.cacheDirPath = path.resolve(this.pluginPath, "model_cache")
			await this.saveSettings()
		}

		if (this.settings.useLocalModel) {
			this.model = new LocalModel(this.settings)
		} else {
			this.model = new ApiModel(this.settings)
		}
		this.model.load()
		if (this.settings.startServerOnLoad) {
			this.model.start()
		}


		// Folder where temporary pasted files are stored
		try {
			await fs.promises.mkdir(path.join(this.vaultPath, this.pluginPath, "/.clipboard_images/"));
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
										this.debug(err, true);
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
				this.clipboardToText(editor).catch((err) => {
					new Notice(`❌ ${err.message}`)
					console.error(err.name, err.message)
				})
			}
		})

		// Add (Re)start server command to command palette
		this.addCommand({
			id: 'restart-latexocr-server',
			name: '(Re)start LatexOCR Server',
			callback: async () => {
				new Notice("⚙️ Starting server...", 5000);
				if (this.model) {
					this.model.unload();
					this.model.load();
					this.model.start();
				}
			}
		});

		// Status bar, will automatically start based on settings
		this.statusBar = new StatusBar(this)
	}

	onunload() {
		this.model?.unload()
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
		// Get clipboard file
		const file = await navigator.clipboard.read();
		if (file.length === 0) {
			throw new Error("Couldn't find image in clipboard")
		}

		let filetype = null;
		for (const ext of IMG_EXTS) {
			if (file[0].types.includes(`image/${ext}`)) {
				this.debug(`latex_ocr: found image in clipboard with mimetype image/${ext}`)
				filetype = ext;
				break
			}
		}

		if (filetype === null) {
			throw new Error("Couldn't find image in clipboard")
		}

		// Abort if model isn't ready
		const status = await this.model.status()
		if (status.status !== Status.Ready) {
			throw new Error(status.msg)
		}

		// Write generating message
		const from = editor.getCursor("from")
		this.debug(`latex_ocr: recieved paste command at line ${from.line}`)
		const waitMessage = `\\LaTeX \\text{ is being generated... } \\vphantom{${from.line}}`
		const fullMessage = `${this.settings.delimiters}${waitMessage}${this.settings.delimiters}`

		editor.replaceSelection(fullMessage)

		// Save image to file
		const blob = await file[0].getType(`image/${filetype}`);
		const buffer = Buffer.from(await blob.arrayBuffer());
		const imgpath = path.join(this.vaultPath, this.pluginPath, `/.clipboard_images/pasted_image.${filetype}`);
		fs.writeFileSync(imgpath, buffer)

		let latex: string;
		try {
			// Get latex
			latex = await this.model.imgfileToLatex(imgpath)
		} catch (err) {
			// If err, return empty string so that we erase `fullMessage`
			latex = ""
			new Notice(`⚠️ ${err} `, 5000)
			console.error(err)
		}

		// Find generating message again.
		// Starts search from original line, then downwards to the end of the document,
		// Then upwards to the start of the document.
		const firstLine = 0;
		const lastLine = editor.lineCount() - 1;
		let currLine = from.line;

		while (currLine <= lastLine) {
			const text = editor.getLine(currLine);
			const from = text.indexOf(fullMessage)
			if (from !== -1) {
				editor.replaceRange(latex, { line: currLine, ch: from }, { line: currLine, ch: from + fullMessage.length })
				if (latex !== "") {
					new Notice(`🪄 Latex pasted to note`)
				}
				return
			}
			currLine += 1;
		}

		currLine = from.line - 1;
		while (currLine >= firstLine) {
			const text = editor.getLine(currLine);
			const from = text.indexOf(fullMessage)
			if (from !== -1) {
				editor.replaceRange(latex, { line: currLine, ch: from }, { line: currLine, ch: from + fullMessage.length })
				if (latex !== "") {
					new Notice(`🪄 Latex pasted to note`)
				}
				return
			}
			currLine -= 1;
		}

		// If the message isn't found, abort
		throw new Error("Couldn't find paste target")
	}

	debug(message?: any, error: boolean = false) {
		if (this.settings.debug) {
			if (error) {
				console.error(message)
			} else {
				console.log(message)
			}
		}
	}
}
