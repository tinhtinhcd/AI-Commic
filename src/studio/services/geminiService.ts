
import { GoogleGenAI } from "@google/genai";
import { ComicPanel, Character, ResearchData, StoryFormat, StoryConcept, Message, ComicProject, UserAIPreferences, ImageProvider } from "../types";
import { PROMPTS } from "./prompts";
import { getCurrentUser } from "./authService";
import { DEFAULT_USER_PREFERENCES } from "../constants";

// --- API HELPERS (LOCAL STORAGE PRIORITY) ---

interface StoredKey {
    id: string;
    key: string;
    provider?: 'GEMINI' | 'DEEPSEEK' | 'OPENAI';
    isActive: boolean;
}

const getLocalKey = (provider: 'GEMINI' | 'DEEPSEEK' | 'OPENAI'): string | undefined => {
    try {
        const rawStore = localStorage.getItem('ai_comic_keystore_v2');
        if (rawStore) {
            const keys: StoredKey[] = JSON.parse(rawStore);
            // Legacy keys might not have 'provider', assume GEMINI
            const activeKey = keys.find(k => k.isActive && (k.provider === provider || (!k.provider && provider === 'GEMINI')));
            if (activeKey && activeKey.key.trim().length > 0) {
                return activeKey.key.trim();
            }
        }
    } catch (e) {
        console.error("Error reading API key store", e);
    }
    return undefined;
};

export const getDynamicApiKey = (): string => {
    // 1. LocalStorage (Privacy / Override)
    const localKey = getLocalKey('GEMINI');
    if (localKey) return localKey;

    // 2. User Profile (Cloud Sync)
    const user = getCurrentUser();
    if (user && user.apiKeys?.gemini) {
        return user.apiKeys.gemini.trim();
    }
    
    // 3. Environment Variable fallback
    const envKey = process.env.API_KEY;
    if (envKey && envKey.length > 0 && !envKey.startsWith('%')) { 
        return envKey;
    }

    return ''; 
};

const getDeepSeekKey = (): string => {
    const localKey = getLocalKey('DEEPSEEK');
    if (localKey) return localKey;

    const user = getCurrentUser();
    if (user && user.apiKeys?.deepseek) return user.apiKeys.deepseek.trim();

    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey && envKey.length > 0 && !envKey.startsWith('%')) return envKey;

    return '';
};

const getOpenAIKey = (): string => {
    const localKey = getLocalKey('OPENAI');
    if (localKey) return localKey;

    const user = getCurrentUser();
    if (user && user.apiKeys?.openai) return user.apiKeys.openai.trim();

    const envKey = process.env.OPENAI_API_KEY;
    if (envKey && envKey.length > 0 && !envKey.startsWith('%')) return envKey;

    return '';
};

const getAI = (customKey?: string) => {
    const key = customKey || getDynamicApiKey();
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

// --- RETRY UTILITY ---
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (e: any) {
        // Check for 429 (Too Many Requests) or 503 (Service Unavailable)
        const isQuota = e.status === 429 || e.code === 429 || e.message?.includes('429') || e.message?.toLowerCase().includes('quota');
        const isServerErr = e.status === 503 || e.code === 503;
        
        if (retries > 0 && (isQuota || isServerErr)) {
            const delay = baseDelay * (4 - retries); // 2s, 4s, 6s...
            console.warn(`[AI Service] Quota/Rate Limit hit (${e.status || '429'}). Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, baseDelay * 1.5);
        }
        throw e;
    }
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

    // --- OPENAI HANDLER ---
    if (engine === 'OPENAI') {
        const apiKey = getOpenAIKey();
        if (!apiKey) {
            console.warn("OpenAI Preference set but Key missing. Falling back to Gemini.");
            // Fallback logic proceeds to Gemini block below
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
                const openAIModel = (taskType === 'LOGIC') ? 'gpt-4o' : 'gpt-4o-mini';
                
                // Wrap fetch in retry logic
                const response = await retryWithBackoff(async () => {
                    const res = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({ model: openAIModel, messages: messages, stream: false, response_format: jsonMode ? { type: "json_object" } : undefined })
                    });
                    if (!res.ok) {
                        const err = await res.text();
                        const status = res.status;
                        throw { status, message: err };
                    }
                    return res;
                });

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (e: any) { 
                console.error("OpenAI Error, fallback Gemini", e); 
                // Don't return, let it fall through to Gemini default
            }
        }
    }

    // --- DEEPSEEK HANDLER ---
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
                
                // Wrap fetch in retry logic
                const response = await retryWithBackoff(async () => {
                    const res = await fetch("https://api.deepseek.com/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({ model: dsModel, messages: messages, stream: false, response_format: jsonMode ? { type: "json_object" } : undefined })
                    });
                    if (!res.ok) {
                        const err = await res.text();
                        const status = res.status;
                        throw { status, message: err };
                    }
                    return res;
                });

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (e: any) { console.error("DeepSeek Error, fallback Gemini", e); }
        }
    }

    // --- GEMINI (DEFAULT & FALLBACK) ---
    const ai = getAI();
    const modelName = getTextModel(modelTier);
    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (jsonMode) config.responseMimeType = "application/json";

    // Wrap Gemini call in retry logic
    const response = await retryWithBackoff(() => ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
    }));
    
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

export const generateCharacterDesign = async (name: string, styleGuide: string, description: string, worldSetting: string, tier: 'STANDARD' | 'PREMIUM', imageModel: string = 'gemini-2.5-flash-image', referenceImage?: string, customApiKey?: string): Promise<{ description: string, imageUrl: string }> => {
    // USE CUSTOM KEY IF PROVIDED
    const ai = getAI(customApiKey);
    
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
        // Apply Retry Logic for Image Generation
        const response = await retryWithBackoff(() => ai.models.generateContent({ 
            model: imageModel, 
            contents: { parts: parts }, 
            config: imageConfig 
        }));
        
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
            console.error("[Gemini] Character Generation Failed. Response:", JSON.stringify(response, null, 2));
            throw new Error(failureReason || "No image returned by AI. It might have been blocked by safety filters.");
        }

        return { description: refinedDesc, imageUrl };
    } catch (e) {
        console.error("[Gemini] API Call Error:", e);
        throw e;
    }
};

// --- MULTI-PROVIDER PANEL GENERATOR ---

export const generatePanelImage = async (
    panel: ComicPanel, 
    styleGuide: string, 
    characters: Character[], 
    worldSetting: string, 
    tier: 'STANDARD' | 'PREMIUM', 
    imageModel: string = 'gemini-2.5-flash-image', 
    assetImage?: string, 
    customApiKey?: string,
    provider: ImageProvider = 'GEMINI' // Default to Gemini
): Promise<string> => {
    
    const charDesc = characters.filter(c => panel.charactersInvolved.includes(c.name)).map(c => `${c.name}: ${c.description}`).join(". ");
    const promptText = PROMPTS.panelImagePrompt(styleGuide, panel.description, charDesc, worldSetting);

    // Identify Master Character Reference (The "Anchor")
    const mainChar = characters.find(c => panel.charactersInvolved.includes(c.name) && c.imageUrl);
    const referenceImageUrl = mainChar?.imageUrl; // Base64 in this app

    console.log(`[Art Studio] Generating Panel via ${provider}. Prompt: ${promptText.substring(0, 50)}...`);

    // --- STRATEGY 1: GEMINI (Native Multimodal) ---
    if (provider === 'GEMINI') {
        const ai = getAI(customApiKey);
        let imageConfig = {}; 
        if (imageModel === 'gemini-3-pro-image-preview') { imageConfig = { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }; }
        
        const parts: any[] = [{ text: promptText }];
        
        // Priority 1: Sketch
        if (panel.layoutSketch) { 
            const cleanBase64 = panel.layoutSketch.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
            parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
            parts[0].text += " STRICTLY follow the composition, redline corrections, and layout of the attached sketch."; 
        } 
        // Priority 2: Background Asset
        else if (assetImage) { 
            const cleanBase64 = assetImage.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
            parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
            parts[0].text += " Use the attached image as the BACKGROUND SETTING. Keep the architecture and lighting but place the characters inside it."; 
        } 
        // Priority 3: Character Reference (Anchor)
        else if (referenceImageUrl) { 
            const cleanBase64 = referenceImageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); 
            parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } }); 
            parts[0].text += ` Use the attached image as a reference for character ${mainChar?.name}.`; 
        }
        
        const response = await retryWithBackoff(() => ai.models.generateContent({ 
            model: imageModel, 
            contents: { parts: parts }, 
            config: imageConfig 
        }));

        if (response.candidates && response.candidates[0].content.parts) { 
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData) { 
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                } 
            } 
        }
        throw new Error("Gemini produced no image.");
    }

    // --- OTHER PROVIDERS (Mocked/Placeholder) ---
    // In a real implementation, you would handle Fetch errors here similarly
    if (provider === 'MIDJOURNEY' || provider === 'LEONARDO' || provider === 'FLUX') {
        throw new Error(`${provider} integration requires a valid backend bridge (not configured in this demo). Please switch to Gemini.`);
    }

    return '';
};

export const generatePanelVideo = async (panel: ComicPanel, style: string): Promise<string> => {
    if (!panel.imageUrl) return ''; 
    const ai = getAI(); 
    const base64Data = panel.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    
    // Video generation is slower, wait longer between retries
    let operation = await retryWithBackoff(() => ai.models.generateVideos({ 
        model: 'veo-3.1-fast-generate-preview', 
        prompt: `Cinematic motion for a comic panel. ${style} style. ${panel.description}. Subtle movement, parallax effect, atmospheric.`, 
        image: { imageBytes: base64Data, mimeType: 'image/png' }, 
        config: { numberOfVideos: 1, aspectRatio: '16:9', resolution: '720p' } 
    }), 2, 5000); 
    
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

// ... (Rest of exported functions use unifiedGenerateText or specific logic)
export const summarizeChapter = async (panels: ComicPanel[], tier: 'STANDARD' | 'PREMIUM'): Promise<string> => { return unifiedGenerateText({ taskType: 'LOGIC', modelTier: tier, contents: PROMPTS.summarizeChapter(panels.map(p => p.description).join(" ")) }); };
export const generateVoiceover = async (text: string, voiceName: string): Promise<string> => {
    const ai = getAI();
    const response = await retryWithBackoff(() => ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: { parts: [{ text }] }, config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } }));
    if (response.candidates && response.candidates[0].content.parts) { for (const part of response.candidates[0].content.parts) { if (part.inlineData) { return `data:audio/mp3;base64,${part.inlineData.data}`; } } } return '';
};
export const analyzeCharacterConsistency = async (imageBase64: string, targetStyle: string, characterName: string, tier: 'STANDARD' | 'PREMIUM'): Promise<{ isConsistent: boolean, critique: string }> => {
    const ai = getAI(); const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    const response = await retryWithBackoff(() => ai.models.generateContent({ model: getTextModel(tier), contents: { parts: [{ inlineData: { mimeType: 'image/png', data: cleanBase64 } }, { text: PROMPTS.analyzeConsistency(characterName, targetStyle) }] }, config: { responseMimeType: "application/json" } }));
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
