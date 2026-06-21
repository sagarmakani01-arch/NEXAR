import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, File, ArrowRight, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';

export default function SearchOverlay({ mode, onClose }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState(mode === 'text' ? 'text' : 'files');
  const inputRef = useRef(null);
  const currentProject = useProjectStore(s => s.currentProject);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !currentProject) return;
    setLoading(true);
    try {
      if (tab === 'files') {
        const res = await fetch(`/api/files/${currentProject.id}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setFiles(data.files || []);
        setSelectedIdx(0);
      } else {
        const res = await fetch(`/api/files/${currentProject.id}/search-text?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIdx(0);
      }
    } catch {}
    setLoading(false);
  }, [query, tab, currentProject]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 200);
    return () => clearTimeout(timer);
  }, [query, tab, doSearch]);

  function openFile(filePath, line) {
    const store = useProjectStore.getState();
    store.openFile(filePath);
    store.setActiveFile(filePath);
    onClose?.();
  }

  function handleKey(e) {
    const items = tab === 'files' ? files : results;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIdx];
      if (item) openFile(item.path || item.file, item.line);
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  }

  const items = tab === 'files' ? files : results;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-xl bg-white dark:bg-dark-secondary rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={tab === 'files' ? 'Search files by name...' : 'Search file contents...'}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-dark-text placeholder-gray-400"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <div className="flex gap-1 ml-2">
            <button onClick={() => setTab('files')} className={`px-2 py-1 text-xs rounded ${tab === 'files' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Files</button>
            <button onClick={() => setTab('text')} className={`px-2 py-1 text-xs rounded ${tab === 'text' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Text</button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && query.trim() && !loading && (
            <div className="p-6 text-center text-sm text-gray-400">No results</div>
          )}
          {items.map((item, i) => (
            <button
              key={tab === 'files' ? item.path : item.file + item.line}
              onClick={() => openFile(item.path || item.file, item.line)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${i === selectedIdx ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-dark-tertiary/50'}`}
            >
              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 dark:text-dark-text truncate block">{tab === 'files' ? item.path : item.file}</span>
                {tab === 'text' && <span className="text-xs text-gray-500 truncate block">{item.text}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {tab === 'text' && <span className="text-xs text-gray-400">Ln {item.line}</span>}
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-200 dark:border-dark-border text-xs text-gray-400 flex gap-4">
          <span>↑↓ Navigate</span>
          <span>↩ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
