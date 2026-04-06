import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";


const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const dropZone = document.getElementById('drop-zone');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const apiConfig = document.getElementById('api-config');
const folderInfo = document.querySelector('.folder-status-top');
const currentFolderName = document.getElementById('current-folder-name');
const clearFolderBtn = id('clear-folder');

// New IDE Elements
const codePanelBody = id('code-panel-body');
const codePanelTabs = id('code-panel-tabs');
const openPreviewBtn = id('open-preview-btn');

openPreviewBtn.onclick = () => {
    // Basic preview: open the HTML content in a new tab
    const htmlContent = openFiles['index.html'] || Object.values(openFiles)[0];
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

function id(name) { return document.getElementById(name); }

let projectFolder = null;
let projectFiles = [];
let chatHistory = []; 
let openFiles = {}; // { filename: content }
// Pre-configured by Antigravity as requested!
let apiKey = localStorage.getItem('gemini_api_key') || '';

if (apiKey) {
    apiConfig.classList.add('hidden');
}

// Save API Key
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        apiKey = key;
        apiKeyInput.placeholder = "Key Saved! ✅";
        apiKeyInput.value = "";
        setTimeout(() => apiConfig.classList.add('hidden'), 1000);
    }
});

// File System Logic
const handleFolderSelect = async () => {
    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await loadFolder(dirHandle);
    } catch (err) {
        console.error('Folder selection cancelled or failed', err);
    }
};

dropZone.addEventListener('click', handleFolderSelect);

const loadFolder = async (dirHandle) => {
    projectFolder = dirHandle;
    projectFiles = [];
    chatHistory = [];
    openFiles = {};
    
    chatMessages.innerHTML = `
        <div class="message system">
            <p>Assalam-o-Alaikum! Main DEV AI hoon. Mujhy koi folder dein aur batayein kia kaam karna hai.</p>
        </div>
    `;
    
    // Reset Code Panel
    codePanelTabs.innerHTML = '<span class="tab active">👾 DEV AI</span>';
    resetCodeBody();

    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            projectFiles.push(entry.name);
        }
    }

    // Try to load history file
    try {
        const historyHandle = await dirHandle.getFileHandle('.dev_ai_history.json', { create: false });
        const file = await historyHandle.getFile();
        const content = await file.text();
        if (content) {
            chatHistory = JSON.parse(content);
            chatHistory.forEach(msg => {
                addMessage(msg.role, msg.text, true); // Don't re-save what we loaded
            });
            addMessage('system', `Pichla kaam yaad agaya! ${chatHistory.length} messages load ho gaye hain.`, true);
        }
    } catch (e) {
        console.log('No history found or failed to load', e);
    }

    currentFolderName.innerText = `Folder: ${dirHandle.name} (${projectFiles.length} files)`;
    folderInfo.classList.remove('hidden');
    dropZone.classList.add('hidden');
    
    if (chatHistory.length === 0) {
        addMessage('system', `Mubarak ho! Aapne "${dirHandle.name}" folder load kar liya hai. Ab batayein kia help chahiye?`);
    }
};

// Chat Logic
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
                const codeLines = codeEl.innerText.split('\n');
                const firstLine = codeLines[0].trim();
                const match = firstLine.match(/^(?:\/\/|\/\*|<!--|<#)?\s*FILE:\s*([a-zA-Z0-9_.-/]+)/i);
                
                if (match) {
                    const filename = match[1];
                    codeLines.shift();
                    const cleanCode = codeLines.join('\n');
                    codeEl.innerText = cleanCode; 
                    
                    // Update IDE Panel
                    updateCodePanel(filename, cleanCode);

                    const actionDiv = document.createElement('div');
                    actionDiv.className = 'file-action';
                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'save-file-btn';
                    saveBtn.innerHTML = `💾 Save File: <strong>${filename}</strong>`;
                    
                    saveBtn.addEventListener('click', async () => {
                        saveBtn.disabled = true;
                        saveBtn.innerText = `⏳ Saving...`;
                        const success = await writeProjectFile(filename, cleanCode);
                        if (success) {
                            saveBtn.innerText = `✅ Saved ${filename}`;
                            saveBtn.classList.add('success');
                        } else {
                            saveBtn.innerText = `❌ Error`;
                            saveBtn.disabled = false;
                        }
                    });
                    
                    actionDiv.appendChild(saveBtn);
                    pre.parentNode.insertBefore(actionDiv, pre);
                }
            }
        });
    }

    chatMessages.appendChild(div);
    
    // Fix Scroll Logic
    requestAnimationFrame(() => {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    });

    if (!skipHistory && (role === 'user' || role === 'ai')) {
        chatHistory.push({ role, text });
        if (chatHistory.length > 20) chatHistory.shift(); // Keep it light
        saveHistory();
    }
};

const updateCodePanel = (filename, content) => {
    openFiles[filename] = content;
    
    // Upsert Tab
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
    // UI: Active Tab
    Array.from(codePanelTabs.children).forEach(t => t.classList.remove('active'));
    const activeTab = Array.from(codePanelTabs.children).find(t => t.dataset.file === filename);
    if (activeTab) activeTab.classList.add('active');

    // UI: Code Display
    codePanelBody.innerHTML = `<pre class="code-display"><code>${escapeHTML(openFiles[filename])}</code></pre>`;
    
    if (filename.endsWith('.html')) {
        openPreviewBtn.style.display = 'block';
    }
};

const resetCodeBody = () => {
    codePanelBody.innerHTML = `
        <div class="code-welcome">
            <div class="code-welcome-icon">⚡</div>
            <h2>Live Code View</h2>
            <p>Jab DEV AI code likhega,<br>yahan real-time nazar aayega.</p>
        </div>
    `;
    openPreviewBtn.style.display = 'none';
};

const escapeHTML = (str) => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const saveHistory = async () => {
    if (!projectFolder) return;
    try {
        const historyHandle = await projectFolder.getFileHandle('.dev_ai_history.json', { create: true });
        const writable = await historyHandle.createWritable();
        await writable.write(JSON.stringify(chatHistory, null, 2));
        await writable.close();
    } catch (e) {
        console.error('Failed to save history', e);
    }
};

const writeProjectFile = async (filePath, content) => {
    if (!projectFolder) {
        alert("Pehle koi folder load karein!");
        return false;
    }
    try {
        const parts = filePath.split('/');
        const filename = parts.pop();
        
        let currentDir = projectFolder;
        for (const part of parts) {
            if (part && part !== '.') {
                currentDir = await currentDir.getDirectoryHandle(part, { create: true });
            }
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

const callGemini = async (prompt) => {
    if (!apiKey) {
        addMessage('system', 'Pehle apni Gemini API Key daalein (Free waali)!');
        apiConfig.classList.remove('hidden');
        return;
    }

    // Construct context-rich prompt
    const historyText = chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    
    const systemInstruction = `You are DEV AI, a professional Autonomous Code Generator. You speak in ROMAN URDU.
Your goal is to build fully functional web applications that RUN INSTANTLY in the browser.

STRICT RULES:
1. DO NOT mention terminal, npm, node, or any local setup commands.
2. NEVER ask the user to run "npm install", "npm start", or open a terminal.
3. ALWAYS use CDN links for libraries (e.g., Tailwind via CDN, FontAwesome via CDN, Vue/React via ESM.run).
4. THE USER CANNOT RUN COMMANDS. They just want to see the code and click the "Preview" button.
5. If you need to "run" something, just provide the HTML/JS/CSS files and assume they will be opened directly.

Format for files:
\`\`\`html
<!-- FILE: index.html -->
...
\`\`\`
... (rest of the prompt logic)`;

    const combinedPrompt = `${systemInstruction}\n\nPrevious Conversation:\n${historyText}\n\nUser Question: ${prompt}`;

    try {
        // Step 1: Find which model is available for this key
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();
        
        if (modelsData.error) {
            const code = modelsData.error.code;
            if (code === 401 || code === 403) {
                apiConfig.classList.remove('hidden');
                localStorage.removeItem('gemini_api_key');
                apiKey = '';
                return `API Key masla: ${modelsData.error.message}. Key remove kar di gayi hai, dobara try karein.`;
            } else {
                // Temporary error (like 503), don't remove the key!
                return `API Busy (Error ${code}): ${modelsData.error.message}. Key save hai, thori der baad dobara koshish karein.`;
            }
        }

        // Step 2: Pick first model that supports generateContent
        const availableModel = modelsData.models?.find(m => 
            m.supportedGenerationMethods?.includes('generateContent')
        );

        if (!availableModel) {
            return `Koi bhi model available nahi hai is API Key ke liye. Nai key try karein.`;
        }

        const modelName = availableModel.name.replace('models/', '');
        
        // Step 3: Call that model
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(combinedPrompt);
        const response = await result.response;
        return `[${modelName}]: ` + response.text();
    } catch (err) {
        console.error(err);
        return `Masla: ${err.message}. (Tip: Ensure Key is valid and Internet is working)`;
    }
};

const handleSend = async () => {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = '<p>Soch raha hoon...</p>';
    chatMessages.appendChild(typingDiv);

    const aiResponse = await callGemini(text);
    typingDiv.remove();
    addMessage('ai', aiResponse);
};

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-expand textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Drag and drop Visuals
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
});
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    // For drop, we still need a directory handle, which usually requires click in browser security.
    // For now, we'll trigger the handleFolderSelect on drop to keep it simple and secure.
    handleFolderSelect();
});

clearFolderBtn.addEventListener('click', () => {
    projectFolder = null;
    projectFiles = [];
    chatHistory = []; // Reset history state
    folderInfo.classList.add('hidden');
    dropZone.classList.remove('hidden');
    
    // Clear chat EXCEPT for initial system message
    chatMessages.innerHTML = `
        <div class="message system">
            <p>Assalam-o-Alaikum! Main DEV AI hoon. Mujhy koi folder dein aur batayein kia kaam karna hai.</p>
        </div>
    `;
    
    addMessage('system', 'Folder close aur history reset kar di gayi hai.');
});
