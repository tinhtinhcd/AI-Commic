
import { UserProfile } from '../types';

const STORAGE_KEY_SESSION = 'acs_session_v1';

export const register = async (email: string, password: string, username: string): Promise<UserProfile> => {
    const newUser: UserProfile = {
        id: crypto.randomUUID(),
        email,
        username,
        joinDate: Date.now(),
        studioName: `${username}'s Studio`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`, 
        bio: "Comic Creator",
        credits: 100, // Starting Credits
        stats: { projectsCount: 0, chaptersCount: 0, charactersCount: 0 }
    };

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newUser.id, email, password, data: newUser })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Registration failed");
    }

    const user = await response.json();
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    return user;
};

export const login = async (email: string, password: string): Promise<UserProfile> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Invalid credentials");
    }

    const user = await response.json();
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    return user;
};

export const logout = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
};

export const getCurrentUser = (): UserProfile | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SESSION);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

export const updateUserProfile = async (id: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    const current = getCurrentUser();
    if (!current) throw new Error("No session");

    // This is a client-side optimisitic update helper. 
    // In a full implementation, you would have a POST /api/auth/update endpoint.
    const updatedUser = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedUser));
    return updatedUser;
};
