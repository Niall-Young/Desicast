import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("desicast", {
  call: (method: string, input?: unknown) =>
    ipcRenderer.invoke("desicast:call", method, input),
});
