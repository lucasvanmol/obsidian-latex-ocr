// eslint-disable-next-line @typescript-eslint/no-var-requires
const Electron = require('electron')

const {
    remote: { safeStorage }
} = Electron

export default safeStorage;