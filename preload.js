const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("asta", {
    navigate: url => ipcRenderer.send("navigate", url),
    onURLChange: cb => ipcRenderer.on("load-url", (_, u) => cb(u)),
    
    // AI Chat with page context
    sendAIMessage: (message, pageContext) => ipcRenderer.send("ai-chat", { message, pageContext }),
    onAIResponse: (cb) => ipcRenderer.on("ai-response", (_, response) => cb(response)),
    onAIAction: (cb) => ipcRenderer.on("ai-action", (_, action) => cb(action)),
    onAIError: (cb) => ipcRenderer.on("ai-error", (_, error) => cb(error)),
    onExecuteAction: (cb) => ipcRenderer.on("execute-action", (_, action) => cb(action))
});
