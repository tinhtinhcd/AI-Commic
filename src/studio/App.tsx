
/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AgentWorkspace from './components/AgentWorkspace';
import FinalComicView from './components/FinalComicView';
import { LoginScreen } from './components/LoginScreen';
import { AgentRole, ComicProject, UserProfile } from './types';
import { INITIAL_PROJECT_STATE } from './constants';
import * as AuthService from './services/authService';
import { Menu, X, Maximize2, Minimize2 } from 'lucide-react';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [activeRole, setActiveRole] = useState<AgentRole>(AgentRole.PROJECT_MANAGER);
  const [project, setProject] = useState<ComicProject>(INITIAL_PROJECT_STATE);
  const [showPreview, setShowPreview] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
      const user = AuthService.getCurrentUser();
      if (user) setCurrentUser(user);
  }, []);

  const handleLogin = (user: UserProfile) => {
      setCurrentUser(user);
      setProject({ ...INITIAL_PROJECT_STATE, ownerId: user.id });
  };

  const handleLogout = () => {
      AuthService.logout();
      setCurrentUser(null);
      setProject(INITIAL_PROJECT_STATE);
  };

  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().then(() => setIsFullScreen(true));
      } else {
          if (document.exitFullscreen) {
              document.exitFullscreen().then(() => setIsFullScreen(false));
          }
      }
  };

  const [uiLanguage, setUiLanguage] = useState<'en' | 'vi'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ai_comic_lang') as 'en' | 'vi') || 'vi';
    }
    return 'vi';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ai_comic_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const updateProject = (updates: Partial<ComicProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    localStorage.setItem('ai_comic_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ai_comic_lang', uiLanguage);
  }, [uiLanguage]);

  const handleGoToReader = () => {
      window.location.href = '/reader/';
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} onEnterReader={handleGoToReader} />;
  }

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <button 
          onClick={toggleFullScreen}
          className="fixed bottom-4 left-4 z-50 p-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full shadow-lg hover:scale-110 transition-transform opacity-50 hover:opacity-100"
          title="Toggle Full Screen"
      >
          {isFullScreen ? <Minimize2 className="w-5 h-5"/> : <Maximize2 className="w-5 h-5"/>}
      </button>

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
                currentUser={currentUser}
                onLogout={handleLogout}
              />
           </div>
        </div>
      )}

      <div className="hidden lg:block h-full flex-shrink-0">
         <Sidebar 
            currentRole={activeRole} 
            onSelectRole={setActiveRole}
            projectTitle={project.title}
            uiLanguage={uiLanguage}
            setUiLanguage={setUiLanguage}
            theme={theme}
            setTheme={setTheme}
            currentUser={currentUser}
            onLogout={handleLogout}
         />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <div className={`lg:hidden p-4 border-b flex items-center justify-between shadow-sm z-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           <div className="flex items-center gap-3 overflow-hidden">
               <button onClick={() => setMobileMenuOpen(true)} className="shrink-0">
                 <Menu className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
               </button>
               <Logo className="w-6 h-6 shrink-0" />
               <span className="font-bold text-sm truncate">{project.title}</span>
           </div>
           <button onClick={() => setShowPreview(!showPreview)} className={`ml-2 shrink-0 text-xs px-3 py-1 rounded font-medium border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              {showPreview ? 'Hide' : 'View'}
           </button>
        </div>

        <div className={`flex-1 overflow-hidden relative ${showPreview ? 'lg:mr-96' : ''}`}>
           <AgentWorkspace 
             role={activeRole}
             project={project}
             updateProject={updateProject}
             onAgentChange={setActiveRole} 
             uiLanguage={uiLanguage}
             currentUser={currentUser}
             onUpdateUser={setCurrentUser}
           />
        </div>

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
