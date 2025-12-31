
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    studioName?: string;
    joinDate: number;
    stats?: {
        projectsCount: number;
        chaptersCount: number;
        charactersCount: number;
    }
}
