import LatexOCR from "main";
import { Status } from "./models/model";


export class StatusBar {
    span: HTMLSpanElement;
    plugin: LatexOCR;
    private started: boolean;
    private should_stop: boolean;

    constructor(plugin: LatexOCR) {
        this.plugin = plugin;
        this.span = plugin.addStatusBarItem();
        this.span.createEl("span", { text: "LatexOCR ❌" });
        this.updateStatusBar();
        if (!plugin.settings.showStatusBar) {
            this.hide();
        }
        this.should_stop = false;
        this.startStatusBar();
    }

    // Update the status bar based on the connection to the LatexOCR server
    // ✅: LatexOCR is up and accepting requests
    // 🌐: LatexOCR is downloading the model from huggingface
    // ⚙️: LatexOCR is loading the model
    // ❌: LatexOCR isn't reachable
    async updateStatusBar(): Promise<{ status: Status; msg: string; }> {
        const status = await this.plugin.model.status();
        console.debug(`latex_ocr: sent status check to ${this.plugin.model.constructor.name}, got ${JSON.stringify(status)}`);

        switch (status.status) {
            case Status.Ready:
                this.span.setText("LatexOCR ✅");
                break;

            case Status.Downloading:
                this.span.setText("LatexOCR 🌐");
                break;

            case Status.Loading:
                this.span.setText("LatexOCR ⚙️");
                break;

            case Status.Misconfigured:
                this.span.setText("LatexOCR 🔧");
                break;

            case Status.Unreachable:
                this.span.setText("LatexOCR ❌");
                break;

            default:
                console.debug(status);
                break;
        }
        return status;
    }

    // Call `updateStatusBar` periodically based on the returned status.
    // This function halts when `this.stopped` is True.
    //
    // This function should only be called once.
    private async startStatusBar() {
        if (this.started) {
            console.error("Attempted to start status bar when already started");
            return
        }
        let prevStatus = { status: Status.Loading, msg: "" };
        let loadingSleepTime = this.plugin.model.statusCheckIntervalReady;

        this.started = true;
        while (!this.should_stop) {
            const status = await this.updateStatusBar();
            prevStatus = status;

            if (status.status === Status.Ready) {
                await sleep(this.plugin.model.statusCheckIntervalReady);
            } else {
                if (status.status === prevStatus.status
                    && status.msg === prevStatus.msg) {
                    // slowly increase sleep time between messages
                    loadingSleepTime = Math.min(
                        loadingSleepTime * 2,
                        this.plugin.model.statusCheckIntervalReady * 2
                    );
                } else {
                    // reset the sleep time if the status has updated
                    loadingSleepTime = this.plugin.model.statusCheckIntervalLoading;
                }
                await sleep(loadingSleepTime);
            }
        }
        this.started = false;
    }


    hide() {
        this.span.hide();
    }

    show() {
        this.span.show();
    }

    stop() {
        this.should_stop = true;
    }
}
