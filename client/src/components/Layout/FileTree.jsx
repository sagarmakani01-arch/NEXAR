import { useState, useRef, useEffect } from 'react';
import { 
  FileText, Folder, FolderOpen, ChevronRight, ChevronDown, 
  MoreVertical, Eye, Edit, Trash2, Copy, FilePlus, FolderPlus
} from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';

const FILE_ICONS = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', html: 'html', css: 'css', scss: 'scss', sass: 'scss',
  md: 'markdown', txt: 'text', py: 'python', rs: 'rust', go: 'go',
  java: 'java', cpp: 'cpp', c: 'c', h: 'c', php: 'php', rb: 'ruby',
  swift: 'swift', kt: 'kotlin', dart: 'dart', vue: 'vue', svelte: 'svelte',
  yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', cfg: 'ini',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  dockerfile: 'docker', gitignore: 'git', git: 'git',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image',
  webp: 'image', ico: 'image', pdf: 'pdf', zip: 'archive', tar: 'archive',
  gz: 'archive', rar: 'archive', mp4: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', woff: 'font', woff2: 'font', ttf: 'font'
};

function FileTreeItem({ item, depth = 0, openFiles, activeFile, onContextMenu, project, onOpen, onCreateFile, onCreateFolder }) {
  const [expanded, setExpanded] = useState(item.type === 'directory' ? false : undefined);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const inputRef = useRef(null);
  const isActive = activeFile === item.path;
  const isOpen = openFiles.includes(item.path);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (item.type === 'directory') {
      setExpanded(!expanded);
    } else {
      onOpen?.(item.path);
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (item.type === 'directory') {
      setExpanded(!expanded);
    } else {
      onOpen?.(item.path);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === item.name) {
      setRenaming(false);
      return;
    }
    try {
      const newPath = item.path.replace(item.name, newName);
      // This would call the rename API
      setRenaming(false);
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') { setRenaming(false); setNewName(item.name); }
  };

  const getIcon = () => {
    if (item.type === 'directory') {
      return expanded ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />;
    }
    const ext = item.extension?.toLowerCase() || '';
    const iconName = FILE_ICONS[ext] || 'file';
    return getFileIcon(iconName, { className: 'w-4 h-4' });
  };

  if (item.type === 'directory') {
    return (
      <div>
        <div
          className={`file-tree-folder flex items-center gap-1 ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => onContextMenu?.(e, item, 'folder')}
        >
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {getIcon()}
          {renaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="input py-0.5 px-1 text-xs flex-1 min-w-0"
              autoFocus
            />
          ) : (
            <span className="truncate flex-1 text-sm font-medium">{item.name}</span>
          )}
        </div>
        {expanded && item.children && (
          <div className="overflow-hidden">
            {item.children.map(child => (
              <FileTreeItem
                key={child.path}
                item={child}
                depth={depth + 1}
                openFiles={openFiles}
                activeFile={activeFile}
                onContextMenu={onContextMenu}
                project={project}
                onOpen={onOpen}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`file-tree-file flex items-center gap-1 ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu?.(e, item, 'file')}
      title={item.path}
    >
      {getIcon()}
      {renaming ? (
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="input py-0.5 px-1 text-xs flex-1 min-w-0"
          autoFocus
        />
      ) : (
        <span className="truncate flex-1 text-sm">{item.name}</span>
      )}
      {isOpen && <span className="text-xs text-gray-400 ml-auto">●</span>}
    </div>
  );
}

export default function FileTree({ tree, openFiles, activeFile, onContextMenu, project }) {
  const { openFile, createFile, deleteFile, renameFile } = useProject();

  const handleOpen = (path) => openFile(path);

  const handleCreateFile = async (parentPath, name) => {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    await createFile(project.id, fullPath);
  };

  const handleCreateFolder = async (parentPath, name) => {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    await createFile(project.id, `${fullPath}/.gitkeep`);
  };

  if (!tree || tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
        <Folder className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">No files yet</p>
        <p className="text-xs mt-1">Create a file to get started</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      {tree.map(item => (
        <FileTreeItem
          key={item.path}
          item={item}
          openFiles={openFiles}
          activeFile={activeFile}
          onContextMenu={onContextMenu}
          project={project}
          onOpen={handleOpen}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
        />
      ))}
    </div>
  );
}

import { useProject } from '../../hooks/useProject';
