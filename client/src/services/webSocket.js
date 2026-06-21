import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    const wsUrl = import.meta.env.VITE_WS_URL || '';
    
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      if (this.socket?.id) {
        console.log('[WS] Connected:', this.socket.id);
      }
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      this.emit('error', error);
    });

    // === Project Events ===
    this.socket.on('file-tree', (data) => this.emit('file-tree', data));
    this.socket.on('file:content', (data) => this.emit('file:content', data));
    this.socket.on('file:changed', (data) => this.emit('file:changed', data));
    this.socket.on('file:created', (data) => this.emit('file:created', data));
    this.socket.on('file:deleted', (data) => this.emit('file:deleted', data));
    this.socket.on('file:renamed', (data) => this.emit('file:renamed', data));

    this.socket.on('cursor:update', (data) => this.emit('cursor:update', data));
    this.socket.on('user-joined', (data) => this.emit('user-joined', data));
    this.socket.on('user-left', (data) => this.emit('user-left', data));

    // === AI Events ===
    this.socket.on('ai:chunk', (data) => this.emit('ai:chunk', data.chunk));
    this.socket.on('ai:complete', (data) => this.emit('ai:complete', data));
    this.socket.on('ai:error', (data) => this.emit('ai:error', data.message));

    // === Build Events ===
    this.socket.on('build:started', (data) => this.emit('build:started', data));
    this.socket.on('build:complete', (data) => this.emit('build:complete', data));
    this.socket.on('build:failed', (data) => this.emit('build:failed', data));

    // === Deploy Events ===
    this.socket.on('deploy:started', (data) => this.emit('deploy:started', data));
    this.socket.on('deploy:complete', (data) => this.emit('deploy:complete', data));
    this.socket.on('deploy:failed', (data) => this.emit('deploy:failed', data));

    // === Terminal ===
    this.socket.on('terminal:output', (data) => this.emit('terminal:output', data));

    // === Agent Events ===
    this.socket.on('agent:step', (data) => this.emit('agent:step', data));
    this.socket.on('agent:action', (data) => this.emit('agent:action', data));
    this.socket.on('agent:result', (data) => this.emit('agent:result', data));
    this.socket.on('agent:complete', (data) => this.emit('agent:complete', data));
    this.socket.on('agent:error', (data) => this.emit('agent:error', data.message));

    // === Usage Notifications ===
    this.socket.on('notification', (data) => this.emit('usage:warning', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // === Project Actions ===
  joinProject(projectId) {
    this.socket?.emit('join-project', { projectId });
  }

  readFile(projectId, filePath) {
    this.socket?.emit('file:read', { projectId, filePath });
  }

  writeFile(projectId, filePath, content) {
    this.socket?.emit('file:write', { projectId, filePath, content });
  }

  createFile(projectId, filePath, content) {
    this.socket?.emit('file:create', { projectId, filePath, content });
  }

  deleteFile(projectId, filePath) {
    this.socket?.emit('file:delete', { projectId, filePath });
  }

  renameFile(projectId, oldPath, newPath) {
    this.socket?.emit('file:rename', { projectId, oldPath, newPath });
  }

  // === Cursor ===
  sendCursor(projectId, filePath, position, selection) {
    this.socket?.emit('cursor:move', { projectId, filePath, position, selection });
  }

  // === AI ===
  sendAIChat(projectId, messages, context, options) {
    this.socket?.emit('ai:chat', { projectId, messages, context, options });
  }

  sendAIGenerate(projectId, prompt, context, options) {
    this.socket?.emit('ai:generate', { projectId, prompt, context, options });
  }

  // === Agent ===
  sendAgentChat(projectId, message, history, modelId) {
    if (!this.socket?.connected) {
      console.warn('[WS] Cannot send agent:chat - socket not connected');
      return;
    }
    this.socket.emit('agent:chat', { projectId, message, history, modelId });
  }

  // === Build/Deploy ===
  buildProject(projectId) {
    this.socket?.emit('project:build', { projectId });
  }

  deployProject(projectId, options) {
    this.socket?.emit('project:deploy', { projectId, options });
  }

  // === Terminal ===
  sendTerminalCommand(projectId, command) {
    this.socket?.emit('terminal:command', { projectId, command });
  }

  // === Event System ===
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
