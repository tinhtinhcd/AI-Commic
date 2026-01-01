
import { ComicProject } from '../types';
import JSZip from 'jszip';

const DB_NAME = 'AIComicStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'active_projects';
const STORE_LIBRARY = 'library';

// --- INDEXED DB UTILITIES (Fallback Layer) ---

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
                db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
                db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

const dbAction = async <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        
        let request: IDBRequest<T> | void;
        try {
            request = action(store);
        } catch (e) {
            reject(e);
            return;
        }

        transaction.oncomplete = () => {
            if (request) resolve(request.result);
            else resolve(undefined as T);
        };

        transaction.onerror = () => reject(transaction.error);
    });
};

// --- HYBRID STORAGE LOGIC ---

export const getActiveProjects = async (userId?: string): Promise<ComicProject[]> => {
    // 1. Try Cloud API
    try {
        let url = '/api/projects?type=active';
        if (userId) url += `&userId=${userId}`;
        
        const res = await fetch(url);
        if (res.ok) {
            return await res.json();
        } else {
            console.warn(`Cloud fetch failed (${res.status}). Switching to Local DB.`);
        }
    } catch (e) {
        console.warn("Cloud unreachable. Switching to Local DB.");
    }

    // 2. Fallback to Local IndexedDB
    try {
        return await dbAction<ComicProject[]>(STORE_PROJECTS, 'readonly', (store) => store.getAll());
    } catch (e) {
        console.error("Local DB failed", e);
        return [];
    }
};

export const saveWorkInProgress = async (project: ComicProject): Promise<{ success: boolean, message?: string }> => {
    // Enforce ID
    if (!project.id) project.id = crypto.randomUUID();
    project.lastModified = Date.now();

    let cloudSuccess = false;
    let cloudMessage = "";

    // 1. Try Cloud API
    try {
        const res = await fetch('/api/projects/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project, isActive: true })
        });

        if (res.ok) {
            cloudSuccess = true;
        } else {
            const errorData = await res.json();
            // Critical Logic Error (like Quota Full) should stop us from confusing user with local save
            if (res.status === 403 && errorData.error === "SLOTS_FULL") {
                return { success: false, message: "SLOTS_FULL" };
            }
            cloudMessage = errorData.error || "Auth Failed";
        }
    } catch (e: any) {
        cloudMessage = e.message;
    }

    if (cloudSuccess) {
        return { success: true };
    }

    console.warn(`Cloud save failed: ${cloudMessage}. Saving locally.`);

    // 2. Fallback to Local
    try {
        // Check Local Slots
        const allLocal = await dbAction<ComicProject[]>(STORE_PROJECTS, 'readonly', (store) => store.getAll());
        // Simple quota check: if not update, and count >= 3
        if (!allLocal.find(p => p.id === project.id) && allLocal.length >= 3) {
             return { success: false, message: "SLOTS_FULL" };
        }

        await dbAction(STORE_PROJECTS, 'readwrite', (store) => store.put(project));
        return { success: true, message: "Saved (Offline Mode)" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const deleteActiveProject = async (id: string): Promise<void> => {
    // Try Cloud
    try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    } catch (e) { console.warn("Cloud delete failed"); }

    // Always Delete Local
    await dbAction(STORE_PROJECTS, 'readwrite', (store) => store.delete(id));
};

// --- LIBRARY LOGIC ---

export const saveProjectToLibrary = async (project: ComicProject): Promise<void> => {
    const projectToSave = { ...project };
    if (!projectToSave.id) projectToSave.id = crypto.randomUUID();
    
    // Try Cloud
    try {
        await fetch('/api/projects/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: projectToSave, isActive: false })
        });
    } catch (e) {}

    // Save Local
    await dbAction(STORE_LIBRARY, 'readwrite', (store) => store.put(projectToSave));
};

export const getLibrary = async (userId?: string): Promise<ComicProject[]> => {
    // Try Cloud
    try {
        let url = '/api/projects?type=library';
        if (userId) url += `&userId=${userId}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback Local
    return await dbAction<ComicProject[]>(STORE_LIBRARY, 'readonly', (store) => store.getAll());
};

export const deleteProjectFromLibrary = async (id: string): Promise<void> => {
    try { await fetch(`/api/projects/${id}`, { method: 'DELETE' }); } catch(e){}
    await dbAction(STORE_LIBRARY, 'readwrite', (store) => store.delete(id));
};

// --- ZIP EXPORT/IMPORT (Client Only) ---

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
