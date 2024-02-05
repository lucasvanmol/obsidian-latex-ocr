import Model, { Status } from "./model";
import * as fs from 'fs'
import { LatexOCRSettings } from "main";
import safeStorage from "safeStorage";
import { Notice, requestUrl } from "obsidian";
import * as path from "path";
import { imageToText } from "@huggingface/inference";

export default class ApiModel implements Model {
    settings: LatexOCRSettings
    apiKey: string
    statusCheckIntervalLoading = 5000;
    statusCheckIntervalReady = 15000;

    constructor(settings: LatexOCRSettings) {
        this.reloadSettings(settings)
    }

    reloadSettings(settings: LatexOCRSettings) {
        this.settings = settings
        if (safeStorage.isEncryptionAvailable()) {
            this.apiKey = safeStorage.decryptString(Buffer.from(settings.hfApiKey as ArrayBuffer))
        } else {
            this.apiKey = settings.hfApiKey as string
        }
    }


    load() {
        console.log("latex_ocr: API model loaded.")
    }

    unload() { }

    async imgfileToLatex(filepath: string): Promise<string> {
        const file = path.parse(filepath)
        const notice = new Notice(`⚙️ Generating Latex for ${file.base}...`, 0);

        const data = fs.readFileSync(filepath);

        try {

            let response;
            try {
                response = await imageToText({
                    accessToken: this.apiKey,
                    model: "Norm/nougat-latex-base",
                    data: data,
                }, {
                    retry_on_error: false,
                });
            } catch (error) {
                console.error(error)

                if (`${error}`.includes("is currently loading")) {
                    notice.setMessage(`⚙️ Generating Latex for ${file.base}... (model is being provisioned)`)
                }

                response = await imageToText({
                    accessToken: this.apiKey,
                    model: "Norm/nougat-latex-base",
                    data: data,
                }, {
                    retry_on_error: false,
                    wait_for_model: true,
                })
            }

            console.log(`latex_ocr: ${JSON.stringify(response)}`)
            setTimeout(() => notice.hide(), 1000)

            const latex = response.generated_text
            if (latex) {
                const d = this.settings.delimiters
                return (`${d}${latex}${d}`)
            } else {
                throw new Error(`Malformed response ${JSON.stringify(response)}`)
            }
        } catch (error) {
            setTimeout(() => notice.hide(), 1000)
            // check 503: not provisioned
            // check 429: rate limited
            // check 400/401: unauthoorized api key
            throw error
        }
    }


    async status() {
        if (this.apiKey === "") {
            return { status: Status.Misconfigured, msg: "Api key required" }
        }

        try {
            const response = await requestUrl({
                url: "https://huggingface.co/api/whoami-v2",
                headers: { Authorization: `Bearer ${this.apiKey}` },
                method: "GET",
            })

            return { status: Status.Ready, msg: "API key is working" }
        } catch (response) {
            if (response.status === 400 || response.status === 401) {
                return { status: Status.Misconfigured, msg: "Unauthorized: check your API key in the settings" }
            } else {
                console.error(response)
                return { status: Status.Unreachable, msg: `Got ${response.status}: ${response}` }
            }
        }
    }
}
