const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require("electron");
const path = require("node:path");
const { startLocalServer } = require("../server/local-server.cjs");

let mainWindow;
let localServer;
let apiBaseUrl = "http://127.0.0.1:4783";
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#15161b",
    title: "OpenGuild",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

async function startLocalHost() {
  process.env.OPENGUILD_DESKTOP_DATA_DIR = app.getPath("userData");
  const local = await startLocalServer({
    dataDir: path.join(app.getPath("userData"), "local-host")
  });
  localServer = local.server;
  apiBaseUrl = local.apiBaseUrl;
}

app.whenReady().then(async () => {
  nativeTheme.themeSource = "dark";
  await startLocalHost();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("app:get-api-base-url", () => apiBaseUrl);

app.on("before-quit", () => {
  localServer?.close();
});
