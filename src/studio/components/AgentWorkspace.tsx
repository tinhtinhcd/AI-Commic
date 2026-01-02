
/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { AgentRole, ComicProject, Character, WorkflowStage, ResearchData, Message, ChapterArchive, AgentTask, CharacterVariant, UserProfile, ImageProvider, ComicPanel } from '../types';
import { AGENTS, TRANSLATIONS } from '../constants';
import * as GeminiService from '../services/geminiService';
import * as StorageService from '../services/storageService';
import { WorkflowStateMachine } from '../services/workflowStateMachine';
import { Send, RefreshCw, CheckCircle, Loader2, Sparkles, BookOpen, Users, Megaphone, Video, Palette, Save, Globe, TrendingUp, ShieldAlert, Archive, Briefcase, Printer, ListTodo, Lock, Layout, Key } from 'lucide-react';
import { ManagerView } from './ManagerView';
import { ResearchView, WriterView, CharacterDesignerView, PanelArtistView } from './CreativeViews';
import { VoiceView, MotionView, TypesetterView, ContinuityView, CensorView, TranslatorView, PublisherView } from './ProductionViews';
import { UserProfileView } from './UserProfileView';
import AgentTodoList from './AgentTodoList';
import { useProjectManagement } from '../hooks/useProjectManagement';

interface AgentWorkspaceProps {
  role: AgentRole;
  project: ComicProject;
  updateProject: (updates: Partial<ComicProject>) => void;
  onAgentChange: (role: AgentRole) => void;
  uiLanguage: 'en' | 'vi';
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const SUPPORTED_LANGUAGES = ['English', 'Vietnamese', 'Japanese', 'Spanish', 'French', 'German', 'Chinese', 'Korean'];
// INCREASE DELAY TO 4 SECONDS to handle Free Tier rate limits (15 RPM)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const WORKFLOW_STEPS_CONFIG = [
  { id: WorkflowStage.RESEARCHING, labelKey: 'step.strategy', agent: AgentRole.MARKET_RESEARCHER, icon: TrendingUp },
  { id: WorkflowStage.SCRIPTING, labelKey: 'step.script', agent: AgentRole.SCRIPTWRITER, icon: BookOpen },
  { id: WorkflowStage.DESIGNING_CHARACTERS, labelKey: 'step.casting', agent: AgentRole.CHARACTER_DESIGNER, icon: Users },
  { id: WorkflowStage.VISUALIZING_PANELS, labelKey: 'step.storyboard', agent: AgentRole.PANEL_ARTIST, icon: Palette },
  { id: WorkflowStage.PRINTING, labelKey: 'step.printing', agent: AgentRole.TYPESETTER, icon: Printer },
  { id: WorkflowStage.POST_PRODUCTION, labelKey: 'step.motion', agent: AgentRole.CINEMATOGRAPHER, icon: Video },
  { id: WorkflowStage.COMPLETED, labelKey: 'step.publish', agent: AgentRole.PUBLISHER, icon: Megaphone },
];

const WORKFLOW_ORDER = [
    WorkflowStage.IDLE,
    WorkflowStage.RESEARCHING,
    WorkflowStage.SCRIPTING,
    WorkflowStage.CENSORING_SCRIPT,
    WorkflowStage.DESIGNING_CHARACTERS,
    WorkflowStage.VISUALIZING_PANELS,
    WorkflowStage.PRINTING,
    WorkflowStage.POST_PRODUCTION,
    WorkflowStage.COMPLETED
];

const createSystemTask = (role: AgentRole, desc: string, chapter?: number): AgentTask => ({
    id: crypto.randomUUID(),
    role,
    description: desc,
    isCompleted: false,
    createdAt: Date.now(),
    type: 'SYSTEM',
    targetChapter: chapter
});

const AgentViewWrapper: React.FC<{ 
    children: React.ReactNode;
    progressBar: React.ReactNode;
    todoList: React.ReactNode;
    isLoading?: boolean;
}> = ({ children, progressBar, todoList, isLoading }) => (
    <div className="h-full flex flex-col w-full relative overflow-y-auto">
        {isLoading && (
            <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin relative z-10"/>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-6 tracking-tight">LOADING WORKSPACE</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Initializing Agents & Assets...</p>
            </div>
        )}
        {progressBar}
        {todoList}
        {children}
    </div>
);

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ role, project, updateProject, onAgentChange, uiLanguage, currentUser, onUpdateUser }) => {
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [scriptStep, setScriptStep] = useState<'CONCEPT' | 'CASTING' | 'WRITING'>('CONCEPT');
  const [researchChatInput, setResearchChatInput] = useState('');
  const [showTodoList, setShowTodoList] = useState(false);
  const [managerViewMode, setManagerViewMode] = useState<'DASHBOARD' | 'PROFILE'>('DASHBOARD');
  const [voiceAnalysis, setVoiceAnalysis] = useState<Record<string, {isSuitable: boolean, suggestion: string, reason: string}>>({});
  const [analyzingVoiceId, setAnalyzingVoiceId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const writerLogsEndRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef(project);

  const t = (key: string) => (TRANSLATIONS[uiLanguage] as any)[key] || key;
  const isLongFormat = project.storyFormat === 'LONG_SERIES' || project.storyFormat === 'EPISODIC' || project.publicationType === 'NOVEL';

  const { 
      saveStatus, activeProjects, library, 
      handleSaveWIP, handleLoadWIP, handleDeleteWIP, handleDeleteFromLibrary,
      handleExportProjectZip, handleImportProjectZip, 
      switchProjectLanguage, handleAddLanguage, addLog,
      isProjectLoading 
  } = useProjectManagement(
      { ...project, ownerId: currentUser.id }, 
      updateProject, 
      uiLanguage
  );

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => {
    if (role === AgentRole.PROJECT_MANAGER) (logsEndRef.current as any)?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.SCRIPTWRITER && loading) (writerLogsEndRef.current as any)?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.MARKET_RESEARCHER) (chatEndRef.current as any)?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.SCRIPTWRITER && (project.panels || []).length > 0) setScriptStep('WRITING');
  }, [project.logs, role, project.panels, loading]);

  const handleImportManuscript = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = (e.target as any).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          updateProject({ originalScript: content });
          addLog(AgentRole.PROJECT_MANAGER, `Manuscript imported (${file.name}). Length: ${content.length} chars.`, 'success');
      };
      reader.readAsText(file);
  };

  const checkApiKeyRequirement = async () => {
    if (!GeminiService.getDynamicApiKey()) {
        (window as any).alert("⚠️ MISSING API KEY!\n\nFeature requires a valid API Key. Please add one in Settings or use the Emergency Key input.");
    }
  };

  const attemptTransition = (target: WorkflowStage, callback?: () => void) => {
      const result = WorkflowStateMachine.canTransitionTo(project, target);
      if (result.allowed) {
          updateProject({ workflowStage: target });
          if (callback) callback();
      } else {
          (window as any).alert(result.reason || "Transition not allowed.");
      }
  };

  const getCurrentStageIndex = () => WORKFLOW_ORDER.indexOf(project.workflowStage);
  const getStepStageIndex = (stepId: WorkflowStage) => WORKFLOW_ORDER.indexOf(stepId);

  const renderProgressBar = () => {
    const currentStageIdx = getCurrentStageIndex();
    const activeTasksCount = (project.agentTasks || []).filter(task => task.role === role && !task.isCompleted).length;

    return (
      <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4 mb-6 sticky top-0 z-40 transition-colors">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 flex-1 mr-4">
            {WORKFLOW_STEPS_CONFIG.map((step, idx) => {
                const stepStageIdx = getStepStageIndex(step.id);
                const effectiveCurrentIdx = (project.workflowStage === WorkflowStage.CENSORING_SCRIPT) 
                    ? getStepStageIndex(WorkflowStage.SCRIPTING) 
                    : currentStageIdx;

                const isUnlocked = effectiveCurrentIdx >= stepStageIdx;
                const isCurrentView = role === step.agent;
                
                let statusColor = '';
                if (isCurrentView) {
                     statusColor = 'text-white bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none';
                } else if (isUnlocked) {
                     statusColor = effectiveCurrentIdx > stepStageIdx 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                        : 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800';
                } else {
                     statusColor = 'text-gray-400 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 cursor-not-allowed';
                }

                return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none group min-w-[120px]">
                    <button 
                        onClick={() => isUnlocked && onAgentChange(step.agent)} 
                        disabled={!isUnlocked}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all whitespace-nowrap w-full justify-center ${statusColor}`}
                    >
                        {!isUnlocked ? <Lock className="w-3 h-3"/> : <step.icon className={`w-4 h-4 ${isCurrentView ? 'animate-pulse' : ''}`} />}
                        <span className="">{t(step.labelKey)}</span>
                    </button>
                    {idx < WORKFLOW_STEPS_CONFIG.length - 1 && (<div className={`h-0.5 w-full mx-2 rounded-full transition-all ${effectiveCurrentIdx > stepStageIdx ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />)}
                </div>
                );
            })}
          </div>
          
          <div className="flex gap-2">
              <button 
                  onClick={() => setShowTodoList(!showTodoList)} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm border ${showTodoList ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                  title="Todo List"
              >
                  <ListTodo className="w-4 h-4" />
                  {activeTasksCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-bounce">{activeTasksCount}</span>
                  )}
              </button>
              
              <button onClick={handleSaveWIP} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${saveStatus === 'SAVING' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' : saveStatus === 'SAVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-gray-900 text-white hover:bg-indigo-600 dark:bg-gray-700 dark:hover:bg-indigo-500'}`}>
                 {saveStatus === 'SAVING' ? <Loader2 className="w-3 h-3 animate-spin"/> : saveStatus === 'SAVED' ? <CheckCircle className="w-3 h-3"/> : <Save className="w-3 h-3"/>}
                 {saveStatus === 'SAVING' ? t('ui.saving') : saveStatus === 'SAVED' ? t('ui.saved') : t('ui.save')}
              </button>
          </div>
        </div>
      </div>
    );
  };

  const handleStartResearch = async () => {
      onAgentChange(AgentRole.MARKET_RESEARCHER);
      attemptTransition(WorkflowStage.RESEARCHING);
      
      if (!project.agentTasks || !project.agentTasks.some(t => t.role === AgentRole.MARKET_RESEARCHER)) {
          const researchTasks = [
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Analyze Theme & Genre`),
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Identify Target Audience`),
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Finalize Strategy Form`)
          ];
          updateProject({ agentTasks: [...(projectRef.current.agentTasks || []), ...researchTasks] });
      }
      
      if (project.theme && (!project.researchChatHistory || project.researchChatHistory.length === 0)) {
          setLoading(true);
          try {
              const aiResponseText = await GeminiService.sendResearchChatMessage([], `Brief: "${project.theme}"`, { theme: project.theme, storyFormat: project.storyFormat, totalChapters: project.totalChapters, language: project.masterLanguage, originalScript: project.originalScript }, project.modelTier || 'STANDARD');
              const userMsg: Message = { role: 'user', content: `Brief: "${project.theme}"`, timestamp: Date.now() };
              updateProject({ researchChatHistory: [userMsg, { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: aiResponseText, timestamp: Date.now() + 1 }] });
          } catch (e) { } finally { setLoading(false); }
      }
  };

  const handleResearchChatSend = async () => {
      if (!researchChatInput.trim()) return;
      const userMsg: Message = { role: 'user', content: researchChatInput, timestamp: Date.now() };
      const newHistory = [...(project.researchChatHistory || []), userMsg];
      updateProject({ researchChatHistory: newHistory });
      setResearchChatInput(''); setLoading(true);
      try {
          const aiResponseText = await GeminiService.sendResearchChatMessage(newHistory, researchChatInput, { theme: project.theme, storyFormat: project.storyFormat, totalChapters: project.totalChapters, language: project.masterLanguage, originalScript: project.originalScript }, project.modelTier || 'STANDARD');
          updateProject({ researchChatHistory: [...newHistory, { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: aiResponseText, timestamp: Date.now() + 1 }] });
      } catch (e) { addLog(AgentRole.MARKET_RESEARCHER, "Chat failed.", 'error'); } finally { setLoading(false); }
  };

  const handleUpdateMarketAnalysis = (data: ResearchData) => updateProject({ marketAnalysis: data });
  
  const handleFinalizeStrategyFromChat = async () => { 
      setLoading(true); 
      try { 
          const analysis = await GeminiService.extractStrategyFromChat(project.researchChatHistory, project.masterLanguage, project.modelTier || 'STANDARD'); 
          const updatedProject = { ...project, marketAnalysis: analysis, title: analysis.suggestedTitle };
          updateProject(updatedProject); 
          
          if (WorkflowStateMachine.canTransitionTo(updatedProject, WorkflowStage.SCRIPTING).allowed) {
              updateProject({ workflowStage: WorkflowStage.SCRIPTING });
              addLog(AgentRole.MARKET_RESEARCHER, "Strategy Approved. Moving to Scripting.", 'success');
              setTimeout(() => onAgentChange(AgentRole.SCRIPTWRITER), 1000); 
          }
      } catch (e) { 
          addLog(AgentRole.MARKET_RESEARCHER, "Failed.", 'error'); 
      } finally { 
          setLoading(false); 
      } 
  };
  
  const handleApproveResearchAndScript = async () => { 
      onAgentChange(AgentRole.SCRIPTWRITER); 
      attemptTransition(WorkflowStage.SCRIPTING);
  };

  const handleApproveScriptAndVisualize = async () => { 
      attemptTransition(WorkflowStage.DESIGNING_CHARACTERS, () => {
          onAgentChange(AgentRole.CHARACTER_DESIGNER);
          addLog(AgentRole.PROJECT_MANAGER, "Script Approved. Starting Character Design.", 'success');
      });
  };

  const handleFinishCharacterDesign = async () => { 
      attemptTransition(WorkflowStage.VISUALIZING_PANELS, () => {
          onAgentChange(AgentRole.PANEL_ARTIST);
          addLog(AgentRole.CHARACTER_DESIGNER, "Cast Finalized. Starting Storyboard.", 'success');
      });
  };

  const handleFinishPanelArt = () => { 
      attemptTransition(WorkflowStage.PRINTING, () => {
          onAgentChange(AgentRole.TYPESETTER);
          addLog(AgentRole.PANEL_ARTIST, "Art Complete. Moving to Layout.", 'success');
      });
  };

  const handleFinishPrinting = () => { 
      attemptTransition(WorkflowStage.POST_PRODUCTION, () => {
          onAgentChange(AgentRole.CINEMATOGRAPHER);
          addLog(AgentRole.TYPESETTER, "Layout Finalized. Sending to Post.", 'success');
      });
  };

  const handleFinalizeProduction = async () => { 
      attemptTransition(WorkflowStage.COMPLETED, () => {
          onAgentChange(AgentRole.PUBLISHER);
          addLog(AgentRole.CINEMATOGRAPHER, "Production Wrapped. Ready for Publishing.", 'success');
      });
  };

  // --- FIXED GENERATION HANDLERS (With Key Support) ---

  const handleGenerateAllCharacters = async (style: string, key?: string, provider?: ImageProvider) => {
      if (!project.characters || project.characters.length === 0) { 
          (window as any).alert("No characters found. Please ensure the Cast has been generated in the Scriptwriter step."); 
          return; 
      } 
      setLoading(true); 
      updateProject({ style }); 
      const currentImageModel = project.imageModel || 'gemini-2.5-flash-image'; 
      addLog(AgentRole.CHARACTER_DESIGNER, `Starting batch generation for ${project.characters.length} characters. Style: ${style}. Engine: ${provider || 'GEMINI'}`, 'info'); 
      
      const charsStart = project.characters.map(c => { if (c.isLocked && c.imageUrl) return c; return { ...c, isGenerating: true, error: undefined }; }); 
      updateProject({ characters: [...charsStart] }); 
      
      await delay(100); 
      try { 
          const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; 
          let styleGuide = project.artStyleGuide; 
          try { 
              if (!styleGuide || !styleGuide.includes(style)) { 
                  styleGuide = await GeminiService.generateArtStyleGuide(style, worldSetting, project.masterLanguage, project.modelTier); 
                  updateProject({ artStyleGuide: styleGuide }); 
                  addLog(AgentRole.CHARACTER_DESIGNER, "New Style Guide enforced.", 'success'); 
              } 
          } catch (err) { 
              styleGuide = `Style: ${style}. Setting: ${worldSetting}`; 
          } 
          
          const workingChars = [...charsStart]; 
          for (let i = 0; i < workingChars.length; i++) { 
              if (workingChars[i].isLocked && workingChars[i].imageUrl) continue; 
              addLog(AgentRole.CHARACTER_DESIGNER, `Generating ${workingChars[i].name}...`, 'info'); 
              try { 
                  // PASS KEY HERE
                  const result = await GeminiService.generateCharacterDesign(
                      workingChars[i].name, 
                      styleGuide!, 
                      workingChars[i].description, 
                      worldSetting, 
                      project.modelTier || 'STANDARD', 
                      currentImageModel, 
                      workingChars[i].referenceImage, 
                      key,
                      provider
                  ); 
                  workingChars[i] = { ...workingChars[i], imageUrl: result.imageUrl, description: result.description, isGenerating: false, error: undefined, variants: [...(workingChars[i].variants || []), { id: crypto.randomUUID(), imageUrl: result.imageUrl, style: style, timestamp: Date.now() }] }; 
              } catch (e: any) { 
                  workingChars[i] = { ...workingChars[i], isGenerating: false, error: e.message }; 
                  addLog(AgentRole.CHARACTER_DESIGNER, `Failed: ${workingChars[i].name}. ${e.message}`, 'error'); 
              } 
              updateProject({ characters: [...workingChars] }); 
              // SLOW DOWN for free tier
              await delay(4000); 
          } 
          addLog(AgentRole.CHARACTER_DESIGNER, "Batch generation complete.", 'success'); 
      } catch (e: any) { 
          addLog(AgentRole.CHARACTER_DESIGNER, `Process error: ${e.message}`, 'error'); 
          const charsReset = project.characters.map(c => ({ ...c, isGenerating: false })); 
          updateProject({ characters: charsReset }); 
      } finally { 
          setLoading(false); 
      } 
  };

  const handleStartPanelGeneration = async (selectedStyle: string, key?: string, provider?: ImageProvider) => {
      setLoading(true); 
      try { 
          const currentImageModel = project.imageModel || 'gemini-2.5-flash-image'; 
          addLog(AgentRole.PANEL_ARTIST, `Drawing ${project.panels.length} panels in style: ${selectedStyle} (Engine: ${provider || 'GEMINI'})...`, 'info'); 
          updateProject({ style: selectedStyle, imageProvider: provider }); 
          
          const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; 
          let styleGuide = project.artStyleGuide; 
          if (!styleGuide || !styleGuide.includes(selectedStyle)) { 
              try { 
                  styleGuide = await GeminiService.generateArtStyleGuide(selectedStyle, worldSetting, project.masterLanguage, project.modelTier); 
                  updateProject({ artStyleGuide: styleGuide }); 
              } catch (e) { 
                  styleGuide = `Style: ${selectedStyle}`; 
              } 
          } 
          
          let updatedPanels = [...project.panels]; 
          for (let i = 0; i < updatedPanels.length; i++) { 
              if (!updatedPanels[i].imageUrl) { 
                  updatedPanels[i] = { ...updatedPanels[i], isGenerating: true }; 
                  updateProject({ panels: [...updatedPanels] }); 
                  try { 
                      // Pass asset if locked
                      let assetImage = undefined;
                      if (updatedPanels[i].backgroundAssetId) {
                          const asset = project.assets.find(a => a.id === updatedPanels[i].backgroundAssetId);
                          if (asset) assetImage = asset.imageUrl;
                      }

                      const imageUrl = await GeminiService.generatePanelImage(updatedPanels[i], styleGuide!, project.characters, worldSetting, project.modelTier || 'STANDARD', currentImageModel, assetImage, key, provider); 
                      updatedPanels[i] = { ...updatedPanels[i], imageUrl, isGenerating: false }; 
                  } catch (error: any) { 
                      updatedPanels[i] = { ...updatedPanels[i], isGenerating: false }; 
                      addLog(AgentRole.PANEL_ARTIST, `Panel ${i+1} failed: ${error.message}`, 'error');
                  } 
                  updateProject({ panels: [...updatedPanels] }); 
                  // SLOW DOWN for free tier
                  await delay(2000);
              } 
          } 
          addLog(AgentRole.PANEL_ARTIST, "Panels ready.", 'success'); 
      } finally { 
          setLoading(false); 
      } 
  };

  const handleRegenerateSinglePanel = async (panel: ComicPanel, index: number, key?: string, provider?: ImageProvider) => { 
      const panelsBefore = [...project.panels]; 
      panelsBefore[index] = { ...panelsBefore[index], isGenerating: true }; 
      updateProject({ panels: panelsBefore }); 
      try { 
          const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; 
          const styleGuide = project.artStyleGuide || `Style: ${project.style}`; 
          const currentImageModel = project.imageModel || 'gemini-2.5-flash-image'; 
          
          let assetImage = undefined;
          if (panel.backgroundAssetId) {
              const asset = project.assets.find(a => a.id === panel.backgroundAssetId);
              if (asset) assetImage = asset.imageUrl;
          }

          const imageUrl = await GeminiService.generatePanelImage(panel, styleGuide, project.characters, worldSetting, project.modelTier || 'STANDARD', currentImageModel, assetImage, key, provider); 
          const newPanels = [...project.panels]; 
          newPanels[index] = { ...newPanels[index], imageUrl, isGenerating: false }; 
          updateProject({ panels: newPanels }); 
      } catch (e: any) { 
          const newPanels = [...project.panels]; 
          newPanels[index] = { ...newPanels[index], isGenerating: false }; 
          updateProject({ panels: newPanels }); 
          addLog(AgentRole.PANEL_ARTIST, `Regen failed: ${e.message}`, 'error');
      } 
  };

  const handleRegenerateSingleCharacter = async (char: Character, index: number, specificStyle?: string, key?: string) => {
      const charsStart = [...project.characters];
      charsStart[index] = { ...charsStart[index], isGenerating: true, error: undefined };
      updateProject({ characters: charsStart });
      
      const styleToUse = specificStyle || project.style;
      const currentImageModel = project.imageModel || 'gemini-2.5-flash-image';
      
      try {
          const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; 
          let styleGuide = project.artStyleGuide; 
          if (!styleGuide) styleGuide = `Style: ${styleToUse}`;
          
          // Note: Regenerate uses Gemini by default unless provider is passed (currently not passed in this function signature, defaulting to Gemini)
          // To fix this, we would need to pass provider here too, but for now we assume Gemini for single regen or update signature later.
          // For consistency with batch, we will stick to default (Gemini) as it was before, unless we update the view to pass provider.
          const result = await GeminiService.generateCharacterDesign(char.name, styleGuide, char.description, worldSetting, project.modelTier || 'STANDARD', currentImageModel, char.referenceImage, key);
          
          const newVariant: CharacterVariant = { id: crypto.randomUUID(), imageUrl: result.imageUrl, style: styleToUse, timestamp: Date.now() };
          const charsDone = [...projectRef.current.characters];
          charsDone[index] = { ...charsDone[index], imageUrl: result.imageUrl, variants: [...(charsDone[index].variants || []), newVariant], description: result.description, isGenerating: false };
          updateProject({ characters: charsDone });
      } catch (e: any) {
          const charsFail = [...project.characters];
          charsFail[index] = { ...charsFail[index], isGenerating: false, error: e.message };
          updateProject({ characters: charsFail });
          addLog(AgentRole.CHARACTER_DESIGNER, `Failed: ${e.message}`, 'error');
      }
  };

  // Re-exported stubs for simple actions
  const handleExportScript = () => { const dataStr = JSON.stringify(project.panels, null, 2); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', `${project.title || 'comic'}_ch${project.currentChapter || 1}_script.json`); linkElement.click(); };
  const handleImportScript = (e: React.ChangeEvent<HTMLInputElement>) => { const file = (e.target as any).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const importedPanels = JSON.parse(event.target?.result as string); if (Array.isArray(importedPanels)) { updateProject({ panels: importedPanels, workflowStage: WorkflowStage.CENSORING_SCRIPT }); addLog(AgentRole.SCRIPTWRITER, `Script imported.`, 'success'); } } catch (err) {} }; reader.readAsText(file); };
  const handleSelectCharacterVariant = (charIndex: number, variant: CharacterVariant) => { const newChars = [...project.characters]; newChars[charIndex] = { ...newChars[charIndex], imageUrl: variant.imageUrl }; updateProject({ characters: newChars }); };
  const handleUpdateCharacterDescription = (index: number, value: string) => { const newChars = [...project.characters]; newChars[index] = { ...newChars[index], description: value }; updateProject({ characters: newChars }); };
  const handleUpdateCharacterVoice = (index: number, voice: string) => { const newChars = [...project.characters]; newChars[index] = { ...newChars[index], voice }; updateProject({ characters: newChars }); };
  const toggleCharacterLock = (charId: string) => { const newChars = project.characters.map(c => { if (c.id === charId) return { ...c, isLocked: !c.isLocked }; return c; }); updateProject({ characters: newChars }); };
  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>, charIndex: number) => { const file = (e.target as any).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = async () => { const base64 = reader.result as string; const newChars = [...project.characters]; newChars[charIndex] = { ...newChars[charIndex], imageUrl: base64, isGenerating: false, isLocked: true }; updateProject({ characters: newChars }); }; reader.readAsDataURL(file); };
  const handleCheckConsistency = async (char: Character, index: number) => { if (!char.imageUrl) return; const newChars = [...project.characters]; newChars[index] = { ...newChars[index], isGenerating: true }; updateProject({ characters: newChars }); try { const result = await GeminiService.analyzeCharacterConsistency(char.imageUrl, project.style, char.name, project.modelTier || 'STANDARD'); newChars[index] = { ...newChars[index], isGenerating: false, consistencyStatus: result.isConsistent ? 'PASS' : 'FAIL', consistencyReport: result.critique }; addLog(AgentRole.CHARACTER_DESIGNER, `Consistency check for ${char.name}: ${result.isConsistent ? 'PASS' : 'FAIL'}`, result.isConsistent ? 'success' : 'warning'); } catch (e: any) { newChars[index] = { ...newChars[index], isGenerating: false }; addLog(AgentRole.CHARACTER_DESIGNER, `Check failed: ${e.message}`, 'error'); } updateProject({ characters: newChars }); };
  const handleForceExtractCast = async () => { setLoading(true); try { let textToAnalyze = project.panels.map(p => `${p.charactersInvolved.join(', ')} ${p.description} ${p.dialogue}`).join("\n"); if (textToAnalyze.length < 50) { textToAnalyze = project.originalScript || ""; } if (textToAnalyze.length < 50) { (window as any).alert("Chưa có nội dung kịch bản để phân tích. (Script is empty)"); setLoading(false); return; } addLog(AgentRole.SCRIPTWRITER, "Scanning script for characters...", 'info'); const concept = project.storyConcept || { premise: "Comic Story", similarStories: [], uniqueTwist: "", genreTrends: "" }; const newChars = await GeminiService.generateComplexCharacters(concept, project.masterLanguage, project.seriesBible?.worldSetting || "Standard", project.modelTier || 'STANDARD', textToAnalyze); const mergedChars = [...project.characters]; let added = 0; newChars.forEach(nc => { const existingIndex = mergedChars.findIndex(c => c.name.toLowerCase().trim() === nc.name.toLowerCase().trim()); if (existingIndex === -1) { mergedChars.push({ ...nc, id: crypto.randomUUID(), voice: AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)] }); added++; } }); updateProject({ characters: mergedChars }); addLog(AgentRole.SCRIPTWRITER, `Found ${added} new characters. Total: ${mergedChars.length}`, 'success'); } catch (e: any) { addLog(AgentRole.SCRIPTWRITER, "Extraction Error: " + e.message, 'error'); } finally { setLoading(false); } };
  const handleVerifyVoice = async (char: Character) => { setAnalyzingVoiceId(char.id); try { const result = await GeminiService.verifyCharacterVoice(char, char.voice || 'Puck'); setVoiceAnalysis(prev => ({ ...prev, [char.id]: result })); addLog(AgentRole.VOICE_ACTOR, `Analyzed voice for ${char.name}: ${result.isSuitable ? "Suitable" : "Mismatch"}`, result.isSuitable ? 'success' : 'warning'); } catch (e) { console.error(e); addLog(AgentRole.VOICE_ACTOR, "Voice analysis failed", 'error'); } finally { setAnalyzingVoiceId(null); } };
  const applyVoiceSuggestion = (charIndex: number, suggestedVoice: string) => { handleUpdateCharacterVoice(charIndex, suggestedVoice); setVoiceAnalysis(prev => { const newState = {...prev}; delete newState[project.characters[charIndex].id]; return newState; }); };
  const handleLoadProject = (p: ComicProject) => { updateProject(p); addLog(AgentRole.ARCHIVIST, `Loaded: ${p.title}`, 'info'); onAgentChange(AgentRole.PROJECT_MANAGER); };
  const handleGeneratePanelVideo = async (panel: ComicPanel, index: number) => { if ((window as any).aistudio) { const hasKey = await (window as any).aistudio.hasSelectedApiKey(); if (!hasKey) { await (window as any).aistudio.openSelectKey(); } } const newPanels = [...project.panels]; newPanels[index] = { ...newPanels[index], isGenerating: true }; updateProject({ panels: newPanels }); try { addLog(AgentRole.CINEMATOGRAPHER, `Generating video for panel ${index+1}...`, 'info'); const videoUrl = await GeminiService.generatePanelVideo(panel, project.style); const updatedPanels = [...project.panels]; updatedPanels[index] = { ...updatedPanels[index], videoUrl: videoUrl, isGenerating: false, shouldAnimate: true }; updateProject({ panels: updatedPanels }); addLog(AgentRole.CINEMATOGRAPHER, `Video generated.`, 'success'); } catch (e: any) { console.error("Video generation error:", e); const errorMsg = e.message || JSON.stringify(e); if (errorMsg.includes("Requested entity was not found") || e.status === 404 || (e.error && e.error.code === 404)) { addLog(AgentRole.CINEMATOGRAPHER, "Access denied. Please select a valid Paid API Key for Veo.", 'warning'); if ((window as any).aistudio) { await (window as any).aistudio.openSelectKey(); } } else { addLog(AgentRole.CINEMATOGRAPHER, `Generation failed: ${errorMsg}`, 'error'); } const updatedPanels = [...project.panels]; updatedPanels[index] = { ...updatedPanels[index], isGenerating: false }; updateProject({ panels: updatedPanels }); } };
  const handleRunContinuityCheck = async () => { setLoading(true); addLog(AgentRole.CONTINUITY_EDITOR, "Analyzing script logic...", 'info'); try { const report = await GeminiService.checkContinuity(project.panels, project.characters, project.seriesBible, project.modelTier); updateProject({ continuityReport: report }); addLog(AgentRole.CONTINUITY_EDITOR, "Continuity check complete.", 'success'); } catch (e) { addLog(AgentRole.CONTINUITY_EDITOR, "Analysis failed.", 'error'); } finally { setLoading(false); } };
  const handleRunCensorCheck = async () => { setLoading(true); addLog(AgentRole.CENSOR, "Running compliance scan...", 'info'); try { const fullText = project.panels.map(p => p.description + " " + p.dialogue).join("\n"); const result = await GeminiService.censorContent(fullText, 'SCRIPT'); updateProject({ censorReport: result.report, isCensored: !result.passed }); addLog(AgentRole.CENSOR, result.passed ? "Content passed safety checks." : "Safety issues detected.", result.passed ? 'success' : 'warning'); } catch(e) { addLog(AgentRole.CENSOR, "Compliance check failed.", 'error'); } finally { setLoading(false); } };
  const handleRevertStage = () => { if (!(window as any).confirm("Are you sure you want to revert to the previous stage?")) return; const currentIdx = getCurrentStageIndex(); if (currentIdx > 0) { const prevStage = WORKFLOW_ORDER[currentIdx - 1]; updateProject({ workflowStage: prevStage }); addLog(AgentRole.PROJECT_MANAGER, `Reverted stage to ${prevStage}`, 'warning'); const prevAgent = WORKFLOW_STEPS_CONFIG.find(s => s.id === prevStage)?.agent || AgentRole.PROJECT_MANAGER; onAgentChange(prevAgent); } };
  const handleJumpToChapter = (chapterNum: number) => { const isCurrentActive = project.currentChapter === chapterNum; if (isCurrentActive) { onAgentChange(AgentRole.SCRIPTWRITER); return; } if (project.panels.length > 0) { const confirmSwitch = (window as any).confirm(`Switching to Chapter ${chapterNum} will archive current Chapter ${project.currentChapter}. Continue?`); if (!confirmSwitch) return; const chapterData: ChapterArchive = { chapterNumber: project.currentChapter || 1, title: `Chapter ${project.currentChapter || 1}`, panels: [...project.panels], summary: "Auto-archived on switch", timestamp: Date.now() }; const cleanArchives = (project.completedChapters || []).filter(c => c.chapterNumber !== chapterData.chapterNumber); const targetArchived = project.completedChapters?.find(c => c.chapterNumber === chapterNum); updateProject({ completedChapters: [...cleanArchives, chapterData], currentChapter: chapterNum, panels: targetArchived ? targetArchived.panels : [], workflowStage: WorkflowStage.SCRIPTING }); } else { const targetArchived = project.completedChapters?.find(c => c.chapterNumber === chapterNum); updateProject({ currentChapter: chapterNum, panels: targetArchived ? targetArchived.panels : [], workflowStage: WorkflowStage.SCRIPTING }); } addLog(AgentRole.PROJECT_MANAGER, `Switched workspace to Chapter ${chapterNum}`, 'info'); onAgentChange(AgentRole.SCRIPTWRITER); };

  if (role === AgentRole.PROJECT_MANAGER) {
      return (
        <AgentViewWrapper progressBar={renderProgressBar()} todoList={showTodoList && <AgentTodoList role={role} project={project} updateProject={updateProject} t={t} onClose={() => setShowTodoList(false)} />} isLoading={isProjectLoading}>
            <div className="max-w-7xl mx-auto w-full px-6 pb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <img src={AGENTS[role].avatar} alt="Manager" className="w-16 h-16 rounded-full border border-gray-100 dark:border-gray-600 shadow-md" />
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t(AGENTS[role].name)}</h2>
                            <div className="flex items-center gap-2">
                                {project.panels.length > 0 && (<div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded-full shadow-sm flex items-center gap-2"><Globe className="w-3 h-3 text-gray-400"/><span className="text-xs text-gray-500 dark:text-gray-300 font-bold uppercase">{t('ui.reviewing')}:</span><select value={project.activeLanguage} onChange={(e) => switchProjectLanguage((e.target as any).value)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-transparent outline-none cursor-pointer">{project.targetLanguages.map(l => <option key={l} value={l}>{l}</option>)}</select></div>)}
                            </div>
                        </div>
                    </div>
                    {/* View Switcher: Dashboard vs Profile */}
                    <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button 
                            onClick={() => setManagerViewMode('DASHBOARD')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${managerViewMode === 'DASHBOARD' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Layout className="w-4 h-4"/> Dashboard
                        </button>
                        <button 
                            onClick={() => setManagerViewMode('PROFILE')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${managerViewMode === 'PROFILE' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Key className="w-4 h-4"/> Profile & Keys
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-8">
                    <div className="lg:col-span-3">
                        {managerViewMode === 'DASHBOARD' ? (
                            <ManagerView 
                                project={project} activeProjects={activeProjects} updateProject={updateProject} 
                                handleLoadWIP={handleLoadWIP} handleDeleteWIP={handleDeleteWIP} handleStartResearch={handleStartResearch} 
                                handleApproveResearchAndScript={handleApproveResearchAndScript} handleApproveScriptAndVisualize={handleApproveScriptAndVisualize} 
                                handleFinalizeProduction={handleFinalizeProduction} handleImportManuscript={handleImportManuscript} 
                                handleExportProjectZip={handleExportProjectZip} handleImportProjectZip={handleImportProjectZip} 
                                handleRevertStage={handleRevertStage}
                                handleJumpToChapter={handleJumpToChapter}
                                handleAddLanguage={handleAddLanguage} 
                                setInputText={setInputText} inputText={inputText} 
                                loading={loading} t={t} isLongFormat={isLongFormat} supportedLanguages={SUPPORTED_LANGUAGES}
                            />
                        ) : (
                            <UserProfileView user={currentUser} onUpdate={onUpdateUser} />
                        )}
                    </div>
                </div>
            </div>
        </AgentViewWrapper>
      );
  }
  
  const commonTodoList = showTodoList ? <AgentTodoList role={role} project={project} updateProject={updateProject} t={t} onClose={() => setShowTodoList(false)} /> : null;
  const progressBar = renderProgressBar();

  // Route to specific role views
  if (role === AgentRole.MARKET_RESEARCHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><ResearchView project={project} handleResearchChatSend={handleResearchChatSend} researchChatInput={researchChatInput} setResearchChatInput={setResearchChatInput} handleFinalizeStrategyFromChat={handleFinalizeStrategyFromChat} handleUpdateMarketAnalysis={handleUpdateMarketAnalysis} updateProject={updateProject} loading={loading} t={t} chatEndRef={chatEndRef} role={role}/></AgentViewWrapper>;
  if (role === AgentRole.SCRIPTWRITER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><WriterView project={project} handleImportScript={handleImportScript} handleExportScript={handleExportScript} handleApproveResearchAndScript={handleApproveResearchAndScript} handleForceExtractCast={handleForceExtractCast} updateProject={updateProject} loading={loading} t={t} scriptStep={scriptStep} writerLogsEndRef={writerLogsEndRef} role={role} isLongFormat={isLongFormat}/></AgentViewWrapper>;
  if (role === AgentRole.VOICE_ACTOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><VoiceView project={project} handleUpdateCharacterVoice={handleUpdateCharacterVoice} handleVerifyVoice={handleVerifyVoice} applyVoiceSuggestion={applyVoiceSuggestion} voiceAnalysis={voiceAnalysis} analyzingVoiceId={analyzingVoiceId} role={role} t={t} availableVoices={AVAILABLE_VOICES}/></AgentViewWrapper>;
  if (role === AgentRole.ARCHIVIST) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><div className="max-w-7xl mx-auto w-full px-8 pb-8"><div className="flex items-center justify-between mb-8"><div className="flex items-center gap-6"><img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-md" /><div><h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('role.archivist')}</h2><p className="text-gray-500 dark:text-gray-400">Secure textual storage.</p></div></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{library.map((p) => (<div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-all group flex flex-col h-64 relative shadow-sm hover:shadow-md"><h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 line-clamp-1">{p.title}</h3><div className="flex gap-2 mt-auto"><button onClick={() => handleLoadProject(p)} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Briefcase className="w-4 h-4"/> {t('ui.upload')}</button><button onClick={() => handleDeleteFromLibrary(p.id!)} className="px-3 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-lg transition-colors border border-red-200 dark:border-red-900"><RefreshCw className="w-4 h-4"/></button></div></div>))}</div></div></AgentViewWrapper>;
  if (role === AgentRole.CHARACTER_DESIGNER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><CharacterDesignerView project={project} handleFinishCharacterDesign={handleFinishCharacterDesign} handleRegenerateSingleCharacter={handleRegenerateSingleCharacter} handleGenerateAllCharacters={handleGenerateAllCharacters} handleUpdateCharacterDescription={handleUpdateCharacterDescription} handleUpdateCharacterVoice={handleUpdateCharacterVoice} toggleCharacterLock={toggleCharacterLock} handleCharacterUpload={handleCharacterUpload} handleCheckConsistency={handleCheckConsistency} handleSelectCharacterVariant={handleSelectCharacterVariant} role={role} t={t} availableVoices={AVAILABLE_VOICES} loading={loading} updateProject={updateProject}/></AgentViewWrapper>;
  if (role === AgentRole.TYPESETTER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><TypesetterView project={project} handleFinishPrinting={handleFinishPrinting} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.CINEMATOGRAPHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><MotionView project={project} handleGeneratePanelVideo={handleGeneratePanelVideo} loading={loading} role={role} t={t}/></AgentViewWrapper>;
  if (role === AgentRole.CONTINUITY_EDITOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><ContinuityView project={project} handleRunContinuityCheck={handleRunContinuityCheck} loading={loading} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.CENSOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><CensorView project={project} handleRunCensorCheck={handleRunCensorCheck} loading={loading} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.TRANSLATOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><TranslatorView project={project} updateProject={updateProject} handleAddLanguage={handleAddLanguage} loading={loading} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.PANEL_ARTIST) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><PanelArtistView project={project} handleStartPanelGeneration={handleStartPanelGeneration} handleRegenerateSinglePanel={handleRegenerateSinglePanel} handleFinishPanelArt={handleFinishPanelArt} loading={loading} role={role} t={t} updateProject={updateProject} /></AgentViewWrapper>;
  if (role === AgentRole.PUBLISHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><PublisherView project={project} role={role} t={t} /></AgentViewWrapper>;

  return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><div className="p-8 max-w-4xl mx-auto"><div className="flex items-center gap-6 mb-8"><img src={AGENTS[role as AgentRole].avatar} className="w-16 h-16 rounded-full border-2 border-gray-100 shadow-md" /><h2 className="text-3xl font-bold text-gray-900">{t(AGENTS[role as AgentRole].name)}</h2></div></div></AgentViewWrapper>;
};

export default AgentWorkspace;
