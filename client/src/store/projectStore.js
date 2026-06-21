import { create } from 'zustand';
import { projectAPI, fileAPI, deployAPI } from '../services/api';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  fileTree: [],
  openFiles: [],
  activeFile: null,
  fileContents: new Map(),
  unsavedFiles: new Set(),
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const { data } = await projectAPI.list();
      set({ projects: data.projects, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (projectData) => {
    set({ isLoading: true });
    try {
      const { data } = await projectAPI.create(projectData);
      set(state => ({ 
        projects: [data.project, ...state.projects],
        currentProject: data.project,
        fileTree: data.project.files || [],
        openFiles: [],
        activeFile: null,
        fileContents: new Map(),
        unsavedFiles: new Set(),
        isLoading: false 
      }));
      return data.project;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  selectProject: async (projectId) => {
    set({ isLoading: true });
    try {
      const { data } = await projectAPI.get(projectId);
      set({ 
        currentProject: data.project,
        fileTree: data.project.files,
        openFiles: [],
        activeFile: null,
        fileContents: new Map(),
        unsavedFiles: new Set(),
        isLoading: false 
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProject: async (projectId, updates) => {
    try {
      const { data } = await projectAPI.update(projectId, updates);
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? data.project : p),
        currentProject: state.currentProject?.id === projectId ? data.project : state.currentProject
      }));
    } catch (error) {
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    try {
      await projectAPI.delete(projectId);
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject
      }));
    } catch (error) {
      throw error;
    }
  },

  readFile: async (projectId, filePath) => {
    try {
      const { data } = await fileAPI.read(projectId, filePath);
      set(state => {
        const newContents = new Map(state.fileContents);
        newContents.set(filePath, data.content);
        return { fileContents: newContents };
      });
      return data.content;
    } catch (error) {
      throw error;
    }
  },

  writeFile: async (projectId, filePath, content) => {
    try {
      await fileAPI.write(projectId, filePath, content);
      set(state => {
        const newContents = new Map(state.fileContents);
        newContents.set(filePath, content);
        const newUnsaved = new Set(state.unsavedFiles);
        newUnsaved.delete(filePath);
        return { fileContents: newContents, unsavedFiles: newUnsaved };
      });
    } catch (error) {
      throw error;
    }
  },

  createFile: async (projectId, filePath, content = '') => {
    try {
      await fileAPI.create(projectId, filePath, content);
      set(state => {
        const newTree = [...state.fileTree];
        return { fileTree: newTree };
      });
    } catch (error) {
      throw error;
    }
  },

  deleteFile: async (projectId, filePath) => {
    try {
      await fileAPI.delete(projectId, filePath);
      set(state => {
        const newContents = new Map(state.fileContents);
        newContents.delete(filePath);
        const newUnsaved = new Set(state.unsavedFiles);
        newUnsaved.delete(filePath);
        const newOpenFiles = state.openFiles.filter(f => f !== filePath);
        return { 
          fileContents: newContents, 
          unsavedFiles: newUnsaved,
          openFiles: newOpenFiles,
          activeFile: state.activeFile === filePath ? (newOpenFiles[0] || null) : state.activeFile
        };
      });
    } catch (error) {
      throw error;
    }
  },

  renameFile: async (projectId, oldPath, newPath) => {
    try {
      await fileAPI.rename(projectId, oldPath, newPath);
      set(state => {
        const newContents = new Map(state.fileContents);
        const content = newContents.get(oldPath);
        newContents.delete(oldPath);
        if (content) newContents.set(newPath, content);
        
        const newUnsaved = new Set(state.unsavedFiles);
        newUnsaved.delete(oldPath);
        if (newUnsaved.has(oldPath)) newUnsaved.add(newPath);
        
        const newOpenFiles = state.openFiles.map(f => f === oldPath ? newPath : f);
        
        return { 
          fileContents: newContents, 
          unsavedFiles: newUnsaved,
          openFiles: newOpenFiles,
          activeFile: state.activeFile === oldPath ? newPath : state.activeFile
        };
      });
    } catch (error) {
      throw error;
    }
  },

  openFile: (filePath) => {
    set(state => {
      if (state.openFiles.includes(filePath)) {
        return { activeFile: filePath };
      }
      return { 
        openFiles: [...state.openFiles, filePath], 
        activeFile: filePath 
      };
    });
    
    const { currentProject, fileContents } = get();
    if (currentProject && !fileContents.has(filePath)) {
      get().readFile(currentProject.id, filePath);
    }
  },

  closeFile: (filePath) => {
    set(state => {
      const newOpenFiles = state.openFiles.filter(f => f !== filePath);
      let newActiveFile = state.activeFile;
      if (state.activeFile === filePath) {
        const index = state.openFiles.indexOf(filePath);
        newActiveFile = newOpenFiles[index] || newOpenFiles[index - 1] || null;
      }
      return { openFiles: newOpenFiles, activeFile: newActiveFile };
    });
  },

  setActiveFile: (filePath) => set({ activeFile: filePath }),

  markUnsaved: (filePath) => {
    set(state => {
      const newUnsaved = new Set(state.unsavedFiles);
      newUnsaved.add(filePath);
      return { unsavedFiles: newUnsaved };
    });
  },

  markSaved: (filePath) => {
    set(state => {
      const newUnsaved = new Set(state.unsavedFiles);
      newUnsaved.delete(filePath);
      return { unsavedFiles: newUnsaved };
    });
  },

  updateFileTree: (tree) => set({ fileTree: tree }),

  buildProject: async (projectId) => {
    try {
      await projectAPI.build(projectId);
    } catch (error) {
      throw error;
    }
  },

  deployProject: async (projectId, options) => {
    try {
      await deployAPI.deploy(projectId, options);
    } catch (error) {
      throw error;
    }
  },

  getDeployments: async (projectId) => {
    try {
      const { data } = await deployAPI.list(projectId);
      return data.deployments;
    } catch (error) {
      throw error;
    }
  }
}));
