
import React, { useState } from 'react';
import { UserProfile, UserAIPreferences } from '../types';
import { Camera, Edit2, Save, User, Mail, Briefcase, Calendar, Star, Layers, Users, BrainCircuit, Cpu, Paintbrush, Globe, Feather, Zap } from 'lucide-react';
import * as AuthService from '../services/authService';
import { DEFAULT_USER_PREFERENCES } from '../constants';

interface UserProfileViewProps {
    user: UserProfile;
    onUpdate: (updatedUser: UserProfile) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: user.username,
        studioName: user.studioName || '',
        bio: user.bio || ''
    });
    
    // Default to existing or fallback to system default
    const [aiPrefs, setAiPrefs] = useState<UserAIPreferences>(user.aiPreferences || DEFAULT_USER_PREFERENCES);
    
    // Load from User Profile (DB) now, not localStorage
    const [deepSeekKeyInput, setDeepSeekKeyInput] = useState(user.apiKeys?.deepseek || '');
    const [openAIKeyInput, setOpenAIKeyInput] = useState(user.apiKeys?.openai || '');
    const [geminiKeyInput, setGeminiKeyInput] = useState(user.apiKeys?.gemini || '');

    const handleSave = async () => {
        try {
            const updated = await AuthService.updateUserProfile(user.id, {
                ...formData,
                aiPreferences: aiPrefs,
                apiKeys: {
                    gemini: geminiKeyInput,
                    deepseek: deepSeekKeyInput,
                    openai: openAIKeyInput
                }
            });
            onUpdate(updated);
            setIsEditing(false);
            (window as any).alert("Profile & AI Keys Saved to Database!");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 pb-20">
            {/* Header / Banner */}
            <div className="relative h-48 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-16 shadow-lg">
                <div className="absolute -bottom-12 left-8 flex items-end gap-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 overflow-hidden shadow-xl">
                            <img src={user.avatar} className="w-full h-full object-cover" />
                        </div>
                        {isEditing && (
                            <button className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all">
                                <Camera className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                    <div className="mb-4">
                        <h2 className="text-3xl font-black text-white drop-shadow-md">{user.username}</h2>
                        <p className="text-white/80 font-medium flex items-center gap-2"><Briefcase className="w-4 h-4"/> {user.studioName || "Freelance Studio"}</p>
                    </div>
                </div>
                
                <div className="absolute top-4 right-4">
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/30"
                        >
                            <Edit2 className="w-4 h-4"/> Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="bg-black/20 backdrop-blur-md hover:bg-black/30 text-white px-4 py-2 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-gray-50 transition-all"
                            >
                                <Save className="w-4 h-4"/> Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 text-sm uppercase tracking-wider">About</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Studio Name</label>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm"
                                        value={formData.studioName}
                                        onChange={(e) => setFormData({...formData, studioName: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-gray-800 dark:text-gray-200 font-medium">{user.studioName || "Not set"}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Joined</label>
                                <p className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400"/>
                                    {new Date(user.joinDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Email</label>
                                <p className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400"/>
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-center border border-indigo-100 dark:border-indigo-800">
                            <h4 className="text-xl font-black text-indigo-700 dark:text-indigo-300">{user.stats?.projectsCount || 0}</h4>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase">Projects</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center border border-purple-100 dark:border-purple-800">
                            <h4 className="text-xl font-black text-purple-700 dark:text-purple-300">{user.stats?.charactersCount || 0}</h4>
                            <p className="text-[10px] font-bold text-purple-500 uppercase">Characters</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Config Matrix (NEW) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 1. Bio Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 text-sm uppercase tracking-wider">Biography</h3>
                        {isEditing ? (
                            <textarea 
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-sm min-h-[100px]"
                                value={formData.bio}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                placeholder="Tell us about your creative style..."
                            />
                        ) : (
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {user.bio || "No biography provided yet."}
                            </p>
                        )}
                    </div>

                    {/* 2. AI Preference Matrix */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-indigo-600"/>
                                AI Engine Matrix (Iron Triangle)
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Keys are now synced to your account securely.
                            </p>
                        </div>

                        <div className="p-6">
                            {/* Key Inputs */}
                            <div className="space-y-4 mb-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase block mb-1">Gemini API Key (Primary)</label>
                                    {isEditing ? (
                                        <input 
                                            type="password"
                                            value={geminiKeyInput}
                                            onChange={(e) => setGeminiKeyInput(e.target.value)}
                                            placeholder="AIza..."
                                            className="w-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                            {geminiKeyInput ? '••••••••••••••••' : 'System Default (Free Tier)'}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase block mb-1">DeepSeek API Key</label>
                                        {isEditing ? (
                                            <input 
                                                type="password"
                                                value={deepSeekKeyInput}
                                                onChange={(e) => setDeepSeekKeyInput(e.target.value)}
                                                placeholder="sk-..."
                                                className="w-full bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm"
                                            />
                                        ) : (
                                            <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                {deepSeekKeyInput ? '••••••••••••••••' : 'Not Configured'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <label className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase block mb-1">OpenAI API Key</label>
                                        {isEditing ? (
                                            <input 
                                                type="password"
                                                value={openAIKeyInput}
                                                onChange={(e) => setOpenAIKeyInput(e.target.value)}
                                                placeholder="sk-..."
                                                className="w-full bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-2 text-sm"
                                            />
                                        ) : (
                                            <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                {openAIKeyInput ? '••••••••••••••••' : 'Not Configured'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left py-3 px-4 font-bold text-gray-500 uppercase text-xs">Task Type</th>
                                            <th className="text-left py-3 px-4 font-bold text-gray-500 uppercase text-xs">Preferred Model</th>
                                            <th className="text-left py-3 px-4 font-bold text-gray-500 uppercase text-xs">Rationale</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {/* CREATIVE ROW */}
                                        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600"><Feather className="w-4 h-4"/></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">Creative Writing</p>
                                                        <p className="text-xs text-gray-500">Scriptwriting, Dialogue</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {isEditing ? (
                                                    <select 
                                                        value={aiPrefs.creativeEngine}
                                                        onChange={(e) => setAiPrefs({...aiPrefs, creativeEngine: (e.target.value as any)})}
                                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-bold w-full"
                                                    >
                                                        <option value="GEMINI">Gemini 3.0 Pro</option>
                                                        <option value="DEEPSEEK">DeepSeek-V3</option>
                                                        <option value="OPENAI">GPT-5 (Orion)</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                        aiPrefs.creativeEngine === 'GEMINI' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                                        aiPrefs.creativeEngine === 'DEEPSEEK' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {aiPrefs.creativeEngine === 'GEMINI' ? 'Gemini 3.0' : aiPrefs.creativeEngine === 'DEEPSEEK' ? 'DeepSeek-V3' : 'GPT-5'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-xs text-gray-500 italic">
                                                GPT-5 offers best nuance.
                                            </td>
                                        </tr>

                                        {/* LOGIC ROW */}
                                        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><Cpu className="w-4 h-4"/></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">Reasoning & Logic</p>
                                                        <p className="text-xs text-gray-500">Planning, Consistency</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {isEditing ? (
                                                    <select 
                                                        value={aiPrefs.logicEngine}
                                                        onChange={(e) => setAiPrefs({...aiPrefs, logicEngine: (e.target.value as any)})}
                                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-bold w-full"
                                                    >
                                                        <option value="GEMINI">Gemini 3.0 Flash</option>
                                                        <option value="DEEPSEEK">DeepSeek-R1 (Best Value)</option>
                                                        <option value="OPENAI">GPT-5 (Max IQ)</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                        aiPrefs.logicEngine === 'GEMINI' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                                        aiPrefs.logicEngine === 'DEEPSEEK' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {aiPrefs.logicEngine === 'GEMINI' ? 'Gemini 3.0' : aiPrefs.logicEngine === 'DEEPSEEK' ? 'DeepSeek-R1' : 'GPT-5'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-xs text-gray-500 italic">
                                                DeepSeek-R1 rivals GPT-5 at 1/10th the cost.
                                            </td>
                                        </tr>

                                        {/* TRANSLATION ROW */}
                                        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600"><Globe className="w-4 h-4"/></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">Translation</p>
                                                        <p className="text-xs text-gray-500">Localization</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {isEditing ? (
                                                    <select 
                                                        value={aiPrefs.translationEngine}
                                                        onChange={(e) => setAiPrefs({...aiPrefs, translationEngine: (e.target.value as any)})}
                                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-bold w-full"
                                                    >
                                                        <option value="GEMINI">Gemini 3.0</option>
                                                        <option value="DEEPSEEK">DeepSeek-V3</option>
                                                        <option value="OPENAI">GPT-5</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                        aiPrefs.translationEngine === 'GEMINI' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                                        aiPrefs.translationEngine === 'DEEPSEEK' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {aiPrefs.translationEngine === 'GEMINI' ? 'Gemini 3.0' : aiPrefs.translationEngine === 'DEEPSEEK' ? 'DeepSeek-V3' : 'GPT-5'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-xs text-gray-500 italic">
                                                Bulk tasks should use DeepSeek.
                                            </td>
                                        </tr>

                                        {/* VISUAL ROW (LOCKED) */}
                                        <tr className="group bg-gray-50/50 dark:bg-gray-900/30">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3 opacity-70">
                                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600"><Paintbrush className="w-4 h-4"/></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">Visual Art & Vision</p>
                                                        <p className="text-xs text-gray-500">Image Gen, Image Analysis</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gray-100 text-gray-500 border-gray-200 flex items-center justify-center gap-1 w-fit">
                                                    <Zap className="w-3 h-3"/> Gemini 3 (Locked)
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-xs text-gray-400 italic">
                                                Native Multimodal required for Video/Art pipelines.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
