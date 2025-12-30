
import React, { useState } from 'react';
import { AgentRole, ComicProject, Character, ResearchData, CharacterVariant, AgentTask, ComicPanel } from '../types';
import { AGENTS } from '../constants';
import { MessageCircle, Loader2, Send, FileText, TrendingUp, Upload, Download, BookOpen, Sparkles, Lightbulb, Users, Feather, CheckCircle, RefreshCw, Lock, Unlock, ScanFace, Globe, Palette, Layers, ListTodo, Plus, Check, Trash2, Bot, Play, Film, AlertTriangle, Search } from 'lucide-react';

const safeRender = (value: any): React.ReactNode => {
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
        if (value.description) return value.description;
        if (value.summary) return value.summary;
        if (value.title) return value.title;
        if (value.setting) return value.setting;
        return JSON.stringify(value);
    }
    return '';
};

// --- RESEARCH VIEW ---
export const ResearchView: React.FC<{ 
    project: ComicProject;
    handleResearchChatSend: () => void;
    researchChatInput: string;
    setResearchChatInput: (s: string) => void;
    handleFinalizeStrategyFromChat: () => void;
    handleUpdateMarketAnalysis: (data: ResearchData) => void;
    updateProject: (updates: Partial<ComicProject>) => void;
    loading: boolean;
    t: (k: string) => string;
    chatEndRef: React.RefObject<HTMLDivElement>;
    role: AgentRole;
}> = ({ project, handleResearchChatSend, researchChatInput, setResearchChatInput, handleFinalizeStrategyFromChat, loading, t, chatEndRef, role, updateProject }) => {
    
    // Auto-generated tasks only
    const tasks = (project.agentTasks || []).filter(t => t.role === AgentRole.MARKET_RESEARCHER);

    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-8 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex items-center gap-6 mb-4 shrink-0">
                <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-indigo-200 shadow-md" />
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{t('planner.desc')}</p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden min-h-0">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center shrink-0">
                            <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> {t('planner.chatTitle')}</span>
                            {project.researchChatHistory?.length > 0 && (
                                <button onClick={handleFinalizeStrategyFromChat} disabled={loading} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1"/> : null} {t('planner.finalize')}
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                             {project.researchChatHistory?.map((msg, idx) => (
                                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'}`}>
                                         {msg.content}
                                     </div>
                                 </div>
                             ))}
                             <div ref={chatEndRef} />
                        </div>
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                            <div className="flex gap-2 relative">
                                 <input 
                                    value={researchChatInput}
                                    onChange={(e) => setResearchChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleResearchChatSend()}
                                    placeholder={t('planner.chatPlaceholder')}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 outline-none transition-all"
                                 />
                                 <button 
                                    onClick={handleResearchChatSend}
                                    disabled={loading || !researchChatInput.trim()}
                                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                 >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                                 </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-1/3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-xs flex items-center gap-2"><ListTodo className="w-4 h-4"/> Agent Workflow</span>
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-bold">{tasks.filter(t => t.isCompleted).length}/{tasks.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30 dark:bg-gray-900/30">
                            {tasks.length === 0 && <div className="text-center text-gray-400 text-xs italic py-4">Initializing agent...</div>}
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500 group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800'}`}>
                                        {task.isCompleted && <Check className="w-3 h-3"/>}
                                    </div>
                                    <div className="flex-1">
                                        <span className={`flex-1 text-xs block ${task.isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200 font-medium'}`}>{task.description}</span>
                                        {task.type === 'SYSTEM' && !task.isCompleted && (
                                            <span className="text-[9px] text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mt-0.5"><Bot className="w-3 h-3"/> Auto-processing</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-1/3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm overflow-y-auto hidden lg:block">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4"><FileText className="w-5 h-5 text-indigo-500"/> {t('planner.formTitle')}</h3>
                    {project.marketAnalysis ? (
                        <div className="space-y-6 text-sm">
                            <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Title</label><p className="font-serif text-lg font-bold text-gray-900 dark:text-gray-100">{safeRender(project.marketAnalysis.suggestedTitle)}</p></div>
                            <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Logline</label><p className="text-gray-600 dark:text-gray-300 leading-relaxed">{safeRender(project.marketAnalysis.narrativeStructure)}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Visual Style</label><span className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-1 rounded border border-pink-100 dark:border-pink-800 font-medium inline-block text-xs">{safeRender(project.marketAnalysis.visualStyle)}</span></div>
                                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Audience</label><p className="text-gray-600 dark:text-gray-300 text-xs font-medium">{safeRender(project.marketAnalysis.targetAudience)}</p></div>
                            </div>
                            
                            {/* Extracted Characters Display */}
                            {project.marketAnalysis.extractedCharacters && project.marketAnalysis.extractedCharacters.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1"><Users className="w-3 h-3"/> Extracted Cast</label>
                                    <div className="space-y-2">
                                        {project.marketAnalysis.extractedCharacters.map((c, i) => (
                                            <div key={i} className="flex flex-col bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">{c.name}</span>
                                                    <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{c.role}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">{c.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <label className="text-xs text-indigo-500 dark:text-indigo-400 font-bold uppercase mb-2 flex items-center gap-1"><Globe className="w-3 h-3"/> World & Culture</label>
                                <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">{safeRender(project.marketAnalysis.worldSetting)}</p>
                                {project.marketAnalysis.culturalContext && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-800 dark:text-indigo-300 text-xs leading-relaxed border border-indigo-100 dark:border-indigo-800">
                                        {safeRender(project.marketAnalysis.culturalContext)}
                                    </div>
                                )}
                            </div>
                            {project.marketAnalysis.keyThemes && project.marketAnalysis.keyThemes.length > 0 && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase block mb-2">Key Themes</label>
                                    <div className="flex flex-wrap gap-1">
                                        {project.marketAnalysis.keyThemes.map((theme, i) => (
                                            <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600">#{safeRender(theme)}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="text-center text-gray-400 mt-20 flex flex-col items-center gap-2">
                             <TrendingUp className="w-12 h-12 opacity-20"/>
                             <p>{t('ui.waiting')}</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- WRITER VIEW ---
export const WriterView: React.FC<{
    project: ComicProject;
    handleImportScript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExportScript: () => void;
    handleApproveResearchAndScript: () => void;
    handleForceExtractCast: () => void; // NEW PROP
    updateProject: (updates: Partial<ComicProject>) => void;
    loading: boolean;
    t: (k: string) => string;
    scriptStep: 'CONCEPT' | 'CASTING' | 'WRITING';
    writerLogsEndRef: React.RefObject<HTMLDivElement>;
    role: AgentRole;
    isLongFormat: boolean;
}> = ({ project, handleImportScript, handleExportScript, handleApproveResearchAndScript, handleForceExtractCast, updateProject, loading, t, scriptStep, writerLogsEndRef, role, isLongFormat }) => {
    const panels = project.panels || [];
    const characters = project.characters || [];

    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-8 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-emerald-200 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Scriptwriting & World Building</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <label className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2">
                         <Upload className="w-4 h-4"/> {t('ui.import_script_btn')}
                         <input type="file" accept=".json,.txt" onChange={handleImportScript} className="hidden" />
                    </label>
                    <button onClick={handleExportScript} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
                        <Download className="w-4 h-4"/> {t('manager.export_file')}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600"/> Script Editor - {t('ui.current_chapter')} {project.currentChapter || 1}</h3>
                          {panels.length > 0 && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">{panels.length} {t('ui.panels')}</span>}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800 space-y-6">
                           {panels.length === 0 ? (
                               <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                   <Feather className="w-16 h-16 opacity-20"/>
                                   <p>{t('writer.empty')}</p>
                                   <button onClick={handleApproveResearchAndScript} disabled={loading} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2">
                                       {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                                       {t('writer.generate')}
                                   </button>
                               </div>
                           ) : (
                               panels.map((panel, idx) => (
                                   <div key={panel.id} className="group relative pl-8 border-l-2 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                                       <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 group-hover:border-emerald-400 text-[9px] flex items-center justify-center font-bold text-gray-400 group-hover:text-emerald-500">{idx+1}</span>
                                       <div className="mb-2">
                                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('writer.visual_desc')}</p>
                                           <textarea 
                                               className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-600 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 outline-none resize-none transition-all"
                                               value={panel.description}
                                               rows={3}
                                               onChange={(e) => {
                                                   const newPanels = [...panels];
                                                   newPanels[idx].description = e.target.value;
                                                   updateProject({ panels: newPanels });
                                               }}
                                           />
                                       </div>
                                       <div>
                                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('writer.dialogue')}</p>
                                            <textarea 
                                               className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm font-comic text-gray-900 dark:text-gray-100 focus:border-emerald-300 outline-none resize-none"
                                               value={panel.dialogue}
                                               rows={2}
                                               onChange={(e) => {
                                                   const newPanels = [...panels];
                                                   newPanels[idx].dialogue = e.target.value;
                                                   updateProject({ panels: newPanels });
                                               }}
                                           />
                                       </div>
                                   </div>
                               ))
                           )}
                           <div ref={writerLogsEndRef} />
                      </div>
                 </div>

                 <div className="lg:col-span-1 space-y-4 overflow-y-auto">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500"/> Concept</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                              {safeRender(project.storyConcept?.premise) || t('ui.waiting')}
                          </p>
                      </div>

                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                           <div className="flex justify-between items-center mb-3">
                               <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Users className="w-4 h-4 text-purple-500"/> Cast</h4>
                               <button 
                                   onClick={handleForceExtractCast}
                                   disabled={loading}
                                   className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                                   title="Re-scan script for characters"
                               >
                                   {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
                                   Scan Script
                               </button>
                           </div>
                           <div className="space-y-2">
                               {characters.map(char => (
                                   <div key={char.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                                       <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden">
                                           {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover"/> : char.name[0]}
                                       </div>
                                       <span className="font-bold text-gray-700 dark:text-gray-300">{char.name}</span>
                                       <span className="ml-auto text-[10px] text-gray-400 uppercase">{char.role}</span>
                                   </div>
                               ))}
                               {characters.length === 0 && <span className="text-xs text-gray-400 italic">{t('err.no_chars')}</span>}
                           </div>
                      </div>
                 </div>
            </div>
        </div>
    );
};

// --- CHARACTER DESIGNER VIEW ---
export const CharacterDesignerView: React.FC<{
    project: ComicProject;
    handleFinishCharacterDesign: () => void;
    handleRegenerateSingleCharacter: (char: Character, index: number, specificStyle?: string) => void;
    handleGenerateAllCharacters: (style: string) => void;
    handleUpdateCharacterDescription: (index: number, desc: string) => void;
    handleUpdateCharacterVoice: (index: number, voice: string) => void;
    toggleCharacterLock: (id: string) => void;
    handleCharacterUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
    handleCheckConsistency: (char: Character, index: number) => void;
    handleSelectCharacterVariant: (charIndex: number, variant: CharacterVariant) => void;
    role: AgentRole;
    t: (k: string) => string;
    availableVoices: string[];
    loading: boolean;
}> = ({ project, handleFinishCharacterDesign, handleRegenerateSingleCharacter, handleGenerateAllCharacters, handleUpdateCharacterDescription, handleUpdateCharacterVoice, toggleCharacterLock, handleCharacterUpload, handleCheckConsistency, handleSelectCharacterVariant, role, t, availableVoices, loading }) => {
    
    const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});
    const [globalStyle, setGlobalStyle] = useState(project.style || 'Japanese Manga (B&W)');
    const characters = project.characters || [];
    const isGlobalGenerating = characters.some(c => c.isGenerating);

    const handleStyleChange = (charId: string, style: string) => {
        setStyleSelections(prev => ({...prev, [charId]: style}));
    };

    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-purple-200 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Model Sheets & Visual Development</p>
                    </div>
                </div>
                
                {/* GLOBAL CONTROL BAR */}
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <select 
                        value={globalStyle} 
                        onChange={(e) => setGlobalStyle(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 outline-none p-2 cursor-pointer max-w-[150px] truncate"
                    >
                        <optgroup label="Manga & Anime">
                            <option value="Japanese Manga (B&W)">{t('style.manga_bw')}</option>
                            <option value="Japanese Manga (Color)">{t('style.manga_color')}</option>
                            <option value="Anime / Cel Shaded">{t('style.anime')}</option>
                        </optgroup>
                        <optgroup label="Animation">
                            <option value="2D Animation / Cartoon">{t('style.animation_2d')}</option>
                            <option value="3D Render / CGI Style">{t('style.animation_3d')}</option>
                        </optgroup>
                        <optgroup label="Webtoon & Manhua">
                            <option value="Webtoon (Full Color)">{t('style.webtoon')}</option>
                            <option value="Wuxia (Traditional Ink)">{t('style.wuxia')}</option>
                            <option value="Xianxia / Cultivation (Manhua)">{t('style.cultivation')}</option>
                        </optgroup>
                        <optgroup label="Western & Cinematic">
                            <option value="Modern Western Comic">{t('style.western')}</option>
                            <option value="Modern Slice of Life">{t('style.modern_sol')}</option>
                            <option value="Noir / High Contrast">{t('style.noir')}</option>
                            <option value="Cyberpunk / Neon">{t('style.cyberpunk')}</option>
                            <option value="Realism / Photorealistic">{t('style.realism')}</option>
                            <option value="Photorealistic (Cinematic)">{t('style.photoreal')}</option>
                        </optgroup>
                        <optgroup label="Niche & Artistic">
                            <option value="Gothic Horror">{t('style.gothic')}</option>
                            <option value="Steampunk">{t('style.steampunk')}</option>
                            <option value="Fantasy Art Nouveau">{t('style.art_nouveau')}</option>
                        </optgroup>
                    </select>
                    <button 
                        onClick={() => handleGenerateAllCharacters(globalStyle)} 
                        disabled={isGlobalGenerating || loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                        {isGlobalGenerating || loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                        Generate All
                    </button>
                </div>

                <button onClick={handleFinishCharacterDesign} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all">
                    <CheckCircle className="w-5 h-5"/> {t('designer.finalize')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {characters.map((char, idx) => (
                    <div key={char.id} className={`bg-white dark:bg-gray-800 border ${char.consistencyStatus === 'FAIL' ? 'border-red-400 dark:border-red-500 ring-2 ring-red-100 dark:ring-red-900/20' : 'border-gray-200 dark:border-gray-700'} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-full`}>
                         <div className="aspect-square bg-gray-50 dark:bg-gray-900 relative overflow-hidden flex items-center justify-center shrink-0">
                             
                             {/* ERROR OVERLAY */}
                             {char.error && !char.isGenerating && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-50/95 dark:bg-red-900/95 p-4 text-center animate-in fade-in">
                                    <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400 mb-2"/>
                                    <p className="text-xs font-bold text-red-600 dark:text-red-300 mb-1">Generation Failed</p>
                                    <p className="text-[10px] text-red-500 dark:text-red-400 mb-3 line-clamp-3 leading-tight">{char.error}</p>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerateSingleCharacter(char, idx);
                                        }}
                                        className="bg-white dark:bg-red-950 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-red-50 dark:hover:bg-red-900 transition-colors flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3"/> Retry
                                    </button>
                                </div>
                             )}

                             {char.isGenerating ? (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-purple-600 dark:text-purple-400 bg-white/90 dark:bg-gray-900/90 z-10">
                                     <Loader2 className="w-8 h-8 animate-spin"/>
                                     <span className="text-xs font-bold uppercase tracking-wider">{t('designer.generating')}</span>
                                 </div>
                             ) : null}
                             
                             {char.imageUrl ? (
                                 <img src={char.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                             ) : (
                                 <Users className="w-12 h-12 text-gray-300 dark:text-gray-600"/>
                             )}
                             
                             {char.consistencyStatus === 'FAIL' && !char.isGenerating && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md z-10 animate-pulse" title="Style Inconsistency Detected">
                                    <AlertTriangle className="w-4 h-4"/>
                                </div>
                             )}
                             
                             {/* Overlay Controls */}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                  <label className="p-3 bg-white rounded-full text-gray-800 hover:text-blue-600 shadow-lg transform hover:scale-110 transition-all cursor-pointer" title="Upload Reference">
                                      <Upload className="w-5 h-5"/>
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCharacterUpload(e, idx)} />
                                  </label>
                                  <button onClick={() => toggleCharacterLock(char.id)} className={`p-3 rounded-full shadow-lg transform hover:scale-110 transition-all ${char.isLocked ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 hover:text-emerald-500'}`} title="Lock Design">
                                      {char.isLocked ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
                                  </button>
                             </div>
                         </div>
                         
                         {/* Variant History Strip */}
                         {char.variants && char.variants.length > 0 && (
                             <div className="px-4 pt-4 pb-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Layers className="w-3 h-3"/> Variations</p>
                                 <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                     {char.variants.map((variant) => (
                                         <button 
                                            key={variant.id}
                                            onClick={() => handleSelectCharacterVariant(idx, variant)}
                                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${char.imageUrl === variant.imageUrl ? 'border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
                                            title={`Style: ${variant.style}`}
                                         >
                                             <img src={variant.imageUrl} className="w-full h-full object-cover" />
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}

                         <div className="p-5 flex-1 flex flex-col">
                             <div className="flex justify-between items-start mb-4">
                                 <div>
                                     <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{char.name}</h3>
                                     <span className="text-xs text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">{char.role}</span>
                                 </div>
                             </div>

                             <div className="space-y-4 flex-1">
                                 <div>
                                     <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t('designer.visual_prompt')}</label>
                                     <textarea 
                                         className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-600 dark:text-gray-300 focus:border-purple-300 outline-none resize-none h-20"
                                         value={char.description}
                                         onChange={(e) => handleUpdateCharacterDescription(idx, e.target.value)}
                                     />
                                 </div>
                                 
                                 <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Voice</label>
                                    <select 
                                        value={char.voice || availableVoices[0]} 
                                        onChange={(e) => handleUpdateCharacterVoice(idx, e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-600 dark:text-gray-300 focus:border-purple-300 outline-none"
                                    >
                                        {availableVoices.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>

                                {/* Style Generator Section - ALWAYS VISIBLE */}
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Style Generator</label>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <select 
                                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 outline-none"
                                            value={styleSelections[char.id] || project.style}
                                            onChange={(e) => handleStyleChange(char.id, e.target.value)}
                                        >
                                            <optgroup label="Manga & Anime">
                                                <option value="Japanese Manga (B&W)">{t('style.manga_bw')}</option>
                                                <option value="Japanese Manga (Color)">{t('style.manga_color')}</option>
                                                <option value="Anime / Cel Shaded">{t('style.anime')}</option>
                                            </optgroup>
                                            <optgroup label="Animation">
                                                <option value="2D Animation / Cartoon">{t('style.animation_2d')}</option>
                                                <option value="3D Render / CGI Style">{t('style.animation_3d')}</option>
                                            </optgroup>
                                            <optgroup label="Webtoon & Manhua">
                                                <option value="Webtoon (Full Color)">{t('style.webtoon')}</option>
                                                <option value="Wuxia (Traditional Ink)">{t('style.wuxia')}</option>
                                                <option value="Xianxia / Cultivation (Manhua)">{t('style.cultivation')}</option>
                                            </optgroup>
                                            <optgroup label="Western & Cinematic">
                                                <option value="Modern Western Comic">{t('style.western')}</option>
                                                <option value="Modern Slice of Life">{t('style.modern_sol')}</option>
                                                <option value="Noir / High Contrast">{t('style.noir')}</option>
                                                <option value="Cyberpunk / Neon">{t('style.cyberpunk')}</option>
                                                <option value="Realism / Photorealistic">{t('style.realism')}</option>
                                                <option value="Photorealistic (Cinematic)">{t('style.photoreal')}</option>
                                            </optgroup>
                                            <optgroup label="Niche & Artistic">
                                                <option value="Gothic Horror">{t('style.gothic')}</option>
                                                <option value="Steampunk">{t('style.steampunk')}</option>
                                                <option value="Fantasy Art Nouveau">{t('style.art_nouveau')}</option>
                                            </optgroup>
                                        </select>
                                        <button 
                                            onClick={() => handleRegenerateSingleCharacter(char, idx, styleSelections[char.id])} 
                                            disabled={char.isGenerating}
                                            className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 p-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors shadow-sm disabled:opacity-50"
                                            title="Generate with selected style"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${char.isGenerating ? 'animate-spin' : ''}`}/>
                                        </button>
                                    </div>
                                    
                                    {/* Moved Consistency Check Here */}
                                    <button 
                                        onClick={() => handleCheckConsistency(char, idx)} 
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <ScanFace className="w-3 h-3"/> Check Style Consistency
                                    </button>
                                </div>
                             </div>
                         </div>
                         
                         {char.consistencyReport && (
                             <div className={`px-5 py-3 text-[10px] font-medium border-t ${char.consistencyStatus === 'PASS' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'}`}>
                                 <span className="font-bold block mb-1 flex items-center gap-2">
                                     {char.consistencyStatus === 'PASS' ? <CheckCircle className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                     {char.consistencyStatus === 'PASS' ? 'Style Check Passed' : 'Style Inconsistency Detected'}
                                 </span>
                                 <p className="leading-relaxed opacity-90">{char.consistencyReport}</p>
                             </div>
                         )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- PANEL ARTIST VIEW ---
export const PanelArtistView: React.FC<{
    project: ComicProject;
    handleStartPanelGeneration: (style: string) => void;
    handleRegenerateSinglePanel: (panel: ComicPanel, index: number) => void;
    handleFinishPanelArt: () => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, handleStartPanelGeneration, handleRegenerateSinglePanel, handleFinishPanelArt, loading, role, t }) => {
    
    const [selectedStyle, setSelectedStyle] = useState(project.style || 'Japanese Manga (B&W)');
    const panels = project.panels || [];
    const hasStartedGeneration = panels.some(p => p.imageUrl || p.isGenerating);

    return (
        <div className="p-8 max-w-6xl mx-auto pb-24">
            <div className="flex items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-rose-200 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Storyboard & Illustration</p>
                    </div>
                </div>
                
                {hasStartedGeneration ? (
                    <button onClick={handleFinishPanelArt} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-rose-200 dark:shadow-none transition-all">
                        <CheckCircle className="w-5 h-5"/> {t('ui.approve')}
                    </button>
                ) : (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <select 
                            value={selectedStyle} 
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 outline-none p-2 cursor-pointer"
                        >
                            <optgroup label="Manga & Anime">
                                <option value="Japanese Manga (B&W)">{t('style.manga_bw')}</option>
                                <option value="Japanese Manga (Color)">{t('style.manga_color')}</option>
                                <option value="Anime / Cel Shaded">{t('style.anime')}</option>
                            </optgroup>
                            <optgroup label="Animation">
                                <option value="2D Animation / Cartoon">{t('style.animation_2d')}</option>
                                <option value="3D Render / CGI Style">{t('style.animation_3d')}</option>
                            </optgroup>
                            <optgroup label="Webtoon & Manhua">
                                <option value="Webtoon (Full Color)">{t('style.webtoon')}</option>
                                <option value="Wuxia (Traditional Ink)">{t('style.wuxia')}</option>
                                <option value="Xianxia / Cultivation (Manhua)">{t('style.cultivation')}</option>
                            </optgroup>
                            <optgroup label="Western & Cinematic">
                                <option value="Modern Western Comic">{t('style.western')}</option>
                                <option value="Modern Slice of Life">{t('style.modern_sol')}</option>
                                <option value="Noir / High Contrast">{t('style.noir')}</option>
                                <option value="Cyberpunk / Neon">{t('style.cyberpunk')}</option>
                                <option value="Realism / Photorealistic">{t('style.realism')}</option>
                                <option value="Photorealistic (Cinematic)">{t('style.photoreal')}</option>
                            </optgroup>
                            <optgroup label="Niche & Artistic">
                                <option value="Gothic Horror">{t('style.gothic')}</option>
                                <option value="Steampunk">{t('style.steampunk')}</option>
                                <option value="Fantasy Art Nouveau">{t('style.art_nouveau')}</option>
                            </optgroup>
                        </select>
                        <button 
                            onClick={() => handleStartPanelGeneration(selectedStyle)} 
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                            Generate Panels
                        </button>
                    </div>
                )}
            </div>

            {!hasStartedGeneration ? (
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-4">
                    <Palette className="w-16 h-16 opacity-20"/>
                    <p className="font-medium">Ready to visualize {panels.length} panels.</p>
                    <p className="text-xs">Select a style above and click Generate to start.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {panels.map((panel, idx) => (
                        <div key={panel.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                            <div className="aspect-video bg-gray-50 dark:bg-gray-900 relative flex items-center justify-center border-b border-gray-100 dark:border-gray-700">
                                {panel.isGenerating ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-rose-500"/>
                                ) : panel.imageUrl ? (
                                    <img src={panel.imageUrl} className="w-full h-full object-cover"/>
                                ) : (
                                    <Palette className="w-8 h-8 text-gray-300 dark:text-gray-600"/>
                                )}
                                
                                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => handleRegenerateSinglePanel(panel, idx)} 
                                        className="p-3 rounded-full bg-white text-gray-800 shadow-md border border-gray-200 hover:text-rose-600 transition-transform hover:scale-110"
                                        title="Regenerate this panel"
                                    >
                                        <RefreshCw className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2">Panel #{idx + 1}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{panel.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
