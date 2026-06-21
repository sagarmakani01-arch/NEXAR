import { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, File, Folder, Plus, Search, 
  RefreshCw, FolderPlus, FilePlus, Trash2, Edit2, Copy,
  MoreVertical, Eye, Download
} from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { useUIStore } from '../../store/uiStore.js';

export default function FileTree() {
  const { 
    fileTree, 
    currentProject,
    openFile,
    createFile,
    deleteFile,
    renameFile,
    readFile
  } = useProject();
  
  const { addNotification } = useUIStore();
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));
  const [filter, setFilter] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const isExpanded = (path) => expandedFolders.has(path);

  const filterNodes = (nodes, prefix = '') => {
    if (!filter) return nodes;
    
    return nodes.filter(node => {
      const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
      const matches = node.name.toLowerCase().includes(filter.toLowerCase());
      if (node.type === 'directory') {
        const children = filterNodes(node.children || [], fullPath);
        return matches || children.length > 0;
      }
      return matches;
    }).map(node => {
      if (node.type === 'directory') {
        const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
        return {
          ...node,
          children: filterNodes(node.children || [], fullPath)
        };
      }
      return node;
    });
  };

  const filteredTree = filterNodes(fileTree);

  const handleContextMenu = (e, node, parentPath = '') => {
    e.preventDefault();
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    setContextMenu({ x: e.clientX, y: e.clientY, node, fullPath, parentPath });
  };

  const handleClickOutside = () => setContextMenu(null);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderNode = (node, parentPath = '', depth = 0) => {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isDir = node.type === 'directory';
    const hasChildren = isDir && (node.children?.length || 0) > 0;
    const expanded = isExpanded(fullPath);

    if (isDir) {
      return (
        <div key={fullPath}>
          <div
            className="file-tree-folder group"
            onClick={() => toggleFolder(fullPath)}
            onContextMenu={(e) => handleContextMenu(e, node, parentPath)}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span className="flex items-center gap-1.5">
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="truncate">{node.name}</span>
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); handleNewFile(fullPath); }} title="New File">
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); handleNewFolder(fullPath); }} title="New Folder">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {expanded && hasChildren && (
            <div className="ml-4">
              {node.children?.map(child => renderNode(child, fullPath, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={fullPath}
        className="file-tree-file group"
        onClick={() => openFile(fullPath)}
        onContextMenu={(e) => handleContextMenu(e, node, parentPath)}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-1.5">
          <File className="w-4 h-4 text-gray-400" />
          <span className="truncate">{node.name}</span>
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); handleRename(fullPath); }} title="Rename">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); handleDelete(fullPath); }} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); handleCopyPath(fullPath); }} title="Copy Path">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const handleNewFile = async (parentPath) => {
    const name = prompt('Enter file name:');
    if (!name) return;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      await createFile(currentProject.id, fullPath, '');
      openFile(fullPath);
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    }
  };

  const handleNewFolder = async (parentPath) => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      // Create a placeholder file to create the folder
      await createFile(currentProject.id, `${fullPath}/.gitkeep`, '');
      setExpandedFolders(prev => new Set(prev).add(fullPath));
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    }
  };

  const handleRename = async (fullPath) => {
    const name = prompt('Enter new name:', fullPath.split('/').pop());
    if (!name || name === fullPath.split('/').pop()) return;
    const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      await renameFile(currentProject.id, fullPath, newPath);
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    }
  };

  const handleDelete = async (fullPath) => {
    if (!confirm(`Delete ${fullPath}?`)) return;
    try {
      await deleteFile(currentProject.id, fullPath);
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    }
  };

  const handleCopyPath = (fullPath) => {
    navigator.clipboard.writeText(fullPath);
    addNotification({ type: 'success', title: 'Copied', message: fullPath });
  };

  return (
    <div className="flex flex-col h-full panel">
      {/* Toolbar */}
      <div className="panel-header">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">Explorer</h3>
        <div className="flex items-center gap-1">
          <button className="btn-ghost p-1.5" onClick={() => setShowHidden(!showHidden)} title="Toggle Hidden Files">
            <Eye className={`w-4 h-4 ${showHidden ? 'text-primary-600' : ''}`} />
          </button>
          <button className="btn-ghost p-1.5" onClick={() => {}} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1.5" onClick={handleNewFile} title="New File">
            <FilePlus className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1.5" onClick={handleNewFolder} title="New Folder">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-dark-border">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search files..."
          className="input text-sm"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentProject ? (
          filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
              <Folder className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-center">{filter ? 'No matching files' : 'No files in project'}</p>
              {filter && <button onClick={() => setFilter('')} className="text-sm text-primary-600 mt-2 hover:underline">Clear filter</button>}
              {!filter && (
                <button onClick={handleNewFile} className="btn-primary mt-3">
                  <FilePlus className="w-4 h-4 mr-2" />
                  Create First File
                </button>
              )}
            </div>
          ) : (
            filteredTree.map(node => renderNode(node))
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-center">No project open</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 min-w-[160px] animate-fade-in"
          style={{ left:
              contextMenu.x, top: contextMenu.y 
            }}
          >
            {contextMenu.node.type === 'directory' ? (
              <>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { handleNewFile(contextMenu.fullPath); setContextMenu(null); }}>
                  <FilePlus className="w-4 h-4" /> New File
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { handleNewFolder(contextMenu.fullPath); setContextMenu(null); }}>
                  <FolderPlus className="w-4 h-4" /> New Folder
                </button>
                <hr className="my-1 border-gray-200 dark:border-dark-border" />
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { handleRename(contextMenu.fullPath); setContextMenu(null); }}>
                  <Edit2 className="w-4 h-4" /> Rename
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 text-red-500" onClick={() => { handleDelete(contextMenu.fullPath); setContextMenu(null); }}>
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            ) : (
              <>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { openFile(contextMenu.fullPath); setContextMenu(null); }}>
                  <File className="w-4 h-4" /> Open
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { handleCopyPath(contextMenu.fullPath); setContextMenu(null); }}>
                  <Copy className="w-4 h-4" /> Copy Path
                </button>
                <hr className="my-1 border-gray-200 dark:border-dark-border" />
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2" onClick={() => { handleRename(contextMenu.fullPath); setContextMenu(null); }}>
                  <Edit2 className="w-4 h-4" /> Rename
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 text-red-500" onClick={() => { handleDelete(contextMenu.fullPath); setContextMenu(null); }}>
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
  );
}
