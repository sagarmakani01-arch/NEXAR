import { 
  Bot, Layout, Settings, X, ChevronDown,
  MessageSquare, Code, Zap, Database, Globe, Shield, Rocket
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import AIChatPanel from './AIChatPanel';
import PreviewPanel from './PreviewPanel';
import SettingsPanel from './SettingsPanel';
import PublishedPanel from './PublishedPanel';

const PANELS = [
  { id: 'ai', icon: Bot, label: 'AI Assistant', shortcut: '⌘⇧A' },
  { id: 'preview', icon: Layout, label: 'Preview', shortcut: '⌘⇧P' },
  { id: 'published', icon: Rocket, label: 'Published', shortcut: '' },
  { id: 'settings', icon: Settings, label: 'Settings', shortcut: '⌘,' }
];

export default function RightSidebar() {
  const { 
    activeRightPanel, 
    setActiveRightPanel, 
    showRightPanel 
  } = useUIStore();

  // Ensure AI panel is default
  const panel = activeRightPanel || 'ai';

  if (!showRightPanel) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary border-l border-gray-200 dark:border-dark-border">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50 backdrop-blur-sm px-1 py-1">
        <div className="flex gap-0.5 flex-1">
          {PANELS.map(({ id, icon: Icon, label, shortcut }) => (
            <button
              key={id}
              onClick={() => setActiveRightPanel(id)}
              className={`flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                panel === id 
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
      </div>

      {/* Panel Content - keep all mounted so agent/cursors survive tab switches */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0" style={{ display: panel === 'ai' ? 'block' : 'none' }}><AIChatPanel /></div>
        <div className="absolute inset-0" style={{ display: panel === 'preview' ? 'block' : 'none' }}><PreviewPanel /></div>
        <div className="absolute inset-0" style={{ display: panel === 'published' ? 'block' : 'none' }}><PublishedPanel /></div>
        <div className="absolute inset-0" style={{ display: panel === 'settings' ? 'block' : 'none' }}><SettingsPanel /></div>
      </div>
    </div>
  );
}
