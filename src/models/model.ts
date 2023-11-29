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
    load: () => void;
    unload: () => void;

    imgfileToLatex: (filepath: PathLike) => Promise<string>

    status: () => Promise<[Status, string]>;

    reloadSettings: (settings: LatexOCRSettings) => void;
}