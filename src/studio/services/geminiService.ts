
import { GoogleGenAI } from "@google/genai";
import { ComicPanel, Character, ResearchData, StoryFormat, StoryConcept, Message, ComicProject, UserAIPreferences } from "../types";
import { PROMPTS } from "./prompts";
import { getCurrentUser } from "./authService";
import { DEFAULT_USER_PREFERENCES } from "../constants";

// --- API HELPERS (SYNCED WITH USER PROFILE) ---

export const getDynamicApiKey = (): string => {
    // 1. Try User Profile (Cloud Sync / Session)
    const user = getCurrentUser();
    if (user && user.apiKeys?.gemini) {
        return user.apiKeys.gemini.trim();
    }

    // 2. Legacy LocalStorage fallback (Keystore V2 - from Settings tab)
    try {
        const rawStore = localStorage.getItem('ai_comic_keystore_v2');
        if (rawStore) {
            const keys: any[] = JSON.parse(rawStore);
            const activeKey = keys.find((k: any) => k.isActive);
            if (activeKey && activeKey.key.trim().length > 0) {
                return activeKey.key.trim();
            }
        }
    } catch (e) {
        console.error("Error reading API key store", e);
    }
    
    // 3. Environment Variable fallback (Build time injection)
    // Note: On Cloudflare, this must be set during build time, not just runtime.
    const envKey = process.env.API_KEY;
    if (envKey && envKey.length > 0 && !envKey.startsWith('%')) { // Avoid unreplaced vite env vars
        return envKey;
    }

    console.warn("No API Key found in User Profile, LocalStorage, or Environment Variables.");
    return '';
};

const getDeepSeekKey = (): string => {
    const user = getCurrentUser();
    if (user && user.apiKeys?.deepseek) return user.apiKeys.deepseek.trim();
    return localStorage.getItem('ai_comic_deepseek_key') || '';
};

const getOpenAIKey = (): string => {
    const user = getCurrentUser();
    if (user && user.apiKeys?.openai) return user.apiKeys.openai.trim();
    return localStorage.getItem('ai_comic_openai_key') || '';
};

const getAI = () => {
    const key = getDynamicApiKey();
    if (!key) {
        console.error("CRITICAL: Missing Gemini API Key during getAI() call.");
        throw new Error("MISSING_API_KEY");
    }
    return new GoogleGenAI({ apiKey: key });
};

const getTextModel = (tier: 'STANDARD' | 'PREMIUM' = 'STANDARD') => 
    tier === 'PREMIUM' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

const cleanAndParseJSON = (text: string) => {
    try {
        let cleanText = text.trim();
        if (cleanText.startsWith("```json")) {
            cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", text);
        throw new Error("Failed to parse AI response.");
    }
};

const getUserPreference = (): UserAIPreferences => {
    const user = getCurrentUser();
    return user?.aiPreferences || DEFAULT_USER_PREFERENCES;
};

// --- UNIFIED GENERATION SERVICE ---

interface GenTextOptions {
    contents: any;
    modelTier?: 'STANDARD' | 'PREMIUM';
    taskType: 'CREATIVE' | 'LOGIC' | 'TRANSLATION' | 'VISUAL'; 
    systemInstruction?: string;
    jsonMode?: boolean;
    forceEngine?: 'GEMINI' | 'DEEPSEEK' | 'OPENAI'; 
}

const unifiedGenerateText = async (options: GenTextOptions): Promise<string> => {
    const { contents, modelTier = 'STANDARD', taskType, systemInstruction, jsonMode, forceEngine } = options;
    const prefs = getUserPreference();
    
    let engine = 'GEMINI'; 
    if (forceEngine) {
        engine = forceEngine;
    } else {
        switch (taskType) {
            case 'CREATIVE': engine = prefs.creativeEngine; break;
            case 'LOGIC': engine = prefs.logicEngine; break;
            case 'TRANSLATION': engine = prefs.translationEngine; break;
            case 'VISUAL': engine = 'GEMINI'; break; 
        }
    }

    if (engine === 'OPENAI') {
        const apiKey = getOpenAIKey();
        if (!apiKey) {
            console.warn("OpenAI Preference set but Key missing. Falling back to Gemini.");
        } else {
            let messages: any[] = [];
            if (systemInstruction) messages.push({ role: "system", content: systemInstruction });

            if (typeof contents === 'string') {
                messages.push({ role: "user", content: contents });
            } else if (Array.isArray(contents)) {
                contents.forEach((msg: any) => {
                    let role = msg.role === 'model' ? 'assistant' : 'user';
                    let content = typeof msg.parts?.[0]?.text === 'string' ? msg.parts[0].text : JSON.stringify(msg);
                    messages.push({ role, content });
                });
            } else if (contents.parts && contents.parts[0].text) {
                 messages.push({ role: "user", content: contents.parts[0].text });
            }

            try {
                const openAIModel = (taskType === 'LOGIC') ? 'gpt-5-reasoning' : 'gpt-5';
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: openAIModel, messages: messages, stream: false, response_format: jsonMode ? { type: "json_object" } : undefined })
                });
                if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
                const data = await response.json();
                return data.choices[0].message.content;
            } catch (e: any) { console.error("OpenAI Error, fallback Gemini", e); }
        }
    }

    if (engine === 'DEEPSEEK') {
        const apiKey = getDeepSeekKey();
        if (!apiKey) {
            console.warn("DeepSeek Preference set but Key missing. Falling back to Gemini.");
        } else {
            let messages: any[] = [];
            if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
            if (typeof contents === 'string') {
                messages.push({ role: "user", content: contents });
            } else if (Array.isArray(contents)) {
                contents.forEach((msg: any) => {
                    let role = msg.role === 'model' ? 'assistant' : 'user';
                    let content = typeof msg.parts?.[0]?.text === 'string' ? msg.parts[0].text : JSON.stringify(msg);
                    messages.push({ role, content });
                });
            } else if (contents.parts && contents.parts[0].text) {
                 messages.push({ role: "user", content: contents.parts[0].text });
            }

            try {
                const dsModel = (taskType === 'LOGIC') ? 'deepseek-reasoner' : 'deepseek-chat';
                const response = await fetch("https://api.deepseek.com/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: dsModel, messages: messages, stream: false, response_format: jsonMode ? { type: "json_object" } : undefined })
                });
                if (!response.ok) throw new Error(`DeepSeek API Error: ${response.status}`);
                const data = await response.json();
                return data.choices[0].message.content;
            } catch (e: any) { console.error("DeepSeek Error, fallback Gemini", e); }
        }
    }

    // Default: Gemini
    const ai = getAI();
    const modelName = getTextModel(modelTier);
    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (jsonMode) config.responseMimeType = "application/json";

    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
    });
    return response.text!;
};

// --- EXPORTED FUNCTIONS ---

export const analyzeUploadedManuscript = async (scriptContent: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<ResearchData> => {
    const text = await unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.analyzeManuscript(scriptContent, language), jsonMode: true });
    return cleanAndParseJSON(text);
};
export const sendResearchChatMessage = async (history: Message[], newMessage: string, context: any, tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    return unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: [...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: newMessage }] }], systemInstruction: PROMPTS.researchChatSystem(context.theme, context.storyFormat, context.language) });
};
export const extractStrategyFromChat = async (history: Message[], language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<ResearchData> => {
    const chatLog = history.map(m => `${m.role}: ${m.content}`).join("\n");
    const text = await unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.extractStrategy(chatLog, language), jsonMode: true });
    return cleanAndParseJSON(text);
};
export const generateArtStyleGuide = async (styleName: string, culturalSetting: string, language: string, tier: 'STANDARD' | 'PREMIUM' = 'STANDARD'): Promise<string> => {
    return unifiedGenerateText({ taskType: 'CREATIVE', modelTier: tier, contents: PROMPTS.researchArtStyle(styleName, culturalSetting, language) });
};
export const generateStoryConceptsWithSearch = async (theme: string, style: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<StoryConcept> => {
    const text = await unifiedGenerateText({ taskType: 'CREATIVE', modelTier: tier, contents: PROMPTS.storyConcept(theme, style, language), jsonMode: true });
    return cleanAndParseJSON(text);
};
export const generateComplexCharacters = async (concept: StoryConcept, language: string, setting: string, tier: 'STANDARD' | 'PREMIUM', sourceText?: string): Promise<Character[]> => {
    let contents = ""; if (sourceText && sourceText.length > 100) { contents = PROMPTS.extractCharactersFromText(sourceText, language); } else { contents = PROMPTS.complexCharacters(concept.premise, language, setting); }
    const text = await unifiedGenerateText({ taskType: 'CREATIVE', modelTier: tier, contents: contents, jsonMode: true });
    const chars = cleanAndParseJSON(text); return chars.map((c: any) => ({ ...c, id: crypto.randomUUID() }));
};
export const generateSeriesBible = async (theme: string, style: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<any> => {
    const text = await unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.seriesBible(theme, style, language), jsonMode: true });
    return cleanAndParseJSON(text);
};
export const generateScript = async (theme: string, style: string, language: string, format: StoryFormat, bible: any, tier: 'STANDARD' | 'PREMIUM', concept: StoryConcept | undefined, characters: Character[], chapterSummary: string, chapterNumber: number, originalScript?: string, worldSetting?: string, targetPanelCount?: number): Promise<{ title: string, panels: ComicPanel[] }> => {
    const setting = worldSetting || bible?.worldSetting || "Standard";
    const text = await unifiedGenerateText({ taskType: 'CREATIVE', modelTier: tier, contents: PROMPTS.scriptGeneration(chapterNumber, format, style, language, targetPanelCount || 20, concept?.premise || theme, characters.map(c => c.name).join(", "), chapterSummary, setting), jsonMode: true });
    const result = cleanAndParseJSON(text); return { title: result.title, panels: result.panels.map((p: any) => ({ ...p, id: crypto.randomUUID(), dialogue: p.dialogue || '', charactersInvolved: p.charactersInvolved || [] })) };
};

// --- UPDATED IMAGE GENERATION FUNCTIONS WITH LOGGING ---

export const generateCharacterDesign = async (name: string, styleGuide: string, description: string, worldSetting: string, tier: 'STANDARD' | 'PREMIUM', imageModel: string = 'gemini-2.5-flash-image', referenceImage?: string): Promise<{ description: string, imageUrl: string }> => {
    const ai = getAI();
    // 1. Refine description using text model
    const refinedDesc = await unifiedGenerateText({ taskType: 'CREATIVE', modelTier: tier, contents: PROMPTS.characterDesign(name, styleGuide, description, worldSetting) });
    
    // 2. Generate Image
    let imageConfig = {}; 
    if (imageModel === 'gemini-3-pro-image-preview') { imageConfig = { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }; }
    
    const parts: any[] = [{ text: PROMPTS.characterImagePrompt(name, refinedDesc, styleGuide) }];
    if (referenceImage) { 
        const cleanBase64 = referenceImage.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
        parts[0].text += " Use the attached image as a strict visual reference for the character's facial features and hair."; 
    }
    
    console.log(`[Gemini] Generating Character: ${name} with model ${imageModel}`);
    
    try {
        const response = await ai.models.generateContent({ model: imageModel, contents: { parts: parts }, config: imageConfig });
        
        let imageUrl = ''; 
        let failureReason = '';

        if (response.candidates && response.candidates[0].content.parts) { 
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData) { 
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                } else if (part.text) {
                    // Capture text fallback (often refusal messages)
                    failureReason += part.text;
                }
            } 
        }
        
        if (!imageUrl) {
            console.error("[Gemini] Character Generation Failed. Response:", JSON.stringify(response, null, 2));
            throw new Error(failureReason || "No image returned by AI. It might have been blocked by safety filters.");
        }

        return { description: refinedDesc, imageUrl };
    } catch (e) {
        console.error("[Gemini] API Call Error:", e);
        throw e;
    }
};

export const generatePanelImage = async (panel: ComicPanel, styleGuide: string, characters: Character[], worldSetting: string, tier: 'STANDARD' | 'PREMIUM', imageModel: string = 'gemini-2.5-flash-image', assetImage?: string): Promise<string> => {
    const ai = getAI();
    const charDesc = characters.filter(c => panel.charactersInvolved.includes(c.name)).map(c => `${c.name}: ${c.description}`).join(". ");
    let imageConfig = {}; 
    if (imageModel === 'gemini-3-pro-image-preview') { imageConfig = { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }; }
    
    const promptText = PROMPTS.panelImagePrompt(styleGuide, panel.description, charDesc, worldSetting);
    const parts: any[] = [{ text: promptText }];
    
    if (panel.layoutSketch) { 
        const cleanBase64 = panel.layoutSketch.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
        parts[0].text += " STRICTLY follow the composition, redline corrections, and layout of the attached sketch."; 
    } else if (assetImage) { 
        const cleanBase64 = assetImage.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
        parts[0].text += " Use the attached image as the BACKGROUND SETTING. Keep the architecture and lighting but place the characters inside it."; 
    } else { 
        const mainChar = characters.find(c => panel.charactersInvolved.includes(c.name) && c.referenceImage); 
        if (mainChar && mainChar.referenceImage) { 
            const cleanBase64 = mainChar.referenceImage.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
            parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
            parts[0].text += ` Use the attached image as a reference for character ${mainChar.name}.`; 
        } 
    }
    
    console.log(`[Gemini] Generating Panel with model ${imageModel}. Prompt length: ${promptText.length}`);

    try {
        const response = await ai.models.generateContent({ model: imageModel, contents: { parts: parts }, config: imageConfig });
        
        let imageUrl = ''; 
        let failureReason = '';

        if (response.candidates && response.candidates[0].content.parts) { 
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData) { 
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                } else if (part.text) {
                    failureReason += part.text;
                }
            } 
        }

        if (!imageUrl) {
            console.error("[Gemini] Panel Generation Failed. Full Response:", JSON.stringify(response, null, 2));
            throw new Error(failureReason || "AI failed to generate visual. Prompt may be too complex or unsafe.");
        }

        return imageUrl;
    } catch (e) {
        console.error("[Gemini] API Call Error (Panel):", e);
        throw e;
    }
};

export const generatePanelVideo = async (panel: ComicPanel, style: string): Promise<string> => {
    if (!panel.imageUrl) return ''; 
    const ai = getAI(); 
    const base64Data = panel.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    
    let operation = await ai.models.generateVideos({ 
        model: 'veo-3.1-fast-generate-preview', 
        prompt: `Cinematic motion for a comic panel. ${style} style. ${panel.description}. Subtle movement, parallax effect, atmospheric.`, 
        image: { imageBytes: base64Data, mimeType: 'image/png' }, 
        config: { numberOfVideos: 1, aspectRatio: '16:9', resolution: '720p' } 
    });
    
    while (!operation.done) { 
        await new Promise(resolve => setTimeout(resolve, 5000)); 
        operation = await ai.operations.getVideosOperation({operation: operation}); 
    }
    
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) { 
        const apiKey = getDynamicApiKey(); 
        const response = await fetch(`${videoUri}&key=${apiKey}`); 
        const blob = await response.blob(); 
        return URL.createObjectURL(blob); 
    } 
    return '';
};

export const summarizeChapter = async (panels: ComicPanel[], tier: 'STANDARD' | 'PREMIUM'): Promise<string> => { return unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.summarizeChapter(panels.map(p => p.description).join(" ")) }); };
export const generateVoiceover = async (text: string, voiceName: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: { parts: [{ text }] }, config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } });
    if (response.candidates && response.candidates[0].content.parts) { for (const part of response.candidates[0].content.parts) { if (part.inlineData) { return `data:audio/mp3;base64,${part.inlineData.data}`; } } } return '';
};
export const analyzeCharacterConsistency = async (imageBase64: string, targetStyle: string, characterName: string, tier: 'STANDARD' | 'PREMIUM'): Promise<{ isConsistent: boolean, critique: string }> => {
    const ai = getAI(); const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    const response = await ai.models.generateContent({ model: getTextModel(tier), contents: { parts: [{ inlineData: { mimeType: 'image/png', data: cleanBase64 } }, { text: PROMPTS.analyzeConsistency(characterName, targetStyle) }] }, config: { responseMimeType: "application/json" } });
    return cleanAndParseJSON(response.text!);
};
export const verifyCharacterVoice = async (character: Character, voiceName: string): Promise<{ isSuitable: boolean; suggestion: string; reason: string }> => {
    const text = await unifiedGenerateText({ taskType: 'LOGIC', modelTier: 'STANDARD', contents: PROMPTS.voiceConsistency(character.name, character.role || 'Unknown', character.personality || character.description, voiceName, ""), jsonMode: true });
    return cleanAndParseJSON(text);
};
export const batchTranslatePanels = async (panels: ComicPanel[], languages: string[], tier: 'STANDARD' | 'PREMIUM'): Promise<ComicPanel[]> => {
    if (languages.length === 0) return panels; const panelsMin = panels.map(p => ({ id: p.id, dialogue: p.dialogue, caption: p.caption }));
    try { const text = await unifiedGenerateText({ taskType: 'TRANSLATION', modelTier: tier, contents: PROMPTS.translatePanels(JSON.stringify(panelsMin), languages), jsonMode: true }); const translatedData = cleanAndParseJSON(text); return panels.map(p => { const tPanel = translatedData.find((tp: any) => tp.id === p.id); const newTranslations = tPanel ? { ...p.translations, ...tPanel.translations } : p.translations; return { ...p, translations: newTranslations }; }); } catch (e) { return panels; }
};
export const censorContent = async (text: string, type: 'SCRIPT' | 'IMAGE'): Promise<{ passed: boolean, report: string }> => {
    const responseText = await unifiedGenerateText({ taskType: 'LOGIC', modelTier: 'STANDARD', contents: PROMPTS.censor(type, text), jsonMode: true });
    return cleanAndParseJSON(responseText);
};
export const checkContinuity = async (panels: ComicPanel[], characters: Character[], seriesBible: any, tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    const panelsText = panels.map((p, i) => `Panel ${i+1}: ${p.description}. Dialogue: ${p.dialogue}`).join("\n"); const charNames = characters.map(c => c.name).join(", "); const setting = seriesBible?.worldSetting || "Standard Setting";
    return unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.continuityCheck(panelsText, charNames, setting) });
};
export const generateMarketingCopy = async (project: ComicProject): Promise<{ blurb: string, socialPost: string, tagline: string }> => {
    const summary = project.completedChapters?.[0]?.summary || project.storyConcept?.premise || "An epic story."; const audience = project.marketAnalysis?.targetAudience || "General Audience";
    const text = await unifiedGenerateText({ taskType: 'CREATIVE', modelTier: project.modelTier, contents: PROMPTS.marketingCopy(project.title, summary, audience, project.activeLanguage), jsonMode: true });
    return cleanAndParseJSON(text);
};
