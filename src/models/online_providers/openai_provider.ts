import Model, { Status } from "../model";
import * as fs from 'fs'
import { LatexOCRSettings } from "main";
import safeStorage from "safeStorage";
import { Notice } from "obsidian";
import * as path from "path";
import OpenAI from "openai";

export interface DetailedOCRResult {
    latex: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    timeTaken: number;
}

export default class OpenAIProvider implements Model {
    settings: LatexOCRSettings
    apiKey: string
    client: OpenAI | null = null
    statusCheckIntervalLoading = 5000;
    statusCheckIntervalReady = 15000;

    constructor(settings: LatexOCRSettings) {
        this.reloadSettings(settings)
    }

    reloadSettings(settings: LatexOCRSettings) {
        this.settings = settings
        try {
            if (safeStorage.isEncryptionAvailable()) {
                this.apiKey = safeStorage.decryptString(Buffer.from(settings.openAiApiKey as ArrayBuffer))
            } else {
                this.apiKey = settings.openAiApiKey as string
            }

            // Create OpenAI client if we have a key
            if (this.apiKey) {
                this.client = new OpenAI({ apiKey: this.apiKey, dangerouslyAllowBrowser: true })
            } else {
                this.client = null
            }
        } catch (error) {
            new Notice(`❌ There was an error loading your OpenAI API key`)
            console.error('Error loading OpenAI API key:', error);
            this.apiKey = ""
            this.client = null
        }
    }

    load() {
        console.debug("latex_ocr: OpenAI API model loaded.")
    }

    start() { }

    unload() { }

    // Implementation taken from:
    // https://developers.openai.com/api/docs/guides/images-vision?format=base64-encoded#analyze-images

    async imgfileToLatexDetailed(filepath: string, showNotice: boolean = true): Promise<DetailedOCRResult> {
        const file = path.parse(filepath)
        const notice = showNotice ? new Notice(`⚙️ Generating Latex for ${file.base}...`, 0) : null;

        if (!this.client) {
            if (notice) setTimeout(() => notice.hide(), 1000)
            throw new Error("OpenAI client not initialized. Please check your API key.")
        }

        const data = fs.readFileSync(filepath);
        const base64Image = data.toString('base64');

        // Determine the image MIME type from file extension
        const ext = file.ext.toLowerCase().replace('.', '');
        const mimeTypes: { [key: string]: string } = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp'
        };

        // If the file extension is not supported, throw an error
        const mimeType = mimeTypes[ext];
        if (!mimeType) {
            const errorMsg = `❌ Unsupported file format: ${file.ext}. Supported formats: PNG, JPG, JPEG, WEBP`
            if (notice) {
                notice.setMessage(errorMsg)
                setTimeout(() => notice.hide(), 8000)
            }
            throw new Error(errorMsg)
        }

        // Declare progress interval outside try/catch so it's accessible in both
        let progressInterval: NodeJS.Timeout | null = null;

        try {
            const startTime = Date.now()

            // Update notice periodically to show progress
            if (notice) {
                progressInterval = setInterval(() => {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    notice.setMessage(`⚙️ Generating LaTeX for ${file.base}... (${elapsed}s)`);
                }, 1000); // Update every 1s
            }

            const serviceTier = (this.settings.openAiServiceTier || "flex") as "flex" | "auto" | "default";
            const response = await this.client.chat.completions.create({
                model: this.settings.openAiModel || "gpt-5-nano",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Convert this image to LaTeX code. Return ONLY the LaTeX formula without any explanation, markdown formatting, or delimiters. Do not include $ or $$ symbols."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_completion_tokens: this.settings.openAiMaxTokens || 2000,
                service_tier: serviceTier
            });

            // Stop the progress updates
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            const endTime = Date.now()
            const duration = (endTime - startTime) / 1000 // Convert to seconds

            console.log(`latex_ocr: Request completed in ${duration.toFixed(2)} seconds`)
            console.debug(`latex_ocr: OpenAI response: ${JSON.stringify(response)}`)

            // Check if the response was cut off due to token limit
            const finishReason = response.choices?.[0]?.finish_reason
            if (finishReason === "length") {
                const usage = response.usage
                const tokensUsed = usage?.completion_tokens || 0
                const maxTokens = this.settings.openAiMaxTokens || 2000
                const errorMsg = `❌ Token limit exceeded! Used ${tokensUsed}/${maxTokens} tokens. Increase "Max Completion Tokens" in settings or try a simpler image.`

                if (notice) {
                    notice.setMessage(errorMsg)
                    setTimeout(() => notice.hide(), 120000)
                }

                throw new Error("Token limit exceeded")
            }

            // Show token usage in console
            const usage = response.usage
            if (usage) {
                console.log(`latex_ocr: Model: ${response.model} | Duration: ${duration.toFixed(2)}s`)
                console.log(`latex_ocr: Token usage - Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}, Total: ${usage.total_tokens}`)
            }

            if (notice) {
                notice.setMessage(`✅ LaTeX generated!`)
                setTimeout(() => notice.hide(), 3000)
            }

            const latex = response.choices?.[0]?.message?.content?.trim()
            if (latex) {
                const d = this.settings.delimiters
                return {
                    latex: `${d}${latex}${d}`,
                    model: response.model,
                    inputTokens: usage?.prompt_tokens || 0,
                    outputTokens: usage?.completion_tokens || 0,
                    totalTokens: usage?.total_tokens || 0,
                    timeTaken: duration
                }
            } else {
                throw new Error(`Malformed response from OpenAI: ${JSON.stringify(response)}`)
            }
        } catch (error: any) {
            // Stop the progress updates if still running
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            console.error('OpenAI API error:', error)

            // Determine error message
            let errorMsg: string
            if (error.status === 429 || error.code === 'rate_limit_exceeded') {
                errorMsg = "❌ Rate limit exceeded. Add credits at platform.openai.com/account/billing or wait and try again."
            } else if (error.status === 402 || error.code === 'insufficient_quota') {
                errorMsg = "❌ Insufficient credits. Add credits at platform.openai.com/account/billing"
            } else if (error.status === 401 || error.code === 'invalid_api_key') {
                errorMsg = "❌ Invalid API key. Check your OpenAI API key in settings"
            } else if (error.status === 400 || error.code === 'invalid_request_error') {
                errorMsg = `❌ Bad request: ${error.message || 'Image format may not be supported'}`
            } else if (error.status >= 500) {
                errorMsg = "❌ OpenAI service unavailable. Try again later"
            } else if (error.message?.includes('Token limit exceeded')) {
                throw error
            } else {
                errorMsg = `❌ Error: ${error.message || 'Unknown error'}`
            }

            if (notice) {
                notice.setMessage(errorMsg)
                setTimeout(() => notice.hide(), 8000)
            }

            throw new Error(errorMsg)
        }
    }

    async imgfileToLatex(filepath: string): Promise<string> {
        const result = await this.imgfileToLatexDetailed(filepath, true);
        return result.latex;
    }

    async status() {
        if (this.apiKey === "" || !this.client) {
            return { status: Status.Misconfigured, msg: "OpenAI API key required" }
        }

        try {
            // Test the API key by listing models
            await this.client.models.list()
            return { status: Status.Ready, msg: "OpenAI API key is working" }
        } catch (error: any) {
            if (error.status === 401 || error.code === 'invalid_api_key') {
                return { status: Status.Misconfigured, msg: "Unauthorized: check your OpenAI API key in the settings" }
            } else if (error.status === 429 || error.code === 'rate_limit_exceeded') {
                return { status: Status.Misconfigured, msg: "Rate limit exceeded. Check your usage at platform.openai.com/usage" }
            } else if (error.status === 402 || error.code === 'insufficient_quota') {
                return { status: Status.Misconfigured, msg: "Insufficient credits. Add credits at platform.openai.com/account/billing" }
            } else if (error.status >= 500) {
                return { status: Status.Unreachable, msg: "OpenAI service temporarily unavailable" }
            } else {
                console.error(error)
                return { status: Status.Unreachable, msg: `Error: ${error.message || 'Unknown error'}` }
            }
        }
    }
}
