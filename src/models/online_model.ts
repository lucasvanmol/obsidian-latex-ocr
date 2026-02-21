import Model from "./model";
import { LatexOCRSettings } from "main";
import HuggingFaceProvider from "./online_providers/huggingface_provider";
import OpenAIProvider from "./online_providers/openai_provider";

export default class ApiModel implements Model {
    settings: LatexOCRSettings
    provider: Model
    statusCheckIntervalLoading = 5000;
    statusCheckIntervalReady = 15000;

    constructor(settings: LatexOCRSettings) {
        this.settings = settings
        this.provider = this.createProvider(settings)
    }

    private createProvider(settings: LatexOCRSettings): Model {
        if (settings.apiProvider === 'openai') {
            return new OpenAIProvider(settings)
        } else {
            // Default to HuggingFace
            return new HuggingFaceProvider(settings)
        }
    }

    reloadSettings(settings: LatexOCRSettings) {
        this.settings = settings
        // If provider changed, create a new provider instance
        const newProviderType = settings.apiProvider === 'openai' ? 'openai' : 'huggingface'
        const currentProviderType = this.provider instanceof OpenAIProvider ? 'openai' : 'huggingface'

        if (newProviderType !== currentProviderType) {
            this.provider = this.createProvider(settings)
        } else {
            this.provider.reloadSettings(settings)
        }
    }

    load() {
        this.provider.load()
    }

    start() {
        this.provider.start()
    }

    unload() {
        this.provider.unload()
    }

    async imgfileToLatex(filepath: string): Promise<string> {
        return this.provider.imgfileToLatex(filepath)
    }

    async status() {
        return this.provider.status()
    }
}
