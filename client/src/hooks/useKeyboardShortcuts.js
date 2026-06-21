import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

export function useKeyboardShortcuts(setSearchMode) {
  useEffect(() => {
    function handler(e) {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setSearchMode?.('text');
        return;
      }

      if (isMod && e.key === 'p') {
        e.preventDefault();
        setSearchMode?.('files');
        return;
      }

      if (isMod && e.key === 's') {
        e.preventDefault();
        const { currentProject, activeFile, fileContents, writeFile } = useProjectStore.getState();
        if (currentProject && activeFile) {
          const content = fileContents.get(activeFile);
          if (content !== undefined) writeFile(currentProject.id, activeFile, content);
        }
        return;
      }

      if (isMod && e.key === 'b') {
        e.preventDefault();
        useUIStore.getState().toggleLeftPanel();
        return;
      }

      if (isMod && e.key === 'j') {
        e.preventDefault();
        useUIStore.getState().toggleBottomPanel();
        return;
      }

      if (isMod && e.key === 'w') {
        e.preventDefault();
        const { activeFile, closeFile } = useProjectStore.getState();
        if (activeFile) closeFile(activeFile);
        return;
      }

      if (e.key === 'Escape') {
        const { activeModal, closeModal } = useUIStore.getState();
        if (activeModal) {
          e.preventDefault();
          closeModal();
        }
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchMode]);
}
