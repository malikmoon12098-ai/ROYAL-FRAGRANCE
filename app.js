

let pendingImage = null; // { data: base64, type: mime }

function id(name) { return document.getElementById(name); }

// Console greeting
console.log("DEV AI - Pure Keyless Mode Initializing...");

// DOM Elements
const chatMessages = id('chat-messages');
const userInput = id('user-input');
const sendBtn = id('send-btn');
const dropZone = id('drop-zone');
const folderInfo = document.querySelector('.folder-status-top');
const currentFolderName = id('current-folder-name');
const clearFolderBtn = id('clear-folder');
const dragOverlay = id('drag-overlay');

// IDE & Media Elements
const codePanelBody = id('code-panel-body');
const codePanelTabs = id('code-panel-tabs');
const openPreviewBtn = id('open-preview-btn');
const imagePreviewContainer = id('image-preview-container');
const imagePreviewImg = id('image-preview');
const removeImageBtn = id('remove-image');

// AI Status Elements
const aiStatusPill = id('ai-status-pill');
const puterStatusText = id('puter-status-text');

// Preview Modal Elements
const previewModal = id('preview-modal');
const previewFrame = id('preview-frame');
const closePreviewBtn = id('close-preview');
const refreshPreviewBtn = id('refresh-preview');

// Helper: Read a file's content directly from the project folder
const readFile = async (filename) => {
    if (!projectFolder) return null;
    try {
        const fileHandle = await projectFolder.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (e) {
        return null;
    }
};

let isPuterEnabled = false;
let projectFolder = null;
let projectFiles = [];
let chatHistory = []; 
let openFiles = {}; // { filename: content }

// Preview Handlers
const showPreview = async () => {
    let htmlContent = openFiles['index.html'];
    
    // Fallback: If not in memory, try to read from folder directly
    if (!htmlContent && projectFolder) {
        htmlContent = await readFile('index.html');
        if (htmlContent) openFiles['index.html'] = htmlContent;
    }

    if (!htmlContent) return alert("Pehle koi index.html file banayein ya load karein!");

    // ENHANCEMENT: Inline style.css for a full preview
    let cssContent = openFiles['style.css'] || await readFile('style.css');
    if (cssContent) {
        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
        } else {
            htmlContent = `<style>${cssContent}</style>` + htmlContent;
        }
    }
    
    // Use srcdoc for safer and easier integrated preview
    previewFrame.srcdoc = htmlContent;
    previewModal.classList.remove('hidden');
};

openPreviewBtn.onclick = showPreview;
closePreviewBtn.onclick = () => {
    previewModal.classList.add('hidden');
    previewFrame.srcdoc = "";
};
refreshPreviewBtn.onclick = showPreview;

// --- Puter AI Logic ---

const updateStatusUI = () => {
    if (typeof puter !== 'undefined' && puter.auth.isSignedIn()) {
        isPuterEnabled = true;
        aiStatusPill.classList.add('connected');
        puterStatusText.innerText = "Puter AI: Connected";
    } else {
        isPuterEnabled = false;
        aiStatusPill.classList.remove('connected');
        puterStatusText.innerText = "Puter AI: Not Connected (Click to Login)";
    }
};

if (typeof puter !== 'undefined') {
    aiStatusPill.onclick = async () => {
        if (!puter.auth.isSignedIn()) {
            try {
                await puter.auth.signIn();
                updateStatusUI();
            } catch (err) {
                console.error("Login failed", err);
            }
        }
    };
    updateStatusUI();
}

const callPuterAI = async (fullPrompt) => {
    if (typeof puter === 'undefined') throw new Error("Puter unavailable");
    const response = await puter.ai.chat(fullPrompt);
    return response.toString();
};

const callAI = async (prompt, typingDiv = null) => {
    const updateStatus = (text, className) => {
        if (typingDiv) {
            const p = typingDiv.querySelector('p');
            if (p) p.innerText = text;
            typingDiv.className = `message ai typing ${className}`;
        }
    };

    if (!isPuterEnabled) {
        if (typeof puter !== 'undefined' && !puter.auth.isSignedIn()) {
            await puter.auth.signIn();
            updateStatusUI();
        }
        if (!isPuterEnabled) return "Plz Puter AI se connect karein (Top Right Pill par click karein).";
    }

    updateStatus("Keyless Cloud AI (Puter)...", "status-generating");

    try {
        const historyText = truncateHistory(chatHistory.slice(-10));
        const systemInstruction = `You are DEV AI. Speak in simple ROMAN URDU.
- MUKHTASAR (SHORT) JAWAB DEIN. 
- **CRITICAL**: Code likhte waqt hamesha TRIPLE BACKTICKS (\`\`\`) istemal karein.
- Har code block ke pehle line par: // FILE: filename.ext
- Browser Apps (HTML/CSS/JS) par focus karein.
Files: ${projectFiles.join(', ')}.`;

        const fullPrompt = `${systemInstruction}\n\nRecent History:\n${historyText}\n\nUser: ${prompt}`;
        const response = await callPuterAI(fullPrompt);
        return response;
    } catch (err) {
        console.error("AI Error:", err);
        return "Afsoos! AI response mein masla aa gaya. Plz check connection.";
    }
};

// --- Core Helper Functions ---

const truncateHistory = (history) => {
    return history.map((msg, index) => {
        if (index >= history.length - 2) return msg;
        let cleanText = msg.text.replace(/```[\s\S]*?```/g, ' [Code Truncated] ');
        return { ...msg, text: cleanText };
    }).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
};

const addMessage = (role, text, skipHistory = false) => {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const html = role === 'system' ? `<p>${text}</p>` : marked.parse(text);
    div.innerHTML = html;

    const processFileCode = (rawContent, anchorElement) => {
        const codeLines = rawContent.split('\n');
        const firstLine = codeLines[0].trim();
        const match = firstLine.match(/^(?:\/\/|\/\*|<!--|<#)?\s*FILE:\s*([a-zA-Z0-9_.-/]+)/i);
        
        let filename = "";
        let cleanCode = "";

        if (match) {
            filename = match[1];
            codeLines.shift();
            cleanCode = codeLines.join('\n');
        } else {
            // Fallbacks
            if (rawContent.includes('<!DOCTYPE html') || rawContent.includes('<html')) filename = 'index.html';
            else if (rawContent.includes('{') && (rawContent.includes('margin') || rawContent.includes(':root'))) filename = 'style.css';
            else if (rawContent.includes('function') || rawContent.includes('addEventListener')) filename = 'app.js';
            else filename = 'output.txt';
            cleanCode = rawContent;
        }

        if (filename) {
            updateCodePanel(filename, cleanCode);
            const actionDiv = document.createElement('div');
            actionDiv.className = 'file-action';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-file-btn';
            saveBtn.innerHTML = `⏳ Auto-Saving...`;
            
            const triggerSave = async () => {
                const success = await writeProjectFile(filename, cleanCode);
                if (success) {
                    saveBtn.innerHTML = `✅ Auto-Saved: <strong>${filename}</strong>`;
                    saveBtn.classList.add('success');
                } else {
                    saveBtn.innerHTML = `💾 Click to Save: <strong>${filename}</strong>`;
                    saveBtn.classList.remove('success');
                }
            };
            triggerSave();
            saveBtn.onclick = async () => {
                saveBtn.disabled = true;
                saveBtn.innerText = `⏳ Saving...`;
                await triggerSave();
                saveBtn.disabled = false;
            };
            actionDiv.appendChild(saveBtn);

            if (filename.endsWith('.html')) {
                const runBtn = document.createElement('button');
                runBtn.className = 'run-btn';
                runBtn.innerHTML = `<span>🚀</span> Run Preview`;
                runBtn.onclick = () => { showFileContent(filename); showPreview(); };
                actionDiv.appendChild(runBtn);
            }

            anchorElement.parentNode.insertBefore(actionDiv, anchorElement);
            return filename;
        }
        return null;
    };
    
    if (role === 'ai') {
        const preElements = div.querySelectorAll('pre');
        const processedFiles = new Set();

        // Pass 1: Handle Standard Code Blocks
        preElements.forEach(pre => {
            const codeEl = pre.querySelector('code');
            if (codeEl) {
                const rawContent = codeEl.innerText;
                const processResult = processFileCode(rawContent, pre);
                if (processResult) processedFiles.add(processResult);
                Prism.highlightElement(codeEl);
            }
        });

        // Pass 2: Robust Detection (In case AI forgot backticks)
        // Detect "// FILE: filename" even in plain text (if not already processed)
        const fileRegex = /(?:\/\/|<!--)\s*FILE:\s*([a-zA-Z0-9_.-/]+)[\s\S]*?(?=(?:\/\/|<!--)\s*FILE:|$)/gi;
        let match;
        while ((match = fileRegex.exec(text)) !== null) {
            const filename = match[1];
            if (!processedFiles.has(filename)) {
                const fullContent = match[0];
                const codeLines = fullContent.split('\n');
                codeLines.shift(); // Remove the // FILE line
                const cleanCode = codeLines.join('\n').trim();
                
                // Add a visual hint that a file was detected
                const hint = document.createElement('div');
                hint.className = 'file-detected-hint';
                hint.innerHTML = `<span>📂</span> Detected file: <strong>${filename}</strong> (Saved)`;
                div.appendChild(hint);

                updateCodePanel(filename, cleanCode);
                writeProjectFile(filename, cleanCode);
                processedFiles.add(filename);
            }
        }
    }

    chatMessages.appendChild(div);
    requestAnimationFrame(() => {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    });

    if (!skipHistory && (role === 'user' || role === 'ai')) {
        chatHistory.push({ role, text });
        if (chatHistory.length > 30) chatHistory.shift(); 
        saveHistory();
    }
};

const updateCodePanel = (filename, content) => {
    openFiles[filename] = content;
    let tab = Array.from(codePanelTabs.children).find(t => t.dataset.file === filename);
    if (!tab) {
        tab = document.createElement('span');
        tab.className = 'tab';
        tab.dataset.file = filename;
        tab.innerText = filename;
        tab.onclick = () => showFileContent(filename);
        codePanelTabs.appendChild(tab);
    }
    showFileContent(filename);
};

const showFileContent = (filename) => {
    Array.from(codePanelTabs.children).forEach(t => t.classList.remove('active'));
    const activeTab = Array.from(codePanelTabs.children).find(t => t.dataset.file === filename);
    if (activeTab) activeTab.classList.add('active');

    const ext = filename.split('.').pop();
    const lang = ext === 'js' ? 'javascript' : ext === 'css' ? 'css' : 'html';
    codePanelBody.innerHTML = `<pre class="code-display line-numbers"><code class="language-${lang}">${escapeHTML(openFiles[filename])}</code></pre>`;
    Prism.highlightElement(codePanelBody.querySelector('code'));
    if (filename.endsWith('.html')) openPreviewBtn.style.display = 'block';
};

const resetCodeBody = () => {
    codePanelBody.innerHTML = `
        <div class="code-welcome">
            <div class="code-welcome-icon">⚡</div>
            <h2>Live Code View</h2>
            <p>Jab DEV AI code likhega, yahan nazar aayega.</p>
        </div>
    `;
    openPreviewBtn.style.display = 'none';
};

const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const writeProjectFile = async (filePath, content) => {
    if (!projectFolder) return false;
    try {
        const parts = filePath.split('/');
        const filename = parts.pop();
        let currentDir = projectFolder;
        for (const part of parts) {
            if (part && part !== '.') currentDir = await currentDir.getDirectoryHandle(part, { create: true });
        }
        const fileHandle = await currentDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        if (!projectFiles.includes(filePath)) {
            projectFiles.push(filePath);
            currentFolderName.innerText = `Folder: ${projectFolder.name} (${projectFiles.length} files)`;
        }
        return true;
    } catch (err) {
        console.error('Error writing file:', err);
        return false;
    }
};

const saveHistory = async () => {
    if (!projectFolder) return;
    try {
        const historyHandle = await projectFolder.getFileHandle('.dev_ai_history.json', { create: true });
        const writable = await historyHandle.createWritable();
        await writable.write(JSON.stringify(chatHistory, null, 2));
        await writable.close();
    } catch (e) {}
};

// --- Event Handlers ---

const loadDirectory = async (dirHandle) => {
    try {
        projectFolder = dirHandle;
        projectFiles = [];
        chatHistory = [];
        openFiles = {};
        chatMessages.innerHTML = "";
        codePanelTabs.innerHTML = '<span class="tab active">👾 DEV AI</span>';
        resetCodeBody();

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') projectFiles.push(entry.name);
        }

        // AUTO-CACHE: Try to load existing index.html for ready-preview
        const existingIndex = await readFile('index.html');
        if (existingIndex) {
            openFiles['index.html'] = existingIndex;
            updateCodePanel('index.html', existingIndex);
        }

        try {
            const hHandle = await dirHandle.getFileHandle('.dev_ai_history.json', { create: false });
            const file = await hHandle.getFile();
            const content = await file.text();
            if (content) {
                chatHistory = JSON.parse(content);
                chatHistory.forEach(msg => addMessage(msg.role, msg.text, true));
            }
        } catch (e) {}

        currentFolderName.innerText = `Folder: ${dirHandle.name} (${projectFiles.length} files)`;
        folderInfo.classList.remove('hidden');
        dropZone.classList.add('hidden');
        addMessage('system', `Mubarak ho! "${dirHandle.name}" load ho gaya hai.`);
    } catch (err) {
        console.error("Load directory error:", err);
    }
};

const handleFolderSelect = async () => {
    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await loadDirectory(dirHandle);
    } catch (err) {}
};

dropZone.addEventListener('click', handleFolderSelect);

const handleSend = async () => {
    const text = userInput.value.trim();
    if ((!text && !pendingImage) || sendBtn.disabled) return;

    sendBtn.disabled = true;
    addMessage('user', text + (pendingImage ? ' [Image Attached]' : ''));
    userInput.value = '';
    userInput.style.height = 'auto';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = '<p>Soch raha hoon...</p>';
    chatMessages.appendChild(typingDiv);

    try {
        const aiResponse = await callAI(text, typingDiv);
        typingDiv.remove();
        addMessage('ai', aiResponse);
    } catch (err) {
        typingDiv.remove();
        addMessage('ai', "Error: AI response mein masla aa gaya.");
    } finally {
        sendBtn.disabled = false;
    }
};

sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
userInput.oninput = function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; };

clearFolderBtn.onclick = () => {
    projectFolder = null;
    folderInfo.classList.add('hidden');
    dropZone.classList.remove('hidden');
    chatMessages.innerHTML = "";
    addMessage('system', 'Folder closed.');
};

// Clipboard / Paste for Images
userInput.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                pendingImage = event.target.result;
                imagePreviewImg.src = pendingImage;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(blob);
        }
    }
});

removeImageBtn.onclick = () => {
    pendingImage = null;
    imagePreviewContainer.classList.add('hidden');
};

// --- Launch Queue (PWA Icon Drop) ---
if ('launchQueue' in window) {
    launchQueue.setConsumer(async (launchParams) => {
        console.log("Launch Queue Triggered:", launchParams);
        if (launchParams.files && launchParams.files.length > 0) {
            for (const handle of launchParams.files) {
                if (handle.kind === 'directory') {
                    try {
                        // Launch handles need permission for the first time
                        const state = await handle.requestPermission({ mode: 'readwrite' });
                        if (state === 'granted') {
                            await loadDirectory(handle);
                        } else {
                            alert("Plz folder permissions grant karein!");
                        }
                    } catch (e) {
                        console.error("Launch Handle Error:", e);
                        // Fallback: try loading without permission if it's read-only
                        await loadDirectory(handle);
                    }
                    break; 
                }
            }
        }
    });
}

// --- Drag & Drop Flow (Window Drop) ---
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('hidden');
});

window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
        dragOverlay.classList.add('hidden');
    }
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragOverlay.classList.add('hidden');
    
    const items = e.dataTransfer.items;
    if (items.length > 0) {
        // Try to get as FileSystemHandle (Modern)
        if (items[0].getAsFileSystemHandle) {
            const handle = await items[0].getAsFileSystemHandle();
            if (handle.kind === 'directory') {
                await loadDirectory(handle);
            }
        } else if (items[0].webkitGetAsEntry) {
            // Fallback for older browsers
            const entry = items[0].webkitGetAsEntry();
            if (entry.isDirectory) {
                // webkitGetAsEntry doesn't give a full handle easily,
                // but for this app we prioritize File System Access API
                alert("Plz use a modern browser (Chrome/Edge) for folder drag-drop.");
            }
        }
    }
});
