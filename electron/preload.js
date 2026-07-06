const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ketcherDesktop', {
  platform: process.platform,
  version: process.env.npm_package_version || '',
  // Write to the native clipboard via the main process. navigator.clipboard
  // on Linux X11 silently drops image/png (and other non-text formats) when
  // custom 'web ' MIME types are present in the same ClipboardItem, so all
  // clipboard writes go through IPC instead.
  writeClipboard: (format, data) => ipcRenderer.invoke('clipboard-write', { format, data }),
})
