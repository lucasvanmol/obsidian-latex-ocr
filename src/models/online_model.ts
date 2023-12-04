import Model, { Status } from "./model";
import * as fs from 'fs'
import { LatexOCRSettings } from "main";
import safeStorage from "safeStorage";
import { Notice } from "obsidian";
import * as path from "path";

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
    };


    load() {
        console.log("latex_ocr: API model loaded.")
    };

    unload() { };

    async imgfileToLatex(filepath: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            const file = path.parse(filepath)
            const notice = new Notice(`⚙️ Generating Latex for ${file.base}...`, 0);

            const data = fs.readFileSync(filepath);
            const response = await fetch(
                "https://api-inference.huggingface.co/models/Norm/nougat-latex-base",
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                    method: "POST",
                    body: data,
                }
            );

            console.log(`latex_ocr_api: ${JSON.stringify(response)}`)
            if (response.ok) {
                const result = await response.json();
                const latex = result[0].generated_text
                if (latex) {
                    const d = this.settings.delimiters
                    resolve(`${d}${latex}${d}`)
                } else {
                    reject(`Malformed response ${result}`)
                }
            } else if (response.status === 503) {
                reject("Inference API is being provisioned, please try again in a few seconds")
            } else if (response.status === 400 || response.status === 401) {
                reject("Unauthorized API key")
            } else {
                reject(`Got ${response.status}: ${response.statusText}`)
            }
            setTimeout(() => notice.hide(), 1000)
        })
    };

    async status() {
        if (this.apiKey === "") {
            return { status: Status.Misconfigured, msg: "Api key required" }
        }
        const response = await fetch(
            "https://huggingface.co/api/whoami-v2",
            {
                headers: { Authorization: `Bearer ${this.apiKey}` },
                method: "GET",
            }
        );

        if (response.ok) {
            // Upload dummy image
            const response = await fetch(
                "https://api-inference.huggingface.co/models/Norm/nougat-latex-base",
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                    method: "POST",
                    body: Buffer.from("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", "base64"),
                }
            );

            if (response.status === 503) {
                return { status: Status.Loading, msg: "Inference API is being provisioned, please try again in a few seconds" }
            } else {
                return { status: Status.Ready, msg: "Inference API is ready and accepting images" }
            }

        } else if (response.status === 400 || response.status === 401) {
            return { status: Status.Misconfigured, msg: "Unauthorized: check your API key in the settings" }
        } else {
            console.error(response)
            return { status: Status.Unreachable, msg: `Got ${response.status}: ${response.statusText}` }
        }
    }
};
