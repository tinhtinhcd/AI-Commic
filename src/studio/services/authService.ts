
import { UserProfile } from '../types';

const STORAGE_KEY_USERS = 'acs_users_v1';
const STORAGE_KEY_SESSION = 'acs_session_v1';

// --- HELPER FUNCTIONS ---

const getAllUsers = (): UserProfile[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

const saveAllUsers = (users: UserProfile[]) => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

// --- AUTH API ---

export const register = async (email: string, password: string, username: string): Promise<UserProfile> => {
    const newUser: UserProfile = {
        id: crypto.randomUUID(),
        email,
        password, // stored locally for fallback
        username,
        joinDate: Date.now(),
        studioName: `${username}'s Studio`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`, 
        bio: "Comic Creator",
        credits: 100,
        stats: { projectsCount: 0, chaptersCount: 0, charactersCount: 0 }
    };

    try {
        // Attempt Cloud Registration
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newUser.id, email, password, data: newUser })
        });

        if (!response.ok) {
            // Check if it's a server/db error (5xx) or a logic error (4xx)
            if (response.status >= 500) {
                throw new Error("SERVER_ERROR");
            }
            const err = await response.json();
            throw new Error(err.error || "Registration failed");
        }
        
        // If successful, we rely on the cloud. But we also save locally for redundancy/offline.
        const users = getAllUsers();
        if (!users.some(u => u.email === email)) {
            users.push(newUser);
            saveAllUsers(users);
        }
        
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
        return newUser;

    } catch (e: any) {
        console.warn("Cloud registration failed, falling back to local storage.", e);
        
        // Fallback: Local Registration logic
        // If the error was specifically about the email existing on the SERVER, we might not know here if it was a 500.
        // But for local fallback, we check local storage.
        
        const users = getAllUsers();
        if (users.some(u => u.email === email)) {
            // If it exists locally, fail.
            throw new Error("Email already registered (Local Storage).");
        }
        
        // Save locally
        users.push(newUser);
        saveAllUsers(users);
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
        return newUser;
    }
};

export const login = async (email: string, password: string): Promise<UserProfile> => {
    // 1. Client-side Bypass for Demo/Testing (Resilient to DB failure)
    // Now accepts both 'user' and 'user@test.com'
    if ((email === 'user' || email === 'user@test.com') && password === '123456') {
        const isNewTestUser = email === 'user@test.com';
        
        const testUser: UserProfile = {
            id: isNewTestUser ? 'test-id-user-at-test' : 'test-user-id-123456',
            username: isNewTestUser ? 'Test User' : 'Director (Test)',
            email: email,
            password: password,
            avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${isNewTestUser ? 'TestUser' : 'Director'}`,
            joinDate: Date.now(),
            studioName: isNewTestUser ? 'Test Studio' : 'Alpha Testing Studio',
            bio: 'Account generated for testing purposes.',
            credits: 9999,
            stats: { projectsCount: 2, chaptersCount: 5, charactersCount: 8 }
        };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(testUser));
        return testUser;
    }

    // 2. Try Cloud API
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errData = await response.json();
            // If it's a 503 (DB Error) or 500, throw specific error to trigger local fallback
            if (response.status >= 500) throw new Error("Server Error");
            throw new Error(errData.error || "Invalid credentials");
        }

        const user = await response.json();
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        return user;

    } catch (e: any) {
        console.warn("Cloud login failed, checking local storage.", e);

        // 3. Fallback to Local Storage
        const users = getAllUsers();
        const localUser = users.find(u => u.email === email && u.password === password);

        if (localUser) {
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(localUser));
            return localUser;
        }

        // If local also fails, propagate the error.
        // If the server is dead (500/503) and user isn't local, give a helpful hint.
        if (e.message === "Server Error" || e.message?.includes("fetch")) {
             throw new Error("Database Offline. Please Register a new local account or use 'user@test.com' / '123456'.");
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
    // Optimistic Update
    const current = getCurrentUser();
    if (!current) throw new Error("No session");
    
    const updatedUser = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedUser));

    // Try to sync with Cloud
    try {
        await fetch('/api/admin/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates })
        });
    } catch (e) {
        console.warn("Failed to sync profile update to cloud (running locally).");
    }

    // Sync with Local Storage list
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        saveAllUsers(users);
    }

    return updatedUser;
};
