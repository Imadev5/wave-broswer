// ======================================================================
// TAB MANAGEMENT
// ======================================================================
let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;

const tabsBar = document.getElementById("tabs-bar");
const newTabBtn = document.getElementById("new-tab-btn");
const webviewsContainer = document.getElementById("webviews-container");
const urlbar = document.getElementById("urlbar");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const refreshBtn = document.getElementById("refresh-btn");
const homeBtn = document.getElementById("home-btn");

function createTab(url = "asta-home.html") {
    const tabId = tabIdCounter++;
    
    // Create tab element
    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <span class="tab-favicon">🌐</span>
        <span class="tab-title">New Tab</span>
        <button class="tab-close">×</button>
    `;
    
    // Create webview wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "webview-wrapper";
    wrapper.dataset.tabId = tabId;
    
    const webview = document.createElement("webview");
    webview.src = url;
    webview.setAttribute("allowpopups", "");
    wrapper.appendChild(webview);
    webviewsContainer.appendChild(wrapper);
    
    // Insert tab before new tab button
    tabsBar.insertBefore(tabEl, newTabBtn);
    
    // Setup webview events
    setupWebviewEvents(webview, tabId);
    
    // Tab click
    tabEl.addEventListener("click", (e) => {
        if (!e.target.classList.contains("tab-close")) {
            switchToTab(tabId);
        }
    });
    
    // Close button
    tabEl.querySelector(".tab-close").addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });
    
    tabs.push({ id: tabId, element: tabEl, wrapper, webview, url });
    switchToTab(tabId);
    
    return tabId;
}

function switchToTab(tabId) {
    activeTabId = tabId;
    
    tabs.forEach(tab => {
        if (tab.id === tabId) {
            tab.element.classList.add("active");
            tab.wrapper.classList.add("active");
            updateNavButtons(tab.webview);
            updateUrlBar(tab.webview);
        } else {
            tab.element.classList.remove("active");
            tab.wrapper.classList.remove("active");
        }
    });
}

function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = tabs[tabIndex];
    tab.element.remove();
    tab.wrapper.remove();
    tabs.splice(tabIndex, 1);
    
    if (tabs.length === 0) {
        createTab();
    } else if (tab.id === activeTabId) {
        const newActiveTab = tabs[Math.max(0, tabIndex - 1)];
        switchToTab(newActiveTab.id);
    }
}

function getActiveTab() {
    return tabs.find(t => t.id === activeTabId);
}

function getActiveWebview() {
    const tab = getActiveTab();
    return tab ? tab.webview : null;
}

function updateTabTitle(tabId, title) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        const titleEl = tab.element.querySelector(".tab-title");
        titleEl.textContent = title || "New Tab";
    }
}

function setupWebviewEvents(webview, tabId) {
    webview.addEventListener("dom-ready", () => {
        if (tabId === activeTabId) {
            updateNavButtons(webview);
        }
        
        // Only hide Brave logos
        const currentUrl = webview.getURL();
        if (currentUrl.includes('search.brave.com')) {
            const css = `
                /* Hide ONLY Brave logos */
                img[src*="brave-logo"],
                img[alt*="Brave logo"],
                img[title*="Brave"],
                .logo[src*="brave"] {
                    display: none !important;
                }
            `;
            webview.insertCSS(css);
        }
        
        // Replace Brave text with Asta
        const replaceScript = `
            (function() {
                function replaceText(node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = node.textContent.replace(/Brave/gi, 'Asta');
                    } else {
                        for (let child of node.childNodes) {
                            replaceText(child);
                        }
                    }
                }
                
                replaceText(document.body);
                
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                                replaceText(node);
                            }
                        });
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                if (document.title.includes('Brave')) {
                    document.title = document.title.replace(/Brave/gi, 'Asta');
                }
                
                document.querySelectorAll('meta[content*="Brave"]').forEach(meta => {
                    meta.content = meta.content.replace(/Brave/gi, 'Asta');
                });
            })();
        `;
        webview.executeJavaScript(replaceScript);
    });
    
    webview.addEventListener("did-navigate", () => {
        if (tabId === activeTabId) {
            updateUrlBar(webview);
            updateNavButtons(webview);
        }
    });
    
    webview.addEventListener("did-navigate-in-page", () => {
        if (tabId === activeTabId) {
            updateUrlBar(webview);
            updateNavButtons(webview);
        }
    });
    
    webview.addEventListener("page-title-updated", (e) => {
        updateTabTitle(tabId, e.title);
    });
}

// ======================================================================
// NAVIGATION CONTROLS
// ======================================================================
backBtn.addEventListener("click", () => {
    const webview = getActiveWebview();
    if (webview && webview.canGoBack()) {
        webview.goBack();
    }
});

forwardBtn.addEventListener("click", () => {
    const webview = getActiveWebview();
    if (webview && webview.canGoForward()) {
        webview.goForward();
    }
});

refreshBtn.addEventListener("click", () => {
    const webview = getActiveWebview();
    if (webview) {
        webview.reload();
    }
});

homeBtn.addEventListener("click", () => {
    const webview = getActiveWebview();
    if (webview) {
        webview.src = "asta-home.html";
    }
});

newTabBtn.addEventListener("click", () => {
    createTab();
});

function updateNavButtons(webview) {
    if (!webview) return;
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
}

function updateUrlBar(webview) {
    if (!webview) return;
    let url = webview.getURL();
    
    // Replace search.brave.com with search.asta
    url = url.replace(/search\.brave\.com/g, 'search.asta');
    
    urlbar.value = url;
}

// Handle URL bar input
urlbar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        let url = urlbar.value.trim();
        const webview = getActiveWebview();
        if (!webview) return;
        
        // If it looks like a search query, use Brave Search
        if (!url.includes(".") && !url.startsWith("http")) {
            url = `https://search.brave.com/search?q=${encodeURIComponent(url)}`;
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        webview.src = url;
    }
});

// ======================================================================
// AI SIDEBAR
// ======================================================================
const aiToggle = document.getElementById("ai-toggle");
const aiSidebar = document.getElementById("ai-sidebar");
const aiMessages = document.getElementById("ai-messages");
const aiInput = document.getElementById("ai-input");
const aiClose = document.getElementById("ai-close");

aiToggle.addEventListener("click", () => {
    aiSidebar.classList.toggle("open");
});

aiClose.addEventListener("click", () => {
    aiSidebar.classList.remove("open");
});

function addMessage(content, role) {
    const msg = document.createElement("div");
    msg.className = `ai-message ${role}`;
    // Support newlines by converting to <br> tags
    msg.innerHTML = content.replace(/\n/g, '<br>');
    aiMessages.appendChild(msg);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return msg;
}

async function getPageContext() {
    const webview = getActiveWebview();
    if (!webview) return null;
    
    try {
        const context = await webview.executeJavaScript(`
            (function() {
                try {
                    return {
                        title: document.title,
                        url: window.location.href,
                        text: document.body.innerText.substring(0, 2000),
                        htmlSnippet: document.documentElement.outerHTML.substring(0, 3000)
                    };
                } catch (e) {
                    return { title: '', url: '', text: '', htmlSnippet: '' };
                }
            })()
        `);
        return context;
    } catch (e) {
        return null;
    }
}

// Listen for AI response (set up once)
window.asta.onAIResponse((response) => {
    const lastMsg = aiMessages.lastElementChild;
    if (lastMsg && lastMsg.textContent === "Thinking...") {
        lastMsg.remove();
    }
    
    addMessage(response, "assistant");
});

// Listen for AI actions (set up once)
window.asta.onAIAction((action) => {
    executeAction(action);
});

// Listen for AI errors (set up once)
window.asta.onAIError((error) => {
    addMessage(`Error: ${error}`, "assistant");
});

aiInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const message = aiInput.value.trim();
        if (!message) return;

        addMessage(message, "user");
        aiInput.value = "";
        addMessage("Thinking...", "assistant");

        const pageContext = await getPageContext();
        window.asta.sendAIMessage(message, pageContext);
    }
});

async function executeAction(action) {
    const webview = getActiveWebview();
    if (!webview) return;
    
    try {
        switch (action.action) {
            case "navigate":
                let url = action.url;
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "https://" + url;
                }
                webview.src = url;
                addMessage(`✓ Navigated to ${url}`, "assistant");
                break;

            case "search":
                const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(action.query)}`;
                webview.src = searchUrl;
                addMessage(`✓ Searching for: ${action.query}`, "assistant");
                break;

            case "click":
                await webview.executeJavaScript(`
                    (function() {
                        const el = document.querySelector('${action.selector}');
                        if (el) {
                            el.click();
                            return true;
                        }
                        return false;
                    })()
                `).then(success => {
                    if (success) {
                        addMessage(`✓ Clicked: ${action.description || action.selector}`, "assistant");
                    } else {
                        addMessage(`✗ Element not found: ${action.selector}`, "assistant");
                    }
                });
                break;

            case "type":
                await webview.executeJavaScript(`
                    (function() {
                        const el = document.querySelector('${action.selector}');
                        if (el) {
                            el.value = '${action.text.replace(/'/g, "\\'")}';
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            return true;
                        }
                        return false;
                    })()
                `).then(success => {
                    if (success) {
                        addMessage(`✓ Typed into: ${action.selector}`, "assistant");
                    } else {
                        addMessage(`✗ Input not found: ${action.selector}`, "assistant");
                    }
                });
                break;

            case "fill-form":
                for (const field of action.fields) {
                    await webview.executeJavaScript(`
                        (function() {
                            const el = document.querySelector('${field.selector}');
                            if (el) {
                                el.value = '${field.value.replace(/'/g, "\\'")}';
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        })()
                    `);
                }
                addMessage(`✓ Filled ${action.fields.length} form fields`, "assistant");
                break;

            case "scroll":
                await webview.executeJavaScript(`
                    window.scrollBy(0, ${action.direction === 'down' ? action.amount : -action.amount})
                `);
                addMessage(`✓ Scrolled ${action.direction}`, "assistant");
                break;

            case "read-page":
                const content = await webview.executeJavaScript(`
                    (function() {
                        try {
                            return {
                                title: document.title,
                                url: window.location.href,
                                text: document.body.innerText,
                                links: Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => ({text: a.innerText, href: a.href}))
                            };
                        } catch (e) {
                            return { title: '', url: '', text: '', links: [] };
                        }
                    })()
                `);
                addMessage(`Page: ${content.title}\n\nContent:\n${content.text.substring(0, 500)}...`, "assistant");
                break;

            case "find-text":
                const found = await webview.executeJavaScript(`
                    (function() {
                        const text = '${action.text}';
                        const found = document.body.innerText.includes(text);
                        if (found) {
                            window.find(text);
                        }
                        return found;
                    })()
                `);
                addMessage(found ? `✓ Found: "${action.text}"` : `✗ Not found: "${action.text}"`, "assistant");
                break;

            case "execute-js":
                await webview.executeJavaScript(action.code)
                    .then((result) => {
                        addMessage(`✓ Executed JavaScript${result ? ': ' + JSON.stringify(result) : ''}`, "assistant");
                    })
                    .catch((err) => {
                        addMessage(`✗ Error: ${err.message}`, "assistant");
                    });
                break;

            case "get-element":
                const elementInfo = await webview.executeJavaScript(`
                    (function() {
                        const el = document.querySelector('${action.selector}');
                        if (el) {
                            return {
                                tag: el.tagName,
                                text: el.innerText?.substring(0, 100),
                                html: el.innerHTML?.substring(0, 200),
                                attributes: Array.from(el.attributes).map(a => ({name: a.name, value: a.value}))
                            };
                        }
                        return null;
                    })()
                `);
                if (elementInfo) {
                    addMessage(`Element: ${elementInfo.tag}\nText: ${elementInfo.text}`, "assistant");
                } else {
                    addMessage(`✗ Element not found: ${action.selector}`, "assistant");
                }
                break;

            case "wait":
                addMessage(`⏳ Waiting for: ${action.selector}`, "assistant");
                setTimeout(async () => {
                    const exists = await webview.executeJavaScript(`
                        !!document.querySelector('${action.selector}')
                    `);
                    addMessage(exists ? `✓ Element appeared` : `✗ Timeout waiting for element`, "assistant");
                }, action.timeout || 3000);
                break;

            case "go-back":
                if (webview.canGoBack()) {
                    webview.goBack();
                    addMessage(`✓ Went back`, "assistant");
                }
                break;

            case "go-forward":
                if (webview.canGoForward()) {
                    webview.goForward();
                    addMessage(`✓ Went forward`, "assistant");
                }
                break;

            case "view-source":
                const sourceCode = await webview.executeJavaScript(`
                    (function() {
                        try {
                            return {
                                html: document.documentElement.outerHTML,
                                buttons: Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).map(el => ({
                                    tag: el.tagName,
                                    text: el.innerText || el.value || el.getAttribute('aria-label'),
                                    classes: el.className,
                                    id: el.id,
                                    type: el.type
                                })).slice(0, 20)
                            };
                        } catch (e) {
                            return { html: '', buttons: [] };
                        }
                    })()
                `);
                
                // Show buttons info
                let buttonsInfo = "Clickable elements found:\n";
                sourceCode.buttons.forEach((btn, i) => {
                    buttonsInfo += `${i + 1}. ${btn.tag} - "${btn.text}" (class: ${btn.classes || 'none'}, id: ${btn.id || 'none'})\n`;
                });
                
                addMessage(buttonsInfo + `\nFull HTML (${sourceCode.html.length} chars)`, "assistant");
                break;

            case "screenshot":
                addMessage(`📸 Screenshot feature coming soon`, "assistant");
                break;

            default:
                addMessage(`Unknown action: ${action.action}`, "assistant");
        }
    } catch (error) {
        addMessage(`✗ Error: ${error.message}`, "assistant");
    }
}

window.asta.onExecuteAction((action) => {
    executeAction(action);
});

// Initialize with first tab
createTab();