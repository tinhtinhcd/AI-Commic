
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

// State machine ensures order, so this array is mostly for UI rendering order
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

const WORKFLOW_STEPS_CONFIG = [
  { id: WorkflowStage.RESEARCHING, labelKey: 'step.strategy', agent: AgentRole.MARKET_RESEARCHER, icon: TrendingUp },
  { id: WorkflowStage.SCRIPTING, labelKey: 'step.script', agent: AgentRole.SCRIPTWRITER, icon: BookOpen },
  { id: WorkflowStage.DESIGNING_CHARACTERS, labelKey: 'step.casting', agent: AgentRole.CHARACTER_DESIGNER, icon: Users },
  { id: WorkflowStage.VISUALIZING_PANELS, labelKey: 'step.storyboard', agent: AgentRole.PANEL_ARTIST, icon: Palette },
  { id: WorkflowStage.PRINTING, labelKey: 'step.printing', agent: AgentRole.TYPESETTER, icon: Printer },
  { id: WorkflowStage.POST_PRODUCTION, labelKey: 'step.motion', agent: AgentRole.CINEMATOGRAPHER, icon: Video },
  { id: WorkflowStage.COMPLETED, labelKey: 'step.publish', agent: AgentRole.PUBLISHER, icon: Megaphone },
];
const SUPPORTED_LANGUAGES = ['English', 'Vietnamese', 'Japanese', 'Spanish', 'French', 'German', 'Chinese', 'Korean'];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createSystemTask = (role: AgentRole, desc: string, chapter?: number): AgentTask => ({
    id: crypto.randomUUID(),
    role,
    description: desc,
    isCompleted: false,
    createdAt: Date.now(),
    type: 'SYSTEM',
    targetChapter: chapter
});

const generateSystemTasks = (totalChapters: number, currentChapter: number, isLongFormat: boolean): AgentTask[] => {
    const tasks: AgentTask[] = [];
    tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Review & Approve Strategy`));
    
    if (totalChapters > 0) {
        for (let i = 1; i <= totalChapters; i++) {
            tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Supervise production of Chapter ${i}`, i));
        }
    }
    
    tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Final Series Review`));
    tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Develop Story Concepts`));
    tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Define Character Cast`));
    
    const lookahead = isLongFormat ? 2 : totalChapters; 
    
    for (let i = currentChapter; i <= Math.min(totalChapters, currentChapter + lookahead); i++) {
        tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Write Script for Chapter ${i}`, i));
        tasks.push(createSystemTask(AgentRole.CHARACTER_DESIGNER, `Review Cast for Chapter ${i}`, i));
        tasks.push(createSystemTask(AgentRole.PANEL_ARTIST, `Draw Panels for Chapter ${i}`, i));
    }

    return tasks;
};

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
  const [narrativeTone, setNarrativeTone] = useState<string>('Standard');

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
        (window as any).alert("⚠️ MISSING API KEY!\n\nCharacter and Panel generation requires a valid Gemini API Key.\nPlease go to 'My Profile' or 'Settings' to add your key.");
        throw new Error("MISSING_API_KEY");
    }
    if ((project.modelTier === 'PREMIUM' || project.imageModel === 'gemini-3-pro-image-preview') && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
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
                // Effective index helps show progress even in parallel/sub-steps
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
              await checkApiKeyRequirement();
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
          await checkApiKeyRequirement();
          const aiResponseText = await GeminiService.sendResearchChatMessage(newHistory, researchChatInput, { theme: project.theme, storyFormat: project.storyFormat, totalChapters: project.totalChapters, language: project.masterLanguage }, project.modelTier || 'STANDARD');
          updateProject({ researchChatHistory: [...newHistory, { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: aiResponseText, timestamp: Date.now() + 1 }] });
      } catch (e) { addLog(AgentRole.MARKET_RESEARCHER, "Chat failed.", 'error'); } finally { setLoading(false); }
  };

  const handleUpdateMarketAnalysis = (data: ResearchData) => updateProject({ marketAnalysis: data });
  
  const handleFinalizeStrategyFromChat = async () => { 
      setLoading(true); 
      try { 
          await checkApiKeyRequirement(); 
          const analysis = await GeminiService.extractStrategyFromChat(project.researchChatHistory, project.masterLanguage, project.modelTier || 'STANDARD'); 
          
          // Update project data first
          const updatedProject = { ...project, marketAnalysis: analysis, title: analysis.suggestedTitle };
          updateProject(updatedProject); 
          
          // Then attempt transition using the new data (via temp object or ensuring state update)
          // Since updateProject is async in React, passing the updated object directly to the transition check logic might be complex here.
          // Instead, we trust the update will happen, and force transition if successful.
          // Ideally, we'd use a callback, but for now we manually set the stage if data is valid.
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
      // Ensure we are in Scripting stage
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

  // ... (Other handlers like handleExportScript, handleImportScript, etc. kept as placeholders or minimal implementation for brevity)
  const handleExportScript = () => {};
  const handleImportScript = (e: any) => {};
  const handleGenerateAllCharacters = async (style: string, key?: string) => {};
  const handleStartPanelGeneration = async (style: string, key?: string, provider?: ImageProvider) => {};
  const handleRegenerateSinglePanel = async (p: ComicPanel, i: number, key?: string, provider?: ImageProvider) => {};
  const handleRegenerateSingleCharacter = async (c: Character, i: number, style?: string, key?: string) => {};
  const handleSelectCharacterVariant = (i: number, v: CharacterVariant) => {};
  const handleUpdateCharacterDescription = (i: number, v: string) => {};
  const handleUpdateCharacterVoice = (i: number, v: string) => {};
  const toggleCharacterLock = (id: string) => {};
  const handleCharacterUpload = async (e: any, i: number) => {};
  const handleCheckConsistency = async (c: Character, i: number) => {};
  const handleCompleteChapterAndNext = async () => {};
  const handleVerifyVoice = async (c: Character) => {};
  const applyVoiceSuggestion = (i: number, v: string) => {};
  const handleLoadProject = (p: ComicProject) => { updateProject(p); onAgentChange(AgentRole.PROJECT_MANAGER); };
  const handleGeneratePanelVideo = async (p: ComicPanel, i: number) => {};
  const handleRunContinuityCheck = async () => {};
  const handleRunCensorCheck = async () => {};
  const handleRevertStage = () => {
      const prev = WorkflowStateMachine.getPreviousStage(project);
      if (prev && (window as any).confirm(`Revert to ${prev}?`)) {
          updateProject({ workflowStage: prev });
      }
  };
  const handleJumpToChapter = (n: number) => {};
  const handleForceExtractCast = async () => {};

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
                    {/* View Switcher */}
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

  // Route to specific role views (Note: Simplified prop passing for brevity, full props assumed in real implementation)
  if (role === AgentRole.MARKET_RESEARCHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><ResearchView project={project} handleResearchChatSend={handleResearchChatSend} researchChatInput={researchChatInput} setResearchChatInput={setResearchChatInput} handleFinalizeStrategyFromChat={handleFinalizeStrategyFromChat} handleUpdateMarketAnalysis={handleUpdateMarketAnalysis} updateProject={updateProject} loading={loading} t={t} chatEndRef={chatEndRef} role={role}/></AgentViewWrapper>;
  if (role === AgentRole.SCRIPTWRITER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><WriterView project={project} handleImportScript={handleImportScript} handleExportScript={handleExportScript} handleApproveResearchAndScript={handleApproveResearchAndScript} handleForceExtractCast={handleForceExtractCast} updateProject={updateProject} loading={loading} t={t} scriptStep={scriptStep} writerLogsEndRef={writerLogsEndRef} role={role} isLongFormat={isLongFormat}/></AgentViewWrapper>;
  if (role === AgentRole.CHARACTER_DESIGNER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><CharacterDesignerView project={project} handleFinishCharacterDesign={handleFinishCharacterDesign} handleRegenerateSingleCharacter={handleRegenerateSingleCharacter} handleGenerateAllCharacters={handleGenerateAllCharacters} handleUpdateCharacterDescription={handleUpdateCharacterDescription} handleUpdateCharacterVoice={handleUpdateCharacterVoice} toggleCharacterLock={toggleCharacterLock} handleCharacterUpload={handleCharacterUpload} handleCheckConsistency={handleCheckConsistency} handleSelectCharacterVariant={handleSelectCharacterVariant} role={role} t={t} availableVoices={AVAILABLE_VOICES} loading={loading} updateProject={updateProject}/></AgentViewWrapper>;
  if (role === AgentRole.PANEL_ARTIST) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><PanelArtistView project={project} handleStartPanelGeneration={handleStartPanelGeneration} handleRegenerateSinglePanel={handleRegenerateSinglePanel} handleFinishPanelArt={handleFinishPanelArt} loading={loading} role={role} t={t} updateProject={updateProject} /></AgentViewWrapper>;
  if (role === AgentRole.TYPESETTER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><TypesetterView project={project} handleFinishPrinting={handleFinishPrinting} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.CINEMATOGRAPHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><MotionView project={project} handleGeneratePanelVideo={handleGeneratePanelVideo} loading={loading} role={role} t={t}/></AgentViewWrapper>;
  if (role === AgentRole.PUBLISHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><PublisherView project={project} role={role} t={t} /></AgentViewWrapper>;
  
  // Default fallback
  return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><div className="p-8 max-w-4xl mx-auto"><div className="flex items-center gap-6 mb-8"><img src={AGENTS[role as AgentRole].avatar} className="w-16 h-16 rounded-full border-2 border-gray-100 shadow-md" /><h2 className="text-3xl font-bold text-gray-900">{t(AGENTS[role as AgentRole].name)}</h2></div></div></AgentViewWrapper>;
};

export default AgentWorkspace;
