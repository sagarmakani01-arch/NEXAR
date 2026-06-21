import { useEffect, useState } from 'react';
import { X, Check, Loader2, FolderPlus, FileText, Zap, Globe, Server, Database, Layers, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useProject } from '../../hooks/useProject';
import { useUIStore } from '../../store/uiStore.js';
import { useProjectStore } from '../../store/projectStore.js';

const MODAL_COMPONENTS = {
  newProject: NewProjectModal,
  deleteProject: DeleteProjectModal,
  settings: SettingsModal,
  published: PublishedProjectsModal
};

export default function Modal({ type, data, onClose }) {
  const Component = MODAL_COMPONENTS[type];
  if (!Component) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <Component data={data} onClose={onClose} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function NewProjectModal({ onClose }) {
  const { createProject } = useProject();
  const { addNotification } = useUIStore();
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState({
    name: '', description: '', framework: 'vite-react', template: 'blank'
  });
  const [importForm, setImportForm] = useState({
    name: '', gitUrl: '', description: ''
  });
  const [loading, setLoading] = useState(false);

  const templates = [
    { id: 'blank', name: 'Blank', description: 'Start from scratch', icon: FileText },
    { id: 'vite-react', name: 'React + Vite', description: 'Modern React with Vite', icon: Zap },
    { id: 'nextjs', name: 'Next.js', description: 'Full-stack React framework', icon: Globe },
    { id: 'vite-vue', name: 'Vue + Vite', description: 'Vue 3 with Composition API', icon: Layers },
    { id: 'vite-svelte', name: 'Svelte + Vite', description: 'Svelte with Vite', icon: Server },
    { id: 'express-api', name: 'Express API', description: 'Node.js REST API', icon: Database },
    { id: 'fullstack', name: 'Full Stack', description: 'React + Express monorepo', icon: Globe }
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await createProject(form);
      addNotification({ type: 'success', title: 'Project Created', message: form.name });
      onClose();
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importForm.gitUrl.trim() || !importForm.name.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/projects/import', importForm);
      const store = useProjectStore.getState();
      store.selectProject(data.project.id);
      addNotification({ type: 'success', title: 'Project Imported', message: importForm.name });
      onClose();
    } catch (error) {
      addNotification({ type: 'error', title: 'Import Failed', message: error.response?.data?.error || error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="p-6 border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">New Project</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setTab('create')} className={`px-4 py-1.5 text-sm rounded-lg font-medium ${tab === 'create' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Create New</button>
          <button onClick={() => setTab('import')} className={`px-4 py-1.5 text-sm rounded-lg font-medium ${tab === 'import' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Import from Git</button>
        </div>
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate}>
          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="label">Project Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="my-awesome-app" className="input" autoFocus required />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="A brief description" className="input" rows={3} />
            </div>
            <div>
              <label className="label">Framework</label>
              <select value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })} className="input">
                <option value="vite-react">React + Vite</option>
                <option value="nextjs">Next.js</option>
                <option value="vite-vue">Vue + Vite</option>
                <option value="vite-svelte">Svelte + Vite</option>
                <option value="express-api">Express API</option>
                <option value="fullstack">Full Stack (React + Express)</option>
              </select>
            </div>
            <div>
              <label className="label">Template</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map(t => { const Icon = t.icon; return (
                  <button key={t.id} type="button" onClick={() => setForm({ ...form, template: t.id })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${form.template === t.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-dark-border hover:border-gray-300'}`}>
                    <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                  </button>
                );})}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !form.name.trim()} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleImport}>
          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="label">Git URL</label>
              <input type="text" value={importForm.gitUrl} onChange={e => setImportForm({ ...importForm, gitUrl: e.target.value })} placeholder="https://github.com/user/repo.git" className="input font-mono" autoFocus required />
              <p className="text-xs text-gray-400 mt-1">Public git repository URL. Supports HTTPS and SSH.</p>
            </div>
            <div>
              <label className="label">Project Name</label>
              <input type="text" value={importForm.name} onChange={e => setImportForm({ ...importForm, name: e.target.value })} placeholder="my-imported-project" className="input" required />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea value={importForm.description} onChange={e => setImportForm({ ...importForm, description: e.target.value })} placeholder="Description of the imported project" className="input" rows={3} />
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !importForm.gitUrl.trim() || !importForm.name.trim()} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import Project'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function DeleteProjectModal({ data, onClose }) {
  const { deleteProject } = useProject();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await deleteProject(data.project.id);
      onClose();
    } catch {
      // notification handled by useProject hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 border-b border-gray-200 dark:border-dark-border">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Delete Project</h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">
            <strong>Warning:</strong> This action cannot be undone. All files and data will be permanently deleted.
          </p>
          <p className="text-red-700 dark:text-red-400 mt-2 font-medium">
            Deleting: <code className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">{data?.project?.name}</code>
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline" /> Deleting...</> : 'Delete Project'}
        </button>
      </div>
    </form>
  );
}

function SettingsModal({ data, onClose }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <p className="text-gray-600 dark:text-gray-400">Settings modal - implement as needed</p>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}

function PublishedProjectsModal({ data, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/publish')
      .then(res => setProjects(res.data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary-600" />
        Published Projects
      </h2>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No published projects yet.</p>
          <p className="text-sm mt-1">Publish a project from the project dropdown menu to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.projectId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg border border-gray-200 dark:border-dark-border">
              <div>
                <div className="font-medium text-gray-900 dark:text-dark-text">{p.projectName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Published {new Date(p.publishedAt).toLocaleDateString()} at {new Date(p.publishedAt).toLocaleTimeString()}
                </div>
              </div>
              <a
                href={`/published/${p.projectId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4" />
                Open
              </a>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}

import axios from 'axios';
