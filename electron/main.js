const { app, BrowserWindow, Menu, protocol, net, shell, dialog, ipcMain, clipboard, nativeImage } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')

// Ubuntu 24.04 (and other distros with strict seccomp/userns policies) block
// the unprivileged user-namespace creation that Chrome's sandbox relies on.
// Disabling the sandbox here lets the app run without requiring a setuid
// helper or a sysctl change from the user.
app.commandLine.appendSwitch('no-sandbox')
// Electron's GPU process can fail silently on some Linux GPU drivers,
// leaving a blank window. Ketcher is SVG-based and doesn't need GPU acceleration.
app.commandLine.appendSwitch('disable-gpu')

// Must be called before app is ready — makes app:// behave like https://
// (standard URL resolution, secure context, WASM allowed, fetch API).
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}])

// In packaged app, Ketcher's built SPA lives in extraResources/ketcher-dist.
// In dev, it lives at ketcher/example/dist relative to project root.
function getKetcherDist() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ketcher-dist')
  }
  return path.join(__dirname, '..', 'ketcher', 'example', 'dist')
}

function registerAppProtocol() {
  const distRoot = getKetcherDist()

  // Register a custom 'app' protocol so that absolute asset paths like
  // /assets/main-xxx.js (produced by Vite) resolve correctly under file://.
  protocol.handle('app', (request) => {
    let filePath = request.url.slice('app://localhost'.length)
    if (!filePath || filePath === '/') filePath = '/index.html'
    const fullPath = path.join(distRoot, filePath)
    return net.fetch(url.pathToFileURL(fullPath).href)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Ketcher Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow WASM execution
      webSecurity: true,
    },
  })

  // standalone mode: self-contained WASM build, no remote server needed
  win.loadURL('app://localhost/standalone/index.html')

  // Augment clipboard copies with a chosen format (PNG/SVG/Molfile) so
  // molecules paste usefully in non-chemistry apps too. png-export.js and
  // copy-format-menu.js must run first — they define the shared PNG rasterizer
  // and the format-selector dropdown that clipboard-augment.js builds on.
  const injectedScripts = ['png-export.js', 'copy-format-menu.js', 'clipboard-augment.js']
    .map((file) => fs.readFileSync(path.join(__dirname, file), 'utf8'))
  win.webContents.on('did-finish-load', () => {
    for (const script of injectedScripts) {
      win.webContents.executeJavaScript(script).catch(() => {})
    }
  })

  // Open external links in the system browser instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url: href }) => {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      shell.openExternal(href)
    }
    return { action: 'deny' }
  })

  // Prompt before closing if the canvas has content.
  win.on('close', async (e) => {
    e.preventDefault()

    let hasContent = false
    try {
      hasContent = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            if (!window.ketcher) return false
            const smiles = await window.ketcher.getSmiles()
            return typeof smiles === 'string' && smiles.trim() !== ''
          } catch (_) {
            return false
          }
        })()
      `)
    } catch (_) {
      // Page not loaded or renderer crashed — allow close
    }

    if (!hasContent) {
      win.destroy()
      return
    }

    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Close anyway', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: 'The editor has unsaved changes.',
      detail: 'Close without saving?',
    })

    if (response === 0) win.destroy()
  })
}

// Renderer sends { format: 'png'|'svg'|'molfile', data } after Ketcher's
// copyOrCutComplete, carrying exactly the one format currently selected in
// the copy-format dropdown. Only one format is ever written to the clipboard
// at a time — writing several at once is unreliable, since not every app
// picks the richest available format (some apps grab plain text over an
// image when both are present).
//
// PNG uses clipboard.writeBuffer directly so the raw bytes (with the pHYs DPI
// chunk already baked in by png-export.js) reach the clipboard unchanged.
// nativeImage.createFromBuffer + clipboard.write({image}) would re-encode the
// PNG from pixels, stripping the pHYs chunk and making LibreOffice/Word
// ignore the DPI metadata that controls paste size.
ipcMain.handle('clipboard-write', (_event, { format, data }) => {
  try {
    if (format === 'png') {
      clipboard.writeBuffer('image/png', Buffer.from(data))
    } else if (format === 'svg') {
      clipboard.writeBuffer('image/svg+xml', Buffer.from(data, 'utf8'))
    } else if (format === 'molfile') {
      clipboard.writeText(data)
    }
  } catch (e) {
    console.warn('[Ketcher Desktop] clipboard-write failed:', e.message)
  }
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerAppProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
