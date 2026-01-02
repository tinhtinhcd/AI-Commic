
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

    try {
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
    } catch (e: any) {
        console.warn("Registration API failed, falling back to local storage for demo.", e);
        // Fallback: Just save session locally for the demo if API fails
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
        return newUser;
    }
};

export const login = async (email: string, password: string): Promise<UserProfile> => {
    // 1. Client-side Bypass for Demo/Testing (Resilient to DB failure)
    if (email === 'user' && password === '123456') {
        const testUser: UserProfile = {
            id: 'test-user-id-123456',
            username: 'Director (Test)',
            email: 'user',
            password: '123456',
            avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Director',
            joinDate: Date.now(),
            studioName: 'Alpha Testing Studio',
            bio: 'Account dành riêng cho Giám đốc Dự án để kiểm thử tính năng.',
            credits: 9999,
            stats: { projectsCount: 12, chaptersCount: 45, charactersCount: 128 }
        };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(testUser));
        return testUser;
    }

    try {
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
    } catch (e: any) {
        console.error("Login API failed:", e);
        // Fallback for specific error message regarding DB connection to hint user
        if (e.message?.includes("500") || e.message?.includes("authentication failed")) {
             throw new Error("Server Database Error. Try 'user' / '123456' for demo access.");
        }
        throw e;
    }
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
