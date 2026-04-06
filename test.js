const apiKey = "AIzaSyAuvisO4PIkoYqUvuUTUof2Nx4afSxBHOA";

async function test() {
    try {
        console.log("Fetching models...");
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();
        
        if (modelsData.error) {
            console.error("API Error: ", modelsData.error);
            return;
        }

        const availableModels = modelsData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
            
        console.log("Available generation models:", availableModels);
        
        if (availableModels.length > 0) {
            // Prefer flash if available, else first
            let modelToUse = availableModels.find(m => m.includes('flash'));
            if (!modelToUse) modelToUse = availableModels[0];
            
            console.log("Testing generateContent with model:", modelToUse);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello, say hi" }] }]
                })
            });
            const data = await response.json();
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch Exception:", e);
    }
}
test();
