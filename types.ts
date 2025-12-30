
export enum AgentRole {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  MARKET_RESEARCHER = 'MARKET_RESEARCHER',
  CONTINUITY_EDITOR = 'CONTINUITY_EDITOR',
  SCRIPTWRITER = 'SCRIPTWRITER',
  CENSOR = 'CENSOR',
  TRANSLATOR = 'TRANSLATOR',
  CHARACTER_DESIGNER = 'CHARACTER_DESIGNER',
  PANEL_ARTIST = 'PANEL_ARTIST',
  TYPESETTER = 'TYPESETTER',
  CINEMATOGRAPHER = 'CINEMATOGRAPHER',
  VOICE_ACTOR = 'VOICE_ACTOR',
  PUBLISHER = 'PUBLISHER',
  ARCHIVIST = 'ARCHIVIST'
}

export interface Agent {
  id: AgentRole;
  name: string;
  avatar: string;
  description: string;
  color: string;
  department: string;
}

export interface PanelTranslation {
    dialogue: string;
    caption?: string;
}

export interface ComicPanel {
  id: string;
  description: string;
  dialogue: string;
  caption?: string; 
  translations?: Record<string, PanelTranslation>; 
  charactersInvolved: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string; 
  captionAudioUrl?: string;
  isGenerating?: boolean;
  shouldAnimate?: boolean;
  duration?: number;
}

export interface CharacterVariant {
  id: string;
  imageUrl: string;
  style: string;
  timestamp: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  variants?: CharacterVariant[]; // History of designs
  voice?: string; 
  isGenerating?: boolean;
  isLocked?: boolean;
  role?: 'MAIN' | 'SUPPORTING' | 'ANTAGONIST';
  personality?: string;
  consistencyStatus?: 'PENDING' | 'PASS' | 'FAIL';
  consistencyReport?: string;
}

export interface BookPage {
    id: string;
    pageNumber: number;
    panels: string[];
    layoutType: 'GRID_2x2' | 'FULL_PAGE' | 'TEXT_HEAVY' | 'SPLASH';
    renderUrl?: string;
}

export enum WorkflowStage {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING',
  SCRIPTING = 'SCRIPTING',
  CENSORING_SCRIPT = 'CENSORING_SCRIPT',
  DESIGNING_CHARACTERS = 'DESIGNING_CHARACTERS',
  VISUALIZING_PANELS = 'VISUALIZING_PANELS',
  PRINTING = 'PRINTING',
  POST_PRODUCTION = 'POST_PRODUCTION',
  COMPLETED = 'COMPLETED'
}

export interface SystemLog {
  id: string;
  agentId: AgentRole;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface AgentTask {
    id: string;
    role: AgentRole;
    description: string;
    isCompleted: boolean;
    createdAt: number;
    type: 'USER' | 'SYSTEM';
    targetChapter?: number;
}

export interface ResearchData {
  suggestedTitle: string;
  targetAudience: string;
  visualStyle: string;
  narrativeStructure: string;
  estimatedChapters: string; 
  worldSetting: string; // Dynamic cultural setting
  culturalContext?: string; // Additional context notes
  chapterOutlines?: { chapterNumber: number; summary: string }[];
  colorPalette: string[];
  keyThemes: string[];
}

export interface StoryConcept {
    premise: string;
    similarStories: string[];
    uniqueTwist: string;
    genreTrends: string;
}

export interface ChapterArchive {
    chapterNumber: number;
    title: string;
    panels: ComicPanel[];
    summary: string;
    timestamp: number;
}

export type StoryFormat = 'SHORT_STORY' | 'LONG_SERIES' | 'EPISODIC' | null;
export type PublicationType = 'COMIC' | 'NOVEL';

export interface Message {
  role: 'user' | 'agent';
  senderId?: AgentRole;
  content: string;
  timestamp: number;
}

export interface ComicProject {
  id?: string;
  lastModified?: number;
  title: string;
  theme: string;
  storyFormat: StoryFormat;
  publicationType: PublicationType;
  modelTier?: 'STANDARD' | 'PREMIUM';
  originalScript?: string;
  masterLanguage: string;
  targetLanguages: string[];
  activeLanguage: string;
  totalChapters?: string; 
  currentChapter?: number;
  targetPanelCount?: number;
  completedChapters: ChapterArchive[];
  seriesBible?: {
      worldSetting: string;
      mainConflict: string;
      characterArcs: string;
  };
  storyConcept?: StoryConcept;
  researchChatHistory: Message[]; 
  marketAnalysis?: ResearchData | null;
  censorReport?: string;
  continuityReport?: string;
  isCensored: boolean;
  style: string;
  artStyleGuide?: string; // NEW: The AI's research on the chosen style
  language: string;
  coverImage?: string;
  characters: Character[];
  panels: ComicPanel[];
  pages?: BookPage[];
  agentTasks: AgentTask[];
  workflowStage: WorkflowStage;
  logs: SystemLog[];
}
