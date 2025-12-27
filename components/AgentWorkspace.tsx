import React, { useState, useEffect, useRef } from 'react';
import { AgentRole, ComicProject, ComicPanel, Character, WorkflowStage, SystemLog, ResearchData, StoryFormat } from '../types';
import { AGENTS } from '../constants';
import * as GeminiService from '../services/geminiService';
import * as StorageService from '../services/storageService';
import { Send, RefreshCw, Image as ImageIcon, CheckCircle, Loader2, Sparkles, UserPlus, BookOpen, Users, Megaphone, Languages, Mic, Video, Play, Pause, Globe, TrendingUp, ShieldAlert, ArrowRight, Activity, Palette, XCircle, AlertTriangle, X, Edit2, Film, Save, Settings, Target, Lightbulb, PenTool, Layers, Archive, Trash2, FileText, Upload, Lock, Unlock, Book, ChevronRight, Eye, AlertCircle } from 'lucide-react';

interface AgentWorkspaceProps {
  role: AgentRole;
  project: ComicProject;
  updateProject: (updates: Partial<ComicProject>) => void;
}

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const NARRATOR_VOICE = 'Puck'; // Default narrator

const SUPPORTED_LANGUAGES = ['English', 'Vietnamese', 'Japanese', 'Korean', 'French', 'Spanish'];

const WORKFLOW_STEPS = [
    { id: WorkflowStage.RESEARCHING, label: '1. Strategy', icon: TrendingUp },
    { id: WorkflowStage.SCRIPTING, label: '2. Script', icon: BookOpen },
    { id: WorkflowStage.DESIGNING_CHARACTERS, label: '3. Casting', icon: Users },
    { id: WorkflowStage.VISUALIZING_PANELS, label: '4. Storyboard', icon: Palette },
    { id: WorkflowStage.POST_PRODUCTION, label: '5. Motion', icon: Video },
    { id: WorkflowStage.COMPLETED, label: '6. Publish', icon: CheckCircle },
];

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ role, project, updateProject }) => {
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectStage, setRejectStage] = useState<WorkflowStage | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Micro-correction State
  const [regeneratingPanelId, setRegeneratingPanelId] = useState<string | null>(null);

  // Archivist State
  const [library, setLibrary] = useState<ComicProject[]>([]);
  const [selectedArchivedProject, setSelectedArchivedProject] = useState<ComicProject | null>(null);

  // Auto-scroll for logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (role === AgentRole.PROJECT_MANAGER) {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // Load library if Archivist
    if (role === AgentRole.ARCHIVIST) {
        setLibrary(StorageService.getLibrary());
    }
  }, [project.logs, role]);

  const addLog = (agentId: AgentRole, message: string, type: SystemLog['type'] = 'info') => {
      const newLog: SystemLog = {
          id: crypto.randomUUID(),
          agentId,
          message,
          timestamp: Date.now(),
          type
      };
      updateProject({ logs: [...project.logs, newLog] });
  };

  const isLongFormat = project.storyFormat === 'LONG_SERIES' || project.storyFormat === 'EPISODIC';

  // ----------------------------------------------------------------------
  // REJECTION / CORRECTION LOGIC
  // ----------------------------------------------------------------------
  const initiateReject = (stage: WorkflowStage) => {
      setRejectStage(stage);
      setRejectionReason('');
      setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
      if (!rejectStage || !rejectionReason.trim()) return;

      const reason = rejectionReason;
      setShowRejectModal(false);

      // Rollback logic
      switch (rejectStage) {
          case WorkflowStage.RESEARCHING:
              addLog(AgentRole.PROJECT_MANAGER, `REJECTED Market Research: "${reason}".`, 'error');
              updateProject({ workflowStage: WorkflowStage.IDLE, marketAnalysis: null });
              break;
          case WorkflowStage.CENSORING_SCRIPT:
              addLog(AgentRole.PROJECT_MANAGER, `REJECTED Script: "${reason}". Back to drafting.`, 'error');
              updateProject({ workflowStage: WorkflowStage.RESEARCHING });
              break;
          case WorkflowStage.POST_PRODUCTION:
              addLog(AgentRole.PROJECT_MANAGER, `REJECTED Visuals: "${reason}". Back to art.`, 'error');
              updateProject({ workflowStage: WorkflowStage.CENSORING_SCRIPT });
              break;
          case WorkflowStage.COMPLETED:
               addLog(AgentRole.PROJECT_MANAGER, `REJECTED Final Cut: "${reason}".`, 'error');
               updateProject({ workflowStage: WorkflowStage.POST_PRODUCTION });
               break;
          default: break;
      }
  };

  const handleRegenerateSinglePanel = async (panel: ComicPanel, index: number) => {
      if (!project.style || project.characters.length === 0) return;
      setRegeneratingPanelId(panel.id);
      addLog(AgentRole.PROJECT_MANAGER, `Requesting redraw for Panel ${index + 1}...`, 'info');
      
      try {
          // Pass full character list with images for consistency
          const imageUrl = await GeminiService.generatePanelImage(panel, project.style, project.characters);
          
          const newPanels = [...project.panels];
          newPanels[index] = { ...newPanels[index], imageUrl };
          updateProject({ panels: newPanels });
          addLog(AgentRole.PANEL_ARTIST, `Redrew Panel ${index + 1}.`, 'success');
      } catch (e) {
          addLog(AgentRole.PANEL_ARTIST, `Failed to redraw Panel ${index + 1}.`, 'error');
      } finally {
          setRegeneratingPanelId(null);
      }
  };

  const handleUpdatePanelText = (index: number, field: 'description' | 'dialogue' | 'caption', value: string) => {
      const newPanels = [...project.panels];
      newPanels[index] = { ...newPanels[index], [field]: value };
      updateProject({ panels: newPanels });
  };

  const toggleCharacterLock = (charId: string) => {
      const newChars = project.characters.map(c => {
          if (c.id === charId) return { ...c, isLocked: !c.isLocked };
          return c;
      });
      updateProject({ characters: newChars });
      const char = newChars.find(c => c.id === charId);
      addLog(AgentRole.CHARACTER_DESIGNER, `${char?.name} design ${char?.isLocked ? 'LOCKED' : 'UNLOCKED'}.`, 'info');
  };

  // NEW: Manual Upload & Verification
  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>, charIndex: number) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Read File
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          
          // 2. Update State with Image (Immediate Feedback)
          const newChars = [...project.characters];
          const charName = newChars[charIndex].name;
          newChars[charIndex] = {
              ...newChars[charIndex],
              imageUrl: base64,
              isGenerating: false,
              consistencyStatus: 'PENDING', // Start Verify
              isLocked: true // Auto-lock manual uploads
          };
          updateProject({ characters: newChars });
          addLog(AgentRole.CHARACTER_DESIGNER, `Uploaded manual design for ${charName}. Verifying style consistency...`, 'info');

          // 3. Trigger AI Verification
          try {
             const report = await GeminiService.analyzeCharacterConsistency(base64, project.style, charName);
             
             // Update Result
             const verifiedChars = [...project.characters]; // Need fresh state ref if changed elsewhere
             // Note: In a real app we'd find index by ID, here we trust index hasn't shifted
             verifiedChars[charIndex] = {
                 ...newChars[charIndex], // use newChars ref
                 consistencyStatus: report.isConsistent ? 'PASS' : 'FAIL',
                 consistencyReport: report.critique
             };
             updateProject({ characters: verifiedChars });

             if(report.isConsistent) {
                 addLog(AgentRole.CHARACTER_DESIGNER, `Style Check Passed for ${charName}.`, 'success');
             } else {
                 addLog(AgentRole.CHARACTER_DESIGNER, `Style Warning for ${charName}: ${report.critique}`, 'warning');
             }

          } catch (err) {
              addLog(AgentRole.CHARACTER_DESIGNER, `Verification failed for ${charName}.`, 'error');
          }
      };
      reader.readAsDataURL(file);
  };

  // ----------------------------------------------------------------------
  // ARCHIVE LOGIC
  // ----------------------------------------------------------------------
  const handleArchiveProject = () => {
      StorageService.saveProjectToLibrary(project);
      addLog(AgentRole.PUBLISHER, "Project text & script archived to library.", 'success');
      alert("Project Saved! (Media stripped to save space)");
  };

  const handleDeleteFromLibrary = (id: string) => {
      if (confirm("Permanently delete this story from archive?")) {
          StorageService.deleteProjectFromLibrary(id);
          setLibrary(StorageService.getLibrary());
          if (selectedArchivedProject?.id === id) setSelectedArchivedProject(null);
      }
  };

  const handleLoadProject = (p: ComicProject) => {
      if (confirm("Load this project? Current unsaved workspace progress will be lost.")) {
          updateProject({
              ...p,
              logs: [...project.logs, {
                  id: crypto.randomUUID(),
                  agentId: AgentRole.ARCHIVIST,
                  message: `Loaded project "${p.title}" from archive. Media assets must be regenerated.`,
                  timestamp: Date.now(),
                  type: 'info'
              }]
          });
          addLog(AgentRole.PROJECT_MANAGER, `Project "${p.title}" loaded. Ready for visual production.`, 'info');
      }
  };

  // ----------------------------------------------------------------------
  // AUTONOMOUS WORKFLOW CONTROLLERS
  // ----------------------------------------------------------------------

  // Step 1: Research
  const handleStartResearch = async () => {
    if (!project.theme) return;
    setLoading(true);
    updateProject({ workflowStage: WorkflowStage.RESEARCHING });
    addLog(AgentRole.PROJECT_MANAGER, `Initializing Strategic Planning (${project.language || 'English'})...`, 'info');
    try {
        const analysis: ResearchData = await GeminiService.conductMarketResearch(project.theme, project.language);
        updateProject({ 
            marketAnalysis: analysis,
            title: analysis.suggestedTitle,
            style: analysis.visualStyle 
        });
        addLog(AgentRole.MARKET_RESEARCHER, `Strategy defined. Title proposed: "${analysis.suggestedTitle}"`, 'success');
    } catch (e) {
        addLog(AgentRole.MARKET_RESEARCHER, "Research strategy generation failed.", 'error');
    } finally { setLoading(false); }
  };

  // Step 2: Scripting (Split Logic)
  const handleApproveResearchAndScript = async () => {
      setLoading(true);
      updateProject({ workflowStage: WorkflowStage.SCRIPTING });
      
      try {
          // Pre-step for Long Series: Create Bible if missing
          if (isLongFormat && !project.seriesBible) {
              addLog(AgentRole.SCRIPTWRITER, "Drafting Series Bible (World & Conflict)...", 'info');
              const bible = await GeminiService.generateSeriesBible(project.theme, project.style, project.language);
              updateProject({ seriesBible: bible });
              addLog(AgentRole.SCRIPTWRITER, "Series Bible established. Now writing Chapter 1...", 'success');
          }

          addLog(AgentRole.PROJECT_MANAGER, `Commissioning Scriptwriter (${project.language}) for ${project.storyFormat}.`, 'info');

          // Pass Bible if available
          const result = await GeminiService.generateScript(
            project.theme, 
            project.marketAnalysis ? project.marketAnalysis.visualStyle : project.style,
            project.language,
            project.storyFormat,
            project.seriesBible 
          );

          const chars = result.panels.flatMap(p => p.charactersInvolved).reduce((acc: Character[], name) => {
            if (!acc.find(c => c.name === name)) {
                // Check if we have an existing character from previous episodes (if loaded from archive)
                const existing = project.characters.find(c => c.name === name);
                if (existing) {
                    acc.push(existing); 
                } else {
                    const randomVoice = AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
                    acc.push({ 
                        id: crypto.randomUUID(), 
                        name, 
                        description: `A character named ${name}`, 
                        voice: randomVoice,
                        isLocked: false // New characters start unlocked
                    });
                }
            }
            return acc;
          }, []);

          updateProject({ title: result.title, panels: result.panels, characters: chars, workflowStage: WorkflowStage.CENSORING_SCRIPT });
          addLog(AgentRole.SCRIPTWRITER, `Script drafted. Manager review needed.`, 'success');
          
          // Auto Censor
          const scriptText = result.panels.map(p => p.description + " " + p.dialogue).join(" ");
          const censorResult = await GeminiService.censorContent(scriptText, 'SCRIPT');
          updateProject({ isCensored: !censorResult.passed, censorReport: censorResult.report });

      } catch (e) {
          addLog(AgentRole.SCRIPTWRITER, "Script generation failed.", 'error');
      } finally { setLoading(false); }
  };

  // Step 3: Visualization (Strict Locking for Series)
  // FIXED: Granular state updates for Character generation
  const handleApproveScriptAndVisualize = async () => {
    if (project.isCensored) { alert("Script unsafe."); return; }
    
    // Check constraint for Long Series
    if (isLongFormat) {
        const unlockedChars = project.characters.filter(c => !c.isLocked);
        if (unlockedChars.length > 0) {
            if(!confirm(`Warning: ${unlockedChars.length} characters are not LOCKED. In Long Series, you should finalize designs first to ensure consistency. Continue anyway?`)) {
                return;
            }
        }
    }

    setLoading(true);
    updateProject({ workflowStage: WorkflowStage.DESIGNING_CHARACTERS });
    addLog(AgentRole.PROJECT_MANAGER, "Script Approved. Starting Visuals.", 'info');

    try {
        // 1. Characters
        addLog(AgentRole.CHARACTER_DESIGNER, `Designing ${project.characters.length} characters...`, 'info');
        
        // We iterate through a COPY of characters to avoid mutation issues, 
        // but we need to update the global project state inside the loop.
        let updatedChars = [...project.characters];

        for (let i = 0; i < updatedChars.length; i++) {
             // Skip if image already exists and IS LOCKED (Don't overwrite locked assets)
             if (updatedChars[i].isLocked && updatedChars[i].imageUrl) {
                 continue;
             }

             // Mark as generating
             updatedChars[i] = { ...updatedChars[i], isGenerating: true };
             updateProject({ characters: [...updatedChars] }); // Force re-render

             try {
                // Generate
                const result = await GeminiService.generateCharacterDesign(
                    updatedChars[i].name, 
                    project.theme, 
                    project.language,
                    isLongFormat
                );
                
                // Update with success
                updatedChars[i] = { 
                    ...updatedChars[i], 
                    description: result.description, 
                    imageUrl: result.imageUrl,
                    isLocked: isLongFormat ? true : false,
                    isGenerating: false
                };
             } catch (error) {
                 console.error("Character Gen Error", error);
                 updatedChars[i] = { ...updatedChars[i], isGenerating: false };
                 addLog(AgentRole.CHARACTER_DESIGNER, `Failed to generate ${updatedChars[i].name}`, 'error');
             }
             
             // Update state immediately so user sees the image appear one by one
             updateProject({ characters: [...updatedChars] }); 
        }
        
        // 2. Panels
        updateProject({ workflowStage: WorkflowStage.VISUALIZING_PANELS });
        addLog(AgentRole.PANEL_ARTIST, `Drawing ${project.panels.length} panels...`, 'info');
        
        let updatedPanels = [...project.panels];
        for (let i = 0; i < updatedPanels.length; i++) {
             if (!updatedPanels[i].imageUrl) {
                 updatedPanels[i] = { ...updatedPanels[i], isGenerating: true };
                 updateProject({ panels: [...updatedPanels] });

                 try {
                     const imageUrl = await GeminiService.generatePanelImage(updatedPanels[i], project.style, updatedChars);
                     updatedPanels[i] = { ...updatedPanels[i], imageUrl, isGenerating: false };
                 } catch (error) {
                     updatedPanels[i] = { ...updatedPanels[i], isGenerating: false };
                     addLog(AgentRole.PANEL_ARTIST, `Failed to draw Panel ${i+1}`, 'error');
                 }

                 updateProject({ panels: [...updatedPanels] });
             }
        }
        
        updateProject({ workflowStage: WorkflowStage.POST_PRODUCTION });
        addLog(AgentRole.PANEL_ARTIST, "Visuals ready for review/corrections.", 'success');

    } catch (e) {
        addLog(AgentRole.PROJECT_MANAGER, "Visual production error.", 'error');
    } finally { setLoading(false); }
  };

  // Step 4: Motion & Sound
  const handleFinalizeProduction = async () => {
    setLoading(true);
    addLog(AgentRole.PROJECT_MANAGER, "Greenlighting Motion & Sound.", 'info');
    
    if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
    }

    try {
        const newPanels = [...project.panels];

        // 1. Audio (Dialogue + Narrator)
        addLog(AgentRole.VOICE_ACTOR, "Recording audio...", 'info');
        for (let i = 0; i < newPanels.length; i++) {
            // Dialogue
            if (newPanels[i].dialogue && !newPanels[i].audioUrl) {
                 try {
                     const speakerName = newPanels[i].charactersInvolved[0];
                     const speaker = project.characters.find(c => c.name === speakerName);
                     const audioUrl = await GeminiService.generateVoiceover(newPanels[i].dialogue, speaker?.voice || 'Puck');
                     newPanels[i].audioUrl = audioUrl;
                 } catch (err) {}
            }
            // Narrator
            if (newPanels[i].caption && !newPanels[i].captionAudioUrl) {
                try {
                    const captionUrl = await GeminiService.generateVoiceover(newPanels[i].caption!, NARRATOR_VOICE);
                    newPanels[i].captionAudioUrl = captionUrl;
                } catch (err) {}
            }
        }
        updateProject({ panels: [...newPanels] });

        // 2. Video (Selective)
        addLog(AgentRole.CINEMATOGRAPHER, "Animating selected panels...", 'info');
        for (let i = 0; i < newPanels.length; i++) {
            if (newPanels[i].imageUrl && newPanels[i].shouldAnimate && !newPanels[i].videoUrl) {
                try {
                    const videoUrl = await GeminiService.generateVideo(newPanels[i].imageUrl!, newPanels[i].description);
                    newPanels[i] = { ...newPanels[i], videoUrl };
                    updateProject({ panels: [...newPanels] });
                } catch (err) {
                     addLog(AgentRole.CINEMATOGRAPHER, `Video skipped Panel ${i+1} (Error).`, 'warning');
                }
            }
        }
        
        updateProject({ workflowStage: WorkflowStage.COMPLETED });
        addLog(AgentRole.PUBLISHER, "Motion Comic Production Complete.", 'success');

    } catch (e) {
        addLog(AgentRole.PROJECT_MANAGER, "Production error.", 'error');
    } finally { setLoading(false); }
  };

  // ----------------------------------------------------------------------
  // COMMON UI: WORKFLOW PROGRESS BAR
  // ----------------------------------------------------------------------
  const renderProgressBar = () => (
      <div className="w-full bg-zinc-900 border-b border-zinc-800 p-4 mb-6 sticky top-0 z-20 overflow-x-auto">
          <div className="flex items-center min-w-max">
              {WORKFLOW_STEPS.map((step, index) => {
                  const isCompleted = WORKFLOW_STEPS.findIndex(s => s.id === project.workflowStage) > index;
                  const isCurrent = project.workflowStage === step.id;
                  // Handle edge case for IDLE
                  const isIdle = project.workflowStage === WorkflowStage.IDLE && index === 0;
                  const active = isCompleted || isCurrent || (index === 0 && project.workflowStage === WorkflowStage.IDLE);
                  
                  return (
                      <div key={step.id} className="flex items-center">
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isCurrent ? 'bg-indigo-600 text-white shadow-lg' : active ? 'text-zinc-300' : 'text-zinc-600'}`}>
                              <step.icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                              <span className="text-xs font-bold uppercase tracking-wider">{step.label}</span>
                          </div>
                          {index < WORKFLOW_STEPS.length - 1 && (
                              <ChevronRight className={`w-4 h-4 mx-2 ${active ? 'text-zinc-600' : 'text-zinc-800'}`} />
                          )}
                      </div>
                  )
              })}
          </div>
      </div>
  );

  // ----------------------------------------------------------------------
  // VIEW RENDERERS
  // ----------------------------------------------------------------------

  // --- PROJECT MANAGER (DASHBOARD) ---
  if (role === AgentRole.PROJECT_MANAGER) {
    return (
      <div className="h-full flex flex-col w-full relative overflow-y-auto">
        {renderProgressBar()}
        
        <div className="max-w-7xl mx-auto w-full px-6 pb-8">
            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-red-500 mb-4 flex gap-2 items-center"><AlertTriangle className="w-6 h-6"/> Reject Phase</h3>
                        <textarea 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-zinc-200 h-32 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Provide reason for rejection..."
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleConfirmReject} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg text-white font-medium transition-colors">Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <img src={AGENTS[role].avatar} alt="Manager" className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-blue-500/20 shadow-lg" />
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Director's Console</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-zinc-400">Oversee production pipeline</p>
                            {isLongFormat && <span className="text-[10px] font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">LONG SERIES MODE</span>}
                        </div>
                    </div>
                </div>
                {/* Quick Status Pill */}
                <div className="hidden md:flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm font-medium text-zinc-300">{loading ? 'Agents Working...' : 'System Ready'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-8">
                {/* LEFT COLUMN: Project Configuration */}
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                     <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 shadow-xl flex-1">
                        <h3 className="font-bold text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                            <Settings className="w-5 h-5 text-blue-500" /> Project Settings
                        </h3>
                        
                        <div className="space-y-6">
                            {/* Theme Input */}
                            <div>
                                <label className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2 block">Story Concept (Theme)</label>
                                <textarea
                                    value={project.theme || inputText}
                                    onChange={(e) => { setInputText(e.target.value); updateProject({ theme: e.target.value }); }}
                                    disabled={project.workflowStage !== WorkflowStage.IDLE && project.workflowStage !== WorkflowStage.RESEARCHING}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-100 min-h-[120px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none leading-relaxed"
                                    placeholder="e.g. A cyberpunk detective solving crimes in Neo-Hanoi..."
                                />
                            </div>

                            {/* Dropdowns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2 block">Language</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <select 
                                            value={project.language || 'English'}
                                            onChange={(e) => updateProject({ language: e.target.value })}
                                            disabled={project.workflowStage !== WorkflowStage.IDLE}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-zinc-200 focus:border-purple-500 outline-none appearance-none"
                                        >
                                            {SUPPORTED_LANGUAGES.map(lang => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-2 block">Art Style</label>
                                    <div className="relative">
                                        <Palette className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <select 
                                            value={project.style}
                                            onChange={(e) => updateProject({ style: e.target.value })}
                                            disabled={project.workflowStage !== WorkflowStage.IDLE} // Visual style can be locked by research too
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-zinc-200 focus:border-pink-500 outline-none appearance-none"
                                        >
                                            <option>Modern Western Comic</option>
                                            <option>Japanese Manga</option>
                                            <option>Noir</option>
                                            <option>Watercolor</option>
                                            <option>Cyberpunk</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2 block">Story Format (Runtime)</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <select 
                                            value={project.storyFormat}
                                            onChange={(e) => updateProject({ storyFormat: e.target.value as StoryFormat })}
                                            disabled={project.workflowStage !== WorkflowStage.IDLE}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-zinc-200 focus:border-amber-500 outline-none appearance-none"
                                        >
                                            <option value="SHORT_STORY">Short Film (5-10 mins)</option>
                                            <option value="LONG_SERIES">Series Chapter 1 (30+ mins)</option>
                                            <option value="EPISODIC">Episodic/Sitcom (15-30 mins)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* CENTER COLUMN: Pipeline Control */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                     <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 shadow-xl h-full">
                        <h3 className="font-bold text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                            <Activity className="w-5 h-5 text-emerald-500" /> Production Pipeline
                        </h3>
                        
                        <div className="space-y-3">
                            {/* 1. Research */}
                            <div className="flex gap-2">
                                <button onClick={handleStartResearch} disabled={loading || !project.theme || project.workflowStage !== WorkflowStage.IDLE}
                                    className={`flex-1 py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all duration-200 group
                                        ${project.workflowStage === WorkflowStage.IDLE 
                                            ? 'bg-gradient-to-r from-indigo-900/50 to-indigo-800/50 border-indigo-500/50 text-indigo-100 hover:border-indigo-400 hover:from-indigo-900 hover:to-indigo-800' 
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'}
                                    `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${project.workflowStage === WorkflowStage.IDLE ? 'bg-indigo-500/20' : 'bg-zinc-900'}`}>
                                            <TrendingUp className="w-4 h-4"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold">1. Market Research</div>
                                            <div className="text-[10px] opacity-70">Analyze {project.language} trends</div>
                                        </div>
                                    </div>
                                    {project.marketAnalysis && <CheckCircle className="w-5 h-5 text-green-500 drop-shadow-lg"/>}
                                </button>
                                {project.workflowStage === WorkflowStage.RESEARCHING && <button onClick={() => initiateReject(WorkflowStage.RESEARCHING)} className="px-4 bg-red-900/20 rounded-xl border border-red-900/50 hover:bg-red-900/40 transition-colors"><XCircle className="w-5 h-5 text-red-500"/></button>}
                            </div>

                            {/* 2. Script */}
                            <div className="flex gap-2">
                                <button onClick={handleApproveResearchAndScript} disabled={loading || !project.marketAnalysis || (project.workflowStage !== WorkflowStage.RESEARCHING && project.workflowStage !== WorkflowStage.SCRIPTING)}
                                    className={`flex-1 py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all duration-200
                                        ${project.workflowStage === WorkflowStage.RESEARCHING 
                                            ? 'bg-gradient-to-r from-emerald-900/50 to-emerald-800/50 border-emerald-500/50 text-emerald-100 hover:border-emerald-400 hover:from-emerald-900 hover:to-emerald-800' 
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'}
                                    `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${project.workflowStage === WorkflowStage.RESEARCHING ? 'bg-emerald-500/20' : 'bg-zinc-900'}`}>
                                            <BookOpen className="w-4 h-4"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold">2. Scripting</div>
                                            <div className="text-[10px] opacity-70">
                                                {isLongFormat ? 'Series Bible + Chapter 1' : 'One-shot Script'}
                                            </div>
                                        </div>
                                    </div>
                                    {project.panels.length > 0 && <CheckCircle className="w-5 h-5 text-green-500 drop-shadow-lg"/>}
                                </button>
                                {project.workflowStage === WorkflowStage.CENSORING_SCRIPT && <button onClick={() => initiateReject(WorkflowStage.CENSORING_SCRIPT)} className="px-4 bg-red-900/20 rounded-xl border border-red-900/50 hover:bg-red-900/40 transition-colors"><XCircle className="w-5 h-5 text-red-500"/></button>}
                            </div>

                            {/* 3. Visuals */}
                            <div className="flex gap-2">
                                <button onClick={handleApproveScriptAndVisualize} disabled={loading || !project.panels.length || project.isCensored || project.workflowStage === WorkflowStage.POST_PRODUCTION || project.workflowStage === WorkflowStage.COMPLETED}
                                    className={`flex-1 py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all duration-200
                                        ${project.workflowStage === WorkflowStage.CENSORING_SCRIPT 
                                            ? 'bg-gradient-to-r from-rose-900/50 to-rose-800/50 border-rose-500/50 text-rose-100 hover:border-rose-400 hover:from-rose-900 hover:to-rose-800' 
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'}
                                    `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${project.workflowStage === WorkflowStage.CENSORING_SCRIPT ? 'bg-rose-500/20' : 'bg-zinc-900'}`}>
                                            <Palette className="w-4 h-4"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold">3. Visuals</div>
                                            <div className="text-[10px] opacity-70">
                                                {isLongFormat ? 'Strict Char Locking' : 'Standard Design'}
                                            </div>
                                        </div>
                                    </div>
                                    {project.panels.some(p => p.imageUrl) && <CheckCircle className="w-5 h-5 text-green-500 drop-shadow-lg"/>}
                                </button>
                                {project.workflowStage === WorkflowStage.POST_PRODUCTION && <button onClick={() => initiateReject(WorkflowStage.POST_PRODUCTION)} className="px-4 bg-red-900/20 rounded-xl border border-red-900/50 hover:bg-red-900/40 transition-colors"><XCircle className="w-5 h-5 text-red-500"/></button>}
                            </div>

                            {/* 4. Motion */}
                            <div className="flex gap-2">
                                <button onClick={handleFinalizeProduction} disabled={loading || !project.panels.some(p => p.imageUrl) || project.workflowStage === WorkflowStage.COMPLETED}
                                    className={`flex-1 py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all duration-200
                                        ${project.workflowStage === WorkflowStage.POST_PRODUCTION 
                                            ? 'bg-gradient-to-r from-amber-900/50 to-amber-800/50 border-amber-500/50 text-amber-100 hover:border-amber-400 hover:from-amber-900 hover:to-amber-800' 
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'}
                                    `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${project.workflowStage === WorkflowStage.POST_PRODUCTION ? 'bg-amber-500/20' : 'bg-zinc-900'}`}>
                                            <Video className="w-4 h-4"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold">4. Motion & Sound</div>
                                            <div className="text-[10px] opacity-70">Veo Video & TTS</div>
                                        </div>
                                    </div>
                                    {project.workflowStage === WorkflowStage.COMPLETED && <CheckCircle className="w-5 h-5 text-green-500 drop-shadow-lg"/>}
                                </button>
                                {project.workflowStage === WorkflowStage.COMPLETED && <button onClick={() => initiateReject(WorkflowStage.COMPLETED)} className="px-4 bg-red-900/20 rounded-xl border border-red-900/50 hover:bg-red-900/40 transition-colors"><XCircle className="w-5 h-5 text-red-500"/></button>}
                            </div>
                        </div>
                     </div>
                </div>

                {/* RIGHT COLUMN: Logs */}
                <div className="lg:col-span-1 bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                        <h3 className="font-bold text-zinc-200">System Logs</h3>
                        <div className="flex gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-500"></div>
                             <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                             <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/30 font-mono text-xs">
                        {project.logs.length === 0 && <div className="text-zinc-700 text-center italic mt-10">Waiting for input...</div>}
                        {project.logs.map((log) => (
                            <div key={log.id} className="flex gap-2 animate-fade-in">
                                <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                <div className="flex-1">
                                    <span className={`${log.type === 'error' ? 'text-red-400' : 'text-blue-400'} font-bold`}>{AGENTS[log.agentId].name}: </span>
                                    <span className={log.type === 'error' ? 'text-red-300' : log.type === 'success' ? 'text-green-300' : 'text-zinc-300'}>
                                        {log.message}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- CHARACTER DESIGNER (UPDATED FOR LOCKING & LOADING FEEDBACK & MANUAL UPLOAD) ---
  if (role === AgentRole.CHARACTER_DESIGNER) {
      if (project.characters.length === 0) {
          return (
              <div className="h-full flex flex-col w-full relative overflow-y-auto">
                 {renderProgressBar()}
                  <div className="h-full flex items-center justify-center p-8">
                      <div className="text-center text-zinc-500">
                          <Users className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                          <h3 className="text-xl font-bold mb-2">No Characters Yet</h3>
                          <p>Run Step 2 (Scripting) to generate a cast list first.</p>
                      </div>
                  </div>
              </div>
          )
      }

      return (
        <div className="h-full flex flex-col w-full relative overflow-y-auto">
             {renderProgressBar()}
             <div className="max-w-7xl mx-auto w-full px-8 pb-8">
                 <div className="flex items-center gap-6 mb-8">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-purple-500 shadow-lg" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Character Casting</h2>
                        <p className="text-zinc-400">
                            {isLongFormat 
                                ? "LONG SERIES MODE: Review and LOCK character sheets before production." 
                                : "SHORT STORY MODE: Quick designs for one-off video."}
                        </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                     {project.characters.map((char, i) => (
                         <div key={char.id} className={`bg-zinc-900 border rounded-2xl p-4 flex gap-4 transition-all relative overflow-hidden ${char.isLocked ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-zinc-800'}`}>
                             {/* Consistency Overlay */}
                             {char.consistencyStatus === 'FAIL' && (
                                 <div className="absolute top-0 right-0 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 flex items-center gap-1">
                                     <AlertTriangle className="w-3 h-3"/> Style Mismatch
                                 </div>
                             )}
                             {char.consistencyStatus === 'PASS' && (
                                 <div className="absolute top-0 right-0 bg-green-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 flex items-center gap-1">
                                     <CheckCircle className="w-3 h-3"/> Style Verified
                                 </div>
                             )}

                             <div className="w-32 h-40 bg-zinc-950 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
                                 {char.isGenerating ? (
                                     <div className="flex flex-col items-center gap-2">
                                         <Loader2 className="w-8 h-8 text-purple-500 animate-spin"/>
                                         <span className="text-[10px] text-zinc-500 uppercase font-bold animate-pulse">
                                             {char.consistencyStatus === 'PENDING' ? 'Verifying...' : 'Designing...'}
                                         </span>
                                     </div>
                                 ) : char.imageUrl ? (
                                     <img src={char.imageUrl} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-950/50">
                                         <UserPlus className="w-8 h-8 opacity-50"/>
                                     </div>
                                 )}
                                 
                                 {/* Lock Status Badge */}
                                 {char.imageUrl && !char.isGenerating && (
                                     <div className="absolute top-2 left-2">
                                         {char.isLocked 
                                            ? <div className="bg-amber-500 text-black p-1 rounded-full shadow-lg"><Lock className="w-3 h-3"/></div>
                                            : <div className="bg-black/50 text-white p-1 rounded-full"><Unlock className="w-3 h-3"/></div>
                                         }
                                     </div>
                                 )}
                             </div>
                             <div className="flex-1 flex flex-col">
                                 <div className="flex justify-between items-start mb-2">
                                     <h3 className="font-bold text-lg text-zinc-100">{char.name}</h3>
                                     <div className="flex gap-2">
                                         {/* Upload Button */}
                                         <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-colors border border-zinc-700 group" title="Upload Manual Design">
                                             <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => handleCharacterUpload(e, i)}
                                             />
                                             <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white"/>
                                         </label>
                                         <button 
                                            onClick={() => toggleCharacterLock(char.id)}
                                            disabled={!char.imageUrl || char.isGenerating}
                                            className={`text-xs font-bold uppercase px-3 py-1 rounded-full border transition-all flex items-center gap-1
                                                ${!char.imageUrl ? 'opacity-50 cursor-not-allowed border-zinc-800 text-zinc-600' : char.isLocked 
                                                    ? 'bg-amber-900/30 border-amber-500/50 text-amber-500 hover:bg-amber-900/50' 
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}
                                            `}
                                         >
                                             {char.isLocked ? 'Locked' : 'Unlocked'}
                                         </button>
                                     </div>
                                 </div>
                                 <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{char.description}</p>
                                 
                                 {char.consistencyReport && char.consistencyStatus === 'FAIL' && (
                                     <div className="bg-red-900/20 border border-red-900/50 p-2 rounded-lg mb-auto">
                                         <p className="text-[10px] text-red-300 line-clamp-2"><span className="font-bold">Critique:</span> {char.consistencyReport}</p>
                                     </div>
                                 )}

                                 <div className="mt-auto pt-2 border-t border-zinc-800 flex gap-2">
                                     <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Voice: {char.voice}</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
      );
  }

  // --- SCRIPTWRITER VIEW (UPDATED FOR BIBLE) ---
  if (role === AgentRole.SCRIPTWRITER) {
    return (
      <div className="h-full flex flex-col w-full relative overflow-y-auto">
         {renderProgressBar()}
         <div className="max-w-5xl mx-auto w-full px-8 pb-8">
             <div className="flex items-center gap-6 mb-8">
                <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-lg" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Script Editor</h2>
                    <p className="text-zinc-400">Review and refine the generated screenplay.</p>
                </div>
             </div>

             {/* Series Bible View (If Long Format) */}
             {isLongFormat && project.seriesBible && (
                 <div className="mb-8 bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-2xl">
                     <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><Book className="w-5 h-5"/> Series Bible (Context)</h3>
                     <div className="grid grid-cols-2 gap-6">
                         <div>
                             <label className="text-[10px] uppercase font-bold text-emerald-600 mb-1 block">World Setting</label>
                             <p className="text-sm text-emerald-100/80">{project.seriesBible.worldSetting}</p>
                         </div>
                         <div>
                             <label className="text-[10px] uppercase font-bold text-emerald-600 mb-1 block">Main Conflict</label>
                             <p className="text-sm text-emerald-100/80">{project.seriesBible.mainConflict}</p>
                         </div>
                     </div>
                 </div>
             )}

             <div className="space-y-8 pb-24">
                 {project.panels.map((p, i) => (
                     <div key={i} className="bg-zinc-900/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-800 relative group shadow-lg transition-all hover:border-emerald-500/30">
                         <span className="absolute top-4 right-4 text-zinc-500 font-mono text-xs font-bold tracking-widest bg-zinc-950 px-2 py-1 rounded">SCENE {i+1}</span>
                         
                         <div className="space-y-6 mt-2">
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2 block">Visual Description</label>
                                 <textarea 
                                    value={p.description}
                                    onChange={(e) => handleUpdatePanelText(i, 'description', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-200 text-sm focus:border-emerald-500 outline-none transition-colors"
                                    rows={2}
                                 />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-2 block flex items-center gap-2"><MessageSquare className="w-3 h-3"/> Dialogue</label>
                                    <textarea 
                                        value={p.dialogue}
                                        onChange={(e) => handleUpdatePanelText(i, 'dialogue', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-emerald-100 text-sm focus:border-emerald-500 outline-none transition-colors"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-amber-500 tracking-wider mb-2 block flex items-center gap-2"><BookOpen className="w-3 h-3"/> Narrator</label>
                                    <textarea 
                                        value={p.caption || ''}
                                        onChange={(e) => handleUpdatePanelText(i, 'caption', e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-amber-100 text-sm focus:border-amber-500 outline-none transition-colors"
                                        rows={3}
                                        placeholder="(Optional narrator text)"
                                    />
                                </div>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
         </div>
      </div>
    );
  }

  // --- ARCHIVIST VIEW (NEW) ---
  if (role === AgentRole.ARCHIVIST) {
    return (
        <div className="h-full flex flex-col w-full relative overflow-y-auto">
             {renderProgressBar()}
             <div className="max-w-7xl mx-auto w-full px-8 pb-8">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-stone-500 shadow-lg" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">Project Archives</h2>
                            <p className="text-zinc-400">Secure textual storage for scripts and metadata.</p>
                        </div>
                    </div>
                    <div className="text-sm text-zinc-500">
                        Total Stored: {library.length}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {library.map((p) => (
                        <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-stone-500 transition-all group flex flex-col h-64 relative">
                             <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-stone-500/20 rounded-lg text-stone-400 group-hover:bg-stone-500 group-hover:text-white transition-colors">
                                    <Archive className="w-6 h-6"/>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-zinc-600 border border-zinc-800 px-2 py-1 rounded">
                                    {p.language}
                                </span>
                             </div>
                             <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{p.title}</h3>
                             <p className="text-xs text-zinc-500 mb-4">{new Date(p.lastModified || Date.now()).toLocaleDateString()}</p>
                             <p className="text-sm text-zinc-400 line-clamp-3 mb-6 flex-1">
                                {p.theme}
                             </p>
                             
                             <div className="flex gap-2 mt-auto">
                                 <button 
                                    onClick={() => setSelectedArchivedProject(p)}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                 >
                                    <FileText className="w-4 h-4"/> View
                                 </button>
                                 <button 
                                    onClick={() => handleLoadProject(p)}
                                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                 >
                                    <Upload className="w-4 h-4"/> Load
                                 </button>
                                 <button 
                                    onClick={() => handleDeleteFromLibrary(p.id!)}
                                    className="px-3 bg-red-900/20 hover:bg-red-900/50 text-red-500 rounded-lg transition-colors"
                                 >
                                    <Trash2 className="w-4 h-4"/>
                                 </button>
                             </div>
                        </div>
                    ))}
                    {library.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-3xl">
                            <Archive className="w-12 h-12 mb-4 opacity-50"/>
                            <p>No archived projects found.</p>
                            <p className="text-xs">Go to Publisher to archive a completed script.</p>
                        </div>
                    )}
                 </div>

                 {/* Detail Modal */}
                 {selectedArchivedProject && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                         <div className="bg-zinc-900 w-full max-w-2xl max-h-[80vh] rounded-2xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                                <h3 className="font-bold text-white">{selectedArchivedProject.title} (Read-Only)</h3>
                                <button onClick={() => setSelectedArchivedProject(null)}><X className="w-5 h-5 text-zinc-500 hover:text-white"/></button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Theme & Style</h4>
                                    <p className="text-zinc-300 text-sm">{selectedArchivedProject.theme}</p>
                                    <p className="text-zinc-400 text-xs mt-1">Style: {selectedArchivedProject.style} | Format: {selectedArchivedProject.storyFormat}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Characters</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedArchivedProject.characters.map(c => (
                                            <div key={c.id} className="bg-zinc-950 p-2 rounded border border-zinc-800">
                                                <p className="font-bold text-xs text-stone-300">{c.name}</p>
                                                <p className="text-[10px] text-zinc-500 line-clamp-2">{c.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Script Summary</h4>
                                    <div className="space-y-2">
                                        {selectedArchivedProject.panels.map((p, idx) => (
                                            <div key={idx} className="flex gap-4 p-2 bg-zinc-950/50 rounded border border-zinc-800/50">
                                                <span className="text-stone-500 font-mono text-xs shrink-0">#{idx+1}</span>
                                                <div>
                                                    <p className="text-xs text-zinc-300 mb-1">{p.description}</p>
                                                    {p.dialogue && <p className="text-xs text-indigo-400 italic">"{p.dialogue}"</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
                                <button onClick={() => { handleLoadProject(selectedArchivedProject); setSelectedArchivedProject(null); }} className="bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded-lg text-sm">
                                    Load Project
                                </button>
                            </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
  }

  // --- MARKET RESEARCHER VIEW (STRATEGIC) ---
  if (role === AgentRole.MARKET_RESEARCHER) {
    if (!project.marketAnalysis) {
        return (
            <div className="h-full flex flex-col w-full relative overflow-y-auto">
                {renderProgressBar()}
                <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center text-zinc-500">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-bold mb-2">No Research Data</h3>
                        <p>Go to Project Manager console and start "Step 1: Market Research".</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col w-full relative overflow-y-auto">
             {renderProgressBar()}
             <div className="max-w-7xl mx-auto w-full px-8 pb-8">
                 <div className="flex items-center gap-6 mb-8">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-indigo-500 shadow-lg" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Strategic Strategy</h2>
                        <p className="text-zinc-400">Analysis of audience, style, and narrative direction.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                     
                     {/* Card 1: Core Identity */}
                     <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Target className="w-5 h-5"/></div>
                             <h3 className="font-bold text-lg text-zinc-100">Core Identity</h3>
                         </div>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Suggested Title</label>
                                 <p className="text-xl font-serif font-black text-white">{project.marketAnalysis.suggestedTitle}</p>
                             </div>
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Target Audience</label>
                                 <p className="text-sm text-zinc-300 leading-relaxed">{project.marketAnalysis.targetAudience}</p>
                             </div>
                         </div>
                     </div>

                     {/* Card 2: Visual Direction */}
                     <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><Palette className="w-5 h-5"/></div>
                             <h3 className="font-bold text-lg text-zinc-100">Visual Direction</h3>
                         </div>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Art Style</label>
                                 <p className="text-sm text-zinc-300 leading-relaxed italic border-l-2 border-pink-500 pl-3">"{project.marketAnalysis.visualStyle}"</p>
                             </div>
                             <div>
                                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Color Palette</label>
                                <div className="flex gap-2">
                                    {project.marketAnalysis.colorPalette.map((color, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-full border border-white/10 shadow-lg" style={{backgroundColor: color}}></div>
                                            <span className="text-[9px] font-mono text-zinc-500">{color}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         </div>
                     </div>

                     {/* Card 3: Narrative DNA */}
                     <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Lightbulb className="w-5 h-5"/></div>
                             <h3 className="font-bold text-lg text-zinc-100">Narrative DNA</h3>
                         </div>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Pacing & Structure</label>
                                 <p className="text-sm text-zinc-300 leading-relaxed">{project.marketAnalysis.narrativeStructure}</p>
                             </div>
                             <div>
                                 <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Key Themes</label>
                                 <div className="flex flex-wrap gap-2">
                                     {project.marketAnalysis.keyThemes.map((theme, i) => (
                                         <span key={i} className="px-3 py-1 bg-emerald-900/30 text-emerald-300 border border-emerald-900/50 rounded-full text-xs font-bold">
                                             #{theme}
                                         </span>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     </div>

                 </div>
             </div>
        </div>
    );
  }

  // --- PANEL ARTIST (REGENERATION) ---
  if (role === AgentRole.PANEL_ARTIST) {
       return (
        <div className="h-full flex flex-col w-full relative overflow-y-auto">
            {renderProgressBar()}
            <div className="max-w-7xl mx-auto w-full px-8 pb-8">
                <div className="flex items-center gap-6 mb-8">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-rose-500 shadow-lg" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Storyboard & Art</h2>
                        <p className="text-zinc-400">Review generated panels. Click refresh icon to redraw.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">
                    {project.panels.map((p, i) => (
                        <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col shadow-xl hover:shadow-2xl transition-all">
                            <div className="relative aspect-[4/3] bg-black group">
                                {p.imageUrl ? (
                                    <>
                                        <img src={p.imageUrl} className={`w-full h-full object-cover transition-all duration-500 ${regeneratingPanelId === p.id ? 'opacity-30 blur-sm' : ''}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                                             <span className="text-white font-bold text-sm drop-shadow-md">Panel {i+1}</span>
                                             <button 
                                                onClick={() => handleRegenerateSinglePanel(p, i)}
                                                disabled={!!regeneratingPanelId}
                                                className="bg-white/10 backdrop-blur-md hover:bg-rose-600 text-white p-2 rounded-full transition-all border border-white/20"
                                                title="Redraw this panel"
                                            >
                                                <RefreshCw className={`w-5 h-5 ${regeneratingPanelId === p.id ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/50">
                                        <ImageIcon className="w-12 h-12 mb-2 opacity-50"/>
                                        <span className="text-xs uppercase font-bold opacity-50">Empty</span>
                                    </div>
                                )}
                                {/* Loading Overlay */}
                                {p.isGenerating && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                        <Loader2 className="w-8 h-8 text-rose-500 animate-spin"/>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-zinc-900 flex-1 border-t border-zinc-800">
                                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">{p.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // --- CINEMATOGRAPHER (VIDEO SELECTION) ---
  if (role === AgentRole.CINEMATOGRAPHER) {
      return (
        <div className="h-full flex flex-col w-full relative overflow-y-auto">
            {renderProgressBar()}
            <div className="max-w-6xl mx-auto w-full px-8 pb-8">
                <div className="flex items-center gap-6 mb-8">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-orange-500 shadow-lg" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Motion Planning</h2>
                        <p className="text-zinc-400">Select panels to animate into video. Unchecked panels will remain as static slides.</p>
                    </div>
                </div>
                <div className="space-y-4 pb-24">
                    {project.panels.map((p, i) => (
                        <div key={i} className={`flex gap-6 p-4 rounded-2xl border transition-all duration-300 ${p.shouldAnimate ? 'bg-gradient-to-r from-orange-900/20 to-transparent border-orange-500/30' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'}`}>
                            <div className="w-48 aspect-[4/3] bg-black shrink-0 rounded-xl overflow-hidden shadow-lg">
                                {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 py-2">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg text-zinc-200">Panel {i+1}</h4>
                                    <label className={`flex items-center gap-3 cursor-pointer px-4 py-2 rounded-lg border transition-all ${p.shouldAnimate ? 'bg-orange-600 text-white border-orange-500 shadow-orange-900/20 shadow-lg' : 'bg-zinc-950 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={p.shouldAnimate} 
                                            onChange={() => {
                                                const newPanels = [...project.panels];
                                                newPanels[i].shouldAnimate = !newPanels[i].shouldAnimate;
                                                updateProject({ panels: newPanels });
                                            }}
                                            className="hidden" // Custom checkbox styling
                                        />
                                        {p.shouldAnimate ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4"/>}
                                        <span className="text-xs font-bold uppercase tracking-wider">{p.shouldAnimate ? 'Video Mode' : 'Static Image'}</span>
                                    </label>
                                </div>
                                <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{p.description}</p>
                                
                                <div className="flex gap-2">
                                    {p.dialogue && <span className="text-[10px] uppercase font-bold bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-900/50">Dialogue Available</span>}
                                    {p.caption && <span className="text-[10px] uppercase font-bold bg-amber-900/30 text-amber-400 px-2 py-1 rounded border border-amber-900/50">Narrator Available</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // --- PUBLISHER (FINAL VIEW) ---
  if (role === AgentRole.PUBLISHER) {
      return (
          <div className="h-full flex flex-col w-full relative overflow-y-auto">
              {renderProgressBar()}
              <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950">
                  <div className="text-center max-w-2xl">
                      <div className="relative w-24 h-24 mx-auto mb-8">
                          <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                          <div className="relative w-full h-full bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/30">
                              <CheckCircle className="w-12 h-12" />
                          </div>
                      </div>
                      <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Production Complete</h2>
                      <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                          Your motion comic has been rendered successfully. Preview it on the sidebar or export the master file below.
                      </p>
                      <div className="flex justify-center gap-6">
                           <button className="flex items-center gap-3 bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-bold shadow-xl shadow-white/5 transition-all transform hover:scale-105">
                               <Film className="w-5 h-5" /> Export MP4
                           </button>
                           <button 
                               onClick={handleArchiveProject}
                               className="flex items-center gap-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 px-8 py-4 rounded-xl font-bold border border-zinc-700 transition-all hover:border-amber-500/50"
                           >
                               <Save className="w-5 h-5" /> Save to Archive
                           </button>
                      </div>
                      <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest">
                          *Save will only archive text & script data to save storage
                      </p>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col w-full relative overflow-y-auto">
        {renderProgressBar()}
        <div className="p-8 max-w-4xl mx-auto flex items-center justify-center flex-1">
            <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-3xl text-center">
                <Users className="w-16 h-16 mx-auto text-zinc-700 mb-6"/>
                <h3 className="text-xl font-bold text-zinc-300 mb-2">Workspace Inactive</h3>
                <p className="text-zinc-500">Select an agent role from the sidebar to view their workspace.</p>
            </div>
        </div>
    </div>
  );
};

// Missing icon fix
const Share2 = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
)

const MessageSquare = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
)

export default AgentWorkspace;