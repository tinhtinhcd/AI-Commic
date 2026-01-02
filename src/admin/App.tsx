
import React, { useState, useEffect } from 'react';
import { Users, BarChart3, ShieldAlert, Settings, LogOut, XCircle, Search, Wallet, Edit2, Check, X, FileText, Trash2 } from 'lucide-react';
import { UserProfile, ComicProject } from '../types';
import { Logo } from '../components/Logo';

// --- COMPONENTS ---

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

const UserEditModal: React.FC<{ user: UserProfile, onClose: () => void, onSave: (u: UserProfile) => void }> = ({ user, onClose, onSave }) => {
    const [credits, setCredits] = useState(user.credits || 0);
    const [studioName, setStudioName] = useState(user.studioName || '');
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Edit User: {user.username}</h3>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Studio Name</label>
                        <input 
                            value={studioName}
                            onChange={(e) => setStudioName(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credits (Quota)</label>
                        <input 
                            type="number"
                            value={credits}
                            onChange={(e) => setCredits(parseInt(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold">Cancel</button>
                    <button 
                        onClick={() => onSave({ ...user, credits, studioName })}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ---

const AdminApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'CONTENT'>('DASHBOARD');
    
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [projects, setProjects] = useState<ComicProject[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeProjects: 0, revenue: 0, flaggedContent: 0 });
    
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Stats
            const statsRes = await fetch('/api/admin/stats');
            if (statsRes.ok) setStats(await statsRes.json());

            // Load specific tab data
            if (activeTab === 'USERS') {
                const usersRes = await fetch('/api/admin/users');
                if (usersRes.ok) setUsers(await usersRes.json());
            } else if (activeTab === 'CONTENT') {
                const projRes = await fetch('/api/admin/projects');
                if (projRes.ok) setProjects(await projRes.json());
            }
        } catch (e) {
            console.error("Admin Load Failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (updatedUser: UserProfile) => {
        try {
            const res = await fetch('/api/admin/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: updatedUser.id, updates: updatedUser })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
                setEditingUser(null);
            }
        } catch (e) {
            alert("Failed to update user");
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this project?")) return;
        try {
            await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (e) {
            alert("Delete failed");
        }
    };

    const handleLogout = () => {
        window.location.href = '/';
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {editingUser && (
                <UserEditModal 
                    user={editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onSave={handleUpdateUser} 
                />
            )}

            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
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
                        <ShieldAlert className="w-5 h-5"/> Project Moderation
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
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {activeTab === 'DASHBOARD' ? 'System Overview' : activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
                        {loading && <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-200">AD</div>
                        <span className="text-sm font-medium text-slate-600">Super Admin</span>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'DASHBOARD' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-600" />
                                <StatCard title="Active Projects" value={stats.activeProjects} icon={BarChart3} color="text-emerald-600" />
                                <StatCard title="Est. Revenue" value={`$${stats.revenue}`} icon={Wallet} color="text-amber-600" />
                                <StatCard title="Flagged" value={stats.flaggedContent} icon={ShieldAlert} color="text-red-600" />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex flex-col justify-center items-center text-slate-400">
                                    <BarChart3 className="w-12 h-12 opacity-20 mb-2"/>
                                    <p>Traffic Analytics (Coming Soon)</p>
                                </div>
                                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm text-white">
                                    <h3 className="font-bold mb-4">System Health</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Database Connection</span> <span className="text-emerald-400 font-bold">ONLINE</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">API Latency</span> <span className="text-emerald-400 font-bold">45ms</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Storage Usage</span> <span className="text-blue-400 font-bold">12%</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                                    <input 
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Studio</th>
                                            <th className="px-6 py-4">Credits</th>
                                            <th className="px-6 py-4">Joined</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0"><img src={u.avatar} className="w-full h-full object-cover"/></div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{u.username}</div>
                                                        <div className="text-slate-500 text-xs">{u.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{u.studioName}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-indigo-600">{u.credits || 0}</td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(u.joinDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    <button onClick={() => setEditingUser(u)} className="p-2 hover:bg-slate-200 rounded text-slate-500" title="Edit User"><Edit2 className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'CONTENT' && (
                         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-sm">Active Projects ({projects.length})</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {projects.map((p) => (
                                    <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="w-16 h-12 bg-slate-200 rounded overflow-hidden shrink-0">
                                            {p.coverImage || (p.panels[0] && p.panels[0].imageUrl) ? 
                                                <img src={p.coverImage || p.panels[0].imageUrl} className="w-full h-full object-cover"/> 
                                                : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">N/A</div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{p.title || 'Untitled'}</h4>
                                            <p className="text-xs text-slate-500 truncate">{p.storyConcept?.premise || p.theme || 'No description'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{p.storyFormat || 'Draft'}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{p.language}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleDeleteProject(p.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Project">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {projects.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No active projects found in database.</div>}
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminApp;
