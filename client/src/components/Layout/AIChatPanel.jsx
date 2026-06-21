import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Copy, Check, X, ChevronDown, 
  RefreshCw, Sparkles, Zap, Brain, Plus, Trash2,
  FileText, Code2, Terminal, Layers, 
  Hammer, Play, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useProject } from '../../hooks/useProject';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUIStore } from '../../store/uiStore';

const SYSTEM_PROMPTS = {
  codeGeneration: 'Generate production-ready code...',
  codeReview: 'Review code for security, performance, best practices...',
  debugging: 'Debug and fix code issues...',
  architecture: 'Design scalable software architecture...',
  fullStack: 'Build complete full-stack features...'
};

const DEFAULT_MODEL_OPTIONS = [
  { value: 'ollama-default', label: 'Loading...', description: 'Fetching available models' }
];

export default function AIChatPanel() {
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODEL_OPTIONS);

  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(data => {
        // Use configuredModels from server (all providers), fall back to models (Ollama only)
        const list = data.configuredModels || (data.models || []).map(m => ({ id: m, label: m, provider: 'ollama', model: m }));
        if (list.length > 0) {
          setModelOptions(list.map(m => ({
            value: m.id,
            label: m.label || m.model,
            description: m.provider === 'groq' ? 'Groq (cloud)' : 'Ollama (local)'
          })));
          if (aiModel === 'ollama-default' || !list.some(m => m.id === aiModel || m.model === aiModel)) {
            setAIModel(list[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);
  const { currentProject, fileContents, activeFile, readFile, writeFile } = useProject();
  const { sendAIChat, sendAIGenerate, sendAgentChat, subscribe, isConnected } = useWebSocket();
  const { 
    aiModel, setAIModel, aiTemperature, setAITemperature,
    aiSystemPrompt, setAISystemPrompt,
    chatHistory, setChatHistory,
    addNotification 
  } = useUIStore();

  const projectId = currentProject?.id;
  const projectChat = projectId ? (chatHistory[projectId] || []) : [];

  const [messages, setMessages] = useState(() => projectChat);

  useEffect(() => {
    setMessages(projectChat);
  }, [projectId]);

  const setMessagesAndPersist = useCallback((updater) => {
    if (!projectId) return;
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, [projectId]);

  // Sync messages to Zustand store after render
  useEffect(() => {
    if (!projectId) return;
    const cleaned = messages.filter(m => !m.streaming);
    setChatHistory(projectId, cleaned);
  }, [projectId, messages, setChatHistory]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentMode, setAgentMode] = useState(true);
  const [contextFiles, setContextFiles] = useState([]);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to AI events
  useEffect(() => {
    const unsubChunk = subscribe('ai:chunk', (chunk) => {
      setMessagesAndPersist(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'text' && last.role === 'assistant' && last.streaming) {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk, streaming: true }];
        }
        return [...prev, { type: 'text', role: 'assistant', content: chunk, streaming: true }];
      });
    });

    const unsubComplete = subscribe('ai:complete', () => {
      setMessagesAndPersist(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'text' && last.role === 'assistant' && last.streaming) {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return prev;
      });
      setIsStreaming(false);
    });

    const unsubError = subscribe('ai:error', (error) => {
      addNotification({ type: 'error', title: 'AI Error', message: error.message || String(error) });
      setIsStreaming(false);
    });

    // Safety net: catch any generic error that could leave streaming stuck
    const unsubGenericError = subscribe('error', () => {
      setIsStreaming(false);
    });

    // Agent events
    const unsubAction = subscribe('agent:action', (data) => {
      setMessagesAndPersist(prev => [...prev, {
        type: 'tool_call',
        tool: data.tool,
        args: data.args,
        iteration: data.iteration,
        timestamp: Date.now(),
        completed: false
      }]);
    });

    const unsubResult = subscribe('agent:result', (data) => {
      setMessagesAndPersist(prev => {
        const idx = [...prev].reverse().findIndex(m => m.type === 'tool_call' && m.tool === data.tool && m.iteration === data.iteration);
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return [
          ...prev.slice(0, realIdx),
          { ...prev[realIdx], completed: true, success: data.success, result: data.result, error: data.error },
          ...prev.slice(realIdx + 1)
        ];
      });
    });

    const unsubComplete_agent = subscribe('agent:complete', (data) => {
      setMessagesAndPersist(prev => [...prev, { type: 'text', role: 'assistant', content: data.message, streaming: false }]);
      setIsStreaming(false);
    });

    const unsubError_agent = subscribe('agent:error', (error) => {
      const msg = error.message || String(error);
      setMessagesAndPersist(prev => [...prev, { type: 'text', role: 'assistant', content: `**Error:** ${msg}`, streaming: false }]);
      addNotification({ type: 'error', title: 'Agent Error', message: msg });
      setIsStreaming(false);
    });

    return () => {
      unsubChunk(); unsubComplete(); unsubError(); unsubGenericError();
      unsubAction(); unsubResult(); unsubComplete_agent(); unsubError_agent();
    };
  }, [subscribe, addNotification]);

  const toggleContextFile = (filePath) => {
    setContextFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(f => f !== filePath) 
        : [...prev, filePath]
    );
  };

  const getContext = useCallback(async () => {
    if (!currentProject) return {};
    const files = {};
    for (const path of contextFiles) {
      const content = fileContents.get(path) || await readFile(currentProject.id, path);
      files[path] = content;
    }
    return { projectFiles: files };
  }, [currentProject, contextFiles, fileContents, readFile]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input;
    setInput('');
    setIsStreaming(true);

    setMessagesAndPersist(prev => [...prev, { type: 'text', role: 'user', content: userMessage, timestamp: Date.now() }]);

    if (agentMode) {
      const history = messages.filter(m => m.type === 'text').map(m => ({ role: m.role, content: m.content }));
      if (!isConnected) {
        addNotification({ type: 'error', title: 'Not Connected', message: 'WebSocket not connected. Please wait or refresh the page.' });
        setIsStreaming(false);
        return;
      }
      sendAgentChat(currentProject?.id, userMessage, history, aiModel);
    } else {
      const context = await getContext();
      const apiMessages = messages
        .filter(m => m.type === 'text')
        .map(m => ({ role: m.role, content: m.content }))
        .concat({ role: 'user', content: userMessage });

      sendAIChat(currentProject?.id, apiMessages, context, {
        modelId: aiModel,
        systemPrompt: SYSTEM_PROMPTS[aiSystemPrompt],
        params: { temperature: aiTemperature }
      });
    }
  };

  const handleGenerateCode = async () => {
    if (!input.trim() || isStreaming || !currentProject) return;
    
    const prompt = input;
    setInput('');
    setIsStreaming(true);

    setMessagesAndPersist(prev => [...prev, { type: 'text', role: 'user', content: prompt, timestamp: Date.now() }]);

    const context = await getContext();
    if (activeFile) {
      context.currentFile = {
        path: activeFile,
        content: fileContents.get(activeFile) || ''
      };
    }

      sendAIGenerate(currentProject.id, prompt, context, {
        modelId: aiModel,
        systemPrompt: SYSTEM_PROMPTS.codeGeneration,
        params: { temperature: aiTemperature }
      });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addNotification({ type: 'success', title: 'Copied', message: 'Code copied to clipboard' });
  };

  const renderToolCall = (msg, idx) => {
    const icon = {
      read_file: FileText,
      write_file: Code2,
      delete_file: Trash2,
      rename_file: RefreshCw,
      list_directory: Layers,
      run_command: Terminal,
      get_project_tree: Layers,
      search_files: FileText,
      install_dependency: Terminal
    }[msg.tool] || Hammer;

    const Icon = icon;

    return (
      <div key={idx} className="flex justify-start animate-fade-in">
        <div className="w-full max-w-[90%]">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-mono border ${msg.completed ? (msg.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300') : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'}`}>
            {msg.completed ? (msg.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />) : <Loader2 className="w-4 h-4 animate-spin" />}
            <Icon className="w-4 h-4" />
            <span className="font-bold">{msg.tool}</span>
            <span className="text-xs opacity-70">step #{msg.iteration}</span>
            {msg.completed && <Copy className="w-3.5 h-3.5 ml-auto cursor-pointer opacity-50 hover:opacity-100" onClick={() => copyToClipboard(JSON.stringify(msg.args, null, 2))} />}
          </div>
          <div className="px-3 py-2 border-x border-b border-gray-200 dark:border-dark-border rounded-b-lg bg-gray-50 dark:bg-dark-tertiary/30 text-xs font-mono max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(msg.args, null, 2)}</pre>
            {msg.completed && msg.result && (
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs font-sans">
                  {msg.success ? 'Result' : 'Error'}
                </summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                  {typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (msg, index) => {
    if (msg.type === 'tool_call') {
      return renderToolCall(msg, index);
    }

    if (msg.role === 'user') {
      return (
        <div key={index} className="flex justify-end animate-fade-in">
          <div className="chat-message chat-message-user">{msg.content}</div>
        </div>
      );
    }

    if (msg.role === 'system') {
      return (
        <div key={index} className="flex justify-center animate-fade-in">
          <div className="chat-message chat-message-system">{msg.content}</div>
        </div>
      );
    }

    const content = DOMPurify.sanitize(marked.parse(msg.content || ''));

    return (
      <div key={index} className="flex justify-start animate-fade-in">
        <div className="chat-message chat-message-assistant relative group max-w-[90%]">
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => copyToClipboard(msg.content)} className="p-1.5 rounded bg-white/80 dark:bg-dark-tertiary/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Copy">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark-tertiary rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="truncate max-w-[120px]">{modelOptions.find(m => m.value === aiModel)?.label || aiModel}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelSelect && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-slide-up scrollbar-thin">
                {modelOptions.map(model => (
                  <button
                    key={model.value}
                    onClick={() => { setAIModel(model.value); setShowModelSelect(false); }}
                    className={`w-full px-3 py-2 text-left text-sm ${aiModel === model.value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-dark-tertiary`}
                  >
                    <div className="font-medium">{model.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Temp:</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={aiTemperature}
              onChange={(e) => setAITemperature(parseFloat(e.target.value))}
              className="w-24 h-1 accent-primary-600"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{aiTemperature.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="btn-ghost p-2" title="Context Files"
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{contextFiles.length}</span>
          </button>
          <button onClick={() => setMessagesAndPersist([])} className="btn-ghost p-2" title="Clear Chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="px-3 py-1.5 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-tertiary/30 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mode</span>
        <div className="flex bg-gray-200 dark:bg-dark-tertiary rounded-lg p-0.5">
          <button
            onClick={() => setAgentMode(false)}
            className={`px-3 py-1 text-xs rounded-md transition-all ${!agentMode ? 'bg-white dark:bg-dark-bg shadow-sm text-gray-900 dark:text-dark-text' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            Chat (text only)
          </button>
          <button
            onClick={() => setAgentMode(true)}
            className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${agentMode ? 'bg-white dark:bg-dark-bg shadow-sm text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <Hammer className="w-3.5 h-3.5" />
            Build (writes files)
          </button>
        </div>
      </div>

      {/* Context Files */}
      {contextFiles.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-tertiary/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Context Files</span>
            <button onClick={() => setContextFiles([])} className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {contextFiles.map(file => (
              <span key={file} className="badge badge-info flex items-center gap-1">
                {file.split('/').pop()}
                <button onClick={() => toggleContextFile(file)} className="ml-1 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            {agentMode ? (
              <>
                <p className="text-center mb-2 text-primary-600 dark:text-primary-400 font-medium">Agent Mode Active</p>
                <p className="text-center text-sm mb-4">I can read, write, and modify your project files, run commands, and build full features.</p>
                <p className="text-center text-xs">Try saying: "Add a new Button component" or "Create a REST API endpoint"</p>
              </>
            ) : (
              <>
                <p className="text-center mb-2">Ask {modelOptions.find(m => m.value === aiModel)?.label || aiModel} anything about your code</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <button onClick={() => { setInput('Create a React component for a todo list with localStorage persistence'); handleSend({ preventDefault: () => {} }); }} className="p-3 bg-gray-100 dark:bg-dark-tertiary rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Code2 className="w-4 h-4 mb-1 text-primary-600" />
                    <span>Generate Component</span>
                  </button>
                  <button onClick={() => { setInput('Review my current file for bugs and improvements'); handleSend({ preventDefault: () => {} }); }} className="p-3 bg-gray-100 dark:bg-dark-tertiary rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Zap className="w-4 h-4 mb-1 text-yellow-600" />
                    <span>Review Code</span>
                  </button>
                  <button onClick={() => { setInput('Fix the error in my terminal: '); handleSend({ preventDefault: () => {} }); }} className="p-3 bg-gray-100 dark:bg-dark-tertiary rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Terminal className="w-4 h-4 mb-1 text-red-600" />
                    <span>Debug Error</span>
                  </button>
                  <button onClick={() => { setInput('Explain how this project works'); handleSend({ preventDefault: () => {} }); }} className="p-3 bg-gray-100 dark:bg-dark-tertiary rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-700">
                    <FileText className="w-4 h-4 mb-1 text-green-600" />
                    <span>Explain Project</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-dark-border">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>NEXAR's agent is thinking...</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50">
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={isStreaming || !currentProject || agentMode}
              className="btn-primary text-sm gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Generate Code
            </button>
            
            <button
              type="button"
              onClick={() => {
                const context = contextFiles.length > 0 ? '\n\nContext files: ' + contextFiles.join(', ') : '';
                setInput(input + context);
              }}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Context
            </button>

            {agentMode && (
              <span className="text-xs text-primary-600 dark:text-primary-400 ml-auto">
                <Hammer className="w-3.5 h-3.5 inline mr-1" />
                Agent will modify your project files
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={agentMode ? "Tell the agent what to build or change..." : "Ask about your code, request changes, or generate new features..."}
              className="input resize-none min-h-[80px] max-h-[200px] pr-20"
              rows={3}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute bottom-2 right-2 btn-primary p-2 disabled:opacity-50"
            >
              {agentMode ? <Hammer className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-bg rounded text-gray-700 dark:text-gray-300 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-bg rounded text-gray-700 dark:text-gray-300 font-mono">Shift+Enter</kbd> for new line
          </p>
        </form>
      </div>
    </div>
  );
}
