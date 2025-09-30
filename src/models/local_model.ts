import { ChildProcess, spawn } from 'child_process';
import { LatexOCRSettings } from 'main';
import Model, { Status } from 'models/model';
import * as path from 'path'
import { LatexOCRClient } from 'protos/latex_ocr';
import * as grpc from '@grpc/grpc-js';
import { Notice } from 'obsidian';

const IMG_EXTS = ["png", "jpg", "jpeg", "bmp", "dib", "eps", "gif", "ppm", "pbm", "pgm", "pnm", "webp"]
const SCRIPT_VERSION = "0.1.0"

export class LocalModel implements Model {
    client: LatexOCRClient
    serverProcess: ChildProcess;
    last_download_update: string;
    plugin_settings: LatexOCRSettings;
    statusCheckIntervalLoading = 300;
    statusCheckIntervalReady = 5000;

    constructor(settings: LatexOCRSettings) {
        this.plugin_settings = settings
    }

    reloadSettings(settings: LatexOCRSettings) {
        this.plugin_settings = settings
    }

    async load() {
        // RPC Client
        console.log(`latex_ocr: initializing RPC client at port ${this.plugin_settings.port}`)
        this.client = new LatexOCRClient(`localhost:${this.plugin_settings.port}`, grpc.credentials.createInsecure())
    }

    unload() {
        // shutdown server
        if (this.serverProcess) {
            this.serverProcess.kill()
        }
    }

    async imgfileToLatex(filepath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const file = path.parse(filepath)
            const debug = this.plugin_settings.debug

            // Enhanced debugging
            if (debug) {
                console.log(`latex_ocr: Processing image at path: ${filepath}`)
                console.log(`latex_ocr: Parsed file info:`, file)
            }

            if (!IMG_EXTS.contains(file.ext.substring(1))) {
                reject(`Unsupported image extension ${file.ext}`)
                return
            }

            // Check if file exists and is readable
            const fs = require('fs')
            try {
                if (!fs.existsSync(filepath)) {
                    reject(`Image file does not exist: ${filepath}`)
                    return
                }
                const stats = fs.statSync(filepath)
                if (debug) {
                    console.log(`latex_ocr: File size: ${stats.size} bytes`)
                }
                if (stats.size === 0) {
                    reject(`Image file is empty: ${filepath}`)
                    return
                }
            } catch (fileErr) {
                reject(`Cannot access image file: ${fileErr}`)
                return
            }

            const notice = new Notice(`⚙️ Generating Latex for ${file.base}...`, 0);
            const d = this.plugin_settings.delimiters;

            if (debug) {
                console.log(`latex_ocr: Sending gRPC request with imagePath: ${filepath}`)
            }

            this.client.generateLatex({ imagePath: filepath }, async function (err, latex) {
                if (debug) {
                    console.log(`latex_ocr: gRPC callback received`)
                    console.log(`latex_ocr: Error:`, err)
                    console.log(`latex_ocr: Response:`, latex)
                }

                if (err) {
                    if (debug) {
                        console.error(`latex_ocr: Full gRPC error details:`, {
                            code: err.code,
                            details: err.details,
                            message: err.message,
                            metadata: err.metadata
                        })
                    }
                    reject(`Error getting response from latex_ocr_server: ${err}`)
                } else {
                    if (debug) {
                        console.log(`latex_ocr_server response: ${latex?.latex}`);
                    }
                    if (latex && latex.latex) {
                        const result = `${d}${latex.latex}${d}`;
                        resolve(result);
                    } else {
                        reject(`Server returned empty or invalid response: ${JSON.stringify(latex)}`)
                    }
                }
                setTimeout(() => notice.hide(), 1000)
            });
        })
    }

    status() {
        const timeout_msecs = 200;
        const timeout = new Date(new Date().getTime() + timeout_msecs);

        return new Promise<{ status: Status, msg: string }>((resolve, reject) => this.client.waitForReady(timeout, (err) => {
            if (err) {
                this.checkPythonInstallation().then(() => {
                    resolve({ status: Status.Unreachable, msg: `The server wasn't reachable before the deadline (${timeout_msecs}ms)` })
                }).catch((pyerr) =>
                    resolve({ status: Status.Misconfigured, msg: pyerr.message })
                )

            } else {
                this.client.isReady({}, (err, reply) => {
                    if (reply?.isReady) {
                        resolve({ status: Status.Ready, msg: "Server ready" })
                    } else {
                        if (this.last_download_update) {
                            resolve({ status: Status.Downloading, msg: `The server is still downloading the model: ${this.last_download_update}` })
                        } else {
                            resolve({ status: Status.Loading, msg: "The server is still loading the model" })
                        }
                    }
                });
            }
        }));
    }


    // Check if the user specified pythonPath is working,
    // and check if the required libraries can be imported using a test script
    checkPythonInstallation() {
        return new Promise<void>(
            (resolve, reject) => {
                const pythonProcess = spawn(this.plugin_settings.pythonPath, ["-m", "latex_ocr_server", "--version"])

                pythonProcess.stdout.on('data', data => {
                    const [prog, version] = data.toString().split(" ")
                    if (this.plugin_settings.debug) {
                        console.log(`${prog} version ${version} (min version: ${SCRIPT_VERSION})`)
                    }
                })
                pythonProcess.stderr.on('data', data => {
                    if (this.plugin_settings.debug) {
                        console.error(data.toString())
                    }
                })

                pythonProcess.on('close', code => {
                    if (code === 0) {
                        resolve()
                    } else {
                        reject(new Error(`latex_ocr_server isn't installed for ${this.plugin_settings.pythonPath}`))
                    }
                })

                pythonProcess.on('error', (err) => {
                    if (err.message.includes("ENOENT")) {
                        reject(new Error(`Couldn't locate python install, please change it in the plugin settings: ${this.plugin_settings.pythonPath}`))
                    } else {
                        reject(new Error(`${err}`))
                    }

                })
            })
    }

    // Start the latex_ocr_python script using user specified settings.
    // Prefer `startServer` for user feedback
    spawnLatexOcrServer(port: string): Promise<ChildProcess> {
        return new Promise<ChildProcess>((resolve, reject) => {
            const args = [
                "-m", "latex_ocr_server",
                "start",
                "-d",
                "--port", port,
                "--cache_dir", this.plugin_settings.cacheDirPath]

            if (this.plugin_settings.debug) {
                console.log(`Starting server with the following command: \n${this.plugin_settings.pythonPath, args}`)
            }
            const pythonProcess = spawn(this.plugin_settings.pythonPath, args)

            pythonProcess.on('spawn', () => {
                console.log(`latex_ocr_server: spawned`)
                resolve(pythonProcess)
            })
            pythonProcess.on('error', (err) => {
                reject(err)
            })

            pythonProcess.stdout.on('data', data => {
                if (data.toString().toLowerCase().includes("downloading")) {
                    this.last_download_update = data.toString()
                }
                if (this.plugin_settings.debug) {
                    console.log(`latex_ocr_server: ${data.toString()}`)
                }
            })
            pythonProcess.stderr.on('data', data => {
                if (data.toString().toLowerCase().includes("downloading")) {
                    this.last_download_update = data.toString()
                }
                if (this.plugin_settings.debug) {
                    console.error(`latex_ocr_server: ${data.toString()}`)
                }
            })

            pythonProcess.on('close', code => {
                console.log(`latex_ocr_server: closed (${code})`)
            })

        })
    }

    // Start the server process. If it fails, try to see if python is working.
    async start() {
        console.log("latex_ocr_server: starting local server")
        try {
            this.serverProcess = await this.spawnLatexOcrServer(this.plugin_settings.port)
        } catch (err) {
            console.error(err)
            this.checkPythonInstallation().then(() => {
                new Notice(`❌ ${err}`, 10000)
            }).catch((pythonErr) => {
                new Notice(`❌ ${pythonErr}`, 10000)
                console.error(pythonErr)
            })
        }
    }
}