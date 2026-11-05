import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
});
