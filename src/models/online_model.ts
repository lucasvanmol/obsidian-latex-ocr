import { PathLike } from "fs";
import Model, { Status } from "./model";
import * as fs from 'fs'
import { LatexOCRSettings } from "main";
import safeStorage from "safeStorage";
import { Notice } from "obsidian";
import * as path from "path";

export default class ApiModel implements Model {
    settings: LatexOCRSettings
    apiKey: string

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
        console.log("Loading LatexOCR API model")
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

            console.log(response)
            if (response.ok) {
                const result = await response.json();
                console.log(result)
                const latex = result[0].generated_text
                if (latex) {
                    const d = this.settings.delimiters
                    resolve(`${d}${latex}${d}`)
                } else {
                    reject(`Malformed response ${result}`)
                }
            } else if (response.status === 503) {
                reject("Inference API is being provisioned, please try again in a few seconds")
            } else if (response.status === 400) {
                reject("Error 400: Bad request; check your API key in the settings")
            } else {
                reject(`Got ${response.status}: ${response.statusText}`)
            }
            setTimeout(() => notice.hide(), 1000)
        })
    };
    status() {
        return new Promise<[Status, string]>(async (resolve, reject) => {
            if (this.apiKey === "") {
                resolve([Status.Misconfigured, "Api key required"])
            }
            resolve([Status.Ready, ""])
        })
    };

}