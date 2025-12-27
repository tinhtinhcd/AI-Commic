import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { ComicPanel, Character } from "../types";

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

// --- NEW CAPABILITIES ---

export const conductMarketResearch = async (theme: string): Promise<string> => {
    const ai = getAI();
    const prompt = `
        As a Comic Market Researcher, analyze the following story theme: "${theme}".
        Provide a short 3-bullet point report on:
        1. Target Audience.
        2. Potential Trends to exploit.
        3. Suggestions to make the story more engaging for a global audience.
        Keep it professional and concise.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    return response.text || "No analysis generated.";
};

export const censorContent = async (content: string, type: 'SCRIPT' | 'IMAGE'): Promise<{passed: boolean, report: string}> => {
    const ai = getAI();
    const prompt = `
        Act as a Safety Inspector for a media publishing house.
        Analyze the following ${type} content for: Hate Speech, Explicit Violence, Sexual Content, or Self-Harm.
        
        Content: "${content}"
        
        Return JSON:
        { "passed": boolean, "report": "Short reason if failed, or 'Safe' if passed" }
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

// --- EXISTING SERVICES ---

export const generateScript = async (theme: string, style: string): Promise<{ title: string; panels: ComicPanel[] }> => {
  const ai = getAI();
  // UPGRADE: Added Dramatic Structure instruction and CAPTION field
  const prompt = `
    Create a comic book script based on: "${theme}". Style: "${style}". 
    Structure the story with 4-6 panels following this arc:
    1. Setup (Introduction)
    2. Inciting Incident (Conflict)
    3. Rising Action
    4. Climax / Twist
    5. Resolution (or Cliffhanger)

    Output JSON. 
    'description': Visual instructions for the artist.
    'dialogue': Spoken text by characters (or empty).
    'caption': Narrator text/box text (or empty).
    'charactersInvolved': List of names.
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
    config: { responseMimeType: "application/json", responseSchema: schema }
  });

  const data = JSON.parse(response.text!);
  const panelsWithIds = data.panels.map((p: any) => ({ ...p, id: crypto.randomUUID(), shouldAnimate: true })); // Default to animate
  return { title: data.title, panels: panelsWithIds };
};

export const generateCharacterDesign = async (characterName: string, projectTheme: string): Promise<{ description: string; imageUrl: string }> => {
  const ai = getAI();
  const textResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Describe appearance of "${characterName}" for a comic about "${projectTheme}". Concise. Focus on distinctive features.`
  });
  const description = textResponse.text || `A cool ${characterName}`;
  const imageResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: `Character design sheet for ${characterName}, ${description}. White background, full body, concept art style.`,
  });
  return { description, imageUrl: `data:image/png;base64,${imageResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}` };
};

export const generatePanelImage = async (panel: ComicPanel, style: string, characters: Character[]): Promise<string> => {
  const ai = getAI();
  
  // UPGRADE: MULTIMODAL INPUT (Reference Images)
  const parts: any[] = [];
  
  // 1. Add Text Prompt
  const charDescriptions = characters
    .filter(c => panel.charactersInvolved.some(name => c.name.toLowerCase().includes(name.toLowerCase())))
    .map(c => `${c.name} (Appearance: ${c.description})`)
    .join(". ");

  const prompt = `
    Comic panel art. Style: ${style}.
    Scene: ${panel.description}.
    Characters: ${charDescriptions}.
    Action: "${panel.dialogue || panel.caption || ''}".
    Maintain consistent character appearance based on provided reference images.
  `;
  
  parts.push({ text: prompt });

  // 2. Add Reference Images
  // Only add images for characters actually in this panel to avoid confusion
  characters.forEach(char => {
      if (panel.charactersInvolved.some(name => char.name.toLowerCase().includes(name.toLowerCase())) && char.imageUrl) {
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
    config: { imageConfig: { aspectRatio: "4:3" } }
  });
  return `data:image/png;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

export const generateCoverImage = async (title: string, theme: string, style: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: `Comic cover for "${title}". Theme: ${theme}. Style: ${style}. Vertical, dramatic, minimal text.`,
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  return `data:image/png;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

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
            aspectRatio: '4:3'
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
