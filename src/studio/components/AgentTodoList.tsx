
import React, { useState } from 'react';
import { AgentRole, ComicProject, AgentTask, TaskPriority } from '../types';
import { AGENTS } from '../constants';
import { CheckSquare, Plus, Trash2, X, ListTodo, Check, Bot, Flag, Clock, ChevronDown } from 'lucide-react';

interface AgentTodoListProps {
    role: AgentRole;
    project: ComicProject;
    updateProject: (updates: Partial<ComicProject>) => void;
    t: (key: string) => string;
    onClose: () => void;
}

const AgentTodoList: React.FC<AgentTodoListProps> = ({ role, project, updateProject, t, onClose }) => {
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
    const [newDeadline, setNewDeadline] = useState('');
    
    const allTasks = project.agentTasks || [];
    const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    const roleTasks = allTasks
        .filter(task => task.role === role)
        .sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            const scoreA = priorityScore[a.priority || 'LOW'] || 0;
            const scoreB = priorityScore[b.priority || 'LOW'] || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return b.createdAt - a.createdAt;
        });

    const agent = AGENTS[role];

    const handleAddTask = () => {
        if (!newTask.trim()) return;
        const task: AgentTask = {
            id: crypto.randomUUID(),
            role: role,
            description: newTask.trim(),
            isCompleted: false,
            createdAt: Date.now(),
            type: 'USER',
            priority: newPriority,
            deadline: newDeadline ? new Date(newDeadline).getTime() : undefined
        };
        updateProject({ agentTasks: [...allTasks, task] });
        setNewTask('');
        setNewDeadline('');
        setNewPriority('MEDIUM');
    };

    const toggleTask = (taskId: string) => {
        const updatedTasks = allTasks.map(task => 
            task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
        );
        updateProject({ agentTasks: updatedTasks });
    };

    const deleteTask = (taskId: string) => {
        const updatedTasks = allTasks.filter(task => task.id !== taskId);
        updateProject({ agentTasks: updatedTasks });
    };

    const getPriorityColor = (p?: TaskPriority) => {
        switch(p) {
            case 'HIGH': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
            case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            default: return 'text-gray-500 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        }
    };

    const getPriorityIconColor = (p?: TaskPriority) => {
        switch(p) {
            case 'HIGH': return 'text-red-500';
            case 'MEDIUM': return 'text-amber-500';
            case 'LOW': return 'text-blue-500';
            default: return 'text-gray-400';
        }
    };

    return (
        <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" onClick={onClose} />
            
            <div className="fixed inset-x-0 bottom-0 top-auto md:top-24 md:right-6 md:left-auto md:bottom-auto md:w-96 bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-2xl border-t md:border border-gray-200 dark:border-gray-700 flex flex-col z-50 animate-in slide-in-from-bottom-full md:slide-in-from-right-8 duration-300 ring-1 ring-gray-900/5 dark:ring-black/20 max-h-[85vh] md:max-h-[600px]">
                {/* Header */}
                <div className={`p-4 rounded-t-2xl flex items-center justify-between ${agent.color.replace('bg-', 'bg-').replace('600', '50')} dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 shrink-0`}>
                    <div className="flex items-center gap-2">
                        <ListTodo className={`w-5 h-5 ${agent.color.replace('bg-', 'text-')}`} />
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{t('ui.tasks')}</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Auto-Tracker Active</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 font-bold">
                            {roleTasks.filter(t => t.isCompleted).length}/{roleTasks.length}
                        </span>
                        <button onClick={onClose} className="p-1 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 md:hidden"/>
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden md:block"/>
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1 bg-gray-50/50 dark:bg-gray-900/30 min-h-0">
                    {roleTasks.length === 0 && (
                        <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs italic flex flex-col items-center gap-2">
                            <CheckSquare className="w-8 h-8 opacity-20"/>
                            {t('ui.no_tasks')}
                        </div>
                    )}
                    
                    {roleTasks.map(task => {
                        const isOverdue = !task.isCompleted && task.deadline && Date.now() > task.deadline;
                        return (
                            <div 
                                key={task.id} 
                                className={`flex flex-col p-3 rounded-xl border transition-all duration-200 group ${task.isCompleted ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <button 
                                        onClick={() => toggleTask(task.id)}
                                        className={`mt-0.5 w-5 h-5 md:w-4 md:h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-500 hover:border-emerald-400 bg-white dark:bg-gray-700'}`}
                                    >
                                        {task.isCompleted && <Check className="w-3 h-3" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {task.priority && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.deadline && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${isOverdue ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                                                    <Clock className="w-2 h-2"/> {new Date(task.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                </span>
                                            )}
                                            {task.type === 'SYSTEM' && (
                                                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Bot className="w-3 h-3"/> System
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-sm md:text-xs font-medium block leading-relaxed break-words ${task.isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {task.description}
                                        </span>
                                    </div>
                                    {task.type === 'USER' && (
                                        <button 
                                            onClick={() => deleteTask(task.id)}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-2 md:p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-none md:rounded-b-2xl space-y-2 shrink-0 pb-safe">
                    <input 
                        value={newTask}
                        onChange={(e) => setNewTask((e.target as any).value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder={t('ui.add_task') + "..."}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 md:py-2 text-sm md:text-xs outline-none focus:border-indigo-300 dark:focus:border-indigo-500 transition-colors focus:bg-white dark:focus:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                    />
                    
                    <div className="flex gap-2">
                        {/* Priority Selector */}
                        <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                            {(['LOW', 'MEDIUM', 'HIGH'] as TaskPriority[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setNewPriority(p)}
                                    className={`p-2 md:p-1.5 rounded-md transition-all ${newPriority === p ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                                    title={p}
                                >
                                    <Flag className={`w-4 h-4 md:w-3 md:h-3 ${getPriorityIconColor(p)} ${newPriority === p ? 'fill-current' : ''}`}/>
                                </button>
                            ))}
                        </div>

                        {/* Deadline Input */}
                        <div className="flex-1 relative">
                            <input 
                                type="date"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                className="w-full h-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-indigo-300 min-w-0"
                            />
                        </div>

                        <button 
                            onClick={handleAddTask}
                            disabled={!newTask.trim()}
                            className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AgentTodoList;
