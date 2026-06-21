import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Maximize2, Minimize2, Monitor, Smartphone, Tablet,
  RotateCcw, Wifi, WifiOff, Bug, Code2, Rocket, Copy
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useProject } from '../../hooks/useProject';
import { publishAPI } from '../../services/api';

const DEVICE_PRESETS = {
  desktop: { width: '100%', height: '100%', name: 'Desktop' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768px)' },
  mobile: { width: 375, height: 667, name: 'Mobile (375px)' },
  mobileL: { width: 414, height: 896, name: 'Mobile Large (414px)' }
};

export default function PreviewPanel() {
  const { 
    previewUrl, 
    setPreviewUrl, 
    previewMode, 
    setPreviewMode,
    autoRefresh,
    setAutoRefresh,
    addNotification
  } = useUIStore();
  
  const { currentProject } = useProject();
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const refreshIntervalRef = useRef(null);

  // Track container size for scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-refresh on file changes
  useEffect(() => {
    if (autoRefresh && previewUrl) {
      refreshIntervalRef.current = setInterval(() => {
        if (iframeRef.current && iframeRef.current.src !== 'about:blank') {
          iframeRef.current.contentWindow.location.reload();
        }
      }, 15000);
    }
    return () => clearInterval(refreshIntervalRef.current);
  }, [autoRefresh, previewUrl]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.contentWindow.location.reload();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load preview');
  };

  const handleMessage = (event) => {
    if (event.data.type === 'console') {
      setConsoleLogs(prev => [...prev.slice(-99), { ...event.data, timestamp: Date.now() }]);
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const startPreview = () => {
    if (!currentProject) return;
    setError(null);
    setIsLoading(true);
    setPreviewUrl(`/api/preview/${currentProject.id}/`);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handlePublish = async () => {
    if (!currentProject || publishing) return;
    setPublishing(true);
    try {
      const { data } = await publishAPI.publish(currentProject.id);
      await navigator.clipboard.writeText(data.url);
      addNotification({ type: 'success', title: 'Published!', message: `URL copied: ${data.url}` });
    } catch (error) {
      addNotification({ type: 'error', title: 'Publish Failed', message: error.response?.data?.error || error.message });
    } finally {
      setPublishing(false);
    }
  };

  const devicePreset = DEVICE_PRESETS[previewMode] || DEVICE_PRESETS.desktop;
  const isDesktop = previewMode === 'desktop';
  const pad = isDesktop ? 0 : 16;

  // Calculate scale to fit device frame within container
  const scale = useMemo(() => {
    if (isDesktop || containerSize.w === 0) return 1;
    const availW = containerSize.w - pad * 2;
    const availH = containerSize.h - pad * 2;
    return Math.min(availW / devicePreset.width, availH / devicePreset.height, 1);
  }, [isDesktop, containerSize, pad, devicePreset]);

  const frameWidth = isDesktop ? '100%' : devicePreset.width;
  const frameHeight = isDesktop ? '100%' : devicePreset.height;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-tertiary/50 overflow-x-auto">
        {/* Device Selector */}
        <button
          onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
          className="btn-ghost px-2 py-1.5 gap-1 shrink-0"
          title={DEVICE_PRESETS[previewMode].name}
        >
          {previewMode === 'desktop' ? (
            <Monitor className="w-4 h-4" />
          ) : previewMode === 'tablet' ? (
            <Tablet className="w-4 h-4" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span className="text-xs hidden sm:inline">{DEVICE_PRESETS[previewMode].name}</span>
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-dark-border shrink-0" />

        {/* URL Bar */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={previewUrl || ''}
            onChange={(e) => setPreviewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPreviewUrl(e.target.value)}
            placeholder="URL..."
            className="input text-xs py-1.5 px-2"
          />
        </div>

        {/* URL Actions */}
        <button onClick={openInNewTab} className="btn-ghost p-1.5 shrink-0" title="Open in new tab">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={handleRefresh} disabled={isLoading} className="btn-ghost p-1.5 shrink-0" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <label className="flex items-center gap-1 cursor-pointer shrink-0 px-1">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary-600"
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">Auto</span>
        </label>

        <div className="w-px h-5 bg-gray-200 dark:bg-dark-border shrink-0" />

        {/* Start Preview */}
        <button
          onClick={startPreview}
          disabled={isLoading || !currentProject}
          className="btn-primary text-xs gap-1 px-2 py-1.5 shrink-0"
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Start</span>
        </button>

        {/* Publish */}
        <button
          onClick={handlePublish}
          disabled={publishing || !currentProject}
          className="btn-secondary text-xs gap-1 px-2 py-1.5 shrink-0"
        >
          <Rocket className="w-3.5 h-3.5 text-purple-500" />
          <span>{publishing ? '...' : 'Pub'}</span>
        </button>
      </div>

      {/* Preview Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900">
          {isDesktop ? (
            <div className="w-full h-full">
              <iframe
                ref={iframeRef}
                src={previewUrl || 'about:blank'}
                className="w-full h-full"
                onLoad={handleLoad}
                onError={handleError}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                title="Live Preview"
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ width: devicePreset.width * scale, height: devicePreset.height * scale }}
            >
              <div
                className="relative bg-white dark:bg-dark-bg overflow-hidden rounded-lg shadow-2xl"
                style={{
                  width: devicePreset.width,
                  height: devicePreset.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                {['mobile', 'mobileL'].includes(previewMode) && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-black rounded-b-lg z-10" />
                )}
                <iframe
                  ref={iframeRef}
                  src={previewUrl || 'about:blank'}
                  className="w-full h-full"
                  onLoad={handleLoad}
                  onError={handleError}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                  title="Live Preview"
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-dark-bg/80 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-dark-bg/90 flex items-center justify-center z-20 p-6">
            <div className="text-center">
              <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">{error}</p>
              <button onClick={handleRefresh} className="btn-primary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!previewUrl && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6">
            <Code2 className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Preview Available</p>
            <p className="text-sm mt-1">Click "Start Preview" to deploy and view your app</p>
          </div>
        )}

        {/* Console Panel */}
        {showConsole && consoleLogs.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 max-h-64 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-medium text-gray-300">Console</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setConsoleLogs([])} className="text-xs text-gray-400 hover:text-white">Clear</button>
                <button onClick={() => setShowConsole(false)} className="text-gray-400 hover:text-white">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-48 overflow-y-auto p-2 font-mono text-xs">
              {consoleLogs.map((log, i) => (
                <div key={i} className={`flex gap-2 py-0.5 border-b border-gray-800 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-gray-500">[{log.level}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Toggle */}
        {consoleLogs.length > 0 && !showConsole && (
          <button
            onClick={() => setShowConsole(true)}
            className="absolute bottom-2 right-2 btn-primary shadow-lg"
          >
            <Bug className="w-4 h-4 mr-1" />
            Console ({consoleLogs.length})
          </button>
        )}
      </div>
    </div>
  );
}
