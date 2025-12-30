
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
        - colorPalette: array of strings
        - keyThemes: array of strings

        Manuscript: "${scriptContent.substring(0, 15000)}..."
    `,

    // 2. Research Chat - Cultural Awareness
    researchChatSystem: (theme: string, format: string | null, language: string) => `
        You are the Editor-in-Chief.
        Context: Theme="${theme}", Format="${format}".
        
        STRICT LANGUAGE REQUIREMENT: You MUST speak in ${language}.
        
        Goal: Discuss the story direction. 
        Important: If the user suggests a specific culture (e.g. Vietnam), you must adapt all your advice to fit that culture's market and tropes. 
        Do not default to Western comic tropes unless requested.
    `,

    extractStrategy: (chatLog: string, language: string) => `
        Based on this chat, compile the Project Strategy.
        OUTPUT LANGUAGE: ${language}.
        
        Required JSON fields: 
        - suggestedTitle
        - targetAudience
        - visualStyle
        - narrativeStructure
        - estimatedChapters
        - worldSetting (Extract the specific location/culture discussed)
        - culturalContext (Any specific cultural notes mentioned)
        
        Chat Log: ${chatLog}
    `,

    // 3. Style Research (NEW)
    researchArtStyle: (style: string, culturalSetting: string, language: string) => `
        Act as an Art Director. Research and define the Visual Style Guide.
        
        Selected Style: "${style}"
        Cultural Setting: "${culturalSetting}"
        
        Task: Create a detailed description of how to draw this comic/animation to ensure it looks authentic to the style AND the culture.
        
        Specific Instructions:
        - If Style is "Manga", describe inking, screen tones (if B&W), or vibrant coloring (if Color), and dynamic paneling typical of Manga.
        - If Style is "2D Animation" or "Anime", describe cel-shading, line weight, and compositing to look like a frame from a show.
        - If Style is "3D Animation", describe lighting (e.g. subsurface scattering), texture quality, and rendering style (Pixar-esque vs Realistic).
        - If Style is "Gothic Horror", focus on deep shadows, high contrast (chiaroscuro), Victorian aesthetics, and a gloomy, oppressive atmosphere.
        - If Style is "Steampunk", emphasize brass, copper, gears, steam-powered machinery mixed with Victorian fashion, and sepia or warm metallic tones.
        - If Style is "Fantasy Art Nouveau", highlight intricate organic lines, floral borders, stained-glass aesthetics (Mucha style), and soft, harmonious colors.
        - If Cultural Setting is "Vietnam", describe Vietnamese facial features, common architectural details, and fashion nuances to avoid looking "Western" or "Generic Asian".
        
        Output a plain text paragraph (in ${language}) that can be used as a system instruction for an artist AI.
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
        Generate a character design for: ${name}.
        Visual Description: ${description}
        Art Style: ${styleGuide}
        Full body character design sheet, dynamic pose, expressive face, interesting angle, white background, high quality.
    `,

    // 5. Panel Art - Uses Style Guide & Setting
    panelImagePrompt: (styleGuide: string, description: string, charDesc: string, worldSetting: string) => `
        Generate a professional comic book panel.

        **SCENE CONTEXT:**
        - **Art Style:** ${styleGuide}
        - **Setting:** ${worldSetting} (Authentic architecture/props required).
        - **Characters:** ${charDesc}
        - **Action/Moment:** ${description}

        **VISUAL STORYTELLING DIRECTIVES (MANDATORY):**
        
        1. **DYNAMIC CAMERA ANGLE:** 
           - *Never* use a flat, eye-level shot unless it's a passport photo.
           - *Select one:* Low Angle (Heroic/Dominant), High Angle (Vulnerable/Establishing), Dutch Tilt (Unease/Action), Over-the-Shoulder (Intimate), or Worm's Eye (Grand scale).
        
        2. **COMPOSITION & DEPTH:**
           - Use **Foreground Elements** (blurred or dark) to frame the subject and create depth.
           - Use **Leading Lines** (roads, fences, limbs) to point to the focal point.
           - Rule of Thirds or Golden Ratio placement.
        
        3. **SHOT TYPE VARIETY:**
           - If detailing emotion: **Extreme Close-Up** (eyes/mouth).
           - If showing action: **Dynamic Full Shot** with foreshortening.
           - If establishing location: **Wide Shot** with atmospheric perspective.
        
        4. **LIGHTING MOOD:**
           - Use dramatic lighting: Rim light, Chiaroscuro (high contrast), Volumetric shafts of light, or Neon glow.
           - Shadows should define the volume of the scene.

        **OUTPUT INSTRUCTION:**
        Render this image as a finished, high-fidelity comic panel or anime screenshot. The composition must be bold and cinematic.
    `,

    // 6. Scripting
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
        Format: ${format}. Style: ${style}.
        Target Length: ${panelCount} panels.
        World Setting: ${worldSetting}.
        
        OUTPUT LANGUAGE: ${language}.
        
        Story Concept: ${concept}
        Characters: ${characters}
        Summary: ${summary}
        
        Output JSON: { "title": "...", "panels": [ { "description": "...", "dialogue": "...", "caption": "...", "charactersInvolved": [] } ] }
    `,

    // Helpers
    storyConcept: (theme: string, style: string, language: string) => `Generate unique story concept. Theme: ${theme}. Style: ${style}. Output JSON in ${language}: { premise, similarStories, uniqueTwist, genreTrends }`,
    
    complexCharacters: (premise: string, language: string, setting: string) => `Create character cast for: ${premise}. Setting: ${setting}. Output JSON in ${language}: [ { name, role, personality, description } ]. Names must fit the setting.`,
    
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
