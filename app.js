import { marked } from "marked";

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

let isPuterEnabled = false;
let projectFolder = null;
let projectFiles = [];
let chatHistory = []; 
let openFiles = {}; // { filename: content }

// Preview Handlers
openPreviewBtn.onclick = () => {
    const htmlContent = openFiles['index.html'] || Object.values(openFiles)[0];
    if (!htmlContent) return alert("Pehle koi code create karein!");
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

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
        const systemInstruction = `You are DEV AI, a world-class Senior Full-Stack Developer. Speak in ROMAN URDU.
CRITICAL RULES:
1. JITNA POOCHA JAYE UTNA HI JAWAB DEIN.
2. JAB TAK USER NA KAHE, tab tak coding shuru na karein.
3. Code blocks MUST start with: // FILE: filename.ext
4. Modern aesthetics (Glassmorphism, Dark Mode). NO NPM.
Files in Project: ${projectFiles.join(', ')}.`;

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
    
    if (role === 'ai') {
        const preElements = div.querySelectorAll('pre');
        preElements.forEach(pre => {
            const codeEl = pre.querySelector('code');
            if (codeEl) {
                const rawContent = codeEl.innerText;
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
                    if (rawContent.includes('<!DOCTYPE html') || rawContent.includes('<html')) filename = 'index.html';
                    else if (rawContent.includes('{') && (rawContent.includes('margin') || rawContent.includes(':root'))) filename = 'style.css';
                    else if (rawContent.includes('function') || rawContent.includes('addEventListener') || rawContent.includes('console.log')) filename = 'app.js';
                    cleanCode = rawContent;
                }

                if (filename) {
                    codeEl.innerText = cleanCode; 
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
                    pre.parentNode.insertBefore(actionDiv, pre);
                }
                Prism.highlightElement(codeEl);
            }
        });
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

const handleFolderSelect = async () => {
    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
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
    } catch (err) {}
};

dropZone.addEventListener('click', handleFolderSelect);

const handleSend = async () => {
    const text = userInput.value.trim();
    if (!text && !pendingImage) return;

    addMessage('user', text + (pendingImage ? ' [Image Attached]' : ''));
    userInput.value = '';
    userInput.style.height = 'auto';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = '<p>Soch raha hoon...</p>';
    chatMessages.appendChild(typingDiv);

    const aiResponse = await callAI(text, typingDiv);
    typingDiv.remove();
    addMessage('ai', aiResponse);
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
