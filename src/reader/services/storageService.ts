
import { ComicProject } from '../types';

export const getActiveProjects = async (): Promise<ComicProject[]> => {
    try {
        const response = await fetch('/api/projects?type=active');
        if (!response.ok) {
            console.error("Failed to fetch projects");
            return [];
        }
        return await response.json();
    } catch (e) {
        console.error("Reader fetch error", e);
        return [];
    }
};
