import { useState, useRef } from 'react';
import { 
  Folder, FileText, Search, GitBranch, Puzzle, 
  ChevronDown, ChevronUp, Menu, X, MoreHorizontal, FolderPlus, 
  FilePlus, ChevronRight, RefreshCw, Plus, Trash2,
  Edit2, Copy, Eye, Maximize2, Minimize2, 
  AlertTriangle, CheckCircle, Bug, Terminal, Code2,
  User, Clock
} from 'lucide-react';
import FileTree from '../FileTree/FileTree';
import { useUIStore } from '../../store/uiStore';
import { useProject } from '../../hooks/useProject';

const TABS = [
  { id: 'files', label: 'Explorer', icon: Folder, shortcut: '⌘⇧E' },
  { id: 'search', label: 'Search', icon: Search, shortcut: '⌘⇧F' },
  { id: 'git', label: 'Git', icon: GitBranch, shortcut: '⌘⇧G' },
  { id: 'extensions', label: 'Extensions', icon: Puzzle, shortcut: '⌘⇧X' }
];

export default function LeftSidebar() {
  const { 
    activeLeftPanel, 
    setActiveLeftPanel, 
    showLeftPanel,
    sidebarOpen 
  } = useUIStore();
  
  const { projects, currentProject, selectProject, fetchProjects } = useProject();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);

  if (!showLeftPanel) return null;

  const handleSwitchProject = (projectId) => {
    selectProject(projectId);
    setShowProjectSwitcher(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary border-r border-gray-200 dark:border-dark-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50">
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon, shortcut }) => (
            <button
              key={id}
              onClick={() => setActiveLeftPanel(id)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeLeftPanel === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg'
              }`}
              title={`${label} (${shortcut})`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Project Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
              className="btn-ghost px-3 py-1.5 gap-1.5 min-w-[180px] justify-between"
            >
              <span className="truncate font-medium text-sm">
                {currentProject?.name || (projects.length > 0 ? 'Select Project' : 'No Project')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showProjectSwitcher && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-slide-up">
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
                <hr className="my-1 border-gray-200 dark:border-dark-border" />
                <button
                  onClick={() => { useUIStore.getState().openModal('newProject'); setShowProjectSwitcher(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />

          <button
            onClick={() => useUIStore.getState().toggleLeftPanel()}
            className="btn-ghost p-2"
            title="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeLeftPanel === 'files' && <FileTree />}
        {activeLeftPanel === 'search' && <SearchPanel />}
        {activeLeftPanel === 'git' && <GitPanel />}
        {activeLeftPanel === 'extensions' && <ExtensionsPanel />}
      </div>
    </div>
  );
}

// ============================================
// INLINE PANEL COMPONENTS (Complete)
// ============================================

function SearchPanel() {
  const [query, setQuery] = useState('');
  return (
    <div className="flex flex-col h-full p-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search in files..."
        className="input mb-3"
      />
      <div className="flex-1 overflow-y-auto text-center text-gray-500 dark:text-gray-400 py-8">
        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Search results will appear here</p>
        <p className="text-sm mt-1">Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-bg rounded">⌘⇧F</kbd> to focus</p>
      </div>
    </div>
  );
}

function GitPanel() {
  const { addNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Mock data
  const stagedFiles = [
    { name: 'src/App.jsx', status: 'modified' },
    { name: 'src/components/Layout/LeftSidebar.jsx', status: 'added' },
  ];
  const unstagedFiles = [
    { name: 'src/hooks/useProject.js', status: 'modified' },
    { name: 'README.md', status: 'deleted' },
  ];
  const history = [
    { hash: 'a1b2c3d', message: 'Add AI chat panel', author: 'You', time: '2 hours ago' },
    { hash: 'e4f5g6h', message: 'Fix terminal rendering', author: 'You', time: '5 hours ago' },
    { hash: 'i7j8k9l', message: 'Initial commit', author: 'You', time: '1 day ago' },
  ];
  const branches = [
    { name: 'main', current: true },
    { name: 'feature/ai-assistant', current: false },
    { name: 'fix/terminal-bug', current: false },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'added': return <span className="text-green-500">●</span>;
      case 'modified': return <span className="text-yellow-500">●</span>;
      case 'deleted': return <span className="text-red-500">●</span>;
      default: return <span className="text-gray-500">●</span>;
    }
  };

  const renderFileItem = (file, staged) => (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-tertiary text-sm font-mono">
      <input
        type="checkbox"
        checked={staged}
        className="w-4 h-4 accent-primary-600 cursor-pointer"
        onChange={() => addNotification({ type: 'info', title: 'Git', message: `Would ${staged ? 'unstage' : 'stage'} ${file.name}` })}
      />
      {getStatusIcon(file.status)}
      <span className="truncate">{file.name}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50">
        {[
          { id: 'changes', label: 'Changes', icon: GitBranch },
          { id: 'history', label: 'History', icon: GitBranch },
          { id: 'branches', label: 'Branches', icon: GitBranch },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'changes' && (
          <div className="space-y-4">
            {stagedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <span>Staged Changes ({stagedFiles.length})</span>
                  <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Would unstage all' })}>
                    Unstage All
                  </button>
                </div>
                <div className="space-y-1">
                  {stagedFiles.map((file, i) => renderFileItem(file, true))}
                </div>
              </div>
            )}

            {unstagedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <span>Unstaged Changes ({unstagedFiles.length})</span>
                  <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Would stage all' })}>
                    Stage All
                  </button>
                </div>
                <div className="space-y-1">
                  {unstagedFiles.map((file, i) => renderFileItem(file, false))}
                </div>
              </div>
            )}

            {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <GitBranch className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-center">No changes</p>
                <p className="text-sm mt-1">Working tree clean</p>
              </div>
            )}

            {stagedFiles.length > 0 && (
              <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Commit</h4>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  className="input text-sm mb-2"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {commitMessage.length} chars
                  </span>
                  <button
                    onClick={() => {
                      if (commitMessage.trim()) {
                        addNotification({ type: 'success', title: 'Committed', message: commitMessage });
                        setCommitMessage('');
                      }
                    }}
                    disabled={!commitMessage.trim()}
                    className="btn-primary text-sm gap-1"
                  >
                    <GitBranch className="w-4 h-4" />
                    Commit
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button className="btn-secondary flex-1 text-sm gap-1"
                onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Pulling changes...' })}>
                <ChevronDown className="w-4 h-4" />
                Pull
              </button>
              <button className="btn-primary flex-1 text-sm gap-1"
                onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Pushing changes...' })}>
                <ChevronUp className="w-4 h-4" />
                Push
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {history.map((commit, i) => (
              <div 
                key={commit.hash} 
                className="p-3 bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-gray-200 dark:border-dark-border"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                    {i < history.length - 1 && <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{commit.hash}</code>
                      <span className="font-medium text-gray-900 dark:text-white">{commit.message}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {commit.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {commit.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">Branches</h4>
              <button 
                onClick={() => setShowNewBranch(true)}
                className="btn-secondary text-sm gap-1"
              >
                <Plus className="w-4 h-4" /> New Branch
              </button>
            </div>

            {showNewBranch && (
              <div className="bg-gray-50 dark:bg-dark-tertiary rounded-lg p-3 border border-gray-200 dark:border-dark-border animate-slide-up">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Branch name (e.g., feature/new-ui)"
                    className="input text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowNewBranch(false); setNewBranchName(''); }} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={() => { if (newBranchName.trim()) { addNotification({ type: 'success', title: 'Branch Created', message: newBranchName }); setShowNewBranch(false); setNewBranchName(''); }} } disabled={!newBranchName.trim()} className="btn-primary text-sm">Create</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {branches.map((branch, i) => (
                <div 
                  key={branch.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    branch.current
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                      : 'bg-gray-50 dark:bg-dark-tertiary border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {branch.current && <span className="text-primary-500">●</span>}
                      <span className={`font-medium ${branch.current ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                        {branch.name}
                      </span>
                      {branch.current && (
                        <span className="badge badge-info text-xs">Current</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtensionsPanel() {
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-gray-900 dark:text-white">Extensions</span>
        <button className="btn-ghost p-1.5 text-xs">Install</button>
      </div>
      <div className="flex-1 overflow-y-auto text-center text-gray-500 dark:text-gray-400 py-8">
        <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No extensions installed</p>
        <p className="text-sm mt-1">Extensions marketplace coming soon</p>
      </div>
    </div>
  );
}
