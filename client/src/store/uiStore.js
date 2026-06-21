import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarWidth: 280,
      panelSizes: { left: 280, center: 'flex', right: 380, bottom: 200 },
      activeLeftPanel: 'files',
      activeRightPanel: 'ai',
      activeBottomPanel: 'terminal',
      showLeftPanel: true,
      showRightPanel: true,
      showBottomPanel: false,
      editorTheme: 'vs-dark',
      uiTheme: 'dark',
      fontSize: 14,
      wordWrap: 'on',
      minimap: true,
      lineNumbers: 'on',
      previewUrl: '',
      previewMode: 'desktop',
      autoRefresh: false,
      aiModel: 'ollama-default',
      aiTemperature: 0.3,
      aiSystemPrompt: 'codeGeneration',
      chatHistory: {},
      terminalCwd: '',
      terminalHistory: [],
      notifications: [],
      activeModal: null,
      modalData: null,

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setPanelSizes: (sizes) => set({ panelSizes: sizes }),
      setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),
      setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
      setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),
      toggleLeftPanel: () => set(state => ({ showLeftPanel: !state.showLeftPanel })),
      toggleRightPanel: () => set(state => ({ showRightPanel: !state.showRightPanel })),
      toggleBottomPanel: () => set(state => ({ showBottomPanel: !state.showBottomPanel })),
      setEditorTheme: (theme) => set({ editorTheme: theme }),
      setUiTheme: (theme) => set({ uiTheme: theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setWordWrap: (wrap) => set({ wordWrap: wrap }),
      setMinimap: (enabled) => set({ minimap: enabled }),
      setLineNumbers: (enabled) => set({ lineNumbers: enabled }),
      setPreviewUrl: (url) => set({ previewUrl: url }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
      setAIModel: (model) => set({ aiModel: model }),
      setAITemperature: (temp) => set({ aiTemperature: temp }),
      setAISystemPrompt: (prompt) => set({ aiSystemPrompt: prompt }),
      addChatMessage: (projectId, message) => set(state => ({ 
        chatHistory: { ...state.chatHistory, [projectId]: [...(state.chatHistory[projectId] || []), message].slice(-100) }
      })),
      clearChatHistory: (projectId) => set(state => ({ 
        chatHistory: { ...state.chatHistory, [projectId]: [] }
      })),
      setChatHistory: (projectId, messages) => set(state => ({ 
        chatHistory: { ...state.chatHistory, [projectId]: messages }
      })),
      setTerminalCwd: (cwd) => set({ terminalCwd: cwd }),
      addTerminalHistory: (cmd) => set(state => ({ 
        terminalHistory: [cmd, ...state.terminalHistory].slice(-50) 
      })),
      addNotification: (notification) => {
        const id = Date.now() + Math.random();
        set(state => ({ 
          notifications: [...state.notifications, { ...notification, id }] 
        }));
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || 5000);
        }
        return id;
      },
      removeNotification: (id) => set(state => ({ 
        notifications: state.notifications.filter(n => n.id !== id) 
      })),
      clearNotifications: () => set({ notifications: [] }),
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),
      resetUI: () => set({
        sidebarOpen: true,
        sidebarWidth: 280,
        panelSizes: { left: 280, center: 'flex', right: 380, bottom: 200 },
        activeLeftPanel: 'files',
        activeRightPanel: 'ai',
        activeBottomPanel: 'terminal',
        showLeftPanel: true,
        showRightPanel: true,
        showBottomPanel: false
      })
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        panelSizes: state.panelSizes,
        activeLeftPanel: state.activeLeftPanel,
        activeRightPanel: state.activeRightPanel,
        activeBottomPanel: state.activeBottomPanel,
        showLeftPanel: state.showLeftPanel,
        showRightPanel: state.showRightPanel,
        showBottomPanel: state.showBottomPanel,
        editorTheme: state.editorTheme,
        uiTheme: state.uiTheme,
        fontSize: state.fontSize,
        wordWrap: state.wordWrap,
        minimap: state.minimap,
        lineNumbers: state.lineNumbers,
        previewMode: state.previewMode,
        autoRefresh: state.autoRefresh,
        aiModel: state.aiModel,
        aiTemperature: state.aiTemperature,
        aiSystemPrompt: state.aiSystemPrompt,
        chatHistory: state.chatHistory
      })
    }
  )
);
