import { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useProject } from '../../hooks/useProject';
import { useUIStore } from '../../store/uiStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { X, Maximize2, Minimize2 } from 'lucide-react';

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', html: 'html', css: 'css', scss: 'scss', sass: 'scss',
  less: 'less', md: 'markdown', txt: 'plaintext', py: 'python',
  rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c', h: 'cpp',
  php: 'php', rb: 'ruby', swift: 'swift', kt: 'kotlin', dart: 'dart',
  vue: 'vue', svelte: 'svelte', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', ini: 'ini', cfg: 'ini', sh: 'shell', bash: 'shell',
  dockerfile: 'dockerfile', gitignore: 'gitignore'
};

function getLanguage(filePath) {
  const ext = filePath?.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] || 'plaintext';
}

// Patch Monaco's internal RenderService to add null guard on _viewLayout
function patchMonacoRenderer() {
  try {
    if (monaco.require) {
      monaco.require(['vs/editor/browser/viewParts/renderService/renderService'], function(rsModule) {
        if (rsModule && rsModule.RenderService) {
          const proto = rsModule.RenderService.prototype;
          if (proto) {
            const dimDesc = Object.getOwnPropertyDescriptor(proto, 'dimensions');
            if (dimDesc && dimDesc.get) {
              const origGet = dimDesc.get;
              Object.defineProperty(proto, 'dimensions', {
                get() {
                  if (!this._viewLayout) return { width: 800, height: 600 };
                  return origGet.call(this);
                },
                configurable: true,
                enumerable: true,
              });
            }
          }
        }
      });
    }
  } catch (_) {}
}

// Fallback: patch known Monaco internal classes if they exist on the prototype chain
// This runs after any editor is created, patching for subsequent creations
function patchPrototypeChain(obj) {
  if (!obj || typeof obj !== 'object') return;
  try {
    let proto = Object.getPrototypeOf(obj);
    while (proto && proto !== Object.prototype) {
      const dimDesc = Object.getOwnPropertyDescriptor(proto, 'dimensions');
      if (dimDesc && dimDesc.get) {
        const origGet = dimDesc.get;
        if (!origGet._patched) {
          Object.defineProperty(proto, 'dimensions', {
            get() {
              if (!this._viewLayout) return { width: 800, height: 600 };
              return origGet.call(this);
            },
            configurable: true,
            enumerable: true,
          });
          origGet._patched = true;
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch (_) {}
}

// Also suppress uncaught Monaco async errors
function installGlobalMonacoSuppressor() {
  const handler = function(e) {
    const msg = e && e.message;
    const stack = e && e.error && e.error.stack;
    if (
      (msg && msg.indexOf('dimensions') !== -1) ||
      (stack && stack.indexOf('RenderService') !== -1 && stack.indexOf('dimensions') !== -1)
    ) {
      e.preventDefault && e.preventDefault();
      e.stopPropagation && e.stopPropagation();
      return false;
    }
  };
  window.addEventListener('error', handler, true);
  return () => window.removeEventListener('error', handler, true);
}

// Patch Monaco once at module level
let patched = false;
function ensurePatched() {
  if (!patched) {
    patched = true;
    patchMonacoRenderer();
  }
}

const EDITOR_OPTIONS = {
  value: '',
  language: 'plaintext',
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  lineHeight: 1.6,
  wordWrap: 'off',
  minimap: { enabled: true },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: 'selection',
  renderControlCharacters: true,
  folding: true,
  matchBrackets: 'always',
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  formatOnPaste: true,
  formatOnType: true,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
  hover: { enabled: true },
  lightbulb: { enabled: true },
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  scrollbar: { vertical: 'auto', horizontal: 'auto' },
  overviewRulerLanes: 3,
  overviewRulerBorder: false,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  multiCursorModifier: 'ctrlCmd',
  dragAndDrop: true,
  links: true,
  colorDecorators: true,
  selectionHighlight: true,
  occurrencesHighlight: 'singleFile',
  contextmenu: true,
};

export default function CenterEditor() {
  const { 
    currentProject, openFiles, activeFile, fileContents,
    unsavedFiles, setActiveFile, closeFile,
    markUnsaved, markSaved, writeFile
  } = useProject();

  const { editorTheme, fontSize, wordWrap, minimap, lineNumbers } = useUIStore();
  const { writeFile: wsWriteFile } = useWebSocket();

  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const roRef = useRef(null);
  const saveTimeouts = useRef(new Map());
  const [editorReady, setEditorReady] = useState(false);
  const [editorCreated, setEditorCreated] = useState(false);
  const [tabWidth] = useState(200);

  // Install global Monaco error suppressor (once per component instance)
  useEffect(() => installGlobalMonacoSuppressor(), []);

  // Wait for container to have non-zero dimensions before creating editor
  useEffect(() => {
    ensurePatched();
    const el = containerRef.current;
    if (!el || editorCreated) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setEditorReady(true);
      return;
    }
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentBoxSize?.[0]?.inlineSize || entry.contentRect?.width || 0;
      const h = entry.contentBoxSize?.[0]?.blockSize || entry.contentRect?.height || 0;
      if (w > 0 && h > 0) {
        ro.disconnect();
        setEditorReady(true);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [editorCreated]);

  // Create editor once container has dimensions
  useEffect(() => {
    if (!editorReady || editorCreated) return;
    const container = containerRef.current;
    if (!container) return;

    setEditorCreated(true);
    let disposed = false;

    let editor;
    try {
      editor = monaco.editor.create(container, EDITOR_OPTIONS);
      // Patch the prototype chain of the editor to prevent RenderService crash
      patchPrototypeChain(editor);
    } catch (_) {
      // Retry after a short delay
      const tid = setTimeout(() => {
        if (!disposed) {
          setEditorReady(false);
          setEditorCreated(false);
        }
      }, 500);
      return () => { clearTimeout(tid); disposed = true; };
    }

    editorRef.current = editor;

    // ResizeObserver for layout (no rAF needed)
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      try { editor.layout(); } catch (_) {}
    });
    ro.observe(container);
    roRef.current = ro;

    // Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const content = editor.getValue();
      const file = activeFile;
      const project = currentProject;
      if (!file || !project) return;
      writeFile(project.id, file, content);
      wsWriteFile(project.id, file, content);
    });

    // Save on blur
    editor.onDidBlurEditorWidget(() => {
      const content = editor.getValue();
      const file = activeFile;
      const project = currentProject;
      if (!file || !project) return;
      writeFile(project.id, file, content);
      wsWriteFile(project.id, file, content);
      markSaved(file);
    });

    // Debounced auto-save on content change
    editor.onDidChangeModelContent(() => {
      const file = activeFile;
      if (!file) return;
      markUnsaved(file);
      if (saveTimeouts.current.has(file)) {
        clearTimeout(saveTimeouts.current.get(file));
      }
      const timeout = setTimeout(() => {
        const content = editor.getValue();
        const proj = currentProject;
        if (!proj || !file) return;
        writeFile(proj.id, file, content);
        wsWriteFile(proj.id, file, content);
        markSaved(file);
      }, 1500);
      saveTimeouts.current.set(file, timeout);
    });

    return () => {
      disposed = true;
      ro.disconnect();
      editor.dispose();
      editorRef.current = null;
    };
  }, [editorReady, editorCreated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update model when activeFile changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFile || !currentProject) return;

    const newContent = fileContents.get(activeFile) || '';
    const newLang = getLanguage(activeFile);
    const newUri = monaco.Uri.parse('file:///' + activeFile);

    const currentModel = editor.getModel();
    if (currentModel) {
      const currentUri = currentModel.uri.toString();
      if (currentUri !== newUri.toString()) {
        const existingModels = monaco.editor.getModels();
        const idx = existingModels.findIndex(m => m.uri.toString() === newUri.toString());
        let model;
        if (idx !== -1) {
          model = existingModels[idx];
        } else {
          model = monaco.editor.createModel(newContent, newLang, newUri);
        }
        editor.setModel(model);
        if (currentModel !== model && currentUri !== 'file:///') {
          currentModel.dispose();
        }
      } else if (currentModel.getValue() !== newContent) {
        currentModel.setValue(newContent);
      }
    } else {
      const model = monaco.editor.createModel(newContent, newLang, newUri);
      editor.setModel(model);
    }
  }, [activeFile, currentProject?.id, fileContents]);

  // Update options when UI prefs change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    monaco.editor.setTheme(editorTheme);
    editor.updateOptions({
      fontSize,
      wordWrap: wordWrap === 'on' ? 'on' : 'off',
      minimap: { enabled: minimap },
      lineNumbers: lineNumbers === 'on' ? 'on' : 'off',
    });
  }, [editorTheme, fontSize, wordWrap, minimap, lineNumbers]);

  const renderTab = (filePath) => {
    const name = filePath.split('/').pop();
    const isActiveTab = activeFile === filePath;
    const isUnsaved = unsavedFiles.has(filePath);
    return (
      <div
        role="tab"
        aria-selected={isActiveTab}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-all cursor-pointer ${isActiveTab ? 'bg-white dark:bg-dark-bg border-b-2 border-primary-500' : 'bg-gray-100 dark:bg-dark-tertiary hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        style={{ minWidth: '120px', maxWidth: tabWidth }}
      >
        <span className={`truncate text-sm font-medium ${isActiveTab ? 'text-gray-900 dark:text-dark-text' : 'text-gray-600 dark:text-gray-400'}`}>{name}</span>
        {isUnsaved && <span className="text-primary-500 text-xs">●</span>}
        <button onClick={(e) => { e.stopPropagation(); closeFile(filePath); }} className={`p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isActiveTab ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-dark-bg">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border px-4 py-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text">Editor</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-lg">No project selected</p>
            <p className="text-sm mt-1">Select or create a project from the sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg">
      <div className="flex items-end border-b border-gray-200 dark:border-dark-border px-2 py-1 gap-1 bg-gray-50 dark:bg-dark-secondary overflow-x-auto" role="tablist">
        {openFiles.map(filePath => (
          <button key={filePath} role="tab" aria-selected={activeFile === filePath} onClick={() => setActiveFile(filePath)} className="group flex-shrink-0">
            {renderTab(filePath)}
          </button>
        ))}
        <div className="flex-1" />
        <button className="btn-ghost p-1.5 flex-shrink-0"><Maximize2 className="w-4 h-4" /></button>
        <button className="btn-ghost p-1.5 flex-shrink-0"><Minimize2 className="w-4 h-4" /></button>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: 100 }} />

      <div className="flex items-center justify-between border-t border-gray-200 dark:border-dark-border px-3 py-1.5 bg-gray-50 dark:bg-dark-secondary text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>{getLanguage(activeFile)}</span>
          <span>Spaces: 2</span>
          <span>LF</span>
          <span>{editorTheme === 'vs-dark' ? 'Dark' : 'Light'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Ln {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span>
          {unsavedFiles.has(activeFile) && <span className="text-primary-500">● Unsaved</span>}
        </div>
      </div>
    </div>
  );
}