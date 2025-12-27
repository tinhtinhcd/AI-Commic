import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { ComicPanel, Character, ResearchData, StoryFormat } from "../types";

// Helper for TTS audio decoding
async function decodeAudioData(
    base64Data: string,
    sampleRate: number = 24000
  ): Promise<AudioBuffer> {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate});
    
    // Convert PCM to AudioBuffer
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length;
    const buffer = outputAudioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
}

function bufferToWave(abuffer: AudioBuffer, len: number) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    setUint32(0x46464952);                         
    setUint32(length - 8);                         
    setUint32(0x45564157);                         

    setUint32(0x20746d66);                         
    setUint32(16);                                 
    setUint16(1);                                  
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2);                      
    setUint16(16);                                 

    setUint32(0x61746164);                         
    setUint32(length - pos - 4);                   

    for(i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while(pos < length) {
        for(i = 0; i < numOfChan; i++) {             
            sample = Math.max(-1, Math.min(1, channels[i][offset])); 
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
            view.setInt16(pos, sample, true);          
            pos += 2;
        }
        offset++                                     
    }

    return new Blob([buffer], {type: "audio/wav"});

    function setUint16(data: any) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: any) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

const getAI = (apiKeyOverride?: string) => {
  const apiKey = apiKeyOverride || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

// --- STRATEGIC & PRE-PRODUCTION ---

export const conductMarketResearch = async (theme: string, language: string = 'English'): Promise<ResearchData> => {
    const ai = getAI();
    const prompt = `
        Act as a Creative Director and Market Researcher.
        Analyze theme: "${theme}".
        
        Output strategic plan in ${language}:
        1. 'suggestedTitle'
        2. 'targetAudience'
        3. 'visualStyle'
        4. 'narrativeStructure'
        5. 'colorPalette': 3-4 main hex codes.
        6. 'keyThemes': 3 keywords.
    `;
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            suggestedTitle: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            narrativeStructure: { type: Type.STRING },
            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["suggestedTitle", "targetAudience", "visualStyle", "narrativeStructure", "colorPalette", "keyThemes"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });
    
    return JSON.parse(response.text!);
};

// NEW: Series Bible Generation (For Long/Episodic formats)
export const generateSeriesBible = async (theme: string, style: string, language: string): Promise<{ worldSetting: string, mainConflict: string, characterArcs: string }> => {
    const ai = getAI();
    const prompt = `
        Create a "Series Bible" for a long-running animated series.
        Theme: "${theme}".
        Style: "${style}".
        Language: ${language}.
        
        Define:
        1. 'worldSetting': The rules, location, and atmosphere of the world.
        2. 'mainConflict': The overarching problem that spans multiple seasons/chapters.
        3. 'characterArcs': Brief summary of how main characters should evolve.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            worldSetting: { type: Type.STRING },
            mainConflict: { type: Type.STRING },
            characterArcs: { type: Type.STRING }
        },
        required: ["worldSetting", "mainConflict", "characterArcs"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });

    return JSON.parse(response.text!);
};

// --- SCRIPTING ---

export const censorContent = async (content: string, type: 'SCRIPT' | 'IMAGE'): Promise<{passed: boolean, report: string}> => {
    const ai = getAI();
    const prompt = `
        Act as a Safety Inspector. Analyze ${type} content: "${content}".
        Check for: Hate Speech, Explicit Violence, Sexual Content, Self-Harm.
        Return JSON: { "passed": boolean, "report": "Reason or 'Safe'" }
    `;
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            passed: { type: Type.BOOLEAN },
            report: { type: Type.STRING }
        },
        required: ["passed", "report"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });
    
    return JSON.parse(response.text!);
};

export const generateScript = async (
    theme: string, 
    style: string, 
    language: string = 'English', 
    format: StoryFormat = 'SHORT_STORY',
    bible?: { worldSetting: string, mainConflict: string } // Optional Bible context
): Promise<{ title: string; panels: ComicPanel[] }> => {
  const ai = getAI();
  
  let structurePrompt = "";
  let panelCountInstructions = "";
  let contextPrompt = "";

  if (bible) {
      contextPrompt = `
        SERIES CONTEXT (Adhere strictly to this):
        World: ${bible.worldSetting}
        Main Conflict: ${bible.mainConflict}
      `;
  }

  if (format === 'SHORT_STORY') {
      structurePrompt = `Target Runtime: 5-10 mins. Complete narrative (Beginning, Middle, End).`;
      panelCountInstructions = "Generate 8-12 KEYFRAMES.";
  } else if (format === 'LONG_SERIES') {
      structurePrompt = `Target Runtime: ~30 mins. This is CHAPTER 1. Focus on world setup and the 'Call to Action'. End with a cliffhanger.`;
      panelCountInstructions = "Generate 12-16 KEYFRAMES (Storyboards).";
  } else if (format === 'EPISODIC') {
      structurePrompt = `Target Runtime: 15-30 mins. Self-contained episode. Problem introduced and resolved.`;
      panelCountInstructions = "Generate 10-14 KEYFRAMES.";
  }

  const prompt = `
    Act as a Screenwriter.
    Theme: "${theme}". 
    Style: "${style}". 
    Format: "${format}".
    ${contextPrompt}
    ${structurePrompt}
    
    Language: ${language}.
    ${panelCountInstructions}
    
    Output JSON: 'description' (Visuals), 'dialogue' (Speech), 'caption' (Narrator), 'charactersInvolved' (Names).
  `;
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      panels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            dialogue: { type: Type.STRING },
            caption: { type: Type.STRING },
            charactersInvolved: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["description", "charactersInvolved"]
        }
      }
    },
    required: ["title", "panels"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 4096 } 
    }
  });

  const data = JSON.parse(response.text!);
  const panelsWithIds = data.panels.map((p: any) => ({ ...p, id: crypto.randomUUID(), shouldAnimate: true })); 
  return { title: data.title, panels: panelsWithIds };
};

// --- VISUALIZATION & CONSISTENCY ---

export const generateCharacterDesign = async (
    characterName: string, 
    projectTheme: string, 
    language: string = 'English', 
    isLongFormat: boolean = false
): Promise<{ description: string; imageUrl: string }> => {
  const ai = getAI();
  
  // 1. Text Description
  const textResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Describe appearance of "${characterName}" for a comic about "${projectTheme}". Concise. Focus on distinctive features (hair, clothes, colors). Write in ${language}.`
  });
  const description = textResponse.text || `A cool ${characterName}`;

  // 2. Image Generation Strategy
  // For Long Format, we generate a "Character Reference Sheet" (Turnaround) to ensure consistency later.
  // For Short Format, we just generate a cool pose.
  let imagePrompt = "";
  if (isLongFormat) {
      imagePrompt = `
          Character Reference Sheet for animation. 
          Character: ${characterName}. ${description}.
          Layout: Three views (Front view, Side view, 3/4 view) arranged horizontally on a white background.
          Style: Concept art, neutral lighting, flat shading for reference.
          No text, clean lines.
      `;
  } else {
      imagePrompt = `Character design for ${characterName}, ${description}. White background, full body, concept art style, dynamic pose.`;
  }

  const imageResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: imagePrompt,
  });
  return { description, imageUrl: `data:image/png;base64,${imageResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}` };
};

// NEW: Analyze Character Consistency (Vision)
export const analyzeCharacterConsistency = async (
    imageBase64: string,
    targetStyle: string,
    characterName: string
): Promise<{ isConsistent: boolean, critique: string }> => {
    const ai = getAI();
    const prompt = `
        Act as an Art Director. 
        Analyze this uploaded image for character: "${characterName}".
        Target Project Style: "${targetStyle}".
        
        Is this image consistent with the Target Style?
        If yes, return isConsistent: true.
        If no (e.g. style is Photo-realistic but target is Anime), return isConsistent: false and a short critique explaining why.
        
        Return JSON.
    `;
    
    // Clean base64 header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            isConsistent: { type: Type.BOOLEAN },
            critique: { type: Type.STRING }
        },
        required: ["isConsistent", "critique"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image", // Using vision model to see the image
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                { text: prompt }
            ]
        },
        config: { responseMimeType: "application/json" } // Note: 2.5 flash image might default to text, so we rely on parsing or standard response
    });
    
    // Parse result (handling potential markdown wrapping)
    let text = response.text!;
    if (text.startsWith("```json")) {
        text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        return { isConsistent: true, critique: "Analysis inconclusive, assumed consistent." };
    }
};

export const generatePanelImage = async (panel: ComicPanel, style: string, characters: Character[]): Promise<string> => {
  const ai = getAI();
  
  const parts: any[] = [];
  
  // 1. Construct Prompt
  const charDescriptions = characters
    .filter(c => panel.charactersInvolved.some(name => c.name.toLowerCase().includes(name.toLowerCase())))
    .map(c => `${c.name} (Look: ${c.description})`)
    .join(". ");

  const prompt = `
    Comic panel art / Storyboard frame.
    Style: ${style}.
    Scene Description: ${panel.description}.
    Characters present: ${charDescriptions}.
    Action/Mood: "${panel.dialogue || panel.caption || ''}".
    
    CRITICAL: Use the provided Reference Images to maintain strict character consistency (Hair, Clothes, Face).
  `;
  
  parts.push({ text: prompt });

  // 2. Inject Reference Images (Crucial for Long Series)
  // Only inject if the character is involved in this specific panel
  characters.forEach(char => {
      const isInvolved = panel.charactersInvolved.some(name => char.name.toLowerCase().includes(name.toLowerCase()));
      // If it's a Long Series (implied by isLocked), we prioritize Locked images.
      // Even if not locked, we use available images.
      if (isInvolved && char.imageUrl) {
          const base64 = char.imageUrl.split(',')[1];
          parts.push({
              inlineData: {
                  mimeType: 'image/png',
                  data: base64
              }
          });
      }
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  return `data:image/png;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

export const generateCoverImage = async (title: string, theme: string, style: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: `Cinematic movie poster for "${title}". Theme: ${theme}. Style: ${style}. Vertical, dramatic, minimal text.`,
    config: { imageConfig: { aspectRatio: "2:3" } }
  });
  return `data:image/png;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

// --- POST PRODUCTION ---

export const translateScript = async (currentScript: {title: string, panels: ComicPanel[]}, targetLanguage: string): Promise<{title: string, panels: ComicPanel[]}> => {
    const ai = getAI();
    const prompt = `
        Translate the following comic script to ${targetLanguage}.
        Keep the IDs identical. Only translate 'dialogue', 'description', 'caption' and 'title'.
        
        Input JSON:
        ${JSON.stringify(currentScript)}
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                caption: { type: Type.STRING },
                charactersInvolved: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "description", "charactersInvolved"]
            }
          }
        },
        required: ["title", "panels"]
      };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });

    const data = JSON.parse(response.text!);
    return data;
};

export const generateVoiceover = async (text: string, voiceName: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const audioBuffer = await decodeAudioData(base64Audio);
    const wavBlob = bufferToWave(audioBuffer, audioBuffer.length);
    return URL.createObjectURL(wavBlob);
};

export const generateVideo = async (imageUrl: string, prompt: string): Promise<string> => {
    const base64Data = imageUrl.split(',')[1]; 
    const ai = getAI(process.env.API_KEY); 

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: {
            imageBytes: base64Data,
            mimeType: 'image/png'
        },
        prompt: `Cinematic camera movement, ${prompt}, high quality, 4k`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};
