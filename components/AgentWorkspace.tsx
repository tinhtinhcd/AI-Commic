
import React, { useState, useEffect, useRef } from 'react';
import { AgentRole, ComicProject, ComicPanel, Character, WorkflowStage, SystemLog, ResearchData, StoryFormat, StoryConcept, Message, ChapterArchive, AgentTask, CharacterVariant } from '../types';
import { AGENTS, TRANSLATIONS, INITIAL_PROJECT_STATE } from '../constants';
import * as GeminiService from '../services/geminiService';
import * as StorageService from '../services/storageService';
import { Send, RefreshCw, CheckCircle, Loader2, Sparkles, UserPlus, BookOpen, Users, Megaphone, Video, Palette, Save, Globe, TrendingUp, ShieldAlert, Archive, Briefcase, ChevronRight, Printer, ListTodo, Lock } from 'lucide-react';
import { ManagerView } from './ManagerView';
import { ResearchView, WriterView, CharacterDesignerView, PanelArtistView } from './CreativeViews';
import { VoiceView, MotionView, TypesetterView, ContinuityView, CensorView, TranslatorView } from './ProductionViews';
import AgentTodoList from './AgentTodoList';
import { useProjectManagement } from '../hooks/useProjectManagement';

interface AgentWorkspaceProps {
  role: AgentRole;
  project: ComicProject;
  updateProject: (updates: Partial<ComicProject>) => void;
  onAgentChange: (role: AgentRole) => void;
  uiLanguage: 'en' | 'vi';
}

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

// STRICT ORDER DEFINITION
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

// --- HELPER FOR GENERATING TASKS ---
const generateSystemTasks = (totalChapters: number, currentChapter: number): AgentTask[] => {
    const tasks: AgentTask[] = [];

    // 1. PROJECT MANAGER TASKS (High Level)
    tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Review & Approve Strategy`));
    for (let i = 1; i <= totalChapters; i++) {
        tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Supervise production of Chapter ${i}`, i));
    }
    tasks.push(createSystemTask(AgentRole.PROJECT_MANAGER, `Final Series Review`));

    // 2. SCRIPTWRITER TASKS
    tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Develop Story Concepts`));
    tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Define Character Cast`));
    for (let i = 1; i <= totalChapters; i++) {
        tasks.push(createSystemTask(AgentRole.SCRIPTWRITER, `Write Script for Chapter ${i}`, i));
    }

    // 3. ARTIST TASKS
    tasks.push(createSystemTask(AgentRole.CHARACTER_DESIGNER, `Create Character Sheets`));
    for (let i = 1; i <= totalChapters; i++) {
        tasks.push(createSystemTask(AgentRole.PANEL_ARTIST, `Draw Panels for Chapter ${i}`, i));
    }

    return tasks;
};

// MOVED OUTSIDE to prevent re-renders losing focus
const AgentViewWrapper: React.FC<{ 
    children: React.ReactNode;
    progressBar: React.ReactNode;
    todoList: React.ReactNode;
}> = ({ children, progressBar, todoList }) => (
    <div className="h-full flex flex-col w-full relative overflow-y-auto">
        {progressBar}
        {todoList}
        {children}
    </div>
);

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ role, project, updateProject, onAgentChange, uiLanguage }) => {
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [scriptStep, setScriptStep] = useState<'CONCEPT' | 'CASTING' | 'WRITING'>('CONCEPT');
  const [regeneratingPanelId, setRegeneratingPanelId] = useState<string | null>(null);
  const [researchChatInput, setResearchChatInput] = useState('');
  const [showTodoList, setShowTodoList] = useState(false);
  
  const [voiceAnalysis, setVoiceAnalysis] = useState<Record<string, {isSuitable: boolean, suggestion: string, reason: string}>>({});
  const [analyzingVoiceId, setAnalyzingVoiceId] = useState<string | null>(null);
  const [narrativeTone, setNarrativeTone] = useState<string>('Standard');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const writerLogsEndRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef(project);

  const t = (key: string) => (TRANSLATIONS[uiLanguage] as any)[key] || key;
  const isLongFormat = project.storyFormat === 'LONG_SERIES' || project.storyFormat === 'EPISODIC';

  const { 
      saveStatus, activeProjects, library, 
      handleSaveWIP, handleLoadWIP, handleDeleteWIP, handleDeleteFromLibrary,
      handleExportProjectZip, handleImportProjectZip, 
      switchProjectLanguage, handleAddLanguage, addLog 
  } = useProjectManagement(project, updateProject, uiLanguage);

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => {
    if (role === AgentRole.PROJECT_MANAGER) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.SCRIPTWRITER && loading) writerLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.MARKET_RESEARCHER) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (role === AgentRole.SCRIPTWRITER && project.panels.length > 0) setScriptStep('WRITING');
  }, [project.logs, role, project.panels.length, loading]);

  // --- INITIALIZE MANAGER TASKS IF EMPTY ---
  useEffect(() => {
      if (role === AgentRole.PROJECT_MANAGER) {
          const managerTasks = (project.agentTasks || []).filter(t => t.role === AgentRole.PROJECT_MANAGER);
          if (managerTasks.length === 0) {
              const initTasks = [
                  createSystemTask(AgentRole.PROJECT_MANAGER, "Set up Project Settings (Title, Language, Format)"),
                  createSystemTask(AgentRole.PROJECT_MANAGER, "Import Manuscript OR Start Research"),
                  createSystemTask(AgentRole.PROJECT_MANAGER, "Approve Story Strategy"),
                  createSystemTask(AgentRole.PROJECT_MANAGER, "Review Final Script"),
                  createSystemTask(AgentRole.PROJECT_MANAGER, "Approve Character Designs")
              ];
              updateProject({ agentTasks: [...(project.agentTasks || []), ...initTasks] });
          }
      }
  }, [role, project.agentTasks]);

  // --- AUTO-COMPLETE TASKS LOGIC ---
  useEffect(() => {
      if (!project.agentTasks) return;
      let tasksChanged = false;
      const updatedTasks = project.agentTasks.map(task => {
          if (task.isCompleted) return task;

          let shouldComplete = false;
          const desc = task.description.toLowerCase();

          // Basic checks based on project state
          if (task.role === AgentRole.MARKET_RESEARCHER) {
              if (desc.includes('manuscript') && project.originalScript) shouldComplete = true;
              if (desc.includes('strategy') && project.marketAnalysis) shouldComplete = true;
          }

          if (task.role === AgentRole.PROJECT_MANAGER) {
             if ((desc.includes('settings') || desc.includes('setup')) && project.title && project.masterLanguage) shouldComplete = true;
             if ((desc.includes('import') || desc.includes('manuscript')) && project.originalScript) shouldComplete = true;
             if (desc.includes('research') && project.workflowStage !== WorkflowStage.IDLE) shouldComplete = true;
             if (desc.includes('strategy') && project.marketAnalysis) shouldComplete = true;
             if (desc.includes('script') && getCurrentStageIndex() > getStepStageIndex(WorkflowStage.SCRIPTING)) shouldComplete = true;
             if (desc.includes('character') && getCurrentStageIndex() > getStepStageIndex(WorkflowStage.DESIGNING_CHARACTERS)) shouldComplete = true;
          }

          if (task.role === AgentRole.SCRIPTWRITER) {
              if (desc.includes('concept') && project.storyConcept) shouldComplete = true;
              if (desc.includes('cast') && project.characters.length > 0) shouldComplete = true;
              if ((desc.includes('script') || desc.includes('write')) && project.panels.length > 0) shouldComplete = true;
          }

          if (task.role === AgentRole.CHARACTER_DESIGNER) {
              if ((desc.includes('sheet') || desc.includes('design')) && project.characters.length > 0 && project.characters.every(c => c.imageUrl)) shouldComplete = true;
          }

          if (task.role === AgentRole.PANEL_ARTIST) {
              const allPanelsDone = project.panels.length > 0 && project.panels.every(p => p.imageUrl);
              if ((desc.includes('draw') || desc.includes('panel')) && allPanelsDone) shouldComplete = true;
          }

          if (shouldComplete) {
              tasksChanged = true;
              return { ...task, isCompleted: true };
          }
          return task;
      });

      if (tasksChanged) {
          updateProject({ agentTasks: updatedTasks });
      }
  }, [project.workflowStage, project.currentChapter, project.characters, project.marketAnalysis, project.originalScript, project.style, project.panels]);


  const handleImportManuscript = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
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
    if (project.modelTier === 'PREMIUM' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
    }
  };

  const getCurrentStageIndex = () => WORKFLOW_ORDER.indexOf(project.workflowStage);
  const getStepStageIndex = (stepId: WorkflowStage) => WORKFLOW_ORDER.indexOf(stepId);

  // Helper to map Stage -> Agent for transitions
  const getAgentForStage = (stage: WorkflowStage): AgentRole => {
      switch(stage) {
          case WorkflowStage.IDLE: return AgentRole.PROJECT_MANAGER;
          case WorkflowStage.RESEARCHING: return AgentRole.MARKET_RESEARCHER;
          case WorkflowStage.SCRIPTING: return AgentRole.SCRIPTWRITER;
          case WorkflowStage.CENSORING_SCRIPT: return AgentRole.CENSOR;
          case WorkflowStage.DESIGNING_CHARACTERS: return AgentRole.CHARACTER_DESIGNER;
          case WorkflowStage.VISUALIZING_PANELS: return AgentRole.PANEL_ARTIST;
          case WorkflowStage.PRINTING: return AgentRole.TYPESETTER;
          case WorkflowStage.POST_PRODUCTION: return AgentRole.CINEMATOGRAPHER;
          case WorkflowStage.COMPLETED: return AgentRole.PUBLISHER;
          default: return AgentRole.PROJECT_MANAGER;
      }
  };

  const renderProgressBar = () => {
    const currentStageIdx = getCurrentStageIndex();
    const activeTasksCount = (project.agentTasks || []).filter(task => task.role === role && !task.isCompleted).length;

    return (
      <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4 mb-6 sticky top-0 z-40 transition-colors">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 flex-1 mr-4">
            {WORKFLOW_STEPS_CONFIG.map((step, idx) => {
                const stepStageIdx = getStepStageIndex(step.id);
                // Special case for SCRIPTING which also covers CENSORING_SCRIPT
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
      const chatLanguage = project.masterLanguage; 
      
      if (!project.agentTasks || !project.agentTasks.some(t => t.role === AgentRole.MARKET_RESEARCHER)) {
          const researchTasks = [
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Analyze Theme & Genre`),
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Identify Target Audience`),
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Propose Visual Style`),
              createSystemTask(AgentRole.MARKET_RESEARCHER, `Finalize Strategy Form`)
          ];
          updateProject({ agentTasks: [...(projectRef.current.agentTasks || []), ...researchTasks] });
      }

      if (project.originalScript) {
           updateProject({ workflowStage: WorkflowStage.RESEARCHING }); setLoading(true);
           try {
               const analysis = await GeminiService.analyzeUploadedManuscript(project.originalScript, project.activeLanguage, project.modelTier || 'STANDARD');
               updateProject({ marketAnalysis: analysis, title: analysis.suggestedTitle, theme: analysis.narrativeStructure, style: analysis.visualStyle, totalChapters: analysis.estimatedChapters });
               const introMsg: Message = { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: `I have analyzed the manuscript. Strategy Form ready.`, timestamp: Date.now() };
               updateProject({ researchChatHistory: [introMsg] });
           } catch (e: any) { addLog(AgentRole.MARKET_RESEARCHER, "Failed to analyze manuscript: " + e.message, 'error'); } finally { setLoading(false); }
           return;
      }
      if (project.theme && (!project.researchChatHistory || project.researchChatHistory.length === 0)) {
          const prefix = uiLanguage === 'vi' ? "Đây là ý tưởng của tôi: " : "Here is my pitch: ";
          updateProject({ workflowStage: WorkflowStage.RESEARCHING }); setLoading(true);
          try {
              const aiResponseText = await GeminiService.sendResearchChatMessage([], `${prefix}"${project.theme}"`, { theme: project.theme, storyFormat: project.storyFormat, totalChapters: project.totalChapters, language: chatLanguage, originalScript: project.originalScript }, project.modelTier || 'STANDARD');
              const userMsg: Message = { role: 'user', content: `${prefix}"${project.theme}"`, timestamp: Date.now() };
              updateProject({ researchChatHistory: [userMsg, { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: aiResponseText, timestamp: Date.now() + 1 }] });
          } catch (e) { } finally { setLoading(false); }
      }
  };

  const handleResearchChatSend = async () => {
      if (!researchChatInput.trim()) return;
      const userMsg: Message = { role: 'user', content: researchChatInput, timestamp: Date.now() };
      const newHistory = [...(project.researchChatHistory || []), userMsg];
      updateProject({ researchChatHistory: newHistory, workflowStage: WorkflowStage.RESEARCHING });
      setResearchChatInput(''); setLoading(true);
      try {
          const aiResponseText = await GeminiService.sendResearchChatMessage(newHistory, researchChatInput, { theme: project.theme, storyFormat: project.storyFormat, totalChapters: project.totalChapters, language: project.masterLanguage, originalScript: project.originalScript }, project.modelTier || 'STANDARD');
          updateProject({ researchChatHistory: [...newHistory, { role: 'agent', senderId: AgentRole.MARKET_RESEARCHER, content: aiResponseText, timestamp: Date.now() + 1 }] });
      } catch (e) { addLog(AgentRole.MARKET_RESEARCHER, "Chat failed.", 'error'); } finally { setLoading(false); }
  };

  const handleUpdateMarketAnalysis = (data: ResearchData) => {
    updateProject({ marketAnalysis: data });
  };

  const handleFinalizeStrategyFromChat = async () => {
      setLoading(true);
      try {
          const analysis = await GeminiService.extractStrategyFromChat(project.researchChatHistory, project.masterLanguage, project.modelTier || 'STANDARD');
          const effectiveTheme = project.theme.includes("Tone:") ? project.theme : `${project.theme}. Tone: ${narrativeTone}.`;
          
          const estimatedChapters = parseInt(analysis.estimatedChapters) || (isLongFormat ? 12 : 1);
          const newSystemTasks = generateSystemTasks(estimatedChapters, 1);
          const artStyleGuide = await GeminiService.generateArtStyleGuide(analysis.visualStyle, analysis.worldSetting, project.masterLanguage, project.modelTier);

          const updatedProject: ComicProject = { 
              ...project, 
              marketAnalysis: analysis, 
              title: analysis.suggestedTitle, 
              style: analysis.visualStyle,
              artStyleGuide: artStyleGuide, 
              theme: effectiveTheme + " " + analysis.narrativeStructure, 
              workflowStage: WorkflowStage.SCRIPTING, 
              id: project.id || crypto.randomUUID(),
              totalChapters: analysis.estimatedChapters,
              agentTasks: [...(project.agentTasks || []), ...newSystemTasks] 
          };
          
          updateProject(updatedProject);
          addLog(AgentRole.MARKET_RESEARCHER, `Strategy Finalized. Cultural Setting: ${analysis.worldSetting}.`, 'success');
          StorageService.saveWorkInProgress(updatedProject);
          setTimeout(() => onAgentChange(AgentRole.SCRIPTWRITER), 1000);
      } catch (e) { addLog(AgentRole.MARKET_RESEARCHER, "Failed to extract strategy.", 'error'); } finally { setLoading(false); }
  };
  
  const handleGenerateConcept = async () => {
      setLoading(true); updateProject({ workflowStage: WorkflowStage.SCRIPTING }); setScriptStep('CONCEPT');
      try { const concept = await GeminiService.generateStoryConceptsWithSearch(project.theme, project.style, project.masterLanguage, project.modelTier || 'STANDARD'); updateProject({ storyConcept: concept }); setScriptStep('CASTING'); addLog(AgentRole.SCRIPTWRITER, `Concept Found: ${concept.uniqueTwist}`, 'success'); } catch (e: any) { addLog(AgentRole.SCRIPTWRITER, `Research failed: ${e.message}`, 'error'); throw e; }
  };
  const handleGenerateCast = async () => {
      if (!project.storyConcept) return; setScriptStep('CASTING');
      try { const setting = project.marketAnalysis?.worldSetting || "Standard"; const complexChars = await GeminiService.generateComplexCharacters(project.storyConcept, project.masterLanguage, setting, project.modelTier || 'STANDARD'); const charsWithVoice = complexChars.map(c => ({ ...c, voice: AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)] })); updateProject({ characters: charsWithVoice }); setScriptStep('WRITING'); addLog(AgentRole.SCRIPTWRITER, `Cast assembled.`, 'success'); } catch (e: any) { addLog(AgentRole.SCRIPTWRITER, `Casting failed: ${e.message}`, 'error'); throw e; }
  };
  const handleGenerateFinalScript = async () => {
      setScriptStep('WRITING'); const targetChapter = project.currentChapter || 1; addLog(AgentRole.SCRIPTWRITER, `Drafting Chapter ${targetChapter}...`, 'info'); let chapterSummary = ""; if (project.marketAnalysis?.chapterOutlines) { const outline = project.marketAnalysis.chapterOutlines.find(c => c.chapterNumber === targetChapter); if (outline) chapterSummary = outline.summary; }
      try {
          if (isLongFormat && !project.seriesBible) { const bible = await GeminiService.generateSeriesBible(project.theme, project.style, project.masterLanguage, project.modelTier || 'STANDARD'); updateProject({ seriesBible: bible }); }
          const setting = project.marketAnalysis?.worldSetting;
          const result = await GeminiService.generateScript(project.theme, project.marketAnalysis ? project.marketAnalysis.visualStyle : project.style, project.masterLanguage, project.storyFormat, project.seriesBible, project.modelTier || 'STANDARD', project.storyConcept, project.characters, chapterSummary, targetChapter, project.originalScript, setting, project.targetPanelCount);
          updateProject({ title: result.title, panels: result.panels, workflowStage: WorkflowStage.CENSORING_SCRIPT });
          addLog(AgentRole.SCRIPTWRITER, `Script Draft Complete.`, 'success');
          setTimeout(() => onAgentChange(AgentRole.PROJECT_MANAGER), 1500);
      } catch (e) { addLog(AgentRole.SCRIPTWRITER, "Script generation failed.", 'error'); throw e; }
  };
  const handleExportScript = () => { const dataStr = JSON.stringify(project.panels, null, 2); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', `${project.title || 'comic'}_ch${project.currentChapter || 1}_script.json`); linkElement.click(); };
  const handleImportScript = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const importedPanels = JSON.parse(event.target?.result as string); if (Array.isArray(importedPanels)) { updateProject({ panels: importedPanels, workflowStage: WorkflowStage.CENSORING_SCRIPT }); addLog(AgentRole.SCRIPTWRITER, `Script imported.`, 'success'); } } catch (err) {} }; reader.readAsText(file); };
  const handleApproveResearchAndScript = async () => { onAgentChange(AgentRole.SCRIPTWRITER); setLoading(true); try { await handleGenerateConcept(); await handleGenerateCast(); await handleGenerateFinalScript(); } catch (e) { console.error(e); } finally { setLoading(false); } };
  
  const handleApproveScriptAndVisualize = async () => { 
      if (project.isCensored) { alert("Script unsafe."); return; } 
      if (isLongFormat) { 
          const unlockedChars = project.characters.filter(c => !c.isLocked); 
          if (unlockedChars.length > 0 && !confirm(`Warning: ${unlockedChars.length} characters are not LOCKED. Continue?`)) return; 
      } 
      setLoading(true); 
      updateProject({ workflowStage: WorkflowStage.DESIGNING_CHARACTERS }); 
      addLog(AgentRole.PROJECT_MANAGER, `Script Approved. Transitioning to Character Design.`, 'info'); 
      onAgentChange(AgentRole.CHARACTER_DESIGNER); 
      await checkApiKeyRequirement(); 
      try { 
          addLog(AgentRole.CHARACTER_DESIGNER, `Designing characters (Style: ${project.style})...`, 'info'); 
          const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; 
          const styleGuide = project.artStyleGuide || `Style: ${project.style}`; 
          
          for (let i = 0; i < projectRef.current.characters.length; i++) { 
              const currentChar = projectRef.current.characters[i]; 
              if (currentChar.isLocked && currentChar.imageUrl) continue; 
              
              const charsBeforeGen = [...projectRef.current.characters]; 
              charsBeforeGen[i] = { ...charsBeforeGen[i], isGenerating: true }; 
              updateProject({ characters: charsBeforeGen }); 
              
              try { 
                  const result = await GeminiService.generateCharacterDesign(charsBeforeGen[i].name, styleGuide, charsBeforeGen[i].description, worldSetting, projectRef.current.modelTier || 'STANDARD'); 
                  let consistencyStatus: 'PASS' | 'FAIL' = 'PASS'; 
                  let consistencyReport = ''; 
                  try { 
                      const check = await GeminiService.analyzeCharacterConsistency(result.imageUrl, projectRef.current.style, charsBeforeGen[i].name, projectRef.current.modelTier || 'STANDARD'); 
                      consistencyStatus = check.isConsistent ? 'PASS' : 'FAIL'; 
                      consistencyReport = check.critique; 
                  } catch (e) {} 
                  
                  const charsAfterGen = [...projectRef.current.characters]; 
                  charsAfterGen[i] = { 
                      ...charsAfterGen[i], 
                      description: result.description, 
                      imageUrl: result.imageUrl, 
                      isLocked: isLongFormat ? true : false, 
                      isGenerating: false, 
                      consistencyStatus, 
                      consistencyReport, 
                      variants: [...(charsAfterGen[i].variants || []), { id: crypto.randomUUID(), imageUrl: result.imageUrl, style: project.style, timestamp: Date.now() }] 
                  }; 
                  updateProject({ characters: charsAfterGen }); 
                  if (consistencyStatus === 'FAIL') addLog(AgentRole.CHARACTER_DESIGNER, `Style inconsistency: ${charsAfterGen[i].name}`, 'warning'); 
              } catch (error) { 
                  const charsFailed = [...projectRef.current.characters]; 
                  charsFailed[i] = { ...charsFailed[i], isGenerating: false }; 
                  updateProject({ characters: charsFailed }); 
              } 
              await delay(2000); 
          } 
          addLog(AgentRole.CHARACTER_DESIGNER, "Character sheets ready.", 'success'); 
      } catch (e) { 
          addLog(AgentRole.PROJECT_MANAGER, "Visual production error.", 'error'); 
      } finally { 
          setLoading(false); 
      } 
  };
  
  const handleFinishCharacterDesign = async () => { 
      updateProject({ workflowStage: WorkflowStage.VISUALIZING_PANELS }); 
      addLog(AgentRole.CHARACTER_DESIGNER, "Character Designs finalized. Moving to Storyboard.", 'success');
      onAgentChange(AgentRole.PANEL_ARTIST);
  };

  const handleStartPanelGeneration = async (selectedStyle: string) => {
      setLoading(true);
      await checkApiKeyRequirement();
      try {
          addLog(AgentRole.PANEL_ARTIST, `Drawing ${project.panels.length} panels in style: ${selectedStyle}...`, 'info');
          updateProject({ style: selectedStyle });
          
          let updatedPanels = [...project.panels];
          for (let i = 0; i < updatedPanels.length; i++) {
              if (!updatedPanels[i].imageUrl) {
                  updatedPanels[i] = { ...updatedPanels[i], isGenerating: true };
                  updateProject({ panels: [...updatedPanels] });
                  try {
                      const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || "";
                      const imageUrl = await GeminiService.generatePanelImage(updatedPanels[i], `Style: ${selectedStyle}`, project.characters, worldSetting, project.modelTier || 'STANDARD');
                      updatedPanels[i] = { ...updatedPanels[i], imageUrl, isGenerating: false };
                  } catch (error) {
                      updatedPanels[i] = { ...updatedPanels[i], isGenerating: false };
                  }
                  updateProject({ panels: [...updatedPanels] });
              }
          }
          addLog(AgentRole.PANEL_ARTIST, "Panels ready.", 'success');
      } finally { setLoading(false); } 
  };

  const handleFinishPanelArt = () => { 
      updateProject({ workflowStage: WorkflowStage.PRINTING }); 
      addLog(AgentRole.PANEL_ARTIST, "Art locked. Sending to Typesetter.", 'success'); 
      onAgentChange(AgentRole.TYPESETTER); 
  };
  
  const handleFinishPrinting = () => { 
      updateProject({ workflowStage: WorkflowStage.POST_PRODUCTION }); 
      addLog(AgentRole.TYPESETTER, "Book Layout finalized. Sending to Motion Director.", 'success'); 
      onAgentChange(AgentRole.CINEMATOGRAPHER); 
  };
  
  const handleRegenerateSinglePanel = async (panel: ComicPanel, index: number) => { await checkApiKeyRequirement(); const panelsBefore = [...project.panels]; panelsBefore[index] = { ...panelsBefore[index], isGenerating: true }; updateProject({ panels: panelsBefore }); setRegeneratingPanelId(panel.id); try { const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; const styleGuide = project.artStyleGuide || `Style: ${project.style}`; const imageUrl = await GeminiService.generatePanelImage(panel, styleGuide, project.characters, worldSetting, project.modelTier || 'STANDARD'); const newPanels = [...project.panels]; newPanels[index] = { ...newPanels[index], imageUrl, isGenerating: false }; updateProject({ panels: newPanels }); } catch (e) { const newPanels = [...project.panels]; newPanels[index] = { ...newPanels[index], isGenerating: false }; updateProject({ panels: newPanels }); } finally { setRegeneratingPanelId(null); } };
  const handleRegenerateSingleCharacter = async (char: Character, index: number, specificStyle?: string) => { await checkApiKeyRequirement(); const newChars = [...project.characters]; newChars[index] = { ...newChars[index], isGenerating: true }; updateProject({ characters: newChars }); const styleToUse = specificStyle || project.style; try { const worldSetting = project.seriesBible?.worldSetting || project.marketAnalysis?.worldSetting || ""; const styleGuide = specificStyle ? `Style: ${specificStyle}` : (project.artStyleGuide || `Style: ${project.style}`); const result = await GeminiService.generateCharacterDesign(char.name, styleGuide, char.description, worldSetting, project.modelTier || 'STANDARD'); const consistency = await GeminiService.analyzeCharacterConsistency(result.imageUrl, styleToUse, char.name, project.modelTier || 'STANDARD'); const newVariant: CharacterVariant = { id: crypto.randomUUID(), imageUrl: result.imageUrl, style: styleToUse, timestamp: Date.now() }; const updatedVariants = [...(newChars[index].variants || []), newVariant]; newChars[index] = { ...newChars[index], imageUrl: result.imageUrl, variants: updatedVariants, description: result.description, isGenerating: false, consistencyStatus: consistency.isConsistent ? 'PASS' : 'FAIL', consistencyReport: consistency.critique }; } catch (e) { newChars[index] = { ...newChars[index], isGenerating: false }; } updateProject({ characters: newChars }); };
  const handleSelectCharacterVariant = (charIndex: number, variant: CharacterVariant) => { const newChars = [...project.characters]; newChars[charIndex] = { ...newChars[charIndex], imageUrl: variant.imageUrl }; updateProject({ characters: newChars }); };
  const handleUpdateCharacterDescription = (index: number, value: string) => { const newChars = [...project.characters]; newChars[index] = { ...newChars[index], description: value }; updateProject({ characters: newChars }); };
  const handleUpdateCharacterVoice = (index: number, voice: string) => { const newChars = [...project.characters]; newChars[index] = { ...newChars[index], voice }; updateProject({ characters: newChars }); };
  const toggleCharacterLock = (charId: string) => { const newChars = project.characters.map(c => { if (c.id === charId) return { ...c, isLocked: !c.isLocked }; return c; }); updateProject({ characters: newChars }); };
  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>, charIndex: number) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = async () => { const base64 = reader.result as string; const newChars = [...project.characters]; newChars[charIndex] = { ...newChars[charIndex], imageUrl: base64, isGenerating: false, isLocked: true }; updateProject({ characters: newChars }); }; reader.readAsDataURL(file); };
  const handleCheckConsistency = async (char: Character, index: number) => { if (!char.imageUrl) return; await checkApiKeyRequirement(); const newChars = [...project.characters]; newChars[index] = { ...newChars[index], isGenerating: true }; updateProject({ characters: newChars }); try { const result = await GeminiService.analyzeCharacterConsistency(char.imageUrl, project.style, char.name, project.modelTier || 'STANDARD'); newChars[index] = { ...newChars[index], isGenerating: false, consistencyStatus: result.isConsistent ? 'PASS' : 'FAIL', consistencyReport: result.critique }; addLog(AgentRole.CHARACTER_DESIGNER, `Consistency check for ${char.name}: ${result.isConsistent ? 'PASS' : 'FAIL'}`, result.isConsistent ? 'success' : 'warning'); } catch (e: any) { newChars[index] = { ...newChars[index], isGenerating: false }; addLog(AgentRole.CHARACTER_DESIGNER, `Check failed: ${e.message}`, 'error'); } updateProject({ characters: newChars }); };
  const handleCompleteChapterAndNext = async () => { if(!confirm("Archive current panels and start next chapter?")) return; setLoading(true); try { const summary = await GeminiService.summarizeChapter(project.panels, project.modelTier || 'STANDARD'); const chapterData: ChapterArchive = { chapterNumber: project.currentChapter || 1, title: `Chapter ${project.currentChapter || 1}`, panels: [...project.panels], summary: summary, timestamp: Date.now() }; const nextChapter = (project.currentChapter || 1) + 1; let newTasks = project.agentTasks || []; newTasks = newTasks.map(t => { if (t.targetChapter === project.currentChapter && t.type === 'SYSTEM') return { ...t, isCompleted: true }; return t; }); const updatedProject: Partial<ComicProject> = { completedChapters: [...(project.completedChapters || []), chapterData], panels: [], currentChapter: nextChapter, workflowStage: WorkflowStage.SCRIPTING, agentTasks: newTasks }; updateProject(updatedProject); addLog(AgentRole.PROJECT_MANAGER, `Chapter ${chapterData.chapterNumber} Finished. Proceeding to Chapter ${nextChapter}.`, 'success'); StorageService.saveWorkInProgress({ ...project, ...updatedProject } as ComicProject); } catch(e) { addLog(AgentRole.PROJECT_MANAGER, "Failed to archive chapter.", 'error'); } finally { setLoading(false); } };
  const handleFinalizeProduction = async () => { if (isLongFormat) { await handleCompleteChapterAndNext(); } else { setLoading(true); try { const newPanels = [...project.panels]; for (let i = 0; i < newPanels.length; i++) { if (newPanels[i].dialogue && !newPanels[i].audioUrl) { try { const speakerName = newPanels[i].charactersInvolved[0]; const speaker = project.characters.find(c => c.name === speakerName); const audioUrl = await GeminiService.generateVoiceover(newPanels[i].dialogue, speaker?.voice || 'Puck'); newPanels[i].audioUrl = audioUrl; } catch (err) {} } } updateProject({ panels: [...newPanels], workflowStage: WorkflowStage.COMPLETED }); onAgentChange(AgentRole.PUBLISHER); } finally { setLoading(false); } } };
  const handleVerifyVoice = async (char: Character) => { setAnalyzingVoiceId(char.id); try { const result = await GeminiService.verifyCharacterVoice(char, char.voice || 'Puck'); setVoiceAnalysis(prev => ({ ...prev, [char.id]: result })); addLog(AgentRole.VOICE_ACTOR, `Analyzed voice for ${char.name}: ${result.isSuitable ? "Suitable" : "Mismatch"}`, result.isSuitable ? 'success' : 'warning'); } catch (e) { console.error(e); addLog(AgentRole.VOICE_ACTOR, "Voice analysis failed", 'error'); } finally { setAnalyzingVoiceId(null); } };
  const applyVoiceSuggestion = (charIndex: number, suggestedVoice: string) => { handleUpdateCharacterVoice(charIndex, suggestedVoice); setVoiceAnalysis(prev => { const newState = {...prev}; delete newState[project.characters[charIndex].id]; return newState; }); };
  const handleLoadProject = (p: ComicProject) => { updateProject(p); addLog(AgentRole.ARCHIVIST, `Loaded: ${p.title}`, 'info'); onAgentChange(AgentRole.PROJECT_MANAGER); };
  
  const handleGeneratePanelVideo = async (panel: ComicPanel, index: number) => { 
      // Ensure API key is selected (Veo requires paid key)
      if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
             await (window as any).aistudio.openSelectKey();
          }
      }

      const newPanels = [...project.panels]; 
      newPanels[index] = { ...newPanels[index], isGenerating: true }; 
      updateProject({ panels: newPanels }); 
      
      try { 
          addLog(AgentRole.CINEMATOGRAPHER, `Generating video for panel ${index+1}...`, 'info'); 
          const videoUrl = await GeminiService.generatePanelVideo(panel, project.style); 
          const updatedPanels = [...project.panels]; 
          updatedPanels[index] = { ...updatedPanels[index], videoUrl: videoUrl, isGenerating: false, shouldAnimate: true }; 
          updateProject({ panels: updatedPanels }); 
          addLog(AgentRole.CINEMATOGRAPHER, `Video generated.`, 'success'); 
      } catch (e: any) { 
          console.error("Video generation error:", e);
          const errorMsg = e.message || JSON.stringify(e);
          
          if (errorMsg.includes("Requested entity was not found") || e.status === 404 || (e.error && e.error.code === 404)) {
             addLog(AgentRole.CINEMATOGRAPHER, "Access denied. Please select a valid Paid API Key for Veo.", 'warning');
             if ((window as any).aistudio) {
                 await (window as any).aistudio.openSelectKey();
             }
          } else {
             addLog(AgentRole.CINEMATOGRAPHER, `Generation failed: ${errorMsg}`, 'error');
          }

          const updatedPanels = [...project.panels]; 
          updatedPanels[index] = { ...updatedPanels[index], isGenerating: false }; 
          updateProject({ panels: updatedPanels }); 
      } 
  };
  
  const handleRunContinuityCheck = async () => { setLoading(true); addLog(AgentRole.CONTINUITY_EDITOR, "Analyzing script logic...", 'info'); try { const report = await GeminiService.checkContinuity(project.panels, project.characters, project.seriesBible, project.modelTier); updateProject({ continuityReport: report }); addLog(AgentRole.CONTINUITY_EDITOR, "Continuity check complete.", 'success'); } catch (e) { addLog(AgentRole.CONTINUITY_EDITOR, "Analysis failed.", 'error'); } finally { setLoading(false); } };
  const handleRunCensorCheck = async () => { setLoading(true); addLog(AgentRole.CENSOR, "Running compliance scan...", 'info'); try { const fullText = project.panels.map(p => p.description + " " + p.dialogue).join("\n"); const result = await GeminiService.censorContent(fullText, 'SCRIPT'); updateProject({ censorReport: result.report, isCensored: !result.passed }); addLog(AgentRole.CENSOR, result.passed ? "Content passed safety checks." : "Safety issues detected.", result.passed ? 'success' : 'warning'); } catch(e) { addLog(AgentRole.CENSOR, "Compliance check failed.", 'error'); } finally { setLoading(false); } };
  
  // ROBUST REVERT STAGE
  const handleRevertStage = () => { 
      if (!confirm("Are you sure you want to revert to the previous stage?")) return;
      const currentIdx = getCurrentStageIndex(); 
      if (currentIdx > 0) { 
          const prevStage = WORKFLOW_ORDER[currentIdx - 1]; 
          updateProject({ workflowStage: prevStage }); 
          addLog(AgentRole.PROJECT_MANAGER, `Reverted stage to ${prevStage}`, 'warning'); 
          
          // Automatically switch to the agent responsible for the previous stage
          const prevAgent = getAgentForStage(prevStage);
          onAgentChange(prevAgent);
      } 
  };

  if (role === AgentRole.PROJECT_MANAGER) {
      return (
        <AgentViewWrapper progressBar={renderProgressBar()} todoList={showTodoList && <AgentTodoList role={role} project={project} updateProject={updateProject} t={t} onClose={() => setShowTodoList(false)} />}>
            <div className="max-w-7xl mx-auto w-full px-6 pb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <img src={AGENTS[role].avatar} alt="Manager" className="w-16 h-16 rounded-full border border-gray-100 dark:border-gray-600 shadow-md" />
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t(AGENTS[role].name)}</h2>
                            <div className="flex items-center gap-2">
                                {project.panels.length > 0 && (<div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded-full shadow-sm flex items-center gap-2"><Globe className="w-3 h-3 text-gray-400"/><span className="text-xs text-gray-500 dark:text-gray-300 font-bold uppercase">{t('ui.reviewing')}:</span><select value={project.activeLanguage} onChange={(e) => switchProjectLanguage(e.target.value)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-transparent outline-none cursor-pointer">{project.targetLanguages.map(l => <option key={l} value={l}>{l}</option>)}</select></div>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-8">
                    <div className="lg:col-span-3">
                        <ManagerView 
                            project={project} activeProjects={activeProjects} updateProject={updateProject} 
                            handleLoadWIP={handleLoadWIP} handleDeleteWIP={handleDeleteWIP} handleStartResearch={handleStartResearch} 
                            handleApproveResearchAndScript={handleApproveResearchAndScript} handleApproveScriptAndVisualize={handleApproveScriptAndVisualize} 
                            handleFinalizeProduction={handleFinalizeProduction} handleImportManuscript={handleImportManuscript} 
                            handleExportProjectZip={handleExportProjectZip} handleImportProjectZip={handleImportProjectZip} 
                            handleRevertStage={handleRevertStage}
                            handleAddLanguage={handleAddLanguage} 
                            setInputText={setInputText} inputText={inputText} 
                            loading={loading} t={t} isLongFormat={isLongFormat} supportedLanguages={SUPPORTED_LANGUAGES}
                        />
                    </div>
                </div>
            </div>
        </AgentViewWrapper>
      );
  }
  
  const commonTodoList = showTodoList ? <AgentTodoList role={role} project={project} updateProject={updateProject} t={t} onClose={() => setShowTodoList(false)} /> : null;
  const progressBar = renderProgressBar();

  if (role === AgentRole.MARKET_RESEARCHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><ResearchView project={project} handleResearchChatSend={handleResearchChatSend} researchChatInput={researchChatInput} setResearchChatInput={setResearchChatInput} handleFinalizeStrategyFromChat={handleFinalizeStrategyFromChat} handleUpdateMarketAnalysis={handleUpdateMarketAnalysis} updateProject={updateProject} loading={loading} t={t} chatEndRef={chatEndRef} role={role}/></AgentViewWrapper>;
  if (role === AgentRole.SCRIPTWRITER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><WriterView project={project} handleImportScript={handleImportScript} handleExportScript={handleExportScript} handleApproveResearchAndScript={handleApproveResearchAndScript} updateProject={updateProject} loading={loading} t={t} scriptStep={scriptStep} writerLogsEndRef={writerLogsEndRef} role={role} isLongFormat={isLongFormat}/></AgentViewWrapper>;
  if (role === AgentRole.VOICE_ACTOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><VoiceView project={project} handleUpdateCharacterVoice={handleUpdateCharacterVoice} handleVerifyVoice={handleVerifyVoice} applyVoiceSuggestion={applyVoiceSuggestion} voiceAnalysis={voiceAnalysis} analyzingVoiceId={analyzingVoiceId} role={role} t={t} availableVoices={AVAILABLE_VOICES}/></AgentViewWrapper>;
  if (role === AgentRole.ARCHIVIST) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><div className="max-w-7xl mx-auto w-full px-8 pb-8"><div className="flex items-center justify-between mb-8"><div className="flex items-center gap-6"><img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-md" /><div><h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('role.archivist')}</h2><p className="text-gray-500 dark:text-gray-400">Secure textual storage.</p></div></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{library.map((p) => (<div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-all group flex flex-col h-64 relative shadow-sm hover:shadow-md"><h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 line-clamp-1">{p.title}</h3><div className="flex gap-2 mt-auto"><button onClick={() => handleLoadProject(p)} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Briefcase className="w-4 h-4"/> {t('ui.upload')}</button><button onClick={() => handleDeleteFromLibrary(p.id!)} className="px-3 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-lg transition-colors border border-red-200 dark:border-red-900"><RefreshCw className="w-4 h-4"/></button></div></div>))}</div></div></AgentViewWrapper>;
  if (role === AgentRole.CHARACTER_DESIGNER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><CharacterDesignerView project={project} handleFinishCharacterDesign={handleFinishCharacterDesign} handleRegenerateSingleCharacter={handleRegenerateSingleCharacter} handleUpdateCharacterDescription={handleUpdateCharacterDescription} handleUpdateCharacterVoice={handleUpdateCharacterVoice} toggleCharacterLock={toggleCharacterLock} handleCharacterUpload={handleCharacterUpload} handleCheckConsistency={handleCheckConsistency} handleSelectCharacterVariant={handleSelectCharacterVariant} role={role} t={t} availableVoices={AVAILABLE_VOICES}/></AgentViewWrapper>;
  if (role === AgentRole.TYPESETTER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><TypesetterView project={project} handleFinishPrinting={handleFinishPrinting} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.CINEMATOGRAPHER) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><MotionView project={project} handleGeneratePanelVideo={handleGeneratePanelVideo} loading={loading} role={role} t={t}/></AgentViewWrapper>;
  
  if (role === AgentRole.CONTINUITY_EDITOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><ContinuityView project={project} handleRunContinuityCheck={handleRunContinuityCheck} loading={loading} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.CENSOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><CensorView project={project} handleRunCensorCheck={handleRunCensorCheck} loading={loading} role={role} t={t} /></AgentViewWrapper>;
  if (role === AgentRole.TRANSLATOR) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><TranslatorView project={project} updateProject={updateProject} handleAddLanguage={handleAddLanguage} loading={loading} role={role} t={t} /></AgentViewWrapper>;

  // Use the new PanelArtistView
  if (role === AgentRole.PANEL_ARTIST) return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><PanelArtistView project={project} handleStartPanelGeneration={handleStartPanelGeneration} handleRegenerateSinglePanel={handleRegenerateSinglePanel} handleFinishPanelArt={handleFinishPanelArt} loading={loading} role={role} t={t} /></AgentViewWrapper>;

  // Fallback for Publisher
  return <AgentViewWrapper progressBar={progressBar} todoList={commonTodoList}><div className="p-8 max-w-4xl mx-auto"><div className="flex items-center gap-6 mb-8"><img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-gray-100 shadow-md" /><h2 className="text-3xl font-bold text-gray-900">{t(AGENTS[role].name)}</h2></div></div></AgentViewWrapper>;
};

export default AgentWorkspace;
