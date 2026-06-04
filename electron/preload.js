// contextBridge can expose Node/Electron APIs to the renderer here if needed.
// Ketcher's standalone mode is fully browser-side (WASM), so nothing is
// required for basic operation.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('ketcherDesktop', {
  platform: process.platform,
  version: process.env.npm_package_version || '',
})
