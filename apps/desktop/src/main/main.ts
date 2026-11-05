import { app, BrowserWindow, Menu, ipcMain } from "electron";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "FlowOS — AI-Powered Cloud ERP",
    backgroundColor: "#020617", // Match bg-slate-950
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../../web/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setupMenu();
}

function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Application",
      submenu: [
        { label: "About FlowOS", role: "about" },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => { app.quit(); } }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { role: "close" }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
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

// Native API handlers for preload bridge
ipcMain.handle("get-system-info", () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    chromeVersion: process.versions.chrome,
    electronVersion: process.versions.electron,
  };
});
