import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useUIStore } from '../../store/uiStore';
import { useProject } from '../../hooks/useProject';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from '../ErrorBoundary';
import SearchOverlay from '../SearchOverlay';
import LeftSidebar from './LeftSidebar';
import CenterEditor from './CenterEditor';
import RightSidebar from './RightSidebar';
import BottomPanel from './BottomPanel';
import TopBar from './TopBar';
import Modal from './Modal';
import Notifications from './Notifications';

export default function MainLayout() {
  const [searchMode, setSearchMode] = useState(null);

  useKeyboardShortcuts(setSearchMode);

  const { 
    showLeftPanel, 
    showRightPanel, 
    showBottomPanel,
    activeModal,
    uiTheme,
    addNotification
  } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (uiTheme === 'dark' || (uiTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [uiTheme]);

  useEffect(() => {
    if (uiTheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [uiTheme]);
  
  const { currentProject, projects, fetchProjects } = useProject();
  const { isConnected, subscribe } = useWebSocket();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      projects[0].id && useProjectStore.getState().selectProject(projects[0].id);
    }
  }, [currentProject, projects]);

  // Listen for usage warnings (Groq 50%/80%/95% thresholds)
  useEffect(() => {
    const unsub = subscribe('usage:warning', (data) => {
      const type = data.fallback ? 'warning' : 'info';
      addNotification({ type, title: `Usage: ${data.provider}`, message: data.message });
    });
    return unsub;
  }, [subscribe, addNotification]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-dark-bg">
      <TopBar 
        project={currentProject} 
        isConnected={isConnected}
      />

      <div className="flex flex-1 overflow-hidden">
        <PanelGroup 
          direction="vertical"
        >
          <Panel 
            defaultSize={showBottomPanel ? 70 : 100}
            minSize={30}
          >
            <PanelGroup direction="horizontal">
              {showLeftPanel && (
                <>
                  <Panel defaultSize={20} minSize={15} maxSize={40} order={0}>
                    <ErrorBoundary title="File Explorer Error">
                      <LeftSidebar />
                    </ErrorBoundary>
                  </Panel>
                  <PanelResizeHandle className="react-resizable-panels-handle-horizontal bg-transparent hover:bg-primary-500/20 w-1" />
                </>
              )}

              <Panel defaultSize={60} minSize={30} order={1}>
                <ErrorBoundary title="Editor Error">
                  <CenterEditor />
                </ErrorBoundary>
              </Panel>

              {showRightPanel && (
                <>
                  <PanelResizeHandle className="react-resizable-panels-handle-horizontal bg-transparent hover:bg-primary-500/20 w-1" />
                  <Panel defaultSize={20} minSize={15} maxSize={40} order={2}>
                    <ErrorBoundary title="Sidebar Error">
                      <RightSidebar />
                    </ErrorBoundary>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {showBottomPanel && (
            <>
              <PanelResizeHandle className="react-resizable-panels-handle-vertical bg-transparent hover:bg-primary-500/20 h-1" />
              <Panel defaultSize={30} minSize={10} maxSize={50}>
                <ErrorBoundary title="Terminal Error">
                  <BottomPanel />
                </ErrorBoundary>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {activeModal && (
        <Modal 
          type={activeModal} 
          data={useUIStore.getState().modalData} 
          onClose={() => useUIStore.getState().closeModal()} 
        />
      )}

      {searchMode && (
        <SearchOverlay mode={searchMode} onClose={() => setSearchMode(null)} />
      )}

      <Notifications />
    </div>
  );
}

// Need to import useProjectStore for the auto-select effect
import { useProjectStore } from '../../store/projectStore';
