import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { wsService } from '../services/webSocket';

export function useWebSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const { currentProject } = useProjectStore();
  const initialized = useRef(false);
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  useEffect(() => {
    if (isAuthenticated && token && !initialized.current) {
      wsService.connect(token);
      initialized.current = true;
    } else if (!isAuthenticated) {
      wsService.disconnect();
      initialized.current = false;
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const unsubConnect = wsService.on('connected', () => setIsConnected(true));
    const unsubDisconnect = wsService.on('disconnected', () => setIsConnected(false));
    return () => { unsubConnect(); unsubDisconnect(); };
  }, []);

  useEffect(() => {
    if (currentProject && isConnected) {
      wsService.joinProject(currentProject.id);
    }
  }, [currentProject, isConnected]);

  const subscribe = useCallback((event, callback) => {
    return wsService.on(event, callback);
  }, []);

  return {
    subscribe,
    isConnected,
    readFile: wsService.readFile.bind(wsService),
    writeFile: wsService.writeFile.bind(wsService),
    createFile: wsService.createFile.bind(wsService),
    deleteFile: wsService.deleteFile.bind(wsService),
    renameFile: wsService.renameFile.bind(wsService),
    sendCursor: wsService.sendCursor.bind(wsService),
    sendAIChat: wsService.sendAIChat.bind(wsService),
    sendAIGenerate: wsService.sendAIGenerate.bind(wsService),
    sendAgentChat: wsService.sendAgentChat.bind(wsService),
    buildProject: wsService.buildProject.bind(wsService),
    deployProject: wsService.deployProject.bind(wsService),
    sendTerminalCommand: wsService.sendTerminalCommand.bind(wsService)
  };
}
