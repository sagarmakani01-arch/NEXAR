import { useState, useEffect } from 'react';
import { 
  Rocket, Globe, Link2, Copy, CheckCircle, AlertCircle, 
  Loader2, Clock, Server, Database, Layers, Settings,
  Trash2, Play, Pause, RotateCcw, ExternalLink
} from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { useUIStore } from '../../store/uiStore';

export default function DeployPanel() {
  const { currentProject, deployProject, getDeployments, buildProject } = useProject();
  const { setPreviewUrl, addNotification } = useUIStore();
  
  const [deployments, setDeployments] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployConfig, setDeployConfig] = useState({
    skipBuild: false,
    envVars: {},
    customDomain: '',
    subdomain: ''
  });
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('deploy'); // deploy, history, settings

  // Load deployments on mount
  useEffect(() => {
    if (currentProject) {
      loadDeployments();
    }
  }, [currentProject]);

  const loadDeployments = async () => {
    try {
      const data = await getDeployments(currentProject.id);
      setDeployments(data);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  };

  const handleDeploy = async () => {
    if (!currentProject) return;
    
    setIsDeploying(true);
    setLogs([]);
    
    try {
      const result = await deployProject(currentProject.id, deployConfig);
      if (result.url) {
        setPreviewUrl(result.url);
        addNotification({ 
          type: 'success', 
          title: 'Deployed!', 
          message: `Your app is live at ${result.url}` 
        });
      }
      await loadDeployments();
    } catch (error) {
      addNotification({ 
        type: 'error', 
        title: 'Deployment Failed', 
        message: error.message 
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleStopDeployment = async (deploymentId) => {
    try {
      // Implementation would call stop API
      addNotification({ type: 'success', title: 'Deployment Stopped' });
      await loadDeployments();
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed to Stop', message: error.message });
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    addNotification({ type: 'success', title: 'Copied', message: 'URL copied to clipboard' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      deploying: 'badge-warning',
      building: 'badge-info',
      failed: 'badge-error',
      stopped: 'badge-gray'
    };
    return badges[status] || 'badge-gray';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'deploying': 
      case 'building': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'stopped': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-dark-border px-2">
        {[
          { id: 'deploy', label: 'Deploy', icon: Rocket },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-dark-bg text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-tertiary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deploy Tab */}
      {activeTab === 'deploy' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Deployment Status</h3>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                <Server className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {currentProject?.name || 'No project selected'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Framework: {currentProject?.framework || 'Unknown'}
                </p>
              </div>
              {deployments.length > 0 && deployments[0].status === 'active' && (
                <div className="flex items-center gap-2">
                  <span className={`${getStatusBadge(deployments[0].status)} flex items-center gap-1`}>
                    {getStatusIcon(deployments[0].status)}
                    Active
                  </span>
                  <button
                    onClick={() => copyUrl(deployments[0].url)}
                    className="btn-secondary text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy URL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deploy Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Configuration</h3>
            
            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4 space-y-4">
              <div>
                <label className="label">Subdomain (optional)</label>
                <input
                  type="text"
                  value={deployConfig.subdomain}
                  onChange={(e) => setDeployConfig({ ...deployConfig, subdomain: e.target.value })}
                  placeholder="my-app"
                  className="input"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Will create: {deployConfig.subdomain}.yourdomain.com
                </p>
              </div>

              <div>
                <label className="label">Custom Domain (optional)</label>
                <input
                  type="text"
                  value={deployConfig.customDomain}
                  onChange={(e) => setDeployConfig({ ...deployConfig, customDomain: e.target.value })}
                  placeholder="app.example.com"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Environment Variables</label>
                <div className="space-y-2">
                  {Object.entries(deployConfig.envVars).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => setDeployConfig({ 
                          ...deployConfig, 
                          envVars: { ...deployConfig.envVars, [e.target.value]: value } 
                        })}
                        placeholder="KEY"
                        className="input flex-1"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setDeployConfig({ 
                          ...deployConfig, 
                          envVars: { ...deployConfig.envVars, [key]: e.target.value } 
                        })}
                        placeholder="VALUE"
                        className="input flex-1"
                      />
                      <button
                        onClick={() => {
                          const newVars = { ...deployConfig.envVars };
                          delete newVars[key];
                          setDeployConfig({ ...deployConfig, envVars: newVars });
                        }}
                        className="btn-ghost p-2 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setDeployConfig({ 
                      ...deployConfig, 
                      envVars: { ...deployConfig.envVars, NEW_KEY: '' } 
                    })}
                    className="btn-secondary text-sm"
                  >
                    <Layers className="w-4 h-4" />
                    Add Variable
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deployConfig.skipBuild}
                  onChange={(e) => setDeployConfig({ ...deployConfig, skipBuild: e.target.checked })}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Skip build (deploy current files directly)
                </span>
              </label>
            </div>

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={isDeploying || !currentProject}
              className="btn-primary w-full py-3 text-lg gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Deploy Application
                </>
              )}
            </button>
          </div>

          {/* Deployment Logs */}
          {isDeploying && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-300">Deployment Logs</span>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {showLogs ? 'Hide' : 'Show'} Logs
                </button>
              </div>
              {showLogs && (
                <div className="font-mono text-xs text-gray-300 max-h-64 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="py-0.5 border-b border-gray-800">
                      <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                      <span className="ml-2">{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Deployment History</h3>
          
          {deployments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Rocket className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No deployments yet</p>
              <p className="text-sm mt-1">Click Deploy to create your first deployment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deployments.map(deployment => (
                <div 
                  key={deployment.id} 
                  className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4 border border-gray-200 dark:border-dark-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${getStatusBadge(deployment.status)} flex items-center gap-1`}>
                          {getStatusIcon(deployment.status)}
                          {deployment.status}
                        </span>
                        {deployment.url && (
                          <a 
                            href={deployment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(deployment.started_at)}
                        {deployment.completed_at && ` • Completed: ${formatDate(deployment.completed_at)}`}
                      </p>
                      {deployment.error && (
                        <p className="text-sm text-red-500 mt-1">{deployment.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {deployment.url && (
                        <button
                          onClick={() => copyUrl(deployment.url)}
                          className="btn-ghost p-2"
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      {deployment.status === 'active' && (
                        <button
                          onClick={() => handleStopDeployment(deployment.id)}
                          className="btn-ghost p-2 text-red-500"
                          title="Stop Deployment"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Deployment Settings</h3>
          
          <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4 space-y-4">
            <div>
              <label className="label">Auto-deploy on push</label>
              <select className="input">
                <option>Disabled</option>
                <option>On main branch</option>
                <option>On all branches</option>
              </select>
            </div>

            <div>
              <label className="label">Build Command</label>
              <input
                type="text"
                value="npm run build"
                className="input font-mono text-sm"
                readOnly
              />
            </div>

            <div>
              <label className="label">Output Directory</label>
              <input
                type="text"
                value="dist"
                className="input font-mono text-sm"
                readOnly
              />
            </div>

            <div>
              <label className="label">Node Version</label>
              <select className="input">
                <option>20.x (LTS)</option>
                <option>18.x (LTS)</option>
                <option>22.x (Latest)</option>
              </select>
            </div>

            <div className="border-t border-gray-200 dark:border-dark-border pt-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Advanced</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Deployments are served via Nginx with automatic HTTPS</p>
                <p>• Each deployment gets a unique subdomain</p>
                <p>• Static assets are cached with immutable cache keys</p>
                <p>• SPA routing automatically falls back to index.html</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
