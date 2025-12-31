
import React, { useState } from 'react';
import { Users, BarChart3, ShieldAlert, Settings, LogOut, XCircle, Search, Wallet } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';

// Mock Data for Admin Demo
const MOCK_USERS: UserProfile[] = [
    { id: '1', username: 'Stan Lee', email: 'stan@marvel.com', joinDate: Date.now() - 10000000, studioName: 'Marvelous', stats: { projectsCount: 15, chaptersCount: 300, charactersCount: 50 } },
    { id: '2', username: 'Alan Moore', email: 'alan@watchmen.com', joinDate: Date.now() - 5000000, studioName: 'Chaos Magic', stats: { projectsCount: 3, chaptersCount: 12, charactersCount: 8 } },
    { id: '3', username: 'MangaArtist99', email: 'manga@japan.jp', joinDate: Date.now() - 200000, studioName: 'Shonen Jump', stats: { projectsCount: 1, chaptersCount: 1, charactersCount: 2 } },
];

export const AdminApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'CONTENT' | 'FINANCE'>('DASHBOARD');
    const [users] = useState(MOCK_USERS);

    const handleLogout = () => {
        window.location.href = '/';
    };

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-800">{value}</h3>
            </div>
            <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <Logo className="w-8 h-8"/>
                    <span className="font-bold text-lg tracking-tight">ACS ADMIN</span>
                </div>
                
                <div className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <BarChart3 className="w-5 h-5"/> Dashboard
                    </button>
                    <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'USERS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Users className="w-5 h-5"/> User Management
                    </button>
                    <button onClick={() => setActiveTab('CONTENT')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'CONTENT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <ShieldAlert className="w-5 h-5"/> Content Moderation
                    </button>
                    <button onClick={() => setActiveTab('FINANCE')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'FINANCE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Wallet className="w-5 h-5"/> Finance & Revenue
                    </button>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors text-sm font-bold">
                        <LogOut className="w-5 h-5"/> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800">{activeTab === 'DASHBOARD' ? 'System Overview' : activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-200">AD</div>
                        <span className="text-sm font-medium text-slate-600">Super Admin</span>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'DASHBOARD' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard title="Total Users" value="12,345" icon={Users} color="text-blue-600" />
                                <StatCard title="Active Projects" value="843" icon={BarChart3} color="text-emerald-600" />
                                <StatCard title="Revenue (MTD)" value="$45,200" icon={Wallet} color="text-amber-600" />
                                <StatCard title="Flagged Content" value="23" icon={ShieldAlert} color="text-red-600" />
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col justify-center items-center text-slate-400">
                                <BarChart3 className="w-16 h-16 opacity-20 mb-4"/>
                                <p>Real-time Traffic Analytics (Integration Pending)</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                                    <input className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search users by email or studio..."/>
                                </div>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Studio</th>
                                        <th className="px-6 py-4">Projects</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden"><img src={u.avatar} className="w-full h-full object-cover"/></div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{u.username}</div>
                                                    <div className="text-slate-500 text-xs">{u.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{u.studioName}</td>
                                            <td className="px-6 py-4 font-mono">{u.stats?.projectsCount}</td>
                                            <td className="px-6 py-4"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Active</span></td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button className="p-2 hover:bg-slate-200 rounded text-slate-500"><Settings className="w-4 h-4"/></button>
                                                <button className="p-2 hover:bg-red-100 rounded text-red-500"><XCircle className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {activeTab === 'CONTENT' && (
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500"/> Flagged Reports</h3>
                            <p className="text-sm text-gray-500">No active reports.</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};
