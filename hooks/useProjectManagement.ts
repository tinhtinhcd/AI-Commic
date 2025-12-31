/// <reference lib="dom" />
import { useState, useRef, useEffect } from 'react';
import { ComicProject, AgentRole, SystemLog } from '../types';
import { INITIAL_PROJECT_STATE } from '../constants';
import * as StorageService from '../services/storageService';
import * as GeminiService from '../services/geminiService';

export const useProjectManagement = (
    project: ComicProject, 
    updateProject: (updates: Partial<ComicProject>) => void,
    uiLanguage: 'en' | 'vi'
) => {
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
    const [activeProjects, setActiveProjects] = useState<ComicProject[]>([]);
    const [library, setLibrary] = useState<ComicProject[]>([]);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const actives = await StorageService.getActiveProjects();
                const libs = await StorageService.getLibrary();
                setActiveProjects(actives);
                setLibrary(libs);
            } catch (e) {
                console.error("Failed to load DB", e);
            }
        };
        loadData();
    }, []);

    const refreshLists = async () => {
        const actives = await StorageService.getActiveProjects();
        const libs = await StorageService.getLibrary();
        setActiveProjects(actives);
        setLibrary(libs);
    };

    const addLog = (agentId: AgentRole, message: string, type: SystemLog['type'] = 'info') => {
        const newLog: SystemLog = {
            id: crypto.randomUUID(),
            agentId,
            message,
            timestamp: Date.now(),
            type
        };
        updateProject({ logs: [...(project.logs || []), newLog] });
    };

    const handleSaveWIP = async () => {
        setSaveStatus('SAVING');
        try {
            const result = await StorageService.saveWorkInProgress(project);
            if (result.success) {
                setSaveStatus('SAVED');
                addLog(AgentRole.PROJECT_MANAGER, "Project Saved to Database.", 'success');
                await refreshLists();
                setTimeout(() => setSaveStatus('IDLE'), 2000);
            } else {
                setSaveStatus('ERROR');
                if (result.message === 'SLOTS_FULL') {
                    (window as any).alert("Dashboard Slots Full (Max 3). Delete an old project to save a new one.");
                } else if (result.message === 'DISK_FULL') {
                    (window as any).alert("Disk Full! Your device is running out of storage space.");
                } else {
                    (window as any).alert("Save failed: " + result.message);
                }
            }
        } catch (e) {
            setSaveStatus('ERROR');
            console.error(e);
        }
    };

    const handleLoadWIP = (p: ComicProject) => {
        if ((window as any).confirm("Load this project? Unsaved changes in current workspace will be lost.")) {
            updateProject(p);
            addLog(AgentRole.PROJECT_MANAGER, `Loaded Workspace: ${p.title}`, 'info');
        }
    };

    const handleDeleteWIP = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if ((window as any).confirm("Delete this project permanently? This action cannot be undone.")) {
            await StorageService.deleteActiveProject(id);
            await refreshLists();

            if (project.id === id) {
                const resetState = JSON.parse(JSON.stringify(INITIAL_PROJECT_STATE));
                updateProject({
                    ...resetState,
                    id: crypto.randomUUID(),
                    logs: [] 
                });
                addLog(AgentRole.PROJECT_MANAGER, "Current project deleted. Workspace reset.", 'warning');
            } else {
                addLog(AgentRole.PROJECT_MANAGER, "Project removed from database.", 'info');
            }
        }
    };

    const handleDeleteFromLibrary = async (id: string) => {
        if ((window as any).confirm("Permanently delete this archived project?")) {
            await StorageService.deleteProjectFromLibrary(id);
            setLibrary(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleExportProjectZip = async () => {
        addLog(AgentRole.PROJECT_MANAGER, "Compressing project assets...", 'info');
        try {
            const zipBlob = await StorageService.exportProjectToZip(project);
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${project.title || 'Project'}_Backup.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addLog(AgentRole.PROJECT_MANAGER, "Backup exported successfully.", 'success');
        } catch (e) {
            console.error(e);
            addLog(AgentRole.PROJECT_MANAGER, "Export failed.", 'error');
        }
    };

    const handleImportProjectZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = (e.target as any).files?.[0];
        if (!file) return;
        
        addLog(AgentRole.PROJECT_MANAGER, "Unzipping and restoring project...", 'info');
        try {
            const loadedProject = await StorageService.importProjectFromZip(file);
            const saveResult = await StorageService.saveWorkInProgress(loadedProject);
            
            if (!saveResult.success) {
                if (saveResult.message === 'SLOTS_FULL') {
                    if((window as any).confirm("Dashboard slots are full. Load into temporary workspace only? (Will NOT be saved)")) {
                         updateProject(loadedProject);
                         addLog(AgentRole.PROJECT_MANAGER, "Project loaded temporarily.", 'warning');
                    }
                } else {
                    (window as any).alert("Could not save imported project: " + saveResult.message);
                }
            } else {
                updateProject(loadedProject);
                await refreshLists();
                addLog(AgentRole.PROJECT_MANAGER, "Project restored and saved to Database.", 'success');
            }
        } catch (e: any) {
            console.error(e);
            (window as any).alert("Import failed: " + e.message);
            addLog(AgentRole.PROJECT_MANAGER, "Import failed: " + e.message, 'error');
        }
    };

    const switchProjectLanguage = (newLang: string) => {
        if (newLang === project.activeLanguage) return;
        const currentLang = project.activeLanguage;
        
        const updatedPanels = project.panels.map(p => {
            const currentTranslation = { dialogue: p.dialogue, caption: p.caption };
            const newTranslations = { ...(p.translations || {}), [currentLang]: currentTranslation };
            
            const nextTranslation = newTranslations[newLang] || { dialogue: '', caption: '' };
            
            return {
                ...p,
                translations: newTranslations,
                dialogue: nextTranslation.dialogue || (newLang === project.masterLanguage ? p.dialogue : ''), 
                caption: nextTranslation.caption || (newLang === project.masterLanguage ? p.caption : '')
            };
        });
        updateProject({ activeLanguage: newLang, panels: updatedPanels });
        addLog(AgentRole.PROJECT_MANAGER, `Switched view to ${newLang}`, 'info');
    };

    const handleAddLanguage = async (newLang: string) => {
        if (!newLang || project.targetLanguages.includes(newLang)) return;
        
        addLog(AgentRole.TRANSLATOR, `Initializing new language layer: ${newLang}...`, 'info');
        
        updateProject({ targetLanguages: [...project.targetLanguages, newLang] });
        
        if (project.panels.length > 0) {
            addLog(AgentRole.TRANSLATOR, `Translating ${project.panels.length} panels to ${newLang}...`, 'info');
            try {
                const translatedPanels = await GeminiService.batchTranslatePanels(
                    project.panels, 
                    [newLang], 
                    project.modelTier
                );
                updateProject({ panels: translatedPanels });
                addLog(AgentRole.TRANSLATOR, `Localization complete for ${newLang}.`, 'success');
            } catch(e) {
                addLog(AgentRole.TRANSLATOR, `Localization failed for ${newLang}.`, 'error');
            }
        }
    };

    return {
        saveStatus,
        activeProjects,
        library,
        handleSaveWIP,
        handleLoadWIP,
        handleDeleteWIP,
        handleDeleteFromLibrary,
        handleExportProjectZip,
        handleImportProjectZip,
        switchProjectLanguage,
        handleAddLanguage,
        addLog
    };
};