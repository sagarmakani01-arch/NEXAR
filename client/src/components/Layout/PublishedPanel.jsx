import { useState, useEffect } from 'react';
import { Globe, Loader2, ExternalLink, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

export default function PublishedPanel() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPublished = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/publish');
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPublished(); }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-border">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-dark-text">
          <Globe className="w-4 h-4 text-primary-500" />
          Published Projects
        </h2>
        <button onClick={fetchPublished} className="btn-ghost p-1.5" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 dark:text-red-400">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <button onClick={fetchPublished} className="btn-secondary text-sm mt-3">Retry</button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No published projects</p>
            <p className="text-xs mt-1">Open a project, build it, then click Publish from the toolbar or project menu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.projectId} className="p-3 bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg border border-gray-200 dark:border-dark-border">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-dark-text truncate">{p.projectName}</div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(p.publishedAt).toLocaleDateString()} {new Date(p.publishedAt).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {p.hasIndex ? (
                        <span className="badge-success text-xs">Live</span>
                      ) : (
                        <span className="badge-error text-xs">No index.html</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/published/${p.projectId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs px-2.5 py-1.5 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
