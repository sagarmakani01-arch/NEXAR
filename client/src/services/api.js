import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const { state } = JSON.parse(token);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (e) {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  refresh: () => api.post('/auth/refresh'),
  twoFAChallenge: (userId, token) => api.post('/auth/2fa/challenge', { userId, token }),
  twoFASetup: () => api.post('/auth/2fa/setup'),
  twoFAVerify: (token) => api.post('/auth/2fa/verify', { token }),
  twoFADisable: (token) => api.post('/auth/2fa/disable', { token }),
  twoFAStatus: () => api.get('/auth/2fa/status'),
  twoFAGitHubEnable: () => api.post('/auth/2fa/github/enable'),
  twoFAGitHubDisable: () => api.post('/auth/2fa/github/disable')
};

export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  build: (id) => api.post(`/projects/${id}/build`),
  getBuilds: (id) => api.get(`/projects/${id}/builds`),
  getDeployments: (id) => api.get(`/projects/${id}/deployments`),
  getUrl: (id) => api.get(`/projects/${id}/url`),
  getCollaborators: (id) => api.get(`/projects/${id}/collaborators`),
  addCollaborator: (id, data) => api.post(`/projects/${id}/collaborators`, data),
  removeCollaborator: (id, userId) => api.delete(`/projects/${id}/collaborators/${userId}`)
};

export const fileAPI = {
  getTree: (projectId) => api.get(`/files/${projectId}/tree`),
  read: (projectId, path) => api.get(`/files/${projectId}/read`, { params: { path } }),
  write: (projectId, path, content) => api.post(`/files/${projectId}/write`, { path, content }),
  create: (projectId, path, content) => api.post(`/files/${projectId}/create`, { path, content }),
  delete: (projectId, path) => api.delete(`/files/${projectId}/delete`, { params: { path } }),
  rename: (projectId, oldPath, newPath) => api.put(`/files/${projectId}/rename`, { oldPath, newPath }),
  upload: (projectId, formData) => api.post(`/files/${projectId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const deployAPI = {
  deploy: (projectId, options) => api.post(`/deploy/${projectId}`, options),
  get: (projectId, deploymentId) => api.get(`/deploy/${projectId}/${deploymentId}`),
  stop: (projectId, deploymentId) => api.delete(`/deploy/${projectId}/${deploymentId}`),
  getLogs: (projectId, deploymentId) => api.get(`/deploy/${projectId}/${deploymentId}/logs`),
  list: (projectId) => api.get(`/deploy/${projectId}`)
};

export const aiAPI = {
  generateProject: (data) => api.post('/ai/generate-project', data, { responseType: 'stream' }),
  chat: (data) => api.post('/ai/chat', data, { responseType: 'stream' }),
  generate: (data) => api.post('/ai/generate', data, { responseType: 'stream' })
};

export const publishAPI = {
  publish: (projectId) => api.post(`/publish/${projectId}`)
};

export default api;
