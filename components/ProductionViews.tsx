
import React, { useState } from 'react';
import { AgentRole, ComicProject, Character, ComicPanel } from '../types';
import { AGENTS } from '../constants';
import { Printer, Users, Loader2, ScanFace, CheckCircle, AlertTriangle, Play, Film, FileText, ShieldAlert, Activity, Globe, Plus, BookOpen, Mic, Clapperboard, Download } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// --- TYPESETTER VIEW ---
export const TypesetterView: React.FC<{
    project: ComicProject;
    handleFinishPrinting: () => void;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, handleFinishPrinting, role, t }) => {
    const panels = project.panels || [];
    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-gray-500 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Lettering & Page Layout</p>
                    </div>
                </div>
                <button onClick={handleFinishPrinting} className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-gray-300 dark:shadow-none transition-all">
                    <Printer className="w-5 h-5"/> {t('ui.confirm')}
                </button>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl overflow-x-auto border border-gray-200 dark:border-gray-700">
                 <div className="flex gap-8 min-w-max">
                     {/* Simulating Pages - Grouping panels into pages of 4 for visualization */}
                     {Array.from({ length: Math.ceil(panels.length / 4) }).map((_, pageIdx) => (
                         <div key={pageIdx} className="w-[400px] h-[600px] bg-white shadow-2xl flex flex-col relative shrink-0 border border-gray-200">
                             <div className="absolute -top-6 left-0 font-bold text-gray-500 dark:text-gray-400 text-xs">Page {pageIdx + 1}</div>
                             <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-4">
                                 {panels.slice(pageIdx * 4, (pageIdx + 1) * 4).map((panel) => (
                                     <div key={panel.id} className="relative border border-gray-900 bg-gray-100 overflow-hidden">
                                          {panel.imageUrl && <img src={panel.imageUrl} className="w-full h-full object-cover grayscale-[0.2]" />}
                                          <div className="absolute inset-0 p-2 pointer-events-none">
                                               {panel.dialogue && (
                                                   <div className="bg-white border border-black rounded-[10px] p-1 text-[8px] font-comic uppercase text-center w-3/4 mx-auto shadow-sm text-black">
                                                       {panel.dialogue}
                                                   </div>
                                               )}
                                          </div>
                                     </div>
                                 ))}
                             </div>
                             <div className="h-8 flex items-center justify-center text-[10px] text-gray-400 font-mono">
                                 {pageIdx + 1}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        </div>
    );
};

// --- VOICE VIEW ---
export const VoiceView: React.FC<{
    project: ComicProject;
    handleUpdateCharacterVoice: (index: number, voice: string) => void;
    handleVerifyVoice: (char: Character) => void;
    applyVoiceSuggestion: (index: number, voice: string) => void;
    voiceAnalysis: Record<string, {isSuitable: boolean, suggestion: string, reason: string}>;
    analyzingVoiceId: string | null;
    role: AgentRole;
    t: (k: string) => string;
    availableVoices: string[];
}> = ({ project, handleUpdateCharacterVoice, handleVerifyVoice, applyVoiceSuggestion, voiceAnalysis, analyzingVoiceId, role, t, availableVoices }) => {
    const characters = project.characters || [];
    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-pink-200 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Audio Casting & Direction</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((char, idx) => {
                    const analysis = voiceAnalysis[char.id];
                    return (
                        <div key={char.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:border-pink-300 dark:hover:border-pink-500 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600 shadow-inner">
                                    {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-gray-300 dark:text-gray-500 m-4"/>}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{char.name}</h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600">{char.role}</span>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1 flex items-center gap-2">
                                    {t('voice.actor')}
                                    {char.voice && <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 px-1.5 rounded text-[10px]">{char.voice}</span>}
                                </label>
                                <div className="relative">
                                    <select 
                                        value={char.voice || availableVoices[0]}
                                        onChange={(e) => handleUpdateCharacterVoice(idx, e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:border-pink-300 outline-none appearance-none"
                                    >
                                        {availableVoices.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <Mic className="w-4 h-4 text-gray-400 absolute right-2 top-2.5 pointer-events-none"/>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button 
                                    onClick={() => handleVerifyVoice(char)}
                                    disabled={analyzingVoiceId === char.id}
                                    className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 px-3 py-2 rounded-lg transition-colors w-full justify-center"
                                >
                                    {analyzingVoiceId === char.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <ScanFace className="w-4 h-4"/>}
                                    {t('voice.audit')}
                                </button>
                            </div>

                            {analysis && (
                                <div className={`mt-4 p-4 rounded-xl text-xs border animate-in fade-in slide-in-from-top-2 ${analysis.isSuitable ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 border-amber-100 dark:border-amber-800'}`}>
                                    <p className="font-bold mb-2 flex items-center gap-2 text-sm">
                                        {analysis.isSuitable ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/> : <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400"/>}
                                        {analysis.isSuitable ? t('voice.match') : t('voice.mismatch')}
                                    </p>
                                    <p className="leading-relaxed opacity-90 mb-3 border-l-2 border-current pl-2">"{analysis.reason}"</p>
                                    {!analysis.isSuitable && (
                                        <button 
                                            onClick={() => applyVoiceSuggestion(idx, analysis.suggestion)}
                                            className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-lg shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold w-full flex items-center justify-center gap-2"
                                        >
                                            Switch to {analysis.suggestion}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- MOTION VIEW ---
export const MotionView: React.FC<{
    project: ComicProject;
    handleGeneratePanelVideo: (panel: ComicPanel, index: number) => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, handleGeneratePanelVideo, loading, role, t }) => {
     const [isCompiling, setIsCompiling] = useState(false);
     const [progress, setProgress] = useState(0);
     const panels = project.panels || [];

     const handleCompileMovie = async () => {
        setIsCompiling(true);
        setProgress(0);
        try {
            const ffmpeg = new FFmpeg();
            // Use unpkg to serve the worker/core files which often works better for dynamic loading than esm.sh directly for the worker
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            ffmpeg.on('progress', ({ progress }) => {
                setProgress(Math.round(progress * 100));
            });

            const videoPanels = panels.filter(p => p.videoUrl);
            if (videoPanels.length === 0) {
                alert("No generated videos to merge.");
                return;
            }

            let fileList = '';
            for (let i = 0; i < videoPanels.length; i++) {
                const filename = `input${i}.mp4`;
                // Fetch the blob from the stored URL
                await ffmpeg.writeFile(filename, await fetchFile(videoPanels[i].videoUrl));
                fileList += `file '${filename}'\n`;
            }
            await ffmpeg.writeFile('concat_list.txt', fileList);

            // Run concatenation
            await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', 'output.mp4']);

            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));

            // Download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.title.replace(/\s+/g, '_')}_MotionComic.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (e: any) {
            console.error(e);
            alert("Video compilation failed. NOTE: Your browser must support 'SharedArrayBuffer' (Desktop Chrome/Edge/Firefox). If on mobile, please download clips individually.");
        } finally {
            setIsCompiling(false);
            setProgress(0);
        }
     };

     const hasVideos = panels.some(p => p.videoUrl);

     return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-orange-200 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Video Generation (Veo)</p>
                    </div>
                </div>
                
                {hasVideos && (
                    <button 
                        onClick={handleCompileMovie} 
                        disabled={isCompiling || loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCompiling ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin"/> {progress > 0 ? `${progress}%` : t('ui.loading')}
                            </>
                        ) : (
                            <>
                                <Clapperboard className="w-5 h-5"/> {t('ui.finished')} & Export
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {panels.map((panel, idx) => (
                    <div key={panel.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm group">
                        <div className="aspect-video bg-gray-900 relative">
                             {panel.videoUrl ? (
                                 <video src={panel.videoUrl} className="w-full h-full object-cover" controls loop playsInline />
                             ) : panel.imageUrl ? (
                                 <img src={panel.imageUrl} className="w-full h-full object-cover opacity-80" />
                             ) : (
                                 <div className="flex items-center justify-center h-full text-gray-600"><Film className="w-8 h-8"/></div>
                             )}

                             {!panel.videoUrl && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                     {panel.isGenerating ? (
                                         <Loader2 className="w-10 h-10 text-white animate-spin"/>
                                     ) : (
                                         <button 
                                            onClick={() => handleGeneratePanelVideo(panel, idx)}
                                            className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700 transition-all transform group-hover:scale-110"
                                         >
                                             <Play className="w-5 h-5 fill-current ml-1"/>
                                         </button>
                                     )}
                                 </div>
                             )}
                        </div>
                        <div className="p-4 flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-1">Panel #{idx+1}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{panel.description}</p>
                            </div>
                            {panel.videoUrl && (
                                <a href={panel.videoUrl} download={`Panel_${idx+1}.mp4`} className="text-gray-400 hover:text-orange-500" title="Download Clip">
                                    <Download className="w-4 h-4"/>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
     );
};

// --- CONTINUITY VIEW ---
export const ContinuityView: React.FC<{
    project: ComicProject;
    handleRunContinuityCheck: () => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, handleRunContinuityCheck, loading, role, t }) => {
     return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-teal-500 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Logic & Plot Consistency</p>
                    </div>
                </div>
                <button onClick={handleRunContinuityCheck} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-200 dark:shadow-none transition-all disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ScanFace className="w-5 h-5"/>}
                    Check Continuity
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                 <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                     <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400"/> Continuity Report
                 </h3>
                 <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[200px] text-sm leading-relaxed whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                     {project.continuityReport || <span className="text-gray-400 italic">No report generated yet. Run a check to analyze the script logic.</span>}
                 </div>
            </div>
        </div>
    );
};

// --- CENSOR VIEW ---
export const CensorView: React.FC<{
    project: ComicProject;
    handleRunCensorCheck: () => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, handleRunCensorCheck, loading, role, t }) => {
     return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-red-500 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Content Safety & Compliance</p>
                    </div>
                </div>
                <button onClick={handleRunCensorCheck} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ShieldAlert className="w-5 h-5"/>}
                    Run Compliance Scan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                         <Activity className="w-5 h-5 text-red-600"/> Status
                     </h3>
                     <div className={`p-4 rounded-xl border flex items-center gap-3 ${project.isCensored ? 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300' : project.censorReport ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                         {project.isCensored ? <AlertTriangle className="w-6 h-6"/> : project.censorReport ? <CheckCircle className="w-6 h-6"/> : <ShieldAlert className="w-6 h-6 opacity-50"/>}
                         <div>
                             <p className="font-bold text-lg">{project.censorReport ? (project.isCensored ? 'Issues Detected' : 'Content Passed') : 'Pending Scan'}</p>
                             <p className="text-xs opacity-80">{project.censorReport ? (project.isCensored ? 'Action required.' : 'Safe for publication.') : 'Awaiting analysis.'}</p>
                         </div>
                     </div>
                 </div>

                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                         <FileText className="w-5 h-5 text-red-600"/> Report Details
                     </h3>
                     <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[150px] text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                         {project.censorReport || <span className="text-gray-400 italic">No report available.</span>}
                     </div>
                 </div>
            </div>
        </div>
    );
};

// --- TRANSLATOR VIEW ---
export const TranslatorView: React.FC<{
    project: ComicProject;
    updateProject: (updates: Partial<ComicProject>) => void;
    handleAddLanguage: (lang: string) => void;
    loading: boolean;
    role: AgentRole;
    t: (k: string) => string;
}> = ({ project, updateProject, handleAddLanguage, loading, role, t }) => {
    const [newLangInput, setNewLangInput] = useState('');
    const targetLanguages = project.targetLanguages || [];
    const panels = project.panels || [];

    return (
        <div className="max-w-7xl mx-auto w-full px-6 pb-24">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <img src={AGENTS[role].avatar} className="w-16 h-16 rounded-full border-2 border-cyan-500 shadow-md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t(AGENTS[role].name)}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Localization & Translation</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm h-fit">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                         <Globe className="w-5 h-5 text-cyan-600"/> Languages
                     </h3>
                     <div className="space-y-3 mb-6">
                         {targetLanguages.map(lang => (
                             <div key={lang} className="flex items-center justify-between p-3 rounded-xl border bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300">
                                 <span className="font-bold text-sm">{lang}</span>
                                 {lang === project.masterLanguage && <span className="text-[10px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-700 font-bold uppercase text-cyan-600 dark:text-cyan-400">Master</span>}
                             </div>
                         ))}
                     </div>
                     
                     <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                         <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">{t('ui.add_lang')}</label>
                         <div className="flex gap-2">
                             <input 
                                value={newLangInput}
                                onChange={(e) => setNewLangInput(e.target.value)}
                                placeholder="e.g. Spanish"
                                className="flex-1 text-sm p-2 rounded-lg border border-gray-200 dark:border-gray-600 outline-none focus:border-cyan-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                             />
                             <button 
                                onClick={() => { handleAddLanguage(newLangInput); setNewLangInput(''); }}
                                disabled={loading || !newLangInput.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                             >
                                 {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                             </button>
                         </div>
                     </div>
                 </div>

                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                         <BookOpen className="w-5 h-5 text-cyan-600"/> Content Preview
                     </h3>
                     {panels.length === 0 ? (
                         <div className="text-center text-gray-400 py-12 italic">No panels content to translate yet.</div>
                     ) : (
                         <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                             {panels.map((panel, idx) => (
                                 <div key={panel.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                     <div className="flex items-center gap-2 mb-2">
                                         <span className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Panel #{idx+1}</span>
                                         <span className="text-xs text-gray-400 font-mono truncate flex-1">{panel.description.substring(0, 50)}...</span>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                             <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Original ({project.masterLanguage})</label>
                                             <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">{panel.dialogue || <span className="text-gray-300 italic">No dialogue</span>}</p>
                                         </div>
                                         {targetLanguages.filter(l => l !== project.masterLanguage).map(lang => (
                                             <div key={lang}>
                                                 <label className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase block mb-1">{lang}</label>
                                                 <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded border border-cyan-100 dark:border-cyan-900">{panel.translations?.[lang]?.dialogue || <span className="text-gray-300 italic">Pending...</span>}</p>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};
