import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { useUIStore } from '../store/uiStore.js';

export function useProject() {
  const {
    projects,
    currentProject,
    fileTree,
    openFiles,
    activeFile,
    fileContents,
    unsavedFiles,
    isLoading,
    error,
    fetchProjects,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
    openFile,
    closeFile,
    setActiveFile,
    markUnsaved,
    markSaved,
    updateFileTree,
    buildProject,
    deployProject,
    getDeployments
  } = useProjectStore();

  const { addNotification } = useUIStore();

  // Wrapper functions with notifications
  const handleCreateProject = useCallback(async (data) => {
    try {
      const project = await createProject(data);
      addNotification({ type: 'success', title: 'Project Created', message: `"${project.name}" is ready` });
      return project;
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed to Create Project', message: error.message });
      throw error;
    }
  }, [createProject, addNotification]);

  const handleDeleteProject = useCallback(async (id) => {
    try {
      await deleteProject(id);
      addNotification({ type: 'success', title: 'Project Deleted' });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to delete project';
      console.error('[Delete] Failed:', id, error.response?.status, error.response?.data);
      addNotification({ type: 'error', title: 'Failed to Delete', message: `Server says: ${msg}` });
      throw error;
    }
  }, [deleteProject, addNotification]);

  const handleSaveFile = useCallback(async (projectId, filePath, content) => {
    try {
      await writeFile(projectId, filePath, content);
      markSaved(filePath);
    } catch (error) {
      addNotification({ type: 'error', title: 'Save Failed', message: error.message });
      throw error;
    }
  }, [writeFile, markSaved, addNotification]);

  const handleCreateFile = useCallback(async (projectId, filePath, content) => {
    try {
      await createFile(projectId, filePath, content);
      openFile(filePath);
      addNotification({ type: 'success', title: 'File Created', message: filePath });
    } catch (error) {
      addNotification({ type: 'error', title: 'Create Failed', message: error.message });
      throw error;
    }
  }, [createFile, openFile, addNotification]);

  const handleDeleteFile = useCallback(async (projectId, filePath) => {
    try {
      await deleteFile(projectId, filePath);
      addNotification({ type: 'success', title: 'File Deleted', message: filePath });
    } catch (error) {
      addNotification({ type: 'error', title: 'Delete Failed', message: error.message });
      throw error;
    }
  }, [deleteFile, addNotification]);

  const handleRenameFile = useCallback(async (projectId, oldPath, newPath) => {
    try {
      await renameFile(projectId, oldPath, newPath);
      addNotification({ type: 'success', title: 'File Renamed', message: `${oldPath} → ${newPath}` });
    } catch (error) {
      addNotification({ type: 'error', title: 'Rename Failed', message: error.message });
      throw error;
    }
  }, [renameFile, addNotification]);

  const getFileContent = useCallback((filePath) => {
    return fileContents.get(filePath) || '';
  }, [fileContents]);

  const isFileUnsaved = useCallback((filePath) => {
    return unsavedFiles.has(filePath);
  }, [unsavedFiles]);

  const getActiveFileContent = useCallback(() => {
    if (!activeFile) return '';
    return fileContents.get(activeFile) || '';
  }, [activeFile, fileContents]);

  return {
    // State
    projects,
    currentProject,
    fileTree,
    openFiles,
    activeFile,
    fileContents,
    unsavedFiles,
    isLoading,
    error,
    
    // Actions
    fetchProjects,
    createProject: handleCreateProject,
    selectProject,
    updateProject,
    deleteProject: handleDeleteProject,
    readFile,
    writeFile: handleSaveFile,
    createFile: handleCreateFile,
    deleteFile: handleDeleteFile,
    renameFile: handleRenameFile,
    openFile,
    closeFile,
    setActiveFile,
    markUnsaved,
    markSaved,
    updateFileTree,
    buildProject,
    deployProject,
    getDeployments,
    
    // Helpers
    getFileContent,
    isFileUnsaved,
    getActiveFileContent,
    hasUnsavedChanges: unsavedFiles.size > 0
  };
}
