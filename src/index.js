// index.js — Electron Main Process for Chanalysis
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Chanalysis',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

};

// ── App Lifecycle ────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon clicked and no windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC Handlers (Future Use) ────────────────────────────────────────────
// Add ipcMain.handle() calls here when migrating file reading to Node fs.
// Example:
//
// const { ipcMain, dialog } = require('electron');
// const fs = require('node:fs/promises');
//
// ipcMain.handle('dialog:openFile', async () => {
//   const { canceled, filePaths } = await dialog.showOpenDialog({
//     properties: ['openFile'],
//     filters: [{ name: 'Chat Export', extensions: ['txt'] }],
//   });
//   if (canceled) return null;
//   return fs.readFile(filePaths[0], 'utf-8');
// });
