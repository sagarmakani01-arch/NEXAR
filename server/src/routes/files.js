import express from 'express';
import { fileService } from '../services/FileService.js';
import { projectOps } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get file tree
router.get('/:projectId/tree', async (req, res) => {
  try {
    const project = await await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const files = await fileService.getFileTree(project.path);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read file
router.get('/:projectId/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const content = await fileService.readFile(project.path, filePath);
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write file
router.post('/:projectId/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await fileService.writeFile(project.path, filePath, content || '');
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create file
router.post('/:projectId/create', async (req, res) => {
  try {
    const { path: filePath, content = '' } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await fileService.createFile(project.path, filePath, content);
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:projectId/delete', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await fileService.deleteFile(project.path, filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename file
router.put('/:projectId/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old and new paths required' });
    }
    
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await fileService.renameFile(project.path, oldPath, newPath);
    res.json({ success: true, oldPath, newPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search file names (Go to File)
router.get('/:projectId/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ files: [] });
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const all = await fileService.flattenTree(project.path);
    const ql = q.toLowerCase();
    res.json({ files: all.filter(f => f.path.toLowerCase().includes(ql)).slice(0, 30) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full-text search in files
router.get('/:projectId/search-text', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const results = await fileService.searchText(project.path, q);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file (for images, assets)
router.post('/:projectId/upload', async (req, res) => {
  try {
    // This would handle multipart/form-data
    // For simplicity, we'll skip full implementation
    res.json({ success: true, message: 'Upload endpoint - implement with multer' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
