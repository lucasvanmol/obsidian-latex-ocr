declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        electron: any;
    }
}

export async function picker(
    message: string,
    properties: string[]
) {
    const dirPath: string[] = window.electron.remote.dialog.showOpenDialogSync({
        title: message,
        properties
    });
    if (properties.includes("multiSelections")) return dirPath
    else return dirPath[0];
}