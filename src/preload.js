// preload.js — Secure context bridge for Chanalysis
// Currently the app uses the browser's native FileReader for file parsing.
// This preload sets up a secure bridge so that if you later decide to use
// Node's `fs` module for file reading, you can expose it here safely.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chanalysis', {
  // ── Platform Info ──────────────────────────────────────────────────────
  platform: process.platform,

  // ── File System (Future Use) ───────────────────────────────────────────
  // Uncomment and implement when migrating from FileReader to Node fs:
  //
  // readFile: (filePath) => ipcRenderer.invoke('dialog:readFile', filePath),
  // openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  // ── IPC Helpers (Future Use) ───────────────────────────────────────────
  // Generic send/receive pattern for main ↔ renderer communication:
  //
  // send: (channel, data) => {
  //   const validChannels = ['file:open', 'file:save', 'app:quit'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.send(channel, data);
  //   }
  // },
  // receive: (channel, callback) => {
  //   const validChannels = ['file:opened', 'file:saved'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.on(channel, (event, ...args) => callback(...args));
  //   }
  // },
});
