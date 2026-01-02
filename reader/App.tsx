
import React, { useState, useEffect } from 'react';
import { ComicProject } from '../types';
import * as StorageService from '../services/storageService';
import { BookOpen, ChevronLeft, Heart, Share2, Search, X } from 'lucide-react';
import { Logo } from '../components/Logo';

const ReaderApp: React.FC = () => {
    const [library, setLibrary] = useState<ComicProject[]>([]);
    const [readingProject, setReadingProject] = useState<ComicProject | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleExit = () => {
        window.location.href = '/';
    };

    useEffect(() => {
        const loadContent = async () => {
            const projects = await StorageService.getActiveProjects();
            const publishable = projects.filter(p => p.panels && p.panels.length > 0 && p.panels.some(panel => panel.imageUrl));
            setLibrary(publishable);
        };
        loadContent();
    }, []);

    const filteredLibrary = library.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

    if (readingProject) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen overflow-hidden">
                <div className="bg-gray-900/90 backdrop-blur-md text-white p-4 flex justify-between items-center border-b border-gray-800 absolute top-0 left-0 right-0 z-10">
                    <button onClick={() => setReadingProject(null)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6"/>
                    </button>
                    <div className="text-center">
                        <h2 className="font-bold text-sm md:text-base line-clamp-1">{readingProject.title}</h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Chapter {readingProject.currentChapter || 1}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-800 rounded-full text-pink-500"><Heart className="w-5 h-5"/></button>
                        <button className="p-2 hover:bg-gray-800 rounded-full text-gray-400"><Share2 className="w-5 h-5"/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-black custom-scrollbar pt-20 pb-20">
                    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-900 shadow-2xl">
                        <div className="relative aspect-[3/4] w-full bg-gray-800 mb-2">
                            {readingProject.coverImage ? (
                                <img src={readingProject.coverImage} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-black">
                                    <h1 className="text-4xl font-black text-white uppercase text-center p-4">{readingProject.title}</h1>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-20">
                                <h1 className="text-3xl font-bold text-white mb-2">{readingProject.title}</h1>
                                <p className="text-gray-300 text-sm line-clamp-2">{readingProject.storyConcept?.premise || readingProject.theme}</p>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            {readingProject.panels.map((panel, idx) => (
                                <div key={panel.id} className="w-full relative group">
                                    {panel.imageUrl ? (
                                        <img src={panel.imageUrl} className="w-full h-auto block" loading="lazy" />
                                    ) : (
                                        <div className="aspect-video bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                                            Rendering Panel {idx + 1}...
                                        </div>
                                    )}
                                    {(panel.dialogue || panel.caption) && (
                                        <div className="p-4 bg-white/5 dark:bg-black/50 backdrop-blur-sm border-b border-gray-800">
                                            {panel.caption && (
                                                <div className="mb-2 bg-yellow-100/90 text-black px-3 py-1 text-xs font-bold uppercase inline-block rounded shadow-sm">
                                                    {panel.caption}
                                                </div>
                                            )}
                                            {panel.dialogue && (
                                                <p className="text-gray-900 dark:text-white font-medium text-sm md:text-base leading-relaxed font-comic bg-white/90 dark:bg-gray-800/90 p-3 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-[90%] mx-auto text-center">
                                                    {panel.dialogue}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-12 text-center bg-gray-50 dark:bg-gray-950">
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">End of Chapter</p>
                            <div className="flex justify-center gap-4">
                                <button className="px-6 py-3 bg-gray-200 dark:bg-gray-800 rounded-full font-bold text-xs hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                                    <Heart className="w-4 h-4 inline mr-2 text-pink-500"/> Like
                                </button>
                                <button className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105">
                                    Next Chapter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-pink-500 selection:text-white">
            <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8" />
                    <span className="font-black text-lg tracking-tighter">ACS READER</span>
                </div>
                
                <div className="flex-1 max-w-md mx-8 hidden md:block relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input 
                        className="w-full bg-gray-100 dark:bg-gray-900 rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Search comics, authors, genres..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleExit} className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                        Are you a Creator?
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                            <span className="font-bold text-xs">U</span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                <div className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl h-[400px] md:h-[500px] flex items-end group cursor-pointer">
                    <div className="absolute inset-0">
                        <img 
                            src="https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=2000" 
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    </div>
                    <div className="relative z-10 p-8 md:p-12 max-w-2xl">
                        <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-4 inline-block">Featured Original</span>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">THE AI CHRONICLES</h1>
                        <p className="text-gray-300 text-sm md:text-base mb-8 line-clamp-3">In a world where art creates itself, one creator must fight to find their own voice. A stunning visual journey generated entirely by AI Comic Studio.</p>
                        <div className="flex gap-4">
                            <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                                <BookOpen className="w-5 h-5"/> Read Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 max-w-7xl mx-auto pb-20 space-y-12">
                <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">New Arrivals</h3>
                    {filteredLibrary.length === 0 ? (
                        <div className="text-center py-20 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800">
                            <p className="text-gray-500 font-medium">No published comics found.</p>
                            <p className="text-xs text-gray-400 mt-2">Go to the Studio and create some panels!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredLibrary.map((project) => (
                                <div key={project.id} onClick={() => setReadingProject(project)} className="group cursor-pointer">
                                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mb-3 relative shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl ring-2 ring-transparent group-hover:ring-indigo-500">
                                        {project.coverImage || (project.panels[0] && project.panels[0].imageUrl) ? (
                                            <img src={project.coverImage || project.panels[0].imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-gray-800 to-black">
                                                <span className="font-black text-gray-700 text-4xl uppercase">{project.title.substring(0,2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-sm truncate group-hover:text-indigo-500 transition-colors">{project.title}</h4>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{project.style}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReaderApp;
