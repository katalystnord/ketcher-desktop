const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron')
const path = require('path')
const url = require('url')

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

  // Open external links in the system browser instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url: href }) => {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      shell.openExternal(href)
    }
    return { action: 'deny' }
  })
}

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
