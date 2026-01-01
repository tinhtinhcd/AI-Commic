
import React, { useState } from 'react';
import { Logo } from './Logo';
import { UserProfile } from '../types';
import * as AuthService from '../services/authService';
import { Loader2, ArrowRight, UserPlus, LogIn, Sparkles, Palette, BookOpen, Book, Github } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (user: UserProfile) => void;
    onEnterReader: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onEnterReader }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let user;
            if (isRegistering) {
                if (!username) throw new Error("Username is required");
                user = await AuthService.register(email, password, username);
            } else {
                user = await AuthService.login(email, password);
            }
            onLogin(user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (provider: 'google' | 'apple') => {
        // Note: Real OAuth requires Client IDs and specific redirects which cannot be hardcoded in this demo.
        alert(`OAuth configuration for ${provider} requires a valid Client ID in Cloudflare Pages. Please use Email/Password for this demo.`);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
            {/* LEFT: ARTWORK / BRANDING */}
            <div className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-purple-900/80 to-transparent"></div>
                
                <div className="relative z-10 text-center text-white p-12 max-w-lg">
                    <div className="w-32 h-32 mx-auto mb-8 bg-white rounded-full flex items-center justify-center shadow-2xl">
                        <Logo className="w-24 h-24" />
                    </div>
                    <h1 className="text-5xl font-black mb-6 font-comic tracking-wider">AI COMIC STUDIO</h1>
                    <p className="text-xl text-indigo-200 font-medium leading-relaxed mb-8">
                        The world's first collaborative AI agent system for professional comic production. 
                        Script, Draw, and Publish in one seamless workflow.
                    </p>
                    
                    <div className="flex justify-center gap-4 text-sm font-bold tracking-widest uppercase">
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><BookOpen className="w-6 h-6"/></div>
                            <span>Story</span>
                        </div>
                        <div className="w-12 h-px bg-white/20 self-center"></div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><Palette className="w-6 h-6"/></div>
                            <span>Art</span>
                        </div>
                        <div className="w-12 h-px bg-white/20 self-center"></div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><Sparkles className="w-6 h-6"/></div>
                            <span>Magic</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white dark:bg-gray-900 relative">
                <div className="absolute top-4 right-4 lg:hidden">
                    <Logo className="w-12 h-12" />
                </div>

                {/* READER MODE BUTTON */}
                <div className="absolute top-6 right-6">
                    <button 
                        onClick={onEnterReader}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border border-gray-200 dark:border-gray-700 group"
                    >
                        <Book className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform"/>
                        Browse as Reader
                    </button>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center lg:justify-start gap-3">
                            {isRegistering ? <UserPlus className="w-8 h-8 text-indigo-600"/> : <LogIn className="w-8 h-8 text-indigo-600"/>}
                            {isRegistering ? "Join the Studio" : "Creator Login"}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {isRegistering ? "Start your creative journey today." : "Log in to manage your projects and assets."}
                        </p>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Google</span>
                        </button>
                        <button onClick={() => handleOAuthLogin('apple')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900">
                            <svg className="w-5 h-5 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-.36-.16-.7-.31-1.15-.31-.5 0-.96.18-1.5.42-1.36.63-2.43.2-3.11-.53-3.79-4.04-3.13-8.62.29-10.74 1.34-.84 2.86-.71 3.98.39.26.25.56.57 1.07.57.43 0 .73-.28 1.01-.52 1.37-1.18 3.33-1.21 4.7-.24-2.54 1.22-2.11 4.7.4 5.76-.66 1.69-1.6 3.33-2.61 4.8zm-2.07-16.1c.36-1.55 1.67-2.64 3.12-2.73.19 1.77-1.4 3.48-3.12 3.48-.37 0-.76-.04-1.07-.12.06-1.74 1.07-2.18 1.07-2.18z"/></svg>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Apple</span>
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-400">Or continue with</span></div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {isRegistering && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Studio Name / Username</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Stan Lee"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-50"></span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowRight className="w-5 h-5"/>}
                            {isRegistering ? "Create Account" : "Access Dashboard"}
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isRegistering ? "Already have an account?" : "New to AI Comic Studio?"}
                            <button 
                                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                className="ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {isRegistering ? "Log In" : "Create Account"}
                            </button>
                        </p>
                    </div>
                </div>
                
                <div className="absolute bottom-6 text-xs text-gray-400 dark:text-gray-600">
                    &copy; 2024 AI Comic Studio. Powered by Gemini.
                </div>
            </div>
        </div>
    );
};
