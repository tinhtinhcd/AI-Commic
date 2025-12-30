
import React, { useState } from 'react';
import { ComicProject, WorkflowStage, ChapterArchive } from '../types';
import { AGENTS } from '../constants';
import { Settings, ArrowLeft, FileText, CheckCircle, Archive, Activity, LayoutTemplate, BookOpen, Library, Smartphone, FolderOpen, TrendingUp, Palette, Printer, Plus, Trash2, ArrowRight, RotateCcw, AlertTriangle, Zap, Star, Map, Edit, Eye, Lock, Lightbulb } from 'lucide-react';

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
    handleRevertStage: () => void;
    handleImportManuscript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExportProjectZip: () => void;
    handleImportProjectZip: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddLanguage: (lang: string) => void;
    handleJumpToChapter: (chapterNum: number) => void; // NEW PROP
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
    handleRevertStage, handleJumpToChapter,
    handleImportManuscript, handleExportProjectZip, handleImportProjectZip, handleAddLanguage,
    setInputText, inputText, loading, t, isLongFormat, supportedLanguages
}) => {
    
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CHAPTERS' | 'SETTINGS'>('DASHBOARD');
    const [selectedChapterId, setSelectedChapterId] = useState<number>(project.currentChapter || 1);

    // DASHBOARD SELECTION MODE (New Project / Load Project)
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
                                       <button onClick={(e) => handleDeleteWIP(e, slotProject.id!)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 z-20 transition-colors bg-white dark:bg-gray-700 rounded-full border border-transparent hover:border-red-200 dark:hover:border-red-900 shadow-sm"><Trash2 className="w-4 h-4"/></button>
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

    // MAIN NAVIGATION TABS
    const renderTabs = () => (
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1">
            <button 
                onClick={() => setActiveTab('DASHBOARD')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 translate-y-[1px]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Activity className="w-4 h-4"/> {t('manager.pipeline')}
            </button>
            <button 
                onClick={() => setActiveTab('CHAPTERS')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'CHAPTERS' ? 'bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 translate-y-[1px]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Map className="w-4 h-4"/> Mục Lục (Chapters)
            </button>
            <button 
                onClick={() => setActiveTab('SETTINGS')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'SETTINGS' ? 'bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 translate-y-[1px]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Settings className="w-4 h-4"/> {t('manager.settings')}
            </button>
        </div>
    );

    // --- CHAPTERS VIEW ---
    if (activeTab === 'CHAPTERS') {
        const totalChapters = project.totalChapters ? parseInt(project.totalChapters.match(/\d+/)?.[0] || '1') : 1;
        const chaptersList = Array.from({length: totalChapters}, (_, i) => i + 1);
        
        // Find data for selected chapter
        const selectedOutline = project.marketAnalysis?.chapterOutlines?.find(o => o.chapterNumber === selectedChapterId);
        const archivedChapter = project.completedChapters?.find(c => c.chapterNumber === selectedChapterId);
        const isCurrentActive = project.currentChapter === selectedChapterId;
        const status = archivedChapter ? 'DONE' : isCurrentActive ? 'ACTIVE' : selectedOutline ? 'PLANNED' : 'PENDING';

        return (
            <div className="flex flex-col h-full pb-8">
                {renderTabs()}
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* LEFT COLUMN: LIST */}
                    <div className="w-1/4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Danh Sách Chương</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {chaptersList.map(chNum => {
                                const isDone = project.completedChapters?.some(c => c.chapterNumber === chNum);
                                const isWorking = project.currentChapter === chNum;
                                const hasOutline = project.marketAnalysis?.chapterOutlines?.some(o => o.chapterNumber === chNum);
                                
                                return (
                                    <button 
                                        key={chNum}
                                        onClick={() => setSelectedChapterId(chNum)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${selectedChapterId === chNum ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {isDone ? <CheckCircle className="w-3 h-3 text-emerald-500"/> : isWorking ? <Edit className="w-3 h-3 text-blue-500"/> : <FileText className="w-3 h-3 opacity-50"/>}
                                            Chapter {chNum}
                                        </span>
                                        {isWorking && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: DETAILS */}
                    <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chapter {selectedChapterId}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        status === 'PLANNED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>
                                        {status === 'DONE' ? 'Hoàn Thành' : status === 'ACTIVE' ? 'Đang Viết' : status === 'PLANNED' ? 'Đã Có Đề Cương' : 'Chưa Có Dữ Liệu'}
                                    </span>
                                </div>
                            </div>
                            
                            {status !== 'ACTIVE' && (
                                <button 
                                    onClick={() => handleJumpToChapter(selectedChapterId)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                                >
                                    {status === 'DONE' ? <Eye className="w-4 h-4"/> : <Edit className="w-4 h-4"/>}
                                    {status === 'DONE' ? 'Xem lại / Sửa' : 'Bắt đầu viết'}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {/* CONTENT DISPLAY */}
                            {status === 'DONE' && archivedChapter ? (
                                <div className="space-y-6">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Đã hoàn thành</h4>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{archivedChapter.summary}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4">Nội dung ({archivedChapter.panels.length} panels)</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {archivedChapter.panels.map((p, i) => (
                                                <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-xs text-gray-400">No Image</div>}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity p-2 text-center">
                                                        {p.dialogue.substring(0, 50)}...
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : status === 'ACTIVE' ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                    <Edit className="w-16 h-16 opacity-20"/>
                                    <p>Chương này đang được mở trong không gian làm việc.</p>
                                    <button onClick={() => updateProject({ workflowStage: WorkflowStage.SCRIPTING })} className="text-indigo-600 font-bold hover:underline">Quay lại bàn làm việc</button>
                                </div>
                            ) : selectedOutline ? (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800">
                                        <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-4 text-sm uppercase tracking-wider flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Tóm tắt Đề Cương</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-serif">"{selectedOutline.summary}"</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-4">Chưa có kịch bản chi tiết.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                    <Lock className="w-16 h-16 opacity-20"/>
                                    <p>Chưa có dữ liệu cho chương này.</p>
                                    <p className="text-xs">Hãy thảo luận với Ban Biên Tập để lên đề cương.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // SETTINGS VIEW 
    if (activeTab === 'SETTINGS') {
        return (
            <div className="flex flex-col h-full pb-8">
                {renderTabs()}
                <div className="w-full flex flex-col h-full overflow-hidden">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex-1 overflow-y-auto">
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <label className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-2 block">{t('manager.theme')}</label>
                                <textarea
                                    value={project.theme || inputText}
                                    onChange={(e) => { setInputText(e.target.value); updateProject({ theme: e.target.value }); }}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-2 block flex justify-between">
                                    {t('manager.target_langs')}
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {project.targetLanguages?.map(lang => (
                                        <span key={lang} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    {supportedLanguages.filter(l => !project.targetLanguages?.includes(l)).map(lang => (
                                        <button key={lang} onClick={() => handleAddLanguage(lang)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300">{lang}</button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-2 flex flex-col gap-3">
                                <button onClick={handleExportProjectZip} className="w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold py-3 px-6 rounded-xl transition-colors border border-gray-200 dark:border-gray-600">
                                    <Archive className="w-4 h-4"/> {t('ui.export_zip_btn')}
                                </button>
                                
                                {project.id && (
                                    <button 
                                        onClick={(e) => handleDeleteWIP(e, project.id!)} 
                                        className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold py-3 px-6 rounded-xl transition-colors border border-red-200 dark:border-red-800"
                                    >
                                        <Trash2 className="w-4 h-4"/> {t('manager.delete')} Project
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // DEFAULT DASHBOARD VIEW (If activeTab === 'DASHBOARD')
    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full pb-8">
            <div className="w-full">
                {renderTabs()}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Pipeline Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> {t('manager.pipeline')}
                        </h3>
                        
                        <div className="space-y-3">
                            <button onClick={handleStartResearch} disabled={loading || (!project.theme && !project.originalScript) || !project.storyFormat} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.IDLE ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 shadow-md shadow-indigo-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                <div className="flex items-center gap-3"><TrendingUp className="w-4 h-4"/><span className="font-bold">{t('action.start_research')}</span></div>
                            </button>
                            
                            <button onClick={handleApproveResearchAndScript} disabled={loading || !project.marketAnalysis || !project.storyConcept} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.RESEARCHING ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-md shadow-emerald-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                <div className="flex items-center gap-3"><BookOpen className="w-4 h-4"/><span className="font-bold">{project.originalScript ? t('action.adapt_script') : t('action.approve_script')}</span></div>
                            </button>

                            <button onClick={handleApproveScriptAndVisualize} disabled={loading || project.panels.length === 0 || project.characters.length === 0} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.CENSORING_SCRIPT ? 'bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 shadow-md shadow-rose-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                <div className="flex items-center gap-3"><Palette className="w-4 h-4"/><span className="font-bold">{t('action.approve_art')}</span></div>
                            </button>
                            
                            <button onClick={handleFinalizeProduction} disabled={loading || !project.panels.some(p => p.imageUrl) || project.workflowStage !== WorkflowStage.PRINTING} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.PRINTING ? 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 border-gray-300 dark:border-gray-500 text-gray-800 dark:text-gray-200 shadow-md shadow-gray-200 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                <div className="flex items-center gap-3"><Printer className="w-4 h-4"/><span className="font-bold">{t('action.start_printing')}</span></div>
                            </button>

                            <button disabled={project.workflowStage !== WorkflowStage.POST_PRODUCTION} className={`w-full py-4 px-5 rounded-xl flex items-center justify-between text-sm font-medium border transition-all ${project.workflowStage === WorkflowStage.POST_PRODUCTION ? 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-md shadow-amber-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}>
                                <div className="flex items-center gap-3"><Archive className="w-4 h-4"/><span className="font-bold">{isLongFormat ? t('action.finalize_chapter') : t('action.finalize_prod')}</span></div>
                            </button>

                            {project.workflowStage !== WorkflowStage.IDLE && (
                                <button 
                                    onClick={handleRevertStage} 
                                    className="w-full mt-4 py-3 px-5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all"
                                >
                                    <RotateCcw className="w-3 h-3"/> Revert Previous Step
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('manager.logs')}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-800 font-mono text-xs">
                            {project.logs?.length === 0 && <div className="text-gray-400 dark:text-gray-500 text-center italic mt-10">{t('ui.waiting')}</div>}
                            {project.logs?.map((log) => (
                                <div key={log.id} className="flex gap-2">
                                    <span className="text-gray-400 dark:text-gray-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                    <div className="flex-1">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">{t(AGENTS[log.agentId].name)}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{log.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
