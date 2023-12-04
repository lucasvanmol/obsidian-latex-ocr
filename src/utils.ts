declare global {
    interface Window {
        electron: any;
    }
}

export async function picker(
    message: string,
    properties: string[]
) {
    let dirPath: string[]
    dirPath = window.electron.remote.dialog.showOpenDialogSync({
        title: message,
        properties
    });
    if (properties.includes("multiSelections")) return dirPath
    else return dirPath[0];
}