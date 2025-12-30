

import { GoogleGenAI } from "@google/genai";
import { ComicPanel, Character, ResearchData, StoryFormat, StoryConcept, Message, ComicProject } from "../types";
import { PROMPTS } from "./prompts";

// The API key must be obtained exclusively from process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const analyzeUploadedManuscript = async (scriptContent: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<ResearchData> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.analyzeManuscript(scriptContent, language),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const sendResearchChatMessage = async (history: Message[], newMessage: string, context: any, tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    const ai = getAI();
    const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: contents,
        config: { systemInstruction: PROMPTS.researchChatSystem(context.theme, context.storyFormat, context.language) }
    });
    return response.text!;
};

export const extractStrategyFromChat = async (history: Message[], language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<ResearchData> => {
    const ai = getAI();
    const chatLog = history.map(m => `${m.role}: ${m.content}`).join("\n");
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.extractStrategy(chatLog, language),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const generateArtStyleGuide = async (styleName: string, culturalSetting: string, language: string, tier: 'STANDARD' | 'PREMIUM' = 'STANDARD'): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.researchArtStyle(styleName, culturalSetting, language)
    });
    return response.text!;
};

export const generateStoryConceptsWithSearch = async (theme: string, style: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<StoryConcept> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.storyConcept(theme, style, language),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const generateComplexCharacters = async (
    concept: StoryConcept, 
    language: string, 
    setting: string, 
    tier: 'STANDARD' | 'PREMIUM',
    sourceText?: string
): Promise<Character[]> => {
    const ai = getAI();
    let contents = "";

    // IMPORTANT: If source text (manuscript) is provided, use extraction prompt.
    // Otherwise, use generation prompt based on concept.
    if (sourceText && sourceText.length > 100) {
        contents = PROMPTS.extractCharactersFromText(sourceText, language);
    } else {
        contents = PROMPTS.complexCharacters(concept.premise, language, setting);
    }

    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: contents,
        config: { responseMimeType: "application/json" }
    });
    const chars = cleanAndParseJSON(response.text!);
    return chars.map((c: any) => ({ ...c, id: crypto.randomUUID() }));
};

export const generateSeriesBible = async (theme: string, style: string, language: string, tier: 'STANDARD' | 'PREMIUM'): Promise<any> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.seriesBible(theme, style, language),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const generateScript = async (
    theme: string, 
    style: string, 
    language: string, 
    format: StoryFormat, 
    bible: any, 
    tier: 'STANDARD' | 'PREMIUM',
    concept: StoryConcept | undefined,
    characters: Character[],
    chapterSummary: string,
    chapterNumber: number,
    originalScript?: string,
    worldSetting?: string,
    targetPanelCount?: number
): Promise<{ title: string, panels: ComicPanel[] }> => {
    const ai = getAI();
    const setting = worldSetting || bible?.worldSetting || "Standard";
    
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.scriptGeneration(
            chapterNumber, 
            format, 
            style, 
            language, 
            targetPanelCount || 20, 
            concept?.premise || theme, 
            characters.map(c => c.name).join(", "), 
            chapterSummary,
            setting // Passed to prompt
        ),
        config: { responseMimeType: "application/json" }
    });

    const result = cleanAndParseJSON(response.text!);
    return {
        title: result.title,
        panels: result.panels.map((p: any) => ({ ...p, id: crypto.randomUUID(), dialogue: p.dialogue || '', charactersInvolved: p.charactersInvolved || [] }))
    };
};

export const generateCharacterDesign = async (
    name: string, 
    styleGuide: string, 
    description: string, 
    worldSetting: string, 
    tier: 'STANDARD' | 'PREMIUM',
    imageModel: string = 'gemini-2.5-flash-image'
): Promise<{ description: string, imageUrl: string }> => {
    const ai = getAI();
    
    // 1. Refine Description
    const descResp = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.characterDesign(name, styleGuide, description, worldSetting)
    });
    const refinedDesc = descResp.text!;

    // 2. Generate Image with specific config based on model
    let imageConfig = {};
    if (imageModel === 'gemini-3-pro-image-preview') {
        imageConfig = {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
            }
        };
    }

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: PROMPTS.characterImagePrompt(name, refinedDesc, styleGuide),
        config: imageConfig
    });

    let imageUrl = '';
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             }
        }
    }
    return { description: refinedDesc, imageUrl };
};

export const generatePanelImage = async (
    panel: ComicPanel, 
    styleGuide: string, 
    characters: Character[], 
    worldSetting: string, 
    tier: 'STANDARD' | 'PREMIUM',
    imageModel: string = 'gemini-2.5-flash-image'
): Promise<string> => {
    const ai = getAI();
    const charDesc = characters.filter(c => panel.charactersInvolved.includes(c.name))
        .map(c => `${c.name}: ${c.description}`).join(". ");
    
    let imageConfig = {};
    if (imageModel === 'gemini-3-pro-image-preview') {
        imageConfig = {
            imageConfig: {
                aspectRatio: "16:9",
                imageSize: "1K"
            }
        };
    }

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: PROMPTS.panelImagePrompt(styleGuide, panel.description, charDesc, worldSetting),
        config: imageConfig
    });

    let imageUrl = '';
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             }
        }
    }
    return imageUrl;
};

export const generatePanelVideo = async (panel: ComicPanel, style: string): Promise<string> => {
    if (!panel.imageUrl) return '';
    const ai = getAI();
    const base64Data = panel.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    
    // Note: Veo model requires a paid API key. 
    // If this call fails with 404/Not Found, it usually means the key is invalid for Veo.
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
        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
    return '';
};

export const summarizeChapter = async (panels: ComicPanel[], tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    const ai = getAI();
    const text = panels.map(p => p.description).join(" ");
    const response = await ai.models.generateContent({ model: getTextModel(tier), contents: PROMPTS.summarizeChapter(text) });
    return response.text!;
};

export const generateVoiceover = async (text: string, voiceName: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
    });
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) { return `data:audio/mp3;base64,${part.inlineData.data}`; }
        }
    }
    return '';
};

export const analyzeCharacterConsistency = async (imageBase64: string, targetStyle: string, characterName: string, tier: 'STANDARD' | 'PREMIUM'): Promise<{ isConsistent: boolean, critique: string }> => {
    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    const response = await ai.models.generateContent({ 
        model: getTextModel(tier), 
        contents: { parts: [{ inlineData: { mimeType: 'image/png', data: cleanBase64 } }, { text: PROMPTS.analyzeConsistency(characterName, targetStyle) }] }, 
        config: { responseMimeType: "application/json" } 
    });
    return cleanAndParseJSON(response.text!);
};

// IMPROVED VOICE VERIFICATION
export const verifyCharacterVoice = async (character: Character, voiceName: string): Promise<{ isSuitable: boolean; suggestion: string; reason: string }> => {
    const ai = getAI();
    const VOICE_DESCRIPTIONS = `
        - Puck: Male, High pitch, Energetic, Youthful, Mischievous. Archetype: The Hero / The Sidekick.
        - Charon: Male, Low pitch, Deep, Gravelly, Authoritative. Archetype: The Villain / The Mentor / The Monster.
        - Kore: Female, Soft, Soothing, Calm, Gentle. Archetype: The Healer / The Mother / The Innocent.
        - Fenrir: Male, Rough, Aggressive, Intense, Growly. Archetype: The Warrior / The Beast / The Anti-Hero.
        - Zephyr: Female/Androgynous, Balanced, Neutral, Clear, Professional. Archetype: The Narrator / The Intellect / The Robot.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: PROMPTS.voiceConsistency(character.name, character.role || 'Unknown', character.personality || character.description, voiceName, VOICE_DESCRIPTIONS),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const batchTranslatePanels = async (panels: ComicPanel[], languages: string[], tier: 'STANDARD' | 'PREMIUM'): Promise<ComicPanel[]> => {
    if (languages.length === 0) return panels;
    const ai = getAI();
    const panelsMin = panels.map(p => ({ id: p.id, dialogue: p.dialogue, caption: p.caption }));
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: PROMPTS.translatePanels(JSON.stringify(panelsMin), languages),
            config: { responseMimeType: "application/json" }
        });
        const translatedData = cleanAndParseJSON(response.text!);
        return panels.map(p => {
            const tPanel = translatedData.find((tp: any) => tp.id === p.id);
            const newTranslations = tPanel ? { ...p.translations, ...tPanel.translations } : p.translations;
            return { ...p, translations: newTranslations };
        });
    } catch (e) { return panels; }
};

export const censorContent = async (text: string, type: 'SCRIPT' | 'IMAGE'): Promise<{ passed: boolean, report: string }> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: PROMPTS.censor(type, text),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};

export const checkContinuity = async (panels: ComicPanel[], characters: Character[], seriesBible: any, tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    const ai = getAI();
    const panelsText = panels.map((p, i) => `Panel ${i+1}: ${p.description}. Dialogue: ${p.dialogue}`).join("\n");
    const charNames = characters.map(c => c.name).join(", ");
    const setting = seriesBible?.worldSetting || "Standard Setting";
    const response = await ai.models.generateContent({
        model: getTextModel(tier),
        contents: PROMPTS.continuityCheck(panelsText, charNames, setting)
    });
    return response.text!;
};

// NEW: Marketing Generator for Publisher
export const generateMarketingCopy = async (project: ComicProject): Promise<{ blurb: string, socialPost: string, tagline: string }> => {
    const ai = getAI();
    // Gather context
    const summary = project.completedChapters?.[0]?.summary || project.storyConcept?.premise || "An epic story.";
    const audience = project.marketAnalysis?.targetAudience || "General Audience";
    
    const response = await ai.models.generateContent({
        model: getTextModel(project.modelTier),
        contents: PROMPTS.marketingCopy(project.title, summary, audience, project.activeLanguage),
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!);
};