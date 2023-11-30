import { PathLike } from "fs";
import Model, { Status } from "./model";
import * as fs from 'fs'
import { LatexOCRSettings } from "main";
import safeStorage from "safeStorage";

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
    async imgfileToLatex(filepath: PathLike): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {

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
                resolve(JSON.stringify(result))
            } else if (response.status === 503) {
                reject("Inference API is being provisioned, please try again in a few seconds")
            } else {
                reject(response.statusText)
            }

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