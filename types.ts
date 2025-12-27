export enum AgentRole {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  MARKET_RESEARCHER = 'MARKET_RESEARCHER',
  SCRIPTWRITER = 'SCRIPTWRITER',
  CENSOR = 'CENSOR',
  TRANSLATOR = 'TRANSLATOR',
  CHARACTER_DESIGNER = 'CHARACTER_DESIGNER',
  PANEL_ARTIST = 'PANEL_ARTIST',
  CINEMATOGRAPHER = 'CINEMATOGRAPHER',
  VOICE_ACTOR = 'VOICE_ACTOR',
  PUBLISHER = 'PUBLISHER'
}

export interface Agent {
  id: AgentRole;
  name: string;
  avatar: string;
  description: string;
  color: string;
}

export interface ComicPanel {
  id: string;
  description: string;
  dialogue: string;
  caption?: string; // New: Narrator text
  charactersInvolved: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string; // Dialogue audio
  captionAudioUrl?: string; // New: Narrator audio
  isGenerating?: boolean;
  shouldAnimate?: boolean; // New: User choice for video
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  voice?: string; 
  isGenerating?: boolean;
}

export enum WorkflowStage {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING',
  SCRIPTING = 'SCRIPTING',
  CENSORING_SCRIPT = 'CENSORING_SCRIPT',
  DESIGNING_CHARACTERS = 'DESIGNING_CHARACTERS',
  VISUALIZING_PANELS = 'VISUALIZING_PANELS',
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

export interface ComicProject {
  title: string;
  theme: string;
  marketAnalysis?: string;
  censorReport?: string;
  isCensored: boolean;
  style: string;
  language: string;
  coverImage?: string;
  characters: Character[];
  panels: ComicPanel[];
  workflowStage: WorkflowStage;
  logs: SystemLog[];
}

export interface Message {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}
