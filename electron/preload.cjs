const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openGuild", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getApiBaseUrl: () => ipcRenderer.invoke("app:get-api-base-url")
});
