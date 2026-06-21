import { useState, useRef, useEffect } from 'react';
import { 
  Menu, X, Github, Sun, Moon, Monitor, Smartphone, Tablet, 
  Play, Save, FolderPlus, Terminal, Layout, Bot,
  Bell, User, LogOut, Settings, ChevronDown, Wifi, WifiOff,
  ChevronRight, Trash2, Globe, Rocket
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useProject } from '../../hooks/useProject';
import { useProjectStore } from '../../store/projectStore';
import { publishAPI } from '../../services/api';

export default function TopBar({ project, isConnected }) {
  // ===== STORE HOOKS =====
  const { 
    showLeftPanel, showRightPanel, showBottomPanel,
    setActiveLeftPanel, setActiveRightPanel, setActiveBottomPanel,
    activeLeftPanel, activeRightPanel, activeBottomPanel,
    previewMode, setPreviewMode,
    editorTheme, setEditorTheme,
    fontSize, setFontSize,
    openModal,
    addNotification
  } = useUIStore();

  const { user, logout } = useAuthStore();
  const { createProject, currentProject, selectProject, projects } = useProject();
  const { fetchProjects } = useProjectStore();
  const [publishing, setPublishing] = useState(false);
  
  const handlePublish = async () => {
    if (!currentProject || publishing) return;
    setPublishing(true);
    try {
      const { data } = await publishAPI.publish(currentProject.id);
      const url = data.url;
      await navigator.clipboard.writeText(url);
      addNotification({ type: 'success', title: 'Published!', message: `URL copied to clipboard: ${url}` });
    } catch (error) {
      addNotification({ type: 'error', title: 'Publish Failed', message: error.response?.data?.error || error.message });
    } finally {
      setPublishing(false);
    }
  };
  
  // ===== LOCAL STATE =====
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const userMenuRef = useRef(null);
  const projectMenuRef = useRef(null);

  // ===== CLOSE DROPDOWNS ON OUTSIDE CLICK =====
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setShowProjectMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== HANDLERS =====
  const handleNewProject = () => {
    openModal('newProject');
  };

  const handleSaveAll = async () => {
    const { unsavedFiles, writeFile, currentProject, getFileContent } = useProjectStore.getState();
    if (!currentProject) return;
    
    for (const filePath of unsavedFiles) {
      await writeFile(currentProject.id, filePath, getFileContent(filePath));
    }
  };

  const handleSwitchProject = (projectId) => {
    selectProject(projectId);
    setShowProjectMenu(false);
  };

  // ===== RENDER =====
  return (
    <header className="h-12 bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 z-20">
      
      {/* ===== LEFT SECTION ===== */}
      <div className="flex items-center gap-2">
        {/* Sidebar Toggle */}
        <button
          onClick={() => useUIStore.getState().toggleLeftPanel()}
          className="btn-ghost p-2 rounded-lg"
          aria-label={showLeftPanel ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />

        {/* Project Switcher Dropdown */}
        <div className="relative" ref={projectMenuRef}>
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="btn-ghost px-3 py-1.5 gap-1.5 min-w-[200px] justify-between"
          >
            <span className="truncate font-medium text-sm">
              {project?.name || (projects.length > 0 ? 'Select Project' : 'No Project')}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-slide-up">
              <button
                onClick={handleNewProject}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                New Project
              </button>
              <hr className="my-1 border-gray-200 dark:border-dark-border" />
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchProject(p.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 ${currentProject?.id === p.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''}`}
                >
                  {currentProject?.id === p.id && <span className="w-4 h-4 text-primary-500">●</span>}
                  <span className="truncate flex-1">{p.name}</span>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No projects yet</div>
              )}
              {currentProject && (
                <>
                  <hr className="my-1 border-gray-200 dark:border-dark-border" />
                  <button
                    onClick={() => { setShowProjectMenu(false); useUIStore.getState().setActiveRightPanel('preview'); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    Preview Project
                  </button>
                  <button
                    onClick={() => { setShowProjectMenu(false); window.open(`/api/preview/${currentProject.id}/`, '_blank'); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 text-primary-600"
                  >
                    <Globe className="w-4 h-4" />
                    Open Preview in New Tab
                  </button>
                  <button
                    onClick={() => { setShowProjectMenu(false); handlePublish(); }}
                    disabled={publishing}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
                  >
                    <Rocket className="w-4 h-4 text-purple-500" />
                    {publishing ? 'Publishing...' : 'Publish & Copy URL'}
                  </button>
                  <button
                    onClick={() => { setShowProjectMenu(false); useUIStore.getState().openModal('deleteProject', { project: currentProject }); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== CENTER SECTION - Preview Controls ===== */}
      <div className="flex items-center gap-2 flex-1 justify-center max-w-md">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-tertiary rounded-lg p-1">
          {['desktop', 'tablet', 'mobile'].map(mode => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`p-1.5 rounded transition-all ${previewMode === mode ? 'bg-white dark:bg-dark-bg shadow-sm' : ''}`}
              title={mode}
            >
              {mode === 'desktop' && <Monitor className="w-4 h-4" />}
              {mode === 'tablet' && <Tablet className="w-4 h-4" />}
              {mode === 'mobile' && <Smartphone className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* ===== RIGHT SECTION ===== */}
      <div className="flex items-center gap-1">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-dark-tertiary">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Panel Toggles */}
        <button
          onClick={() => useUIStore.getState().toggleLeftPanel()}
          className={`btn-ghost p-2 ${showLeftPanel ? 'text-primary-600' : ''}`}
          title="Toggle Explorer"
        >
          <Layout className="w-4 h-4" />
        </button>
        <button
          onClick={() => useUIStore.getState().toggleRightPanel()}
          className={`btn-ghost p-2 ${showRightPanel ? 'text-primary-600' : ''}`}
          title="Toggle AI/Preview"
        >
          <Bot className="w-4 h-4" />
        </button>
        <button
          onClick={() => useUIStore.getState().toggleBottomPanel()}
          className={`btn-ghost p-2 ${showBottomPanel ? 'text-primary-600' : ''}`}
          title="Toggle Terminal"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />

        {/* Action Buttons */}
        <button onClick={handleSaveAll} className="btn-ghost p-2" title="Save All (⌘S)">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={handleNewProject} className="btn-ghost p-2" title="New Project">
          <FolderPlus className="w-4 h-4" />
        </button>

        {/* Preview Button */}
        <button
          onClick={() => useUIStore.getState().setActiveRightPanel('preview')}
          className="btn-primary gap-1.5"
        >
          <Wifi className="w-4 h-4" />
          Preview
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-tertiary"
          >
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.name || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-slide-up">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-border">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
                onClick={() => { setShowUserMenu(false); useUIStore.getState().openModal('published'); }}>
                <Globe className="w-4 h-4" />
                Published
              </button>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
                onClick={() => { setShowUserMenu(false); useUIStore.getState().setActiveRightPanel('settings'); }}>
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <hr className="my-1 border-gray-200 dark:border-dark-border" />
              <button 
                onClick={logout}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 text-red-500"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
