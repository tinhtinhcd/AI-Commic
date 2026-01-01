import React, { useState, useEffect } from 'react';
import { Users, BarChart3, ShieldAlert, Settings, LogOut, XCircle, Search, Wallet, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from '../components/Logo';

const AdminApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'CONTENT' | 'FINANCE'>('DASHBOARD');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeProjects: 0, revenue: 0, flaggedContent: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for speed
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/stats')
            ]);

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData);
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (e) {
            console.error("Failed to load admin data", e);
        } finally {
            setLoading(false);
        }
    };

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
                        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Refresh Data">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <BarChart3 className="w-5 h-5"/>}
                        </button>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-200">AD</div>
                        <span className="text-sm font-medium text-slate-600">Super Admin</span>
                    </div>
                </header>

                <div className="p-8">
                    {loading && users.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'DASHBOARD' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-600" />
                                        <StatCard title="Active Projects" value={stats.activeProjects} icon={BarChart3} color="text-emerald-600" />
                                        <StatCard title="Revenue (MTD)" value={`$${stats.revenue}`} icon={Wallet} color="text-amber-600" />
                                        <StatCard title="Flagged Content" value={stats.flaggedContent} icon={ShieldAlert} color="text-red-600" />
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col justify-center items-center text-slate-400">
                                        <BarChart3 className="w-16 h-16 opacity-20 mb-4"/>
                                        <p>Real-time Traffic Analytics (DB Connected)</p>
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
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-6 py-4">User</th>
                                                    <th className="px-6 py-4">Studio</th>
                                                    <th className="px-6 py-4">Joined</th>
                                                    <th className="px-6 py-4">Stats</th>
                                                    <th className="px-6 py-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {users.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50">
                                                        <td className="px-6 py-4 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden"><img src={u.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.username}`} className="w-full h-full object-cover"/></div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">{u.username}</div>
                                                                <div className="text-slate-500 text-xs">{u.email}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">{u.studioName || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-500">{new Date(u.joinDate).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold mr-1">P: {u.stats?.projectsCount || 0}</span>
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">C: {u.stats?.chaptersCount || 0}</span>
                                                        </td>
                                                        <td className="px-6 py-4 flex gap-2">
                                                            <button className="p-2 hover:bg-slate-200 rounded text-slate-500"><Settings className="w-4 h-4"/></button>
                                                            <button className="p-2 hover:bg-red-100 rounded text-red-500"><XCircle className="w-4 h-4"/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'CONTENT' && (
                                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500"/> Flagged Reports</h3>
                                    <p className="text-sm text-gray-500 italic">No active reports from the moderation AI agent.</p>
                                 </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminApp;