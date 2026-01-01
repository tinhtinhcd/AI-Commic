
export const PROMPTS = {
    analyzeManuscript: (scriptContent: string, language: string) => `
        Act as a professional Literary Editor. Analyze this manuscript.
        CRITICAL OUTPUT RULES:
        1. Output JSON ONLY.
        2. All string values MUST be in ${language}.
        Extract: suggestedTitle, targetAudience, visualStyle, narrativeStructure, estimatedChapters, worldSetting, culturalContext, chapterOutlines, extractedCharacters, colorPalette, keyThemes.
        Manuscript: "${scriptContent.substring(0, 25000)}..."
    `,
    researchChatSystem: (theme: string, format: string | null, language: string) => `
        You are the Editor-in-Chief (Biên Tập Viên Chính). 
        Context: Theme="${theme}", Format="${format}".
        Language: ${language}.

        **CORE RESPONSIBILITIES:**
        1. **Strategy:** Analyze market trends, target audience, and **Competitor Pricing Models** (freemium, subscription, pay-per-chapter).
        2. **Engagement:** Propose **User Engagement Strategies** specifically for motion comics (e.g., interactive polls, gamified reading, cliffhanger timing).
        3. **Arc Planning:** Break long stories into manageable Arcs.
        4. **Task Management:** You have the power to assign tasks.

        **COMMAND PROTOCOL:**
        If actionable steps are needed, use:
        <<<CMD:ADD_TASK>>>{ "role": "SCRIPTWRITER", "description": "...", "targetChapter": 1 }<<<END_CMD>>>
        
        **BEHAVIOR:**
        - Be proactive. Discuss monetization and retention explicitly.
    `,
    extractStrategy: (chatLog: string, language: string) => `
        Based on this chat, compile the Project Strategy.
        OUTPUT LANGUAGE: ${language}.
        
        Required JSON fields: 
        - suggestedTitle
        - targetAudience
        - visualStyle
        - narrativeStructure
        - estimatedChapters (number string)
        - worldSetting
        - culturalContext
        - monetizationModel (Extract pricing strategy discussed: Freemium/Ad-supported/etc)
        - engagementStrategy (Extract retention tactics: Daily passes, comments, etc)
        
        Chat Log: ${chatLog}
    `,
    researchArtStyle: (style: string, culturalSetting: string, language: string) => `Define strict visual rules for style "${style}" in setting "${culturalSetting}". Output a technical prompt prefix in English.`,
    characterDesign: (name: string, styleGuide: string, description: string, worldSetting: string) => `Create image prompt for "${name}". Style: "${styleGuide}". Setting: "${worldSetting}". Desc: "${description}". Dynamic pose, expressive face.`,
    characterImagePrompt: (name: string, description: string, styleGuide: string) => `(Masterpiece), ${styleGuide}. Character Sheet: ${name}. Visuals: ${description}. Full body, white background.`,
    
    panelImagePrompt: (styleGuide: string, description: string, charDesc: string, worldSetting: string) => `
        (Masterpiece, Best Quality, Ultra-Detailed), ${styleGuide}.
        
        **VISUAL COMPOSITION & CAMERA:**
        - Use a **Dynamic Camera Angle** appropriate for the action (e.g., Low Angle for power, High Angle for vulnerability, Dutch Tilt for tension, Extreme Close-up for emotion).
        - **Depth of Field:** Ensure foreground/background separation to create depth. Avoid flat, 2D composition.
        - **Framing:** Use "Rule of Thirds" or "Golden Ratio" for interesting placement.
        - **Lighting:** Cinematic, dramatic lighting (e.g., Rim lighting, Volumetric fog, Chiaroscuro) matching the scene mood.

        **SCENE DETAILS:**
        - **Action:** ${description}
        - **Setting:** ${worldSetting} (Rich background details required).
        - **Characters:** ${charDesc}
    `,

    scriptGeneration: (chapterNumber: number, format: string | null, style: string, language: string, panelCount: number, concept: string, characters: string, summary: string, worldSetting: string) => `
        Write script for Chapter ${chapterNumber}. Format: ${format}. Panels: ~${panelCount}. Style: ${style}. Setting: ${worldSetting}. Lang: ${language}.
        Context: ${concept}, ${characters}, ${summary}.
        
        **CRITICAL INSTRUCTION FOR PANEL VISUALS:**
        - Do NOT just write "Character A talks". 
        - You MUST include specific **Camera Directions** in the 'description' field (e.g., "Worm's eye view looking up at...", "Over-the-shoulder shot of...", "Extreme close-up on eyes...", "Wide establishing shot of...").
        - **Vary the Layout:** Alternate between wide shots, medium shots, and close-ups to create visual rhythm.
        
        Return JSON: { "title": "...", "panels": [ { "description": "Visual description including SPECIFIC CAMERA ANGLE, action, and lighting", "dialogue": "...", "caption": "...", "charactersInvolved": [] } ] }
    `,
    
    storyConcept: (theme: string, style: string, language: string) => `Generate unique concept. Theme: ${theme}. Style: ${style}. Output JSON in ${language}: { premise, similarStories, uniqueTwist, genreTrends }`,
    complexCharacters: (premise: string, language: string, setting: string) => `Create cast for premise "${premise}" in "${setting}". JSON array in ${language}: { name, role, personality, description }`,
    extractCharactersFromText: (sourceText: string, language: string) => `Extract characters from text. JSON array in ${language}: { name, role, personality, description }. Text: "${sourceText.substring(0, 30000)}..."`,
    seriesBible: (theme: string, style: string, language: string) => `Write Series Bible. Theme: ${theme}. JSON in ${language}: { worldSetting, mainConflict, characterArcs }`,
    continuityCheck: (panelsText: string, characters: string, worldSetting: string) => `Check logic/plot holes. Setting: ${worldSetting}. Characters: ${characters}. Script: ${panelsText}. Return plain text report.`,
    censor: (type: string, text: string) => `Check for hate/violence/sexual content. Content: ${text}. Return JSON: { passed: boolean, report: string }`,
    translatePanels: (panelsJson: string, languages: string[]) => `Translate 'dialogue' and 'caption' to ${languages.join(', ')}. Input: ${panelsJson}. Return JSON with 'translations' object.`,
    voiceConsistency: (name: string, role: string, desc: string, voice: string, list: string) => `Check if voice '${voice}' fits '${name}'. List: ${list}. JSON: { isSuitable, suggestion, reason }`,
    analyzeConsistency: (charName: string, style: string) => `Evaluate character "${charName}" against style "${style}". JSON: { "isConsistent": boolean, "critique": "..." }`,
    summarizeChapter: (text: string) => `Summarize in 3 sentences: ${text}`,
    marketingCopy: (title: string, summary: string, audience: string, language: string) => `Create marketing copy for "${title}". Summary: ${summary}. Audience: ${audience}. Lang: ${language}. JSON: { blurb, socialPost, tagline }`
};
