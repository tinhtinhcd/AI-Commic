
import { ComicProject } from '../types';

const DB_NAME = 'AIComicStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'active_projects';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
};

export const getActiveProjects = async (): Promise<ComicProject[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_PROJECTS, 'readonly');
            const store = transaction.objectStore(STORE_PROJECTS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return [];
    }
};
