import { useState } from 'react';
import { 
  GitBranch, GitCommit, RefreshCw, Plus, 
  ChevronRight, Check, X, MessageSquare, 
  Clock, User, ArrowUp, ArrowDown
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export default function GitPanel() {
  const { addNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Mock data - replace with real git integration later
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
          { id: 'changes', label: 'Changes', icon: GitCommit },
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
        {/* CHANGES TAB */}
        {activeTab === 'changes' && (
          <div className="space-y-4">
            {/* Staged */}
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

            {/* Unstaged */}
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

            {/* Empty State */}
            {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <GitCommit className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-center">No changes</p>
                <p className="text-sm mt-1">Working tree clean</p>
              </div>
            )}

            {/* Commit Section */}
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
                    <GitCommit className="w-4 h-4" />
                    Commit
                  </button>
                </div>
              </div>
            )}

            {/* Push/Pull */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button className="btn-secondary flex-1 text-sm gap-1"
                onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Pulling changes...' })}>
                <ArrowDown className="w-4 h-4" />
                Pull
              </button>
              <button className="btn-primary flex-1 text-sm gap-1"
                onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Pushing changes...' })}>
                <ArrowUp className="w-4 h-4" />
                Push
              </button>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
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

        {/* BRANCHES TAB */}
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

        {/* Refresh Button - Fixed Position */}
        <div className="pt-4">
          <button className="btn-ghost w-full text-sm gap-1 justify-center"
            onClick={() => addNotification({ type: 'info', title: 'Git', message: 'Refreshing...' })}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
