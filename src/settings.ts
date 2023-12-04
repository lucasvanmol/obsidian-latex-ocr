import { Status } from "models/model";
import LatexOCR from "main";
import { LocalModel } from "models/local_model";
import ApiModel from "models/online_model";
import { PluginSettingTab, App, Setting, Notice, TextComponent, normalizePath } from "obsidian";
import safeStorage from "safeStorage";

const obfuscateApiKey = (apiKey = ''): string =>
    apiKey.length > 0 ? apiKey.replace(/^(.{3})(.*)(.{4})$/, '$1****$3') : ''

export default class LatexOCRSettingsTab extends PluginSettingTab {
    plugin: LatexOCR;

    constructor(app: App, plugin: LatexOCR) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // GENERAL SETTINGS //
        containerEl.createEl("h5", { text: "General" })

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
            .setDesc("✅ online; ⚙️ loading; 🌐 downloading; 🔧 needs configuration; ❌ unreachable")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showStatusBar)
                .onChange(async (value) => {
                    if (value) {
                        this.plugin.statusBar.show()
                    } else {
                        this.plugin.statusBar.hide()
                    }
                    this.plugin.settings.showStatusBar = value
                    await this.plugin.saveSettings()
                }));

        let ApiSettings: HTMLElement[]
        let LocalSettings: HTMLElement[]
        new Setting(containerEl)
            .setName("Use local model")
            .setDesc("Use local model with python. \
			See the project's README for installation instructions")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useLocalModel)
                .onChange(async value => {
                    this.plugin.model.unload()

                    if (value) {
                        this.plugin.model = new LocalModel(this.plugin.settings, this.plugin.manifest)

                        ApiSettings.forEach(e => e.hide())
                        LocalSettings.forEach(e => e.show())
                    } else {
                        this.plugin.model = new ApiModel(this.plugin.settings)

                        ApiSettings.forEach(e => e.show())
                        LocalSettings.forEach(e => e.hide())
                    }
                    this.plugin.model.load()

                    this.plugin.settings.useLocalModel = value
                    await this.plugin.saveSettings()
                }))


        const checkStatus = () => {
            this.plugin.model.status().then((status) => {
                switch (status.status) {
                    case Status.Ready:
                        new Notice("✅ The server is reachable!")
                        break;

                    case Status.Downloading:
                        new Notice(`🌐 ${status.msg}`)
                        break;

                    case Status.Loading:
                        new Notice(`⚙️ ${status.msg}`)
                        break;

                    case Status.Misconfigured:
                        new Notice(`🔧 ${status.msg}`)
                        break;

                    case Status.Unreachable:
                    default:
                        new Notice(`❌ ${status.msg}`)
                        break;
                }
            })
        }

        // MODEL SPECIFIC SETTINGS //
        const apiHeading = containerEl.createEl("h5", { text: "API model configuration" })

        const KeyDisplay = new Setting(containerEl)
            .setName('Current API Key')
            .addText(text => text
                .setPlaceholder(this.plugin.settings.obfuscatedKey).setDisabled(true))
        ApiSettings = [
            apiHeading,
            new Setting(containerEl)
                .setName('Set API Key')
                .setDesc('Hugging face API key. See https://huggingface.co/docs/api-inference/quicktour#get-your-api-token.')
                .addText(text => text
                    .onChange(async value => {
                        let key
                        if (safeStorage.isEncryptionAvailable()) {
                            key = safeStorage.encryptString(value)
                        } else {
                            key = value
                        }

                        new Notice("🔧 Api key saved")
                        this.plugin.settings.obfuscatedKey = obfuscateApiKey(value)
                        this.plugin.settings.hfApiKey = key;
                        (KeyDisplay.components[0] as TextComponent).setPlaceholder(this.plugin.settings.obfuscatedKey)
                        await this.plugin.saveSettings()
                    }).inputEl.setAttr("type", "password"))
                .settingEl,

            KeyDisplay.settingEl]


        LocalSettings = [
            containerEl.createEl("h5", { text: "Local model configuration" }),

            new Setting(containerEl)
                .setName('Python path')
                .setDesc("Path to Python installation. You need to have the `latex_ocr_server` package installed, see the project's README for more information.\
			Note that changing the path requires a server restart in order to take effect.")
                .addText(text => text
                    .setPlaceholder('path/to/python.exe')
                    .setValue(this.plugin.settings.pythonPath)
                    .onChange(async (value) => {
                        this.plugin.settings.pythonPath = normalizePath(value);
                        await this.plugin.saveSettings();
                    })).settingEl,

            new Setting(containerEl)
                .setName('Server status')
                .setDesc("LatexOCR runs a python script in the background that can process OCR requests. \
				Use these settings to check it's status, or restart it. \
				Note that restarting can take a few seconds. If the model isn't cached, it needs to be downloaded first (~1.4 GB).")
                .addButton(button => button
                    .setButtonText("Check status")
                    .onClick(evt => {
                        checkStatus()
                    })
                )
                .addButton(button => button
                    .setButtonText("(Re)start server")
                    .onClick(async (evt) => {
                        new Notice("⚙️ Starting server...", 5000)
                        this.plugin.model.unload()
                    })).settingEl,


            new Setting(containerEl)
                .setName('Port')
                .setDesc('Port to run the LatexOCR server on. Note that a server restart is required in order for this to take effect.')
                .addText(text => text
                    .setValue(this.plugin.settings.port)
                    .onChange(async (value) => {
                        this.plugin.settings.port = value;
                        await this.plugin.saveSettings();
                    })).settingEl,

            new Setting(containerEl)
                .setName("Start server on launch")
                .setDesc("The LatexOCR server consumes quite a lot of memory. If you don't use it often, feel free to disable this.\
				You will need to (re)start the server manually if you wish to use the plugin.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.startServerOnLoad)
                    .onChange(async (value) => {
                        this.plugin.settings.startServerOnLoad = value;
                        await this.plugin.saveSettings();
                    })).settingEl,

            new Setting(containerEl)
                .setName("Cache dir")
                .setDesc("The directory where the model is saved. By default this is in `Vault/.obsidian/plugins/obsidian-latex-ocr/model_cache`. \
					Note that changing this will not delete the old cache, and require the model to be redownloaded. \
					The server must be restarted for this to take effect.")
                .addText(text => text
                    .setValue(this.plugin.settings.cacheDirPath)
                    .onChange(async (value) => {
                        const path = normalizePath(value)
                        if (path !== "") {
                            this.plugin.settings.cacheDirPath = path
                            await this.plugin.saveSettings();
                        }
                    })).settingEl
        ]


        if (this.plugin.settings.useLocalModel) {
            ApiSettings.forEach(e => e.hide())
        } else {
            LocalSettings.forEach(e => e.hide())
        }

    }
}
