import { Status } from "models/model";
import LatexOCR from "main";
import { LocalModel } from "models/local_model";
import ApiModel from "models/online_model";
import { PluginSettingTab, App, Setting, Notice, TextComponent } from "obsidian";
import safeStorage from "safeStorage";
import { picker } from "utils";
import { normalize } from "path";

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

        ///// GENERAL SETTINGS /////

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
            .setDesc("✅ online / ⚙️ loading / 🌐 downloading / 🔧 needs configuration / ❌ unreachable")
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

        new Setting(containerEl)
            .setName("Use local model")
            .setDesc("Use local model with python. \
			See the project's README for installation instructions.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useLocalModel)
                .onChange(async value => {
                    if (this.plugin.model) {
                        this.plugin.model.unload()
                    }

                    if (value) {
                        this.plugin.model = new LocalModel(this.plugin.settings)
                        configuration_text.setText(LOCAL_CONF_TEXT)

                        ApiSettings.forEach(e => e.hide())
                        LocalSettings.forEach(e => e.show())
                    } else {
                        this.plugin.model = new ApiModel(this.plugin.settings)
                        configuration_text.setText(API_CONF_TEXT)

                        LocalSettings.forEach(e => e.hide())
                        apiProviderSetting.settingEl.show()

                        // Show only the relevant API key settings based on provider
                        if (this.plugin.settings.apiProvider === 'huggingface') {
                            HfApiSettings.forEach(e => e.show())
                            OpenAiApiSettings.forEach(e => e.hide())
                        } else {
                            HfApiSettings.forEach(e => e.hide())
                            OpenAiApiSettings.forEach(e => e.show())
                        }
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

        new Setting(containerEl)
            .setName("Debug logging")
            .setDesc("To enable verbose logging, open the developer console (Ctrl+Shift+I) and set the log level to include 'Verbose' messages.");


        const API_CONF_TEXT = "API Configuration"
        const LOCAL_CONF_TEXT = "Local Python Model Configuration"
        const configuration_text = containerEl.createEl("h5", { text: API_CONF_TEXT })
        if (this.plugin.settings.useLocalModel) {
            configuration_text.setText(LOCAL_CONF_TEXT)
        }

        ///// API MODEL SETTINGS /////

        // API Provider choice Dropdown
        const apiProviderSetting = new Setting(containerEl)
            .setName('API Provider')
            .setDesc('Choose which API provider to use for OCR processing.')
            .addDropdown(dd => dd
                .addOption('huggingface', 'HuggingFace')
                .addOption('openai', 'OpenAI')
                .setValue(this.plugin.settings.apiProvider)
                .onChange(async (value) => {
                    this.plugin.settings.apiProvider = value
                    await this.plugin.saveSettings()

                    // Show/hide appropriate API key settings
                    if (value === 'huggingface') {
                        HfApiSettings.forEach(e => e.show())
                        OpenAiApiSettings.forEach(e => e.hide())
                    } else {
                        HfApiSettings.forEach(e => e.hide())
                        OpenAiApiSettings.forEach(e => e.show())
                    }
                })
            )

        // HuggingFace API Key Settings
        const KeyDisplay = new Setting(containerEl)
            .setName('Current API Key')
            .addText(text => text
                .setPlaceholder(this.plugin.settings.obfuscatedKey).setDisabled(true))

        const apiKeyDesc = new DocumentFragment()
        apiKeyDesc.textContent = "Hugging face API key. See the "
        apiKeyDesc.createEl("a", { text: "hugging face docs", href: "https://huggingface.co/docs/api-inference/quicktour#get-your-api-token" })
        apiKeyDesc.createSpan({ text: " on how to generate it." })
        const apiKeyInput = new Setting(containerEl)
            .setName('Set HuggingFace API Key')
            .setDesc(apiKeyDesc)
            .addText(text => text.inputEl.setAttr("type", "password"))
        apiKeyInput.addButton(btn =>
            btn.setButtonText("Submit")
                .setCta()
                .onClick(async evt => {
                    const value = (apiKeyInput.components[0] as TextComponent).getValue()
                    let key
                    if (safeStorage.isEncryptionAvailable()) {
                        key = safeStorage.encryptString(value)
                    } else {
                        key = value
                    }

                    new Notice("🔧 HuggingFace API key saved")
                    this.plugin.settings.obfuscatedKey = obfuscateApiKey(value)
                    this.plugin.settings.hfApiKey = key;
                    (KeyDisplay.components[0] as TextComponent).setPlaceholder(this.plugin.settings.obfuscatedKey)
                    await this.plugin.saveSettings()
                }))

        const HfApiSettings = [apiKeyInput.settingEl, KeyDisplay.settingEl]

        // OpenAI API Key Settings

        // Cost Warning
        const openAiCostWarningDesc = document.createDocumentFragment();
        openAiCostWarningDesc.append(
            "OpenAI API usage is not free. You will be charged based on the number of tokens processed. Typical costs are  ~$0.0001-0.0004 per image for simple equations. ~$0.001-0.003 per image for complex formulas. "
        );
        const openAiCostLink = document.createElement("a");
        openAiCostLink.textContent = "Monitor your usage and set spending limits";
        openAiCostLink.href = "https://platform.openai.com/account/limits";
        openAiCostLink.target = "_blank";
        openAiCostWarningDesc.appendChild(openAiCostLink);

        const openAiCostWarning = new Setting(containerEl)
            .setName('⚠️ WARNING: Usage Costs')
            .setDesc(openAiCostWarningDesc);
        
        // API Settings Interface
        const OpenAiKeyDisplay = new Setting(containerEl)
            .setName('Current OpenAI API Key')
            .addText(text => text
                .setPlaceholder(this.plugin.settings.obfuscatedOpenAiKey).setDisabled(true))

        const openAiKeyDesc = new DocumentFragment()
        openAiKeyDesc.textContent = "Find your OpenAI API key on the "
        openAiKeyDesc.createEl("a", { text: "OpenAI API key page", href: "https://platform.openai.com/api-keys" })
        const openAiKeyInput = new Setting(containerEl)
            .setName('Set OpenAI API Key')
            .setDesc(openAiKeyDesc)
            .addText(text => text.inputEl.setAttr("type", "password"))
        openAiKeyInput.addButton(btn =>
            btn.setButtonText("Submit")
                .setCta()
                .onClick(async evt => {
                    const value = (openAiKeyInput.components[0] as TextComponent).getValue()
                    let key
                    if (safeStorage.isEncryptionAvailable()) {
                        key = safeStorage.encryptString(value)
                    } else {
                        key = value
                    }

                    new Notice("🔧 OpenAI API key saved")
                    this.plugin.settings.obfuscatedOpenAiKey = obfuscateApiKey(value)
                    this.plugin.settings.openAiApiKey = key;
                    (OpenAiKeyDisplay.components[0] as TextComponent).setPlaceholder(this.plugin.settings.obfuscatedOpenAiKey)
                    await this.plugin.saveSettings()
                }))


        // OpenAI Model Selection
        //
        //  Cost: For simple images both models cost approximately the same, but for complex images Nano becomes significantly cheaper (up to 10x). \
        //  Speed: Mini is faster for simple images, but the difference decreases as complexity increases.\
        //  Accuracy: Mini is more capable, especially for low resolution or complex images.
        const openAiModelSetting = new Setting(containerEl)
            .setName('OpenAI Model')
            .setDesc('Choose which OpenAI model to use for OCR processing. For simpler images we recommend Mini, which is much faster for about the same cost.\
                    For more complex images we recommend Nano, which can be up to 10x cheaper at about the same speed.\
                    If you are working with low resolution, Mini might give better results.')
            .addDropdown(dd => dd
                .addOption('gpt-5-nano', 'GPT-5 Nano')
                .addOption('gpt-5-mini', 'GPT-5 Mini')
                .setValue(this.plugin.settings.openAiModel)
                .onChange(async (value) => {
                    this.plugin.settings.openAiModel = value
                    await this.plugin.saveSettings()
                })
            )

        // OpenAI Max Tokens Setting
        const openAiMaxTokensSetting = new Setting(containerEl)
            .setName('Max Completion Tokens')
            .setDesc('Maximum number of tokens to generate in the response (100-100000). Makes sure you don\'t accidentally make a huge request. \
                    1000 tokens costs about $0.0004 with Nano and $0.0017 with Mini.')
            .addText(text => text
                .setPlaceholder('20000')
                .setValue(String(this.plugin.settings.openAiMaxTokens))
                .onChange(async (value) => {
                    const numValue = parseInt(value)
                    if (!isNaN(numValue) && numValue >= 100 && numValue <= 100000) {
                        this.plugin.settings.openAiMaxTokens = numValue
                        await this.plugin.saveSettings()
                    }
                })
            )

        // OpenAI Service Tier Setting
        const openAiServiceTierSetting = new Setting(containerEl)
            .setName('Service Tier')
            .setDesc('Flex tier is about 50% cheaper but might queue requests during peak times. Default tier guarantees no queuing. If you experience delays, consider switching to default.')
            .addDropdown(dd => dd
                .addOption('flex', 'Flex')
                .addOption('default', 'Default')
                .setValue(this.plugin.settings.openAiServiceTier)
                .onChange(async (value) => {
                    this.plugin.settings.openAiServiceTier = value
                    await this.plugin.saveSettings()
                })
            )

        const OpenAiApiSettings = [openAiKeyInput.settingEl, OpenAiKeyDisplay.settingEl, openAiCostWarning.settingEl, openAiModelSetting.settingEl, openAiMaxTokensSetting.settingEl, openAiServiceTierSetting.settingEl]

        const ApiSettings = [...HfApiSettings, ...OpenAiApiSettings, apiProviderSetting.settingEl]


        ///// LOCAL MODEL SETTINGS /////

        const pythonPath = new Setting(containerEl)
            .setName('Python path')
            .setDesc("Path to Python installation. You need to have the `latex_ocr_server` package installed, see the project's README for more information.\
			Note that changing the path requires a server restart in order to take effect.")
            .addExtraButton(cb => cb
                .setIcon("folder")
                .setTooltip("Browse")
                .onClick(async () => {
                    const file = await picker("Open Python path", ["openFile"]) as string;
                    (pythonPath.components[1] as TextComponent).setValue(file)
                    this.plugin.settings.pythonPath = normalize(file);
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setPlaceholder('path/to/python.exe')
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = normalize(value);
                    await this.plugin.saveSettings();
                }))

        const serverStatus = new Setting(containerEl)
            .setName('Server control')
            .setDesc("LatexOCR runs a python script in the background that can process OCR requests. \
				Use these settings to check it's status, start, or stop it. \
				Note that starting can take a few seconds. If the model isn't cached, it needs to be downloaded first (~1.4 GB).")
            .addButton(button => button
                .setButtonText("Check status")
                .setCta()
                .onClick(evt => {
                    checkStatus()
                })
            )
            .addButton(button => button
                .setButtonText("(Re)start server")
                .onClick(async (evt) => {
                    new Notice("⚙️ Starting server...", 5000)
                    if (this.plugin.model) {
                        this.plugin.model.unload()
                        this.plugin.model.load()
                        this.plugin.model.start()
                    }
                }))
            .addButton(button => button
                .setButtonText("Stop server")
                .onClick(async (evt) => {
                    if (this.plugin.model) {
                        this.plugin.model.unload()
                        new Notice("⚙️ Server stopped", 2000);
                    } else {
                        new Notice("❌ No server found to stop", 5000);
                    }
                }))


        const port = new Setting(containerEl)
            .setName('Port')
            .setDesc('Port to run the LatexOCR server on. Note that a server restart is required in order for this to take effect.')
            .addText(text => text
                .setValue(this.plugin.settings.port)
                .onChange(async (value) => {
                    this.plugin.settings.port = value;
                    await this.plugin.saveSettings();
                }))

        const startOnLaunch = new Setting(containerEl)
            .setName("Start server on launch")
            .setDesc("The LatexOCR server consumes quite a lot of memory. If you don't use it often, feel free to disable this.\
				You will need to (re)start the server manually if you wish to use the plugin.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.startServerOnLoad)
                .onChange(async (value) => {
                    this.plugin.settings.startServerOnLoad = value;
                    await this.plugin.saveSettings();
                }))

        const cacheDir = new Setting(containerEl)
            .setName("Cache dir")
            .setDesc("The directory where the model is saved. By default this is in `Vault/.obsidian/plugins/obsidian-latex-ocr/model_cache`. \
					Note that changing this will not delete the old cache, and require the model to be redownloaded. \
					The server must be restarted for this to take effect.")
            .addExtraButton(cb => cb
                .setIcon("folder")
                .setTooltip("Browse")
                .onClick(async () => {
                    const folder = await picker("Open cache directory", ["openDirectory"]) as string;
                    (cacheDir.components[1] as TextComponent).setValue(folder)
                    this.plugin.settings.cacheDirPath = normalize(folder)
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setValue(this.plugin.settings.cacheDirPath)
                .onChange(async (value) => {
                    const path = normalize(value)
                    if (path !== "") {
                        this.plugin.settings.cacheDirPath = path
                        await this.plugin.saveSettings();
                    }
                }))

        const LocalSettings: HTMLElement[] = [pythonPath.settingEl, serverStatus.settingEl, port.settingEl, startOnLaunch.settingEl, cacheDir.settingEl]

        if (this.plugin.settings.useLocalModel) {
            ApiSettings.forEach(e => e.hide())
        } else {
            LocalSettings.forEach(e => e.hide())
            // Show only the relevant API key settings based on provider
            if (this.plugin.settings.apiProvider === 'huggingface') {
                HfApiSettings.forEach(e => e.show())
                OpenAiApiSettings.forEach(e => e.hide())
            } else {
                HfApiSettings.forEach(e => e.hide())
                OpenAiApiSettings.forEach(e => e.show())
            }
        }

    }
}
