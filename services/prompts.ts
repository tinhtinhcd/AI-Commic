
export const PROMPTS = {
    // 1. Analyze Manuscript with Cultural Extraction
    analyzeManuscript: (scriptContent: string, language: string) => `
        Act as a professional Literary Editor. Analyze this manuscript.
        
        CRITICAL OUTPUT RULES:
        1. Output JSON ONLY.
        2. All string values MUST be in ${language}.
        
        Extract:
        - suggestedTitle: string
        - targetAudience: string
        - visualStyle: string (e.g. Manga, Webtoon, Noir)
        - narrativeStructure: string (Logline)
        - estimatedChapters: string
        - worldSetting: string (BE SPECIFIC about country, era, culture. e.g. "Hanoi, Vietnam, 2024", "Fantasy world inspired by Ly Dynasty Vietnam")
        - culturalContext: string (Notes on specific cultural norms to respect)
        - chapterOutlines: array of objects { chapterNumber, summary }
        - extractedCharacters: array of objects { name, role (MAIN/SUPPORTING), description (visuals), personality }
        - colorPalette: array of strings
        - keyThemes: array of strings

        Manuscript: "${scriptContent.substring(0, 25000)}..."
    `,

    // 2. Research Chat - Cultural Awareness & ACTIONABLE INTELLIGENCE
    researchChatSystem: (theme: string, format: string | null, language: string) => `
        You are the Editor-in-Chief (Biên Tập Viên Chính). 
        Context: Theme="${theme}", Format="${format}".
        Language: ${language}.

        **CORE RESPONSIBILITIES:**
        1. **Strategy:** Analyze market trends and target audience.
        2. **Arc Planning (CRITICAL FOR LONG SERIES):** 
           - Do NOT try to plan the entire series at once if it is long (>20 chapters).
           - Propose breaking the story into "Arcs" (e.g., Arc 1: The Beginning, Chapters 1-10).
           - Focus the discussion ONLY on the current Arc until it is finalized.
        3. **Task Management (ACTIONABLE):** You have the power to assign tasks to other agents.

        **COMMAND PROTOCOL (IMPORTANT):**
        If the user asks you to create tasks, or if you decide a specific actionable step is needed for another agent, you MUST include a command block in your response.
        
        Format:
        <<<CMD:ADD_TASK>>>
        {
            "role": "SCRIPTWRITER" (or CHARACTER_DESIGNER, PANEL_ARTIST, etc.),
            "description": "Specific instruction for the agent",
            "targetChapter": 1 (optional number)
        }
        <<<END_CMD>>>

        Example:
        User: "Let's start making characters."
        You: "Agreed. I will assign the Writer to outline the cast first.
        <<<CMD:ADD_TASK>>>{"role": "SCRIPTWRITER", "description": "Create detailed character profiles for the protagonist and antagonist."}<<<END_CMD>>>"
        
        **BEHAVIOR:**
        - Be proactive. Don't just chat. Make decisions.
        - If the story is long, say: "This is a long series. Let's focus on the first Arc (Chapters 1-12) first. I will generate a roadmap for just this Arc."
    `,

    extractStrategy: (chatLog: string, language: string) => `
        Based on this chat, compile the Project Strategy.
        OUTPUT LANGUAGE: ${language}.
        
        Required JSON fields: 
        - suggestedTitle
        - targetAudience
        - visualStyle
        - narrativeStructure
        - estimatedChapters (Provide a number string, e.g. "50", "100". If unsure but it's a long series, default to "50").
        - worldSetting (Extract the specific location/culture discussed)
        - culturalContext (Any specific cultural notes mentioned)
        
        Chat Log: ${chatLog}
    `,

    // 3. Style Research (ENHANCED FOR DISTINCTIVENESS)
    researchArtStyle: (style: string, culturalSetting: string, language: string) => `
        Act as an Expert Art Director. Define the STRICT VISUAL RULES for the style: "${style}".
        Setting: "${culturalSetting}".
        
        You must output a technical Prompt Prefix that enforces this style.
        
        CRITICAL DIFFERENTIATION GUIDE:
        - "Manga (B&W)": Emphasize 'black and white ink', 'screentones', 'G-pen lines', 'high contrast', 'speed lines'. No colors.
        - "Webtoon": Emphasize 'vertical scrolling composition', 'vibrant digital colors', 'soft shading', 'clean lines', 'manhwa aesthetic'.
        - "Noir": Emphasize 'chiaroscuro', 'heavy shadows', 'high contrast', 'monochrome', 'film noir lighting'.
        - "Anime": Emphasize 'cel-shaded', 'studio ghibli/mappa style', 'cinematic lighting', 'highly detailed backgrounds'.
        - "3D Render": Emphasize 'Octane render', 'raytracing', 'subsurface scattering', 'unreal engine 5', 'photorealistic textures'.
        - "Wuxia/Ink": Emphasize 'traditional chinese ink wash painting', 'watercolor textures', 'flowing lines', 'calligraphic strokes'.
        
        Output a plain text paragraph (in English - for the Image Generator) describing the rendering technique, lighting, line quality, and color palette.
    `,

    // 4. Character Design - Uses Style Guide
    characterDesign: (name: string, styleGuide: string, description: string, worldSetting: string) => `
        Create an image generation prompt for a character named "${name}".
        
        INPUTS:
        - Style Guide: "${styleGuide}"
        - World Setting: "${worldSetting}"
        - Character Description: "${description}"
        
        INSTRUCTIONS:
        Write a high-quality, descriptive prompt for an image generator.
        1. STRICTLY follow the 'Style Guide'. 
        2. Ensure the character's ethnicity and fashion matches the 'World Setting' and 'Name' (e.g. Vietnamese name -> Vietnamese features).
        3. Do NOT use Western comic tropes (like Superman muscles) unless specified.
        4. Focus on facial features, skin tone, hair texture, and culturally accurate clothing.
        5. CRITICAL: Request a dynamic, personality-driven pose (avoid static T-poses) and a specific facial expression that conveys their archetype (e.g. confident smirk, shy glance, fierce shout).
    `,

    characterImagePrompt: (name: string, description: string, styleGuide: string) => `
        (Masterpiece, Best Quality), ${styleGuide}.
        Character Design Sheet for: ${name}.
        Visuals: ${description}.
        Full body, dynamic pose, expressive face, interesting angle, white background.
    `,

    // 5. Panel Art - Uses Style Guide & Setting
    panelImagePrompt: (styleGuide: string, description: string, charDesc: string, worldSetting: string) => `
        (Masterpiece, Best Quality, Ultra Detailed), ${styleGuide}.
        
        **SCENE:**
        - **Action:** ${description}
        - **Setting:** ${worldSetting} (Authentic architecture/props required).
        - **Characters:** ${charDesc}

        **COMPOSITION DIRECTIVES:**
        - Use a Cinematic Angle (Low angle, Dutch tilt, or Over-the-shoulder).
        - Dramatic Lighting consistent with the Art Style.
        - Ensure character consistency.
    `,

    // 6. Scripting (UPDATED FOR DYNAMIC LENGTH)
    scriptGeneration: (
        chapterNumber: number,
        format: string | null,
        style: string,
        language: string,
        panelCount: number,
        concept: string,
        characters: string,
        summary: string,
        worldSetting: string
    ) => `
        Write a comic script for Chapter ${chapterNumber}.
        
        **PROJECT CONFIGURATION:**
        - Format: ${format} (CRITICAL: Adjust pacing accordingly).
        - Target Length: Approximately ${panelCount} panels. 
          *NOTE: Do NOT strictly adhere to ${panelCount}. If the scene needs more panels to flow correctly (e.g. action sequences, emotional beats), add them. Use as many as needed to tell the story well, up to 1.5x the target.*
        - Style: ${style}.
        - Setting: ${worldSetting}.
        
        **OUTPUT LANGUAGE:** ${language}.
        
        **CONTEXT:**
        - Concept: ${concept}
        - Characters: ${characters}
        - Chapter Summary: ${summary}
        
        **OUTPUT FORMAT:**
        Return strictly a JSON object with this structure:
        { 
            "title": "Chapter Title", 
            "panels": [ 
                { 
                    "description": "Visual description of the panel (camera angle, action, lighting)", 
                    "dialogue": "Character Name: Dialogue text", 
                    "caption": "Narrator text or Sound Effect", 
                    "charactersInvolved": ["Name1", "Name2"] 
                } 
            ] 
        }
    `,

    // Helpers
    storyConcept: (theme: string, style: string, language: string) => `Generate unique story concept. Theme: ${theme}. Style: ${style}. Output JSON in ${language}: { premise, similarStories, uniqueTwist, genreTrends }`,
    
    // MODIFIED: Supports creation from scratch
    complexCharacters: (premise: string, language: string, setting: string) => `
        Create a cast of characters for a story with this premise: "${premise}".
        Setting: "${setting}".
        
        OUTPUT RULES:
        1. Output strictly valid JSON array.
        2. Language: ${language}.
        
        JSON Structure: 
        [ 
            { 
                "name": "Name", 
                "role": "MAIN / SUPPORTING / ANTAGONIST", 
                "personality": "Short personality traits", 
                "description": "Visual description (hair, eyes, clothes, distinguishing features)" 
            } 
        ]
    `,

    // NEW: Supports extraction from existing script
    extractCharactersFromText: (sourceText: string, language: string) => `
        Analyze the following story text/script.
        Identify the characters present in the text.
        
        OUTPUT RULES:
        1. Extract names directly from the text. Do not invent characters not mentioned.
        2. Infer visual descriptions based on the text context (or create fitting ones if not described).
        3. Output strictly valid JSON array.
        4. Language for descriptions: ${language}.

        JSON Structure: 
        [ 
            { 
                "name": "Name", 
                "role": "MAIN / SUPPORTING / ANTAGONIST", 
                "personality": "Inferred personality", 
                "description": "Visual description based on text" 
            } 
        ]

        Text Source (Excerpt):
        "${sourceText.substring(0, 30000)}..."
    `,
    
    seriesBible: (theme: string, style: string, language: string) => `Write Series Bible. Theme: ${theme}. Output JSON in ${language}: { worldSetting, mainConflict, characterArcs }`,

    continuityCheck: (panelsText: string, characters: string, worldSetting: string) => `Check script for logic/plot holes. Setting: ${worldSetting}. Characters: ${characters}. Script: ${panelsText}. Return plain text report.`,

    censor: (type: string, text: string) => `Check for hate/violence/sexual content. Content: ${text}. Return JSON: { passed: boolean, report: string }`,

    translatePanels: (panelsJson: string, languages: string[]) => `Translate 'dialogue' and 'caption' to ${languages.join(', ')}. Input: ${panelsJson}. Return JSON with 'translations' object added to each panel.`,
    
    voiceConsistency: (name: string, role: string, desc: string, voice: string, list: string) => `Check if voice '${voice}' fits character '${name}' (${role}, ${desc}). List: ${list}. JSON: { isSuitable, suggestion, reason }`,
    
    analyzeConsistency: (charName: string, style: string) => `
        Act as an Art Director. Evaluate the generated character image for "${charName}" against the target style "${style}".
        
        Criteria:
        1. Style Match: Does the image adhere to the visual techniques of "${style}" (e.g. cel-shading for Anime, screen tones for Manga, realistic lighting for Photoreal)?
        2. Anatomy & Quality: Are there severe deformities (extra fingers, distorted face) or artifacts?
        3. Character Fidelity: Is the character coherent?
        
        Strictly flag 'isConsistent: false' if the style is wrong OR if anatomy is significantly broken.
        
        Return JSON:
        {
            "isConsistent": boolean,
            "critique": "Short actionable feedback (< 20 words)."
        }
    `,
    
    summarizeChapter: (text: string) => `Summarize in 3 sentences: ${text}`
};
