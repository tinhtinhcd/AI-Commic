
import { UserProfile } from '../types';

const STORAGE_KEY_USERS = 'acs_users_v1';
const STORAGE_KEY_SESSION = 'acs_session_v1';

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

export const register = async (email: string, password: string, username: string): Promise<UserProfile> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const users = getAllUsers();
    if (users.some(u => u.email === email)) {
        throw new Error("Email already registered.");
    }

    const newUser: UserProfile = {
        id: crypto.randomUUID(),
        email,
        password,
        username,
        joinDate: Date.now(),
        studioName: `${username}'s Studio`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`, 
        bio: "Comic Creator",
        stats: { projectsCount: 0, chaptersCount: 0, charactersCount: 0 }
    };

    users.push(newUser);
    saveAllUsers(users);
    
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
    return newUser;
};

export const login = async (email: string, password: string): Promise<UserProfile> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === 'user' && password === '123456') {
        const users = getAllUsers();
        let testUser = users.find(u => u.email === 'user');
        
        if (!testUser) {
            testUser = {
                id: 'test-user-id-123456',
                username: 'Director (Test)',
                email: 'user',
                password: '123456',
                avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Director',
                joinDate: Date.now(),
                studioName: 'Alpha Testing Studio',
                bio: 'Account dành riêng cho Giám đốc Dự án để kiểm thử tính năng.',
                stats: { projectsCount: 12, chaptersCount: 45, charactersCount: 128 }
            };
            users.push(testUser);
            saveAllUsers(users);
        }

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(testUser));
        return testUser;
    }

    const users = getAllUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        throw new Error("Invalid credentials.");
    }

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
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error("User not found");

    const updatedUser = { ...users[idx], ...updates };
    users[idx] = updatedUser;
    saveAllUsers(users);

    const current = getCurrentUser();
    if (current && current.id === id) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedUser));
    }

    return updatedUser;
};
