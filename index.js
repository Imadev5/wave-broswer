const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { chatWithAI } = require("./ai-handler");

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1300,
        height: 900,
        title: "Asta Browser",
        icon: "./assets/asta-logo.png",
        backgroundColor: "#111",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            webviewTag: true,
            nodeIntegration: false
        }
    });

    win.loadFile("index.html");

    setupRewriteRules();
    setupIPC();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());


// ======================================================================
// 1. SETUP WEB REQUEST HANDLERS
// ======================================================================
function setupRewriteRules() {
    // Set Windows 10 Chrome user agent
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    session.defaultSession.setUserAgent(userAgent);

    // Set user agent for webviews
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = userAgent;
        callback({ requestHeaders: details.requestHeaders });
    });

    // ==================================================================
    // BLOCK BRAVE LOGOS + AUTO-REPLACE THEM
    // ==================================================================
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const res = details.responseHeaders;

        const isBraveLogo =
            details.url.includes("brave-logo") ||
            details.url.includes("brave-logo-light") ||
            details.url.includes("brave-logo-small");

        if (isBraveLogo) {
            delete res["content-security-policy"];

            callback({
                redirectURL: "file://" + path.join(__dirname, "assets/asta-logo.svg")
            });
            return;
        }

        callback({ cancel: false, responseHeaders: res });
    });
}


// ======================================================================
// MEMORY SYSTEM
// ======================================================================
const memoryPath = path.join(__dirname, "memory.json");

function loadMemory() {
    try {
        if (fs.existsSync(memoryPath)) {
            const data = fs.readFileSync(memoryPath, "utf8");
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading memory:", e);
    }
    return { conversations: [] };
}

function saveMemory(memory) {
    try {
        fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    } catch (e) {
        console.error("Error saving memory:", e);
    }
}

function addToMemory(userMessage, aiResponse) {
    const memory = loadMemory();
    memory.conversations.push({
        timestamp: new Date().toISOString(),
        user: userMessage,
        assistant: aiResponse
    });
    
    // Keep only last 50 conversations
    if (memory.conversations.length > 50) {
        memory.conversations = memory.conversations.slice(-50);
    }
    
    saveMemory(memory);
}

// ======================================================================
// 3. IPC FOR NAVIGATION FROM index.html
// ======================================================================
function setupIPC() {
    ipcMain.on("navigate", (_e, url) => {
        const webview = win.webContents;
        
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        // Send to renderer to update webview
        webview.send("load-url", url);
    });

    // AI Chat Handler with page context and memory
    ipcMain.on("ai-chat", async (event, { message, pageContext }) => {
        try {
            // Load conversation memory
            const memory = loadMemory();
            
            const fullResponse = await chatWithAI(message, pageContext, memory);

            // Save to memory
            addToMemory(message, fullResponse);

            // Parse response for mixed JSON + text
            const parsed = parseAIResponse(fullResponse);
            
            // Send text response if any
            if (parsed.text) {
                event.reply("ai-response", parsed.text);
            }
            
            // Send actions if any (can be multiple)
            if (parsed.actions.length > 0) {
                parsed.actions.forEach(action => {
                    event.reply("ai-action", action);
                });
            }
            
            // If no text and no actions, send the raw response
            if (!parsed.text && parsed.actions.length === 0) {
                event.reply("ai-response", fullResponse);
            }
        } catch (error) {
            event.reply("ai-error", error.message);
        }
    });

    // Clear memory
    ipcMain.on("clear-memory", () => {
        saveMemory({ conversations: [] });
    });
}

// Parse AI response to extract JSON actions and plain text
function parseAIResponse(response) {
    const actions = [];
    let text = response;
    
    // Find all JSON objects in the response
    const jsonRegex = /\{[^{}]*"action"[^{}]*\}/g;
    const matches = response.match(jsonRegex);
    
    if (matches) {
        matches.forEach(match => {
            try {
                const action = JSON.parse(match);
                if (action.action) {
                    actions.push(action);
                    // Remove the JSON from the text
                    text = text.replace(match, '').trim();
                }
            } catch (e) {
                // Invalid JSON, skip
            }
        });
    }
    
    return { text, actions };
}


