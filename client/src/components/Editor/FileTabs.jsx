import { useState } from 'react';
import { X, Circle, FileCode, FileText, Search } from 'lucide-react';
import { useProject } from '../../hooks/useProject';

export default function FileTabs() {
  const { 
    openFiles, 
    activeFile, 
    unsavedFiles,
    fileContents,
    setActiveFile,
    closeFile,
    currentProject
  } = useProject();
  
  const [showDropdown, setShowDropdown] = useState(false);

  const getFileIcon = (path) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const icons = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      json: 'json', html: 'html', css: 'css', scss: 'scss',
      md: 'markdown', py: 'python', rs: 'rust', go: 'go',
      vue: 'vue', svelte: 'svelte', dockerfile: 'docker'
    };
    return icons[ext] || 'file';
  };

  const getFileName = (path) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="flex items-center h-8 border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50 px-2 overflow-x-auto">
      {/* File Tabs */}
      <div className="flex gap-1 min-w-max">
        {openFiles.map((filePath, index) => {
          const isActive = activeFile === filePath;
          const isUnsaved = unsavedFiles.has(filePath);
          const content = fileContents.get(filePath) || '';
          const isLarge = content.length > 50000;
          
          return (
            <button
              key={filePath}
              onClick={() => setActiveFile(filePath)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Could show context menu
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 border-b-2 border-transparent'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-tertiary'
              }`}
              style={{ minWidth: '120px', maxWidth: '200px' }}
            >
              <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <span className="truncate">{getFileName(filePath)}</span>
              {isUnsaved && (
                <Circle className="w-2 h-2 text-yellow-500" />
              )}
              {isLarge && (
                <span className="text-xs text-gray-400 dark:text-gray-500">(large)</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(filePath);
                }}
                className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </button>
          );
        })}

        {/* New File Button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-tertiary transition-all"
          title="New File (Ctrl+N)"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="btn-ghost p-2"
          >
            <FileText className="w-4 h-4" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary">
                Close All Tabs
              </button>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary">
                Close Other Tabs
              </button>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary">
                Close Tabs to Right
              </button>
              <hr className="my-1 border-gray-200 dark:border-dark-border" />
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary">
                Save All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
