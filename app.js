import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";


let pendingImage = null; // { data: base64, type: mime }

function id(name) { return document.getElementById(name); }

// Console greeting for dev debugging
console.log("DEV AI Initializing...");

// DOM Elements
const chatMessages = id('chat-messages');
const userInput = id('user-input');
const sendBtn = id('send-btn');
const dropZone = id('drop-zone');
const apiKeyInput = id('api-key');
const saveKeyBtn = id('save-key');
const apiConfig = id('api-config');
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

// Multi-Key Elements
const manageKeysBtn = id('manage-keys-btn');
const keysManager = id('keys-manager');
const closeKeysBtn = id('close-keys-btn');
const keysList = id('keys-list');
const newKeyInput = id('new-key-input');
const addKeyConfirmBtn = id('add-key-confirm-btn');
const keysCount = id('keys-count');

// Preview Handlers
openPreviewBtn.onclick = () => {
    const htmlContent = openFiles['index.html'] || Object.values(openFiles)[0];
    if (!htmlContent) return alert("Pehle koi code create karein!");
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

let projectFolder = null;
let projectFiles = [];
let chatHistory = []; 
let openFiles = {}; // { filename: content }

// Multi-Key Logic
let apiKeys = JSON.parse(localStorage.getItem('gemini_api_keys')) || [];
let activeKeyIndex = 0;

const updateKeysUI = () => {
    keysCount.innerText = apiKeys.length;
    keysList.innerHTML = apiKeys.map((key, index) => `
        <div class="key-item ${index === activeKeyIndex ? 'active' : ''}">
            <span>${key.substring(0, 8)}...${key.substring(key.length - 4)}</span>
            <button class="delete-key-btn" onclick="removeKey(${index})">×</button>
        </div>
    `).join('');
    
    // Hide old config if keys exist
    if (apiKeys.length > 0) apiConfig.classList.add('hidden');
    else apiConfig.classList.remove('hidden');
};

window.removeKey = (index) => {
    apiKeys.splice(index, 1);
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
    if (activeKeyIndex >= apiKeys.length) activeKeyIndex = 0;
    updateKeysUI();
};

manageKeysBtn.addEventListener('click', () => {
    keysManager.classList.remove('hidden');
});

closeKeysBtn.addEventListener('click', () => {
    keysManager.classList.add('hidden');
});

// Close modal when clicking outside (on backdrop)
keysManager.addEventListener('click', (e) => {
    if (e.target === keysManager) {
        keysManager.classList.add('hidden');
    }
});

addKeyConfirmBtn.onclick = () => {
    const key = newKeyInput.value.trim();
    if (key) {
        apiKeys.push(key);
        localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
        newKeyInput.value = '';
        updateKeysUI();
    }
};

updateKeysUI();

// Legacy Support for single key migration
const legacyKey = localStorage.getItem('gemini_api_key');
if (legacyKey && !apiKeys.includes(legacyKey)) {
    apiKeys.push(legacyKey);
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
    localStorage.removeItem('gemini_api_key');
    updateKeysUI();
}

// Save API Key from old UI
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKeys.push(key);
        localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
        apiKeyInput.value = "";
        updateKeysUI();
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

                    // Auto-Trigger on generation
                    triggerSave();
                    
                    saveBtn.addEventListener('click', async () => {
                        saveBtn.disabled = true;
                        saveBtn.innerText = `⏳ Saving...`;
                        await triggerSave();
                        saveBtn.disabled = false;
                    });
                    
                    actionDiv.appendChild(saveBtn);
                    pre.parentNode.insertBefore(actionDiv, pre);
                }
                
                // Final Highlight for chat
                Prism.highlightElement(codeEl);
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

    // UI: Code Display + Highlighting
    const ext = filename.split('.').pop();
    const lang = ext === 'js' ? 'javascript' : ext === 'css' ? 'css' : 'html';
    
    codePanelBody.innerHTML = `<pre class="code-display line-numbers"><code class="language-${lang}">${escapeHTML(openFiles[filename])}</code></pre>`;
    
    const codeEl = codePanelBody.querySelector('code');
    Prism.highlightElement(codeEl);

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
            <div class="code-welcome-steps">
                <div class="step"><span>1</span> <p>Folder load karein</p></div>
                <div class="step"><span>2</span> <p>App banane ko kaho (ya screenshot paste karein)</p></div>
                <div class="step"><span>3</span> <p>Yahan code dekhein ✨</p></div>
            </div>
        </div>
    `;
    openPreviewBtn.style.display = 'none';
};

const setPendingImage = (base64, type) => {
    pendingImage = { data: base64, type };
    imagePreviewImg.src = `data:${type};base64,${base64}`;
    imagePreviewContainer.classList.remove('hidden');
};

removeImageBtn.onclick = () => {
    pendingImage = null;
    imagePreviewContainer.classList.add('hidden');
};

const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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

const callGemini = async (prompt, imageData = null, keyIdx = 0, modelIdx = 0) => {
    if (apiKeys.length === 0) {
        addMessage('system', 'Pehle koi API Key daalein!');
        keysManager.classList.remove('hidden');
        return;
    }

    // Wrap around if we ran out of keys
    if (keyIdx >= apiKeys.length) {
        return "Sari keys aur unke models ki limit khatam ho chuki hai. Plz thori der baad try karein.";
    }

    activeKeyIndex = keyIdx;
    updateKeysUI();
    const currentKey = apiKeys[keyIdx];

    try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
        const modelsData = await modelsRes.json();
        
        if (modelsData.error) {
             console.error(`Key ${keyIdx} Error:`, modelsData.error.message);
             return callGemini(prompt, imageData, keyIdx + 1, 0); // Try NEXT KEY
        }

        const validModels = modelsData.models
            ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .sort((a, b) => b.name.includes('pro') ? 1 : -1);

        if (!validModels || validModels.length === 0) {
            return callGemini(prompt, imageData, keyIdx + 1, 0); // Try NEXT KEY
        }

        if (modelIdx >= validModels.length) {
            console.log(`Key ${keyIdx} models exhausted. Switching keys...`);
            return callGemini(prompt, imageData, keyIdx + 1, 0); // Try NEXT KEY
        }

        const selectedModel = validModels[modelIdx];
        const modelName = selectedModel.name.replace('models/', '');
        
        console.log(`Trying Key [${keyIdx + 1}] Model [${modelIdx + 1}]: ${modelName}`);

        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const historyText = chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
        const folderStatus = projectFolder ? `Active (Folder: ${projectFolder.name})` : "None";
        const visionContext = imageData ? "\n[Note: User has attached a screenshot.]" : "";

        const systemInstruction = `You are DEV AI, a world-class Senior Full-Stack Developer & UI/UX Designer. You speak in ROMAN URDU.
Your goal is to build web applications that look and feel like PREMIUM, HIGH-END digital products. Always use modern aesthetics (Glassmorphism, Gradients, Premium Fonts). NO NPM.

Available Project files: ${projectFiles.join(', ')}.${visionContext}`;

        const combinedPrompt = `[INTERNAL STATE: Folder Selection is ${folderStatus}]\n\n${systemInstruction}\n\nPrevious Conversation:\n${historyText}\n\nUser Question: ${prompt}`;

        const parts = [combinedPrompt];
        if (imageData) parts.push({ inlineData: { data: imageData.data, mimeType: imageData.type } });

        const result = await model.generateContent(parts);
        const response = await result.response;
        return `[${modelName}]: ` + response.text();

    } catch (err) {
        if (err.message.includes('429') || err.message.includes('quota')) {
            console.warn(`Key ${keyIdx} Model ${modelIdx} limited. Trying next model...`);
            return callGemini(prompt, imageData, keyIdx, modelIdx + 1); // Try NEXT MODEL
        }
        console.error(err);
        return callGemini(prompt, imageData, keyIdx + 1, 0); // Try NEXT KEY on other errors
    }
};

const handleSend = async () => {
    const text = userInput.value.trim();
    if (!text && !pendingImage) return;

    // Use a temp variable for the image so we can clear UI immediately
    const imgToSend = pendingImage;
    pendingImage = null;
    imagePreviewContainer.classList.add('hidden');

    addMessage('user', text + (imgToSend ? ' [Screenshot Attached]' : ''));
    userInput.value = '';
    userInput.style.height = 'auto';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = '<p>Soch raha hoon...</p>';
    chatMessages.appendChild(typingDiv);

    const aiResponse = await callGemini(text, imgToSend);
    typingDiv.remove();
    addMessage('ai', aiResponse);
};

userInput.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const base64 = await convertToBase64(blob);
            setPendingImage(base64, item.type);
        }
    }
});

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
