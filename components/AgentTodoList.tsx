import React, { useState } from 'react';
import { AgentRole, ComicProject, AgentTask } from '../types';
import { AGENTS } from '../constants';
import { CheckSquare, Plus, Trash2, X, ListTodo, Check, Bot } from 'lucide-react';

interface AgentTodoListProps {
    role: AgentRole;
    project: ComicProject;
    updateProject: (updates: Partial<ComicProject>) => void;
    t: (key: string) => string;
    onClose: () => void;
}

const AgentTodoList: React.FC<AgentTodoListProps> = ({ role, project, updateProject, t, onClose }) => {
    const [newTask, setNewTask] = useState('');
    
    const allTasks = project.agentTasks || [];
    // Sort: Pending first, then Completed. Inside Pending: System first, then User.
    const roleTasks = allTasks
        .filter(task => task.role === role)
        .sort((a, b) => {
            if (a.isCompleted === b.isCompleted) {
                return 0; 
            }
            return a.isCompleted ? 1 : -1;
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
            type: 'USER'
        };
        updateProject({ agentTasks: [...allTasks, task] });
        setNewTask('');
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

    return (
        <div className="absolute right-6 top-20 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 animate-in fade-in slide-in-from-right-4 ring-1 ring-gray-900/5 dark:ring-black/20">
            {/* Header */}
            <div className={`p-4 rounded-t-2xl flex items-center justify-between ${agent.color.replace('bg-', 'bg-').replace('600', '50')} dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700`}>
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
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar space-y-1 bg-gray-50/50 dark:bg-gray-900/30">
                {roleTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs italic flex flex-col items-center gap-2">
                        <CheckSquare className="w-8 h-8 opacity-20"/>
                        {t('ui.no_tasks')}
                    </div>
                )}
                
                {roleTasks.map(task => (
                    <div 
                        key={task.id} 
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 group ${task.isCompleted ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-70' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500'}`}
                    >
                        <button 
                            onClick={() => toggleTask(task.id)}
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-500 hover:border-emerald-400 bg-white dark:bg-gray-700'}`}
                        >
                            {task.isCompleted && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1">
                            <span className={`text-xs font-medium block leading-relaxed ${task.isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                {task.description}
                            </span>
                            {task.type === 'SYSTEM' && (
                                <div className="flex items-center gap-1 mt-1 text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                                    <Bot className="w-3 h-3"/> AI System Task
                                </div>
                            )}
                        </div>
                        {task.type === 'USER' && (
                            <button 
                                onClick={() => deleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
                <div className="flex gap-2">
                    <input 
                        value={newTask}
                        onChange={(e) => setNewTask((e.target as any).value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder={t('ui.add_task') + "..."}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-300 dark:focus:border-indigo-500 transition-colors focus:bg-white dark:focus:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                    />
                    <button 
                        onClick={handleAddTask}
                        disabled={!newTask.trim()}
                        className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentTodoList;