
import React from 'react';
import { ComicProject, WorkflowStage } from '../types';
import { AGENTS } from '../constants';
import { Settings, ArrowLeft, FileText, CheckCircle, Archive, Activity, LayoutTemplate, BookOpen, Library, Smartphone, FolderOpen, TrendingUp, Palette, Printer, Plus, Trash2, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';

interface ManagerViewProps {
    project: ComicProject;
    activeProjects: ComicProject[];
    updateProject: (updates: Partial<ComicProject>) => void;
    handleLoadWIP: (p: ComicProject) => void;
    handleDeleteWIP: (e: React.MouseEvent, id: string) => void;
    handleStartResearch: () => void;
    handleApproveResearchAndScript: () => void;
    handleApproveScriptAndVisualize: () => void;
    handleFinalizeProduction: () => void;
    handleRevertStage: () => void; // New Prop
    handleImportManuscript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExportProjectZip: () => void;
    handleImportProjectZip: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddLanguage: (lang: string) => void;
    setInputText: (val: string) => void;
    inputText: string;
    loading: boolean;
    t: (key: string) => string;
    isLongFormat: boolean;
    supportedLanguages: string[];
}

export const ManagerView: React.FC<ManagerViewProps> = ({ 
    project, activeProjects, updateProject, handleLoadWIP, handleDeleteWIP, 
    handleStartResearch, handleApproveResearchAndScript, handleApproveScriptAndVisualize, handleFinalizeProduction,
    handleRevertStage,
    handleImportManuscript, handleExportProjectZip, handleImportProjectZip, handleAddLanguage,
    setInputText, inputText, loading, t, isLongFormat, supportedLanguages
}) => {
    
    // DASHBOARD MODE
    if (!project.storyFormat) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div>
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> {t('ui.resume')}</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[0, 1, 2].map(i => {
                           const slotProject = activeProjects[i];
                           return slotProject ? (
                               <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all relative group cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500" onClick={() => handleLoadWIP(slotProject)}>
                                   <div className="flex justify-between items-start mb-3">
                                       <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">{slotProject.storyFormat?.replace('_', ' ')}</span>
                                       <button onClick={(e) => handleDeleteWIP(e, slotProject.id!)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 z-20 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                   <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate mb-1">{slotProject.title || "Untitled Project"}</h4>
                                   <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{t('ui.last_edited')}: {new Date(slotProject.lastModified || Date.now()).toLocaleDateString()}</p>
                                   <button className="w-full bg-gray-900 dark:bg-gray-700 text-white text-xs font-bold py-3 rounded-xl hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none">
                                       {t('ui.open_project')} <ArrowRight className="w-3 h-3"/>
                                   </button>
                               </div>
                           ) : (
                               <div key={i} className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-6 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 h-48 transition-colors hover:border-gray-300 dark:hover:border-gray-600">
                                   <span className="text-xs font-bold uppercase tracking-widest">{t('ui.empty_slot')} {i+1}</span>
                               </div>
                           );
                       })}
                   </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> {t('ui.start_new')}</h3>
                    
                    {project.originalScript && (
                        <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>
                            <div>
                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{t('ui.manuscript_loaded')}</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('ui.select_format_hint')}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <button onClick={() => updateProject({ storyFormat: 'SHORT_STORY' })} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BookOpen className="w-24 h-24 text-indigo-600 dark:text-indigo-400"/></div>
                           <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 w-fit mb-4 border border-indigo-100 dark:border-indigo-800"><BookOpen className="w-6 h-6"/></div>
                           <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{t('fmt.short')}</h4>
                           <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('fmt.short.desc')}</p>
                       </button>

                       <button onClick={() => updateProject({ storyFormat: 'LONG_SERIES' })} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Library className="w-24 h-24 text-purple-600 dark:text-purple-400"/></div>
                           <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400 w-fit mb-4 border border-purple-100 dark:border-purple-800"><Library className="w-6 h-6"/></div>
                           <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{t('fmt.series')}</h4>
                           <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('fmt.series.desc')}</p>
                       </button>

                       <button onClick={() => updateProject({ storyFormat: 'EPISODIC' })} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Smartphone className="w-24 h-24 text-emerald-600 dark:text-emerald-400"/></div>
                           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 w-fit mb-4 border border-emerald-100 dark:border-emerald-800"><Smartphone className="w-6 h-6"/></div>
                           <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{t('fmt.episodic')}</h4>
                           <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('fmt.episodic.desc')}</p>
                       </button>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> {t('ui.quick_import')}</h3>
                    <div className="flex gap-4">
                        <label className="flex-1 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center group">
                            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"/>
                            <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{t('ui.import_script_btn')}</span>
                            <input type="file" accept=".txt,.md" onChange={handleImportManuscript} className="hidden" />
                        </label>
                        <label className="flex-1 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center group">
                            <Archive className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"/>
                            <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{t('ui.import_config_btn')}</span>
                            <input type="file" accept=".zip" onChange={handleImportProjectZip} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    // SETTINGS MODE
    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full pb-8">
            <div className="lg:col-span-1 space-y-6 flex flex-col">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex-1">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" /> {t('manager.settings')}
                        </h3>
                        <button 
                            onClick={() => updateProject({ storyFormat: null })} 
                            className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-xs font-bold p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                            title="Change Pipeline Format"
                        >
                            <ArrowLeft className="w-4 h-4" /> {t('ui.back')}
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-2 block">{t('manager.theme')}</label>
                            <textarea
                                value={project.theme || inputText}
                                onChange={(e) => { setInputText(e.target.value); updateProject({ theme: e.target.value }); }}
                                disabled={project.workflowStage !== WorkflowStage.IDLE && project.workflowStage !== WorkflowStage.RESEARCHING}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 min-h-[100px] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none resize-none placeholder-gray-400 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-900"
                                placeholder={project.originalScript ? "Detected from manuscript..." : t('manager.themeplaceholder')}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-2 block flex justify-between">
                                {t('manager.target_langs')}
                                <span className="text-gray-400 text-[10px]">Master: {project.masterLanguage}</span>
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {project.targetLanguages.map(lang => (
                                    <span key={lang} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                            
                            <div className="relative group">
                                <button className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl w-full justify-center border border-indigo-200 dark:border-indigo-800 border-dashed hover:border-solid transition-all">
                                    <Plus className="w-3 h-3"/> {t('ui.add_lang')}
                                </button>
                                <div className="hidden group-hover:block absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl mt-2 z-50 max-h-48 overflow-y-auto p-2">
                                    {supportedLanguages.filter(l => !project.targetLanguages.includes(l)).map(lang => (
                                        <button 
                                            key={lang}
                                            onClick={() => handleAddLanguage(lang)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs text-pink-600 dark:text-pink-400 font-bold uppercase tracking-wider mb-2 block">{t('manager.style')}</label>
                            <select value={project.style} onChange={(e) => updateProject({ style: e.target.value })} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-3 text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900 focus:border-pink-300 transition-all cursor-pointer">
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
                        </div>
                        
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-2">
                            <button 
                                onClick={handleExportProjectZip}
                                className="w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold py-3 rounded-xl transition-colors border border-gray-200 dark:border-gray-600"
                            >
                                <Archive className="w-4 h-4"/> {t('ui.export_zip_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm h-full flex flex-col">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> {t('manager.pipeline')}
                    </h3>
                    
                    <div className="space-y-3 flex-1">
                        <button onClick={handleStartResearch} disabled={loading || (!project.theme && !project.originalScript) || !project.storyFormat} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.IDLE ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 shadow-md shadow-indigo-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                            <div className="flex items-center gap-3"><TrendingUp className="w-4 h-4"/><span className="font-bold">{t('action.start_research')}</span></div>
                        </button>
                        
                        <button onClick={handleApproveResearchAndScript} disabled={loading || !project.marketAnalysis || !project.storyConcept} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.RESEARCHING ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-md shadow-emerald-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                            <div className="flex items-center gap-3"><BookOpen className="w-4 h-4"/><span className="font-bold">{project.originalScript ? t('action.adapt_script') : t('action.approve_script')}</span></div>
                        </button>

                        <button onClick={handleApproveScriptAndVisualize} disabled={loading || project.panels.length === 0 || project.characters.length === 0} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.CENSORING_SCRIPT ? 'bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 shadow-md shadow-rose-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                            <div className="flex items-center gap-3"><Palette className="w-4 h-4"/><span className="font-bold">{t('action.approve_art')}</span></div>
                        </button>
                        
                        <button onClick={handleFinalizeProduction} disabled={loading || !project.panels.some(p => p.imageUrl) || project.workflowStage !== WorkflowStage.PRINTING} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.PRINTING ? 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-300 shadow-md shadow-slate-200 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                            <div className="flex items-center gap-3"><Printer className="w-4 h-4"/><span className="font-bold">{t('action.start_printing')}</span></div>
                        </button>

                        <button disabled={project.workflowStage !== WorkflowStage.POST_PRODUCTION} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.POST_PRODUCTION ? 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-md shadow-amber-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600'}`}>
                            <div className="flex items-center gap-3"><Archive className="w-4 h-4"/><span className="font-bold">{isLongFormat ? t('action.finalize_chapter') : t('action.finalize_prod')}</span></div>
                        </button>

                        {/* Revert Button - Pushed to bottom */}
                        {project.workflowStage !== WorkflowStage.IDLE && project.workflowStage !== WorkflowStage.RESEARCHING && (
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button 
                                    onClick={handleRevertStage} 
                                    disabled={loading}
                                    className="w-full py-3 px-5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 transition-all group"
                                >
                                    <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform"/> Revert to Previous Stage
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('manager.logs')}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-800 font-mono text-xs">
                    {project.logs.length === 0 && <div className="text-gray-400 text-center italic mt-10">{t('ui.waiting')}</div>}
                    {project.logs.map((log) => (
                        <div key={log.id} className="flex gap-2">
                            <span className="text-gray-400 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                            <div className="flex-1">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{t(AGENTS[log.agentId].name)}: </span>
                                <span className="text-gray-700 dark:text-gray-300">{log.message}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
