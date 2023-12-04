import clipboard from "clipboardy";
import LatexOCR from "main";
import { Modal, App, Setting, TFile, Notice } from "obsidian";
import * as path from "path";

export class LatexOCRModal extends Modal {
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
                        this.plugin.model.imgfileToLatex(this.imagePath).then(async (latex) => {
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