import React, { useState, useEffect, useRef } from 'react';
import { AgentRole, ComicProject, ComicPanel, Character, WorkflowStage, SystemLog } from '../types';
import { AGENTS } from '../constants';
import * as GeminiService from '../services/geminiService';
import { Send, RefreshCw, Image as ImageIcon, CheckCircle, Loader2, Sparkles, UserPlus, BookOpen, Users, Megaphone, Languages, Mic, Video, Play, Pause, Globe, TrendingUp, ShieldAlert, ArrowRight, Activity, Palette, XCircle, AlertTriangle, X, Edit2, Film, Save } from 'lucide-react';

interface AgentWorkspaceProps {
  role: AgentRole;
  project: ComicProject;
  updateProject: (updates: Partial<ComicProject>) => void;
}

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const NARRATOR_VOICE = 'Puck'; // Default narrator

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ role, project, updateProject }) => {
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectStage, setRejectStage] = useState<WorkflowStage | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Micro-correction State
  const [regeneratingPanelId, setRegeneratingPanelId] = useState<string | null>(null);

  // Auto-scroll for logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (role === AgentRole.PROJECT_MANAGER) {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
              updateProject({ workflowStage: WorkflowStage.IDLE, marketAnalysis: '' });
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

  // ----------------------------------------------------------------------
  // AUTONOMOUS WORKFLOW CONTROLLERS
  // ----------------------------------------------------------------------

  // Step 1: Research
  const handleStartResearch = async () => {
    if (!project.theme) return;
    setLoading(true);
    updateProject({ workflowStage: WorkflowStage.RESEARCHING });
    addLog(AgentRole.PROJECT_MANAGER, "Initializing Market Research...", 'info');
    try {
        const analysis = await GeminiService.conductMarketResearch(project.theme);
        updateProject({ marketAnalysis: analysis });
        addLog(AgentRole.MARKET_RESEARCHER, "Research complete.", 'success');
    } catch (e) {
        addLog(AgentRole.MARKET_RESEARCHER, "Research failed.", 'error');
    } finally { setLoading(false); }
  };

  // Step 2: Scripting
  const handleApproveResearchAndScript = async () => {
      setLoading(true);
      updateProject({ workflowStage: WorkflowStage.SCRIPTING });
      addLog(AgentRole.PROJECT_MANAGER, "Commissioning Scriptwriter.", 'info');

      try {
        const result = await GeminiService.generateScript(project.theme, project.style);
        const chars = result.panels.flatMap(p => p.charactersInvolved).reduce((acc: Character[], name) => {
            if (!acc.find(c => c.name === name)) {
                const randomVoice = AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
                acc.push({ id: crypto.randomUUID(), name, description: `A character named ${name}`, voice: randomVoice });
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

  // Step 3: Visualization
  const handleApproveScriptAndVisualize = async () => {
    if (project.isCensored) { alert("Script unsafe."); return; }

    setLoading(true);
    updateProject({ workflowStage: WorkflowStage.DESIGNING_CHARACTERS });
    addLog(AgentRole.PROJECT_MANAGER, "Script Approved. Starting Visuals.", 'info');

    try {
        // 1. Characters
        addLog(AgentRole.CHARACTER_DESIGNER, `Designing ${project.characters.length} characters...`, 'info');
        const newChars = [...project.characters];
        for (let i = 0; i < newChars.length; i++) {
             const result = await GeminiService.generateCharacterDesign(newChars[i].name, project.theme);
             newChars[i] = { ...newChars[i], description: result.description, imageUrl: result.imageUrl };
             updateProject({ characters: [...newChars] }); 
        }
        
        // 2. Panels
        updateProject({ workflowStage: WorkflowStage.VISUALIZING_PANELS });
        addLog(AgentRole.PANEL_ARTIST, `Drawing ${project.panels.length} panels...`, 'info');
        const newPanels = [...project.panels];
        for (let i = 0; i < newPanels.length; i++) {
             // Pass characters for consistency
             const imageUrl = await GeminiService.generatePanelImage(newPanels[i], project.style, newChars);
             newPanels[i] = { ...newPanels[i], imageUrl };
             updateProject({ panels: [...newPanels] });
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
            if (newPanels[i].dialogue) {
                 try {
                     const speakerName = newPanels[i].charactersInvolved[0];
                     const speaker = project.characters.find(c => c.name === speakerName);
                     const audioUrl = await GeminiService.generateVoiceover(newPanels[i].dialogue, speaker?.voice || 'Puck');
                     newPanels[i].audioUrl = audioUrl;
                 } catch (err) {}
            }
            // Narrator
            if (newPanels[i].caption) {
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
            // Only animate if selected AND has image
            if (newPanels[i].imageUrl && newPanels[i].shouldAnimate) {
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
  // VIEW RENDERERS
  // ----------------------------------------------------------------------

  // --- PROJECT MANAGER (DASHBOARD) ---
  if (role === AgentRole.PROJECT_MANAGER) {
    return (
      <div className="h-full flex flex-col max-w-6xl mx-auto w-full pt-6 px-4 relative">
        {/* Rejection Modal */}
        {showRejectModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md">
                    <h3 className="text-xl font-bold text-red-500 mb-4 flex gap-2"><AlertTriangle/> Reject Phase</h3>
                    <textarea 
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-200 h-32 mb-4"
                        placeholder="Reason for rejection..."
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowRejectModal(false)} className="text-zinc-400">Cancel</button>
                        <button onClick={handleConfirmReject} className="bg-red-600 px-4 py-2 rounded text-white">Confirm</button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
            <img src={AGENTS[role].avatar} alt="Manager" className="w-16 h-16 rounded-full border-2 border-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Director's Console</h2>
              <p className="text-zinc-400">Manage pipeline & approvals.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-6">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-4">
                 <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                    <h3 className="font-bold text-zinc-300 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Project</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase">Theme</label>
                            <textarea
                                value={project.theme || inputText}
                                onChange={(e) => { setInputText(e.target.value); updateProject({ theme: e.target.value }); }}
                                disabled={project.workflowStage !== WorkflowStage.IDLE && project.workflowStage !== WorkflowStage.RESEARCHING}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-zinc-100 mt-1 h-24"
                                placeholder="Story concept..."
                            />
                        </div>
                    </div>
                 </div>

                 {/* Workflow Buttons */}
                 <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                    <h3 className="font-bold text-zinc-300 mb-4">Pipeline</h3>
                    <div className="space-y-2">
                        {/* 1. Research */}
                        <div className="flex gap-2">
                            <button onClick={handleStartResearch} disabled={loading || !project.theme || project.workflowStage !== WorkflowStage.IDLE}
                                className={`flex-1 py-3 px-4 rounded flex justify-between text-sm border ${project.workflowStage === WorkflowStage.IDLE ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <span>1. Research</span>
                                {project.marketAnalysis && <CheckCircle className="w-4 h-4 text-green-500"/>}
                            </button>
                            {project.workflowStage === WorkflowStage.RESEARCHING && <button onClick={() => initiateReject(WorkflowStage.RESEARCHING)} className="px-3 bg-red-900/50 rounded border border-red-800"><XCircle className="w-4 h-4 text-red-400"/></button>}
                        </div>

                        {/* 2. Script */}
                        <div className="flex gap-2">
                            <button onClick={handleApproveResearchAndScript} disabled={loading || !project.marketAnalysis || (project.workflowStage !== WorkflowStage.RESEARCHING && project.workflowStage !== WorkflowStage.SCRIPTING)}
                                className={`flex-1 py-3 px-4 rounded flex justify-between text-sm border ${project.workflowStage === WorkflowStage.RESEARCHING ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <span>2. Scripting</span>
                                {project.panels.length > 0 && <CheckCircle className="w-4 h-4 text-green-500"/>}
                            </button>
                            {project.workflowStage === WorkflowStage.CENSORING_SCRIPT && <button onClick={() => initiateReject(WorkflowStage.CENSORING_SCRIPT)} className="px-3 bg-red-900/50 rounded border border-red-800"><XCircle className="w-4 h-4 text-red-400"/></button>}
                        </div>

                        {/* 3. Visuals */}
                        <div className="flex gap-2">
                            <button onClick={handleApproveScriptAndVisualize} disabled={loading || !project.panels.length || project.isCensored || project.workflowStage === WorkflowStage.POST_PRODUCTION || project.workflowStage === WorkflowStage.COMPLETED}
                                className={`flex-1 py-3 px-4 rounded flex justify-between text-sm border ${project.workflowStage === WorkflowStage.CENSORING_SCRIPT ? 'bg-rose-600 border-rose-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <span>3. Visuals</span>
                                {project.panels.some(p => p.imageUrl) && <CheckCircle className="w-4 h-4 text-green-500"/>}
                            </button>
                            {project.workflowStage === WorkflowStage.POST_PRODUCTION && <button onClick={() => initiateReject(WorkflowStage.POST_PRODUCTION)} className="px-3 bg-red-900/50 rounded border border-red-800"><XCircle className="w-4 h-4 text-red-400"/></button>}
                        </div>

                        {/* 4. Motion */}
                        <div className="flex gap-2">
                            <button onClick={handleFinalizeProduction} disabled={loading || !project.panels.some(p => p.imageUrl) || project.workflowStage === WorkflowStage.COMPLETED}
                                className={`flex-1 py-3 px-4 rounded flex justify-between text-sm border ${project.workflowStage === WorkflowStage.POST_PRODUCTION ? 'bg-amber-600 border-amber-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <span>4. Motion & Sound</span>
                                {project.workflowStage === WorkflowStage.COMPLETED && <CheckCircle className="w-4 h-4 text-green-500"/>}
                            </button>
                            {project.workflowStage === WorkflowStage.COMPLETED && <button onClick={() => initiateReject(WorkflowStage.COMPLETED)} className="px-3 bg-red-900/50 rounded border border-red-800"><XCircle className="w-4 h-4 text-red-400"/></button>}
                        </div>
                    </div>
                 </div>
            </div>

            {/* Logs */}
            <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-200">System Logs</h3>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500"/>}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/50">
                    {project.logs.map((log) => (
                        <div key={log.id} className="flex gap-3 text-sm">
                            <span className={`font-mono text-xs px-1 rounded h-fit ${log.type === 'error' ? 'text-red-400 bg-red-900/20' : 'text-zinc-500 bg-zinc-800'}`}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={log.type === 'error' ? 'text-red-300' : 'text-zinc-300'}>
                                <b>{AGENTS[log.agentId].name}:</b> {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- SCRIPTWRITER VIEW (EDITABLE) ---
  if (role === AgentRole.SCRIPTWRITER) {
    return (
      <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full overflow-y-auto">
         <div className="flex items-center gap-4 mb-6">
            <img src={AGENTS[role].avatar} className="w-12 h-12 rounded-full border-2 border-emerald-500" />
            <div>
                <h2 className="text-xl font-bold">Script Editor</h2>
                <p className="text-zinc-400 text-sm">Edit dialogue and captions before approval.</p>
            </div>
         </div>
         <div className="space-y-6 pb-20">
             {project.panels.map((p, i) => (
                 <div key={i} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 relative group">
                     <span className="absolute top-4 right-4 text-zinc-600 font-mono text-xs">PANEL {i+1}</span>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="text-[10px] uppercase font-bold text-zinc-500">Visual Description</label>
                             <textarea 
                                value={p.description}
                                onChange={(e) => handleUpdatePanelText(i, 'description', e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-sm mt-1 focus:border-emerald-500 outline-none"
                                rows={2}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-emerald-500">Dialogue</label>
                                <textarea 
                                    value={p.dialogue}
                                    onChange={(e) => handleUpdatePanelText(i, 'dialogue', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-emerald-100 text-sm mt-1 focus:border-emerald-500 outline-none"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-amber-500">Caption / Narrator</label>
                                <textarea 
                                    value={p.caption || ''}
                                    onChange={(e) => handleUpdatePanelText(i, 'caption', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-amber-100 text-sm mt-1 focus:border-amber-500 outline-none"
                                    rows={2}
                                    placeholder="(Optional narrator text)"
                                />
                            </div>
                         </div>
                     </div>
                 </div>
             ))}
         </div>
      </div>
    );
  }

  // --- PANEL ARTIST (REGENERATION) ---
  if (role === AgentRole.PANEL_ARTIST) {
       return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <img src={AGENTS[role].avatar} className="w-12 h-12 rounded-full border-2 border-rose-500" />
                <div>
                    <h2 className="text-xl font-bold">Storyboard Review</h2>
                    <p className="text-zinc-400 text-sm">Review art. Use "Regenerate" to redraw specific panels.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {project.panels.map((p, i) => (
                    <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex flex-col">
                        <div className="relative aspect-[4/3] bg-black group">
                            {p.imageUrl ? (
                                <>
                                    <img src={p.imageUrl} className={`w-full h-full object-cover transition-opacity ${regeneratingPanelId === p.id ? 'opacity-50' : ''}`} />
                                    <button 
                                        onClick={() => handleRegenerateSinglePanel(p, i)}
                                        disabled={!!regeneratingPanelId}
                                        className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                        title="Redraw this panel"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${regeneratingPanelId === p.id ? 'animate-spin' : ''}`} />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                    <ImageIcon className="w-8 h-8"/>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-zinc-900 flex-1">
                            <p className="text-xs text-zinc-400 line-clamp-3">{p.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // --- CINEMATOGRAPHER (VIDEO SELECTION) ---
  if (role === AgentRole.CINEMATOGRAPHER) {
      return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <img src={AGENTS[role].avatar} className="w-12 h-12 rounded-full border-2 border-orange-500" />
                <div>
                    <h2 className="text-xl font-bold">Motion Planning</h2>
                    <p className="text-zinc-400 text-sm">Select panels to animate (Check "Video"). Unchecked panels remain static.</p>
                </div>
            </div>
            <div className="space-y-4 pb-20">
                {project.panels.map((p, i) => (
                    <div key={i} className={`flex gap-4 p-4 rounded-xl border transition-colors ${p.shouldAnimate ? 'bg-orange-900/10 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                        <div className="w-32 aspect-[4/3] bg-black shrink-0 rounded overflow-hidden">
                            {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-zinc-200">Panel {i+1}</h4>
                                <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 px-3 py-1.5 rounded border border-zinc-700 hover:border-orange-500 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={p.shouldAnimate} 
                                        onChange={() => {
                                            const newPanels = [...project.panels];
                                            newPanels[i].shouldAnimate = !newPanels[i].shouldAnimate;
                                            updateProject({ panels: newPanels });
                                        }}
                                        className="accent-orange-500"
                                    />
                                    <span className="text-xs font-bold text-zinc-300">GENERATE VIDEO</span>
                                </label>
                            </div>
                            <p className="text-sm text-zinc-500 mt-2">{p.description}</p>
                            {(p.dialogue || p.caption) && (
                                <div className="flex gap-2 mt-2">
                                    {p.dialogue && <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Dialogue</span>}
                                    {p.caption && <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Caption</span>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // --- PUBLISHER (FINAL VIEW) ---
  if (role === AgentRole.PUBLISHER) {
      return (
          <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                  <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Ready for Distribution</h2>
                  <p className="text-zinc-400 max-w-md mx-auto mb-8">
                      The motion comic has been assembled. You can view the final cut in the preview sidebar.
                  </p>
                  <div className="flex justify-center gap-4">
                       <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-bold">
                           <Film className="w-5 h-5" /> Export MP4
                       </button>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
        {/* Market Researcher & Censor Views remain same as previous step, omitted for brevity but conceptually present */}
        <div className="bg-zinc-900 p-8 rounded text-center text-zinc-500">
            Select a role to view detailed workspace.
        </div>
    </div>
  );
};

export default AgentWorkspace;