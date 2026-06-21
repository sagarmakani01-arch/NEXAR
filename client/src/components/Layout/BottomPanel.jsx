import { useState, useRef, useEffect } from 'react';
import { 
  Terminal, AlertTriangle, CheckCircle, X, 
  Trash2, Maximize2, Minimize2, Copy, Search,
  Bug, Play, Square, RotateCcw
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useProject } from '../../hooks/useProject';
import { useWebSocket } from '../../hooks/useWebSocket';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Terminal as XTerm } from 'xterm';
import 'xterm/css/xterm.css';

const TABS = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'problems', label: 'Problems', icon: AlertTriangle },
  { id: 'output', label: 'Output', icon: CheckCircle },
  { id: 'debug', label: 'Debug Console', icon: Bug }
];

export default function BottomPanel() {
  const { 
    activeBottomPanel, 
    setActiveBottomPanel,
    showBottomPanel,
    panelSizes
  } = useUIStore();
  
  const { currentProject, buildProject } = useProject();
  const { sendTerminalCommand, subscribe } = useWebSocket();
  const [terminal, setTerminal] = useState(null);
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [problems, setProblems] = useState([]);
  const [outputLogs, setOutputLogs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);

  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const xtermRef = useRef(null);

  // Initialize xterm
  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const xterm = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          selection: '#264f78',
          black: '#161b22',
          red: '#f85149',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#e6edf3',
          brightBlack: '#6e7681',
          brightRed: '#ff7b72',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#ffffff'
        },
        convertEol: true,
        scrollback: 10000
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      xterm.open(terminalRef.current);
      fitAddon.fit();

      // Handle input
      xterm.onData((data) => {
        if (data === '\r') {
          const command = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString(true).replace(/^[$\s>]+\s*/, '') || '';
          if (command.trim()) {
            sendTerminalCommand(currentProject?.id, command.trim());
            setTerminalHistory(prev => [...prev, command.trim()].slice(-50));
            setHistoryIndex(-1);
          }
          xterm.write('\r\n$ ');
        } else if (data === '\u0003') { // Ctrl+C
          xterm.write('^C\r\n$ ');
        } else if (data === '\u001b[A') { // Up arrow
          if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const cmd = terminalHistory[terminalHistory.length - 1 - newIndex];
            xterm.write('\r' + ' '.repeat(80) + '\r$ ' + cmd);
          }
        } else if (data === '\u001b[B') { // Down arrow
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const cmd = terminalHistory[terminalHistory.length - 1 - newIndex];
            xterm.write('\r' + ' '.repeat(80) + '\r$ ' + cmd);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            xterm.write('\r' + ' '.repeat(80) + '\r$ ');
          }
        } else if (data === '\u007f') { // Backspace
          if (xterm.buffer.active.cursorX > 2) {
            xterm.write('\b \b');
          }
        } else {
          xterm.write(data);
        }
      });

      // Handle resize
      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      // Welcome message
      xterm.write('\x1b[1;36m');
      xterm.write('  █████╗ ██╗   ██╗████████╗ ██████╗ ███╗   ██╗\r\n');
      xterm.write(' ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗████╗  ██║\r\n');
      xterm.write(' ███████║██║   ██║   ██║   ██║   ██║██╔██╗ ██║\r\n');
      xterm.write(' ██╔══██║██║   ██║   ██║   ██║   ██║██║╚██╗██║\r\n');
      xterm.write(' ██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║ ╚████║\r\n');
      xterm.write(' ╚══════╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═══╝\r\n');
      xterm.write('\x1b[0m');
      xterm.write('\r\nWelcome to NEXAR Terminal\r\n');
      xterm.write('Type commands to interact with your project\r\n');
      xterm.write('$ ');

      return () => {
        window.removeEventListener('resize', handleResize);
        xterm.dispose();
        xtermRef.current = null;
      };
    }
  }, [currentProject?.id, sendTerminalCommand, terminalHistory, historyIndex]);

  // Subscribe to terminal output
  useEffect(() => {
    const unsub = subscribe('terminal:output', (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data.output);
      }
    });
    return unsub;
  }, [subscribe]);

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('$ ');
    }
  };

  const runCommand = (cmd) => {
    if (xtermRef.current && currentProject) {
      xtermRef.current.write(cmd + '\r');
      sendTerminalCommand(currentProject.id, cmd);
    }
  };

  const quickCommands = [
    { label: 'npm install', cmd: 'npm install' },
    { label: 'npm run dev', cmd: 'npm run dev' },
    { label: 'npm run build', cmd: 'npm run build' },
    { label: 'npm test', cmd: 'npm test' },
    { label: 'git status', cmd: 'git status' },
    { label: 'ls -la', cmd: 'ls -la' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary border-t border-gray-200 dark:border-dark-border">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50 backdrop-blur-sm px-1 py-1">
        <div className="flex gap-0.5 flex-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveBottomPanel(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeBottomPanel === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-1 ml-2">
          {activeBottomPanel === 'terminal' && (
            <>
              <button onClick={clearTerminal} className="btn-ghost p-1.5" title="Clear Terminal">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => runCommand('npm run build')} className="btn-ghost p-1.5" title="Build">
                <Play className="w-4 h-4" />
              </button>
            </>
          )}
          <button className="btn-ghost p-1.5" title="Maximize Panel">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeBottomPanel === 'terminal' && (
          <div className="h-full terminal-container" ref={terminalRef} />
        )}

        {activeBottomPanel === 'problems' && (
          <ProblemsPanel problems={problems} />
        )}

        {activeBottomPanel === 'output' && (
          <OutputPanel logs={outputLogs} />
        )}

        {activeBottomPanel === 'debug' && (
          <DebugPanel logs={debugLogs} />
        )}
      </div>

      {/* Quick Commands Bar */}
      {activeBottomPanel === 'terminal' && (
        <div className="border-t border-gray-200 dark:border-dark-border p-2 bg-white/50 dark:bg-dark-tertiary/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">Quick commands:</span>
            {quickCommands.map(({ label, cmd }) => (
              <button
                key={cmd}
                onClick={() => runCommand(cmd)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 font-mono"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Problems Panel
function ProblemsPanel({ problems }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {problems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <CheckCircle className="w-12 h-12 mb-3 text-green-500" />
          <p className="text-center">No problems detected</p>
          <p className="text-sm mt-1">Build your project to check for errors</p>
        </div>
      ) : (
        <div className="space-y-2">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="p-3 bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-gray-200 dark:border-dark-border flex items-start gap-3"
            >
              <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${
                problem.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {problem.severity === 'error' ? (
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.75 5.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7a1 1 0 100-2 1 1 0 000 2z"/></svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.75 4.5a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zm0 8a1 1 0 100-2 1 1 0 000 2z"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{problem.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{problem.file}:{problem.line}:{problem.column}</p>
              </div>
              <span className="badge badge-gray text-xs">{problem.source || 'typescript'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Output Panel
function OutputPanel({ logs }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Build Output</span>
        <button className="btn-ghost p-1.5 text-xs">Clear</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-gray-900 text-gray-300">
        {logs.length === 0 ? (
          <p className="text-gray-500">No output yet. Build your project to see output.</p>
        ) : (
          <pre className="whitespace-pre-wrap">{logs.join('\n')}</pre>
        )}
      </div>
    </div>
  );
}

// Debug Panel
function DebugPanel({ logs }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Debug Console</span>
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5 text-xs">Clear</button>
          <button className="btn-ghost p-1.5 text-xs">Pause</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-gray-900 text-gray-300">
        {logs.length === 0 ? (
          <p className="text-gray-500">Debug console will show here when debugging.</p>
        ) : (
          <pre className="whitespace-pre-wrap">{logs.join('\n')}</pre>
        )}
      </div>
    </div>
  );
}
