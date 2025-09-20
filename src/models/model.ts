import { PathLike } from "fs";
import { LatexOCRSettings } from "main";

export enum Status {
    Ready,
    Loading,
    Downloading,
    Unreachable,
    Misconfigured
}

export default interface Model {
    // Interval (ms) of statusCheck message when previous message was unsuccessful
    statusCheckIntervalLoading: number;
    // Interval (ms) of statusCheck message when previous message was successful
    statusCheckIntervalReady: number;

    load: () => void;
    start: () => void;
    unload: () => void;

    imgfileToLatex: (filepath: PathLike) => Promise<string>

    status: () => Promise<{ status: Status, msg: string }>;

    reloadSettings: (settings: LatexOCRSettings) => void;
}