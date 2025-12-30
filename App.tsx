
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AgentWorkspace from './components/AgentWorkspace';
import FinalComicView from './components/FinalComicView';
import { AgentRole, ComicProject } from './types';
import { INITIAL_PROJECT_STATE } from './constants';
import { Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<AgentRole>(AgentRole.PROJECT_MANAGER);
  const [project, setProject] = useState<ComicProject>(INITIAL_PROJECT_STATE);
  const [showPreview, setShowPreview] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<'en' | 'vi'>('vi');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const updateProject = (updates: Partial<ComicProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
           <div className={`absolute left-0 top-0 bottom-0 w-64 shadow-2xl transition-colors ${theme === 'dark' ? 'bg-gray-800 border-r border-gray-700' : 'bg-white'}`}>
              <Sidebar 
                currentRole={activeRole} 
                onSelectRole={(role) => { setActiveRole(role); setMobileMenuOpen(false); }}
                projectTitle={project.title}
                uiLanguage={uiLanguage}
                setUiLanguage={setUiLanguage}
                theme={theme}
                setTheme={setTheme}
              />
           </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0">
         <Sidebar 
            currentRole={activeRole} 
            onSelectRole={setActiveRole}
            projectTitle={project.title}
            uiLanguage={uiLanguage}
            setUiLanguage={setUiLanguage}
            theme={theme}
            setTheme={setTheme}
         />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        {/* Mobile Header */}
        <div className={`lg:hidden p-4 border-b flex items-center justify-between shadow-sm z-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           <button onClick={() => setMobileMenuOpen(true)}>
             <Menu className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
           </button>
           <span className="font-bold text-sm truncate max-w-[150px]">{project.title}</span>
           <button onClick={() => setShowPreview(!showPreview)} className={`text-xs px-3 py-1 rounded font-medium border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              {showPreview ? 'Hide' : 'View'} Comic
           </button>
        </div>

        <div className={`flex-1 overflow-hidden relative ${showPreview ? 'lg:mr-96' : ''}`}>
           <AgentWorkspace 
             role={activeRole}
             project={project}
             updateProject={updateProject}
             onAgentChange={setActiveRole} 
             uiLanguage={uiLanguage}
           />
        </div>

        {/* Preview Sidebar (Desktop Only toggle) */}
        {showPreview && (
          <div className="hidden lg:block">
            <FinalComicView project={project} />
          </div>
        )}

        <button 
          onClick={() => setShowPreview(!showPreview)}
          className={`hidden lg:flex fixed top-4 z-30 p-2 rounded-l-lg shadow-md items-center gap-2 transition-all duration-300 border ${showPreview ? 'right-96' : 'right-0'} ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600'}`}
        >
           {showPreview ? <X className="w-4 h-4"/> : <Menu className="w-4 h-4"/>}
        </button>
      </div>
    </div>
  );
};

export default App;
