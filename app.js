import { GoogleGenerativeAI } from "@google/generative-ai";

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const dropZone = document.getElementById('drop-zone');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const apiConfig = document.getElementById('api-config');
const folderInfo = document.getElementById('folder-info');
const currentFolderName = document.getElementById('current-folder-name');
const clearFolderBtn = document.getElementById('clear-folder');

let projectFolder = null;
let projectFiles = [];
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
        apiConfig.classList.add('hidden');
        addMessage('system', 'API Key save ho gayi hai. Shukriya!');
    }
});

// File System Logic
const handleFolderSelect = async () => {
    try {
        const dirHandle = await window.showDirectoryPicker();
        await loadFolder(dirHandle);
    } catch (err) {
        console.error('Folder selection cancelled or failed', err);
    }
};

dropZone.addEventListener('click', handleFolderSelect);

const loadFolder = async (dirHandle) => {
    projectFolder = dirHandle;
    projectFiles = [];
    
    // Simple recursive scan (limited for now)
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            projectFiles.push(entry.name);
        }
    }

    currentFolderName.innerText = `Folder: ${dirHandle.name} (${projectFiles.length} files)`;
    folderInfo.classList.remove('hidden');
    dropZone.classList.add('hidden');
    addMessage('system', `Mubarak ho! Aapne "${dirHandle.name}" folder load kar liya hai. Ab batayein kia help chahiye?`);
};

// Chat Logic
const addMessage = (role, text) => {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const callGemini = async (prompt) => {
    if (!apiKey) {
        addMessage('system', 'Pehle apni Gemini API Key daalein (Free waali)!');
        apiConfig.classList.remove('hidden');
        return;
    }

    const combinedPrompt = `You are DEV AI. Speak in ROMAN URDU. Project files: ${projectFiles.join(', ')}. \n\n User Question: ${prompt}`;

    try {
        // Step 1: Find which model is available for this key
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();
        
        if (modelsData.error) {
            apiConfig.classList.remove('hidden');
            localStorage.removeItem('gemini_api_key');
            apiKey = '';
            return `API Key masla: ${modelsData.error.message}`;
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
    folderInfo.classList.add('hidden');
    dropZone.classList.remove('hidden');
    addMessage('system', 'Folder close kar diya gaya hai.');
});
