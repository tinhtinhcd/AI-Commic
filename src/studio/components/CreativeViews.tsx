
import React, { useState, useRef, useEffect } from 'react';
import { AgentRole, ComicProject, Character, ResearchData, CharacterVariant, AgentTask, ComicPanel, Asset, ImageProvider } from '../types';
import { AGENTS, COMMON_STYLES } from '../constants';
import { MessageCircle, Loader2, Send, FileText, TrendingUp, Upload, Download, BookOpen, Sparkles, Lightbulb, Users, Feather, CheckCircle, RefreshCw, Lock, Unlock, ScanFace, Globe, Palette, Layers, ListTodo, Plus, Check, Trash2, Bot, Play, Film, AlertTriangle, Search, Eraser, PenTool, X, Anchor, Image as ImageIcon, MapPin, Edit2, Key, Zap, DollarSign } from 'lucide-react';

// UPDATED FOR 2026 PROJECTIONS - COMIC FOCUS
const COST_ESTIMATES: Record<string, { cost: string, label: string, color: string }> = {
    'GEMINI': { cost: '~$0.004', label: 'Recommended', color: 'text-blue-600' },
    'MIDJOURNEY': { cost: '~$0.060', label: 'Premium Art', color: 'text-purple-600' },
    'LEONARDO': { cost: '~$0.015', label: 'Comic Specialist', color: 'text-pink-600' },
    'FLUX': { cost: '~$0.001', label: 'Drafting (Cheap)', color: 'text-emerald-600' },
};

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

const DrawingCanvas: React.FC<{
    initialImage?: string;
    onSave: (base64: string) => void;
    onClose: () => void;
    title?: string;
}> = ({ initialImage, onSave, onClose, title }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'PEN' | 'ERASER' | 'REDLINE'>('PEN');
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (initialImage) {
            const img = new Image();
            img.src = initialImage;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, []);

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => { 
        setIsDrawing(true); 
        draw(e); 
    };
    
    const stopDraw = () => { 
        setIsDrawing(false); 
        const canvas = canvasRef.current; 
        if (canvas) { 
            const ctx = canvas.getContext('2d'); 
            ctx?.beginPath(); 
        } 
    };
    
    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Adjust for canvas scale if CSS size differs from attr size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const trueX = x * scaleX;
        const trueY = y * scaleY;

        if (tool === 'REDLINE') { ctx.lineWidth = 3; ctx.strokeStyle = '#ff0000'; } 
        else { ctx.lineWidth = tool === 'PEN' ? 2 : 20; ctx.strokeStyle = tool === 'PEN' ? '#000000' : '#ffffff'; }
        
        ctx.lineCap = 'round';
        ctx.lineTo(trueX, trueY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(trueX, trueY);
    };

    const handleSave = () => { if (canvasRef.current) { onSave(canvasRef.current.toDataURL('image/png')); onClose(); } };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col gap-4 max-h-[90vh]">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><PenTool className="w-5 h-5"/> {title || "Quick Sketch / Fix"}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:text-red-500"/></button>
                </div>
                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 cursor-crosshair mx-auto overflow-hidden flex-1 w-full flex items-center justify-center touch-none">
                    <canvas 
                        ref={canvasRef} 
                        width={800} 
                        height={450} 
                        className="max-w-full max-h-full h-auto w-auto touch-none" 
                        onMouseDown={startDraw} 
                        onMouseUp={stopDraw} 
                        onMouseOut={stopDraw} 
                        onMouseMove={draw}
                        onTouchStart={startDraw}
                        onTouchEnd={stopDraw}
                        onTouchMove={draw}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={() => setTool('PEN')} className={`p-2 rounded-lg border ${tool === 'PEN' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`} title="Black Pen"><PenTool className="w-4 h-4"/></button>
                        <button onClick={() => setTool('REDLINE')} className={`p-2 rounded-lg border ${tool === 'REDLINE' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`} title="Redline Correction"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => setTool('ERASER')} className={`p-2 rounded-lg border ${tool === 'ERASER' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`} title="Eraser"><Eraser className="w-4 h-4"/></button>
                    </div>
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700">Save</button>
                </div>
            </div>
        </div>
    );
};

export const ResearchView: React.FC<any> = (props) => {
    const { project, handleResearchChatSend, researchChatInput, setResearchChatInput, handleFinalizeStrategyFromChat, loading, t, chatEndRef, role } = props;
    return (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 pb-8 h-full flex flex-col min-h-[calc(100dvh-140px)]">
            <div className="flex items-center gap-4 lg:gap-6 mb-4 shrink-0">
                <img src={AGENTS[role as AgentRole].avatar} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-indigo-200 shadow-md" />
                <div><h2 className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role as AgentRole].name)}</h2><p className="text-xs lg:text-base text-gray-500 dark:text-gray-400">{t('planner.desc')}</p></div>
            </div>
             <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden min-h-0">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center shrink-0">
                            <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> {t('planner.chatTitle')}</span>
                            {project.researchChatHistory?.length > 0 && (<button onClick={handleFinalizeStrategyFromChat} disabled={loading} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">{loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1"/> : null} {t('planner.finalize')}</button>)}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                             {project.researchChatHistory?.map((msg: any, idx: number) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'}`}>{msg.content}</div></div>))}
                             <div ref={chatEndRef} />
                        </div>
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0"><div className="flex gap-2 relative"><input value={researchChatInput} onChange={(e) => setResearchChatInput((e.target as any).value)} onKeyDown={(e) => e.key === 'Enter' && handleResearchChatSend()} placeholder={t('planner.chatPlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 outline-none transition-all" /><button onClick={handleResearchChatSend} disabled={loading || !researchChatInput.trim()} className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}</button></div></div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export const WriterView: React.FC<any> = (props) => {
     const { project, handleImportScript, handleExportScript, handleApproveResearchAndScript, handleForceExtractCast, updateProject, loading, t, scriptStep, writerLogsEndRef, role } = props;
    const panels = project.panels || [];
    const characters = project.characters || [];
    return (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 pb-8 h-full flex flex-col min-h-[calc(100dvh-140px)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 shrink-0 gap-4">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role as AgentRole].avatar} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-emerald-200 shadow-md" />
                    <div>
                        <h2 className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role as AgentRole].name)}</h2>
                        <p className="text-xs lg:text-base text-gray-500 dark:text-gray-400">Scriptwriting & World Building</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <label className="flex-1 sm:flex-none justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2">
                        <Upload className="w-4 h-4"/> {t('ui.import_script_btn')}
                        <input type="file" accept=".json,.txt" onChange={handleImportScript} className="hidden" />
                    </label>
                    <button onClick={handleExportScript} className="flex-1 sm:flex-none justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
                        <Download className="w-4 h-4"/> {t('manager.export_file')}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
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
                                      {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}{t('writer.generate')}
                                  </button>
                              </div>
                          ) : (
                              panels.map((panel: any, idx: number) => (
                                  <div key={panel.id} className="group relative pl-8 border-l-2 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                                      <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 group-hover:border-emerald-400 text-[9px] flex items-center justify-center font-bold text-gray-400 group-hover:text-emerald-500">{idx+1}</span>
                                      <div className="mb-2">
                                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('writer.visual_desc')}</p>
                                          <textarea className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-600 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 outline-none resize-none transition-all" value={panel.description} rows={3} onChange={(e) => { const newPanels = [...panels]; newPanels[idx].description = (e.target as any).value; updateProject({ panels: newPanels }); }} />
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('writer.dialogue')}</p>
                                          <textarea className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm font-comic text-gray-900 dark:text-gray-100 focus:border-emerald-300 outline-none resize-none" value={panel.dialogue} rows={2} onChange={(e) => { const newPanels = [...panels]; newPanels[idx].dialogue = (e.target as any).value; updateProject({ panels: newPanels }); }} />
                                      </div>
                                  </div>
                              ))
                          )}
                          <div ref={writerLogsEndRef} />
                      </div>
                 </div>
                 
                 <div className="lg:col-span-1 space-y-4 overflow-y-auto h-auto lg:h-full max-h-[300px] lg:max-h-none">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500"/> Concept</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">{safeRender(project.storyConcept?.premise) || t('ui.waiting')}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Users className="w-4 h-4 text-purple-500"/> Cast</h4>
                              <button onClick={handleForceExtractCast} disabled={loading} className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1">Scan Script</button>
                          </div>
                          <div className="space-y-2">
                              {characters.map((char: any) => (
                                  <div key={char.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden">{char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover"/> : char.name[0]}</div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">{char.name}</span>
                                      <span className="ml-auto text-[10px] text-gray-400 uppercase">{char.role}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                 </div>
            </div>
        </div>
    );
};

export const CharacterDesignerView: React.FC<any> = (props) => {
    const { project, handleFinishCharacterDesign, handleRegenerateSingleCharacter, handleGenerateAllCharacters, handleUpdateCharacterDescription, handleUpdateCharacterVoice, toggleCharacterLock, handleCharacterUpload, handleCheckConsistency, handleSelectCharacterVariant, role, t, availableVoices, loading, updateProject } = props;
    const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});
    const [globalStyle, setGlobalStyle] = useState(project.style || 'Japanese Manga (B&W)');
    const [tempApiKey, setTempApiKey] = useState('');
    
    const characters = project.characters || [];
    const isGlobalGenerating = characters.some((c: any) => c.isGenerating);
    const handleAnchorUpload = (e: React.ChangeEvent<HTMLInputElement>, charIndex: number) => { const file = (e.target as any).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { const newChars = [...characters]; newChars[charIndex] = { ...newChars[charIndex], referenceImage: reader.result as string }; updateProject({ characters: newChars }); }; reader.readAsDataURL(file); };

    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <img src={AGENTS[role as AgentRole].avatar} className="w-16 h-16 rounded-full border-2 border-purple-200 shadow-md" />
                    <div><h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role as AgentRole].name)}</h2><p className="text-gray-500 dark:text-gray-400">Model Sheets & Visual Development</p></div>
                </div>
                
                {/* TOOLBAR: Style, Key, Generate */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-end">
                    
                    {/* Style Selector */}
                    <div className="flex flex-col gap-1 w-full md:w-48">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Palette className="w-3 h-3"/> Style</label>
                        <select 
                            value={globalStyle} 
                            onChange={(e) => setGlobalStyle(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-purple-500"
                        >
                            {COMMON_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            <option value={project.style}>Current: {project.style}</option>
                        </select>
                    </div>

                    {/* API Key Input */}
                    <div className="flex flex-col gap-1 w-full md:w-48">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Key className="w-3 h-3"/> Emergency Key</label>
                        <input 
                            type="password"
                            placeholder="Paste Key (Bypass 429)" 
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs font-mono text-gray-700 dark:text-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 md:flex-none">
                        <button onClick={() => handleGenerateAllCharacters(globalStyle, tempApiKey)} disabled={isGlobalGenerating || loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 text-xs md:text-sm whitespace-nowrap">{isGlobalGenerating || loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} Generate All</button>
                    </div>
                    <button onClick={handleFinishCharacterDesign} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all text-xs md:text-sm whitespace-nowrap"><CheckCircle className="w-5 h-5"/> {t('designer.finalize')}</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{characters.map((char: Character, idx: number) => (<div key={char.id} className={`bg-white dark:bg-gray-800 border ${char.consistencyStatus === 'FAIL' ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-full`}><div className="aspect-square bg-gray-50 dark:bg-gray-900 relative overflow-hidden flex items-center justify-center shrink-0">{char.referenceImage && (<div className="absolute top-2 left-2 z-20 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md flex items-center gap-1" title="Using Anchor Image"><Anchor className="w-3 h-3"/> Anchored</div>)}{char.isGenerating && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-purple-600 bg-white/90 z-10"><Loader2 className="w-8 h-8 animate-spin"/></div>)}{char.imageUrl ? (<img src={char.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />) : (<Users className="w-12 h-12 text-gray-300 dark:text-gray-600"/>)}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm"><label className="p-3 bg-white rounded-full text-gray-800 hover:text-blue-600 shadow-lg transform hover:scale-110 transition-all cursor-pointer" title="Upload Reference (Manual)"><Upload className="w-5 h-5"/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleCharacterUpload(e, idx)} /></label><label className="p-3 bg-white rounded-full text-gray-800 hover:text-indigo-600 shadow-lg transform hover:scale-110 transition-all cursor-pointer" title="Upload Anchor Image (For AI Consistency)"><Anchor className="w-5 h-5"/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleAnchorUpload(e, idx)} /></label><button onClick={() => toggleCharacterLock(char.id)} className={`p-3 rounded-full shadow-lg transform hover:scale-110 transition-all ${char.isLocked ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 hover:text-emerald-500'}`} title="Lock Design">{char.isLocked ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}</button></div></div>{char.variants && char.variants.length > 0 && (<div className="px-4 pt-4 pb-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Layers className="w-3 h-3"/> Variations</p><div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">{char.variants.map((variant) => (<button key={variant.id} onClick={() => handleSelectCharacterVariant(idx, variant)} className={`w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${char.imageUrl === variant.imageUrl ? 'border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}><img src={variant.imageUrl} className="w-full h-full object-cover" /></button>))}</div></div>)}<div className="p-5 flex-1 flex flex-col space-y-4"><div><h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{char.name}</h3><span className="text-xs text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">{char.role}</span></div><div><textarea className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-600 dark:text-gray-300 focus:border-purple-300 outline-none resize-none h-20" value={char.description} onChange={(e) => handleUpdateCharacterDescription(idx, (e.target as any).value)} /></div><div className="flex gap-2"><button onClick={() => handleRegenerateSingleCharacter(char, idx, globalStyle, tempApiKey)} className="flex-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 p-2 rounded-lg hover:bg-purple-200 font-bold text-xs">Regenerate</button><button onClick={() => handleCheckConsistency(char, idx)} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg hover:bg-gray-50" title="Check Consistency"><ScanFace className="w-4 h-4"/></button></div></div></div>))}</div>
        </div>
    );
};

export const PanelArtistView: React.FC<{
    project: ComicProject;
    handleStartPanelGeneration: (style: string, key?: string, provider?: ImageProvider) => void;
    handleRegenerateSinglePanel: (panel: ComicPanel, index: number, key?: string, provider?: ImageProvider) => void;
    handleFinishPanelArt: () => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
    updateProject: (updates: Partial<ComicProject>) => void;
}> = ({ project, handleStartPanelGeneration, handleRegenerateSinglePanel, handleFinishPanelArt, loading, role, t, updateProject }) => {
    
    const [selectedStyle, setSelectedStyle] = useState(project.style || 'Japanese Manga (B&W)');
    const [drawingPanel, setDrawingPanel] = useState<{panel: ComicPanel, index: number} | null>(null);
    const [showAssetLibrary, setShowAssetLibrary] = useState(false);
    const [newAsset, setNewAsset] = useState<{name: string, type: 'BACKGROUND' | 'PROP', image?: string}>({name: '', type: 'BACKGROUND'});
    const [tempApiKey, setTempApiKey] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ImageProvider>('GEMINI');
    
    const panels = project.panels || [];
    const assets = project.assets || [];
    const hasStartedGeneration = panels.some(p => p.imageUrl || p.isGenerating);

    const handleSaveSketch = (base64: string) => {
        if (!drawingPanel) return;
        const newPanels = [...panels];
        const modifiedPanel = { ...newPanels[drawingPanel.index], layoutSketch: base64 };
        handleRegenerateSinglePanel(modifiedPanel, drawingPanel.index, tempApiKey, selectedProvider);
    };

    const handleUploadAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = (e.target as any).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewAsset(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const saveAsset = () => {
        if (!newAsset.image || !newAsset.name) return;
        const asset: Asset = {
            id: crypto.randomUUID(),
            name: newAsset.name,
            type: newAsset.type,
            imageUrl: newAsset.image,
            description: newAsset.name
        };
        updateProject({ assets: [...assets, asset] });
        setNewAsset({name: '', type: 'BACKGROUND'});
    };

    const costInfo = COST_ESTIMATES[selectedProvider];

    return (
        <div className="flex h-[calc(100vh-100px)] relative">
             {drawingPanel && (
                <DrawingCanvas 
                    initialImage={drawingPanel.panel.imageUrl || drawingPanel.panel.layoutSketch}
                    onSave={handleSaveSketch}
                    onClose={() => setDrawingPanel(null)}
                    title={`Redline / Fix Panel ${drawingPanel.index + 1}`}
                />
            )}

            <div className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-rose-200 shadow-md" />
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                            <p className="text-gray-500 dark:text-gray-400">Storyboard & Illustration</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto items-end flex-wrap">
                        {/* Provider Selector */}
                        <div className="flex flex-col gap-1 w-full sm:w-40">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Zap className="w-3 h-3"/> Engine (2026)</label>
                            <select 
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value as ImageProvider)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-rose-500"
                            >
                                <option value="GEMINI">Gemini (Balanced)</option>
                                <option value="FLUX">Flux (Draft / Cheap)</option>
                                <option value="MIDJOURNEY">Midjourney (Final)</option>
                                <option value="LEONARDO">Leonardo (Ref)</option>
                            </select>
                            {costInfo && (
                                <span className={`text-[10px] font-bold ${costInfo.color} flex items-center gap-1`}>
                                    <DollarSign className="w-3 h-3"/> Est: {costInfo.cost}/img
                                </span>
                            )}
                        </div>

                        {/* API Key Input */}
                        <div className="flex flex-col gap-1 w-full sm:w-40">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Key className="w-3 h-3"/> API Key</label>
                            <input 
                                type="password"
                                placeholder={selectedProvider === 'GEMINI' ? "Bypass Limit" : "Required"}
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs font-mono text-gray-700 dark:text-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <button onClick={() => setShowAssetLibrary(!showAssetLibrary)} className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl font-bold flex items-center gap-2 border transition-all ${showAssetLibrary ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <MapPin className="w-5 h-5"/> Assets
                        </button>
                        {hasStartedGeneration ? (
                            <button onClick={handleFinishPanelArt} className="flex-1 sm:flex-none justify-center bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-rose-200 dark:shadow-none transition-all">
                                <CheckCircle className="w-5 h-5"/> {t('ui.approve')}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 sm:flex-none justify-center">
                                <button 
                                    onClick={() => handleStartPanelGeneration(selectedStyle, tempApiKey, selectedProvider)} 
                                    disabled={loading}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    Generate
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {panels.map((panel, idx) => (
                        <div key={panel.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                            <div className="aspect-video bg-gray-50 dark:bg-gray-900 relative flex items-center justify-center border-b border-gray-100 dark:border-gray-700">
                                {panel.backgroundAssetId && (
                                    <div className="absolute top-2 left-2 z-10 bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md flex items-center gap-1">
                                        <MapPin className="w-3 h-3"/> Locked BG
                                    </div>
                                )}

                                {panel.isGenerating ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-rose-500"/>
                                ) : panel.imageUrl ? (
                                    <img src={panel.imageUrl} className="w-full h-full object-cover"/>
                                ) : (
                                    <Palette className="w-8 h-8 text-gray-300 dark:text-gray-600"/>
                                )}
                                
                                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => handleRegenerateSinglePanel(panel, idx, tempApiKey, selectedProvider)} 
                                        className="p-3 rounded-full bg-white text-gray-800 shadow-md border border-gray-200 hover:text-rose-600 transition-transform hover:scale-110"
                                        title="Regenerate"
                                    >
                                        <RefreshCw className="w-5 h-5"/>
                                    </button>
                                    <button 
                                        onClick={() => setDrawingPanel({panel, index: idx})} 
                                        className="p-3 rounded-full bg-white text-gray-800 shadow-md border border-gray-200 hover:text-indigo-600 transition-transform hover:scale-110"
                                        title="Redline / Fix"
                                    >
                                        <PenTool className="w-5 h-5"/>
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
            </div>

            {/* ASSET LIBRARY SIDEBAR (Responsive Overlay) */}
            {showAssetLibrary && (
                <>
                    <div className="absolute inset-0 bg-black/50 z-20 md:hidden transition-opacity" onClick={() => setShowAssetLibrary(false)}></div>
                    <div className="absolute inset-y-0 right-0 z-30 w-80 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto flex flex-col gap-4 shadow-xl transform transition-transform duration-300 md:static md:transform-none">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Studio Assets</h3>
                            <button onClick={() => setShowAssetLibrary(false)}><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Add New Reference</p>
                            <input 
                                placeholder="Asset Name (e.g. Hero Bedroom)" 
                                className="w-full text-xs p-2 mb-2 bg-gray-100 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                                value={newAsset.name}
                                onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                            />
                            <div className="flex gap-2 mb-2">
                                <label className="flex-1 cursor-pointer bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 p-2 rounded text-center text-xs border border-dashed border-gray-300">
                                    {newAsset.image ? "Image Loaded" : "Upload Image"}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadAsset}/>
                                </label>
                            </div>
                            <button onClick={saveAsset} className="w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded">Save to Library</button>
                        </div>

                        <div className="space-y-4">
                            {assets.map(asset => (
                                <div key={asset.id} className="relative group cursor-pointer" draggable onDragStart={(e) => e.dataTransfer.setData("assetId", asset.id)}>
                                    <img src={asset.imageUrl} className="w-full rounded-lg border border-gray-300"/>
                                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">{asset.name}</span>
                                </div>
                            ))}
                            {assets.length === 0 && <p className="text-center text-gray-400 text-xs italic">No assets yet.</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
