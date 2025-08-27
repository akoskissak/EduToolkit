const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  generateHTML: (data) => ipcRenderer.invoke("generate-html", data),
  saveHTML: (html, title) => ipcRenderer.invoke("save-html", { html, title }),
  zipHTML: () => ipcRenderer.invoke("zip-html"),
});
