import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("iconcast", {
  call: (method: string, input?: unknown) =>
    ipcRenderer.invoke("iconcast:call", method, input),
});
