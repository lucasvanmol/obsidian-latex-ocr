import { PathLike } from "fs";
import LatexOCR, { LatexOCRSettings } from "main";

export enum Status {
    Ready,
    Loading,
    Downloading,
    Unreachable,
    Misconfigured
}

export class StatusBar {
    span: HTMLSpanElement;
    plugin: LatexOCR

    constructor(plugin: LatexOCR) {
        this.plugin = plugin;
        this.span = plugin.addStatusBarItem();
        this.span.createEl("span", { text: "LatexOCR ❌" });
        this.updateStatusBar()
        this.setStatusBarInterval(plugin.model.statusCheckIntervalLoading)
        if (!plugin.settings.showStatusBar) {
            this.hide()
        }
    }

    // Update the status bar based on the connection to the LatexOCR server
    // ✅: LatexOCR is up and accepting requests
    // 🌐: LatexOCR is downloading the model from huggingface
    // ⚙️: LatexOCR is loading the model
    // ❌: LatexOCR isn't reachable
    async updateStatusBar(): Promise<boolean> {
        const status = await this.plugin.model.status()
        console.log(`latex_ocr: sent status check, got ${JSON.stringify(status)}`)

        switch (status.status) {
            case Status.Ready:
                this.span.setText("LatexOCR ✅")
                return true;

            case Status.Downloading:
                this.span.setText("LatexOCR 🌐")
                break;

            case Status.Loading:
                this.span.setText("LatexOCR ⚙️")
                break;

            case Status.Misconfigured:
                this.span.setText("LatexOCR 🔧")
                break;

            case Status.Unreachable:
                this.span.setText("LatexOCR ❌")
                break;

            default:
                console.error(status)
                break;
        }
        return false
    }

    // Call `updateStatusBar` with an initial delay of `number`.
    // After this, `updateStatusBar` based on invterval values
    // Should only be called once.
    private setStatusBarInterval(time: number) {
        setTimeout(async () => {
            const ready = await this.updateStatusBar()
            if (ready) {
                this.setStatusBarInterval(this.plugin.model.statusCheckIntervalReady)
            } else {
                this.setStatusBarInterval(this.plugin.model.statusCheckIntervalLoading)
            }
        }, time)
    }

    hide() {
        this.span.hide()
    }

    show() {
        this.span.show()
    }
}

export default interface Model {
    // Interval (ms) of statusCheck message when previous message was unsuccessful
    statusCheckIntervalLoading: number;
    // Interval (ms) of statusCheck message when previous message was successful
    statusCheckIntervalReady: number;

    load: () => void;
    unload: () => void;

    imgfileToLatex: (filepath: PathLike) => Promise<string>

    status: () => Promise<{ status: Status, msg: string }>;

    reloadSettings: (settings: LatexOCRSettings) => void;
}