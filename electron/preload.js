const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ketcherDesktop', {
  platform: process.platform,
  version: process.env.npm_package_version || '',
  // Write a PNG blob to the native clipboard via the main process.
  // navigator.clipboard.write() on Linux X11 silently drops image/png when
  // custom 'web ' MIME types are present in the same ClipboardItem.
  copyImageToClipboard: (pngArrayBuffer, html) =>
    ipcRenderer.invoke('clipboard-write-image', pngArrayBuffer, html),
})
