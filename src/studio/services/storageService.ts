
import { ComicProject } from '../types';
import JSZip from 'jszip';

// --- API BASED STORAGE ---

export const getActiveProjects = async (userId?: string): Promise<ComicProject[]> => {
    try {
        let url = '/api/projects?type=active';
        if (userId) url += `&userId=${userId}`;
        
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch projects failed", e);
        return [];
    }
};

export const saveWorkInProgress = async (project: ComicProject): Promise<{ success: boolean, message?: string }> => {
    try {
        // Enforce ID
        if (!project.id) project.id = crypto.randomUUID();
        project.lastModified = Date.now();

        // Optimistic check: We assume client logic is sound, but server is authority.
        // We'll let the server reject if it's full.

        const res = await fetch('/api/projects/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project, isActive: true })
        });

        if (!res.ok) {
            const errorData = await res.json();
            if (res.status === 403 && errorData.error === "SLOTS_FULL") {
                return { success: false, message: "SLOTS_FULL" };
            }
            throw new Error(errorData.error || "API Error");
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const deleteActiveProject = async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
};

// --- LIBRARY LOGIC ---

export const saveProjectToLibrary = async (project: ComicProject): Promise<void> => {
    // In new DB schema, Library is just is_active = false
    const projectToSave = { ...project };
    if (!projectToSave.id) projectToSave.id = crypto.randomUUID();
    
    await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectToSave, isActive: false })
    });
};

export const getLibrary = async (userId?: string): Promise<ComicProject[]> => {
    try {
        let url = '/api/projects?type=library';
        if (userId) url += `&userId=${userId}`;
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    } catch (e) {
        return [];
    }
};

export const deleteProjectFromLibrary = async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
};

// --- ZIP EXPORT/IMPORT (Unchanged, Client Side) ---

export const exportProjectToZip = async (project: ComicProject): Promise<Blob> => {
    const zip = new JSZip();
    const projectJson = JSON.stringify(project, null, 2);
    zip.file("project.json", projectJson);
    zip.file("README.txt", `Project: ${project.title}\nExported: ${new Date().toISOString()}\n\nTo restore, upload this .zip file in the AI Comic Studio.`);
    const content = await zip.generateAsync({ type: "blob" });
    return content;
};

export const importProjectFromZip = async (file: File): Promise<ComicProject> => {
    try {
        const zip = await JSZip.loadAsync(file);
        const projectFile = zip.file("project.json");
        if (!projectFile) throw new Error("Invalid backup: project.json not found.");

        const projectText = await projectFile.async("string");
        const project = JSON.parse(projectText) as ComicProject;
        
        if (!project.title || !Array.isArray(project.panels)) throw new Error("Invalid project format.");
        
        project.id = crypto.randomUUID();
        return project;
    } catch (e) {
        console.error("Failed to import project", e);
        throw e;
    }
};
