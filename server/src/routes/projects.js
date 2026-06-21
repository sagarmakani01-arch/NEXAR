import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { projectManager } from '../services/ProjectManager.js';
import { projectOps, buildOps, deployOps } from '../config/database.js';
import { fileService } from '../services/FileService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// List projects
router.get('/', async (req, res) => {
  try {
    const projects = await projectOps.getByUser(req.userId);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project with files
router.get('/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check access
    if (project.user_id !== req.userId) {
      // Check collaborator
      const collaborators = await projectOps.getCollaborators(project.id);
      const isCollaborator = collaborators.some(c => c.user_id === req.userId);
      if (!isCollaborator) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, framework = 'vite-react', template = 'blank' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name required' });
    }
    
    const project = await projectManager.createProject(req.userId, {
      name,
      description,
      framework,
      template
    });
    
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import project from git
router.post('/import', async (req, res) => {
  try {
    const { name, gitUrl, description } = req.body;
    if (!gitUrl) return res.status(400).json({ error: 'Git URL required' });
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const projectId = uuidv4();
    const projectsDir = process.env.PROJECTS_DIR || './data/projects';
    const projectPath = path.join(projectsDir, projectId);

    await fs.mkdir(projectPath, { recursive: true });
    execSync(`git clone --depth 1 "${gitUrl}" "${projectPath}"`, { timeout: 120000, stdio: 'pipe' });
    await fs.rm(path.join(projectPath, '.git'), { recursive: true, force: true });

    await projectOps.create({
      id: projectId,
      userId: req.userId,
      name,
      description: description || `Imported from ${gitUrl}`,
      framework: 'custom',
      path: projectPath
    });

    fileService.watchProject(projectId, projectPath);

    const project = await projectManager.getProject(projectId);
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: `Import failed: ${error.message}` });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const updated = await projectManager.updateProject(req.params.id, req.body);
    res.json({ project: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied - you do not own this project' });
    }
    
    await projectManager.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Build project
router.post('/:id/build', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Return immediately, build happens via WebSocket
    res.json({ success: true, message: 'Build started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get build history
router.get('/:id/builds', async (req, res) => {
  const builds = await buildOps.getByProject(req.params.id);
  res.json({ builds });
});

// Deploy project
router.post('/:id/deploy', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ success: true, message: 'Deployment started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployments
router.get('/:id/deployments', async (req, res) => {
  const deployments = await deployOps.getByProject(req.params.id);
  res.json({ deployments });
});

// Get active deployment URL
router.get('/:id/url', async (req, res) => {
  const deployment = await deployOps.getActive(req.params.id);
  if (deployment) {
    res.json({ url: deployment.url });
  } else {
    res.status(404).json({ error: 'No active deployment' });
  }
});

// Collaborators
router.get('/:id/collaborators', async (req, res) => {
  const collaborators = await projectOps.getCollaborators(req.params.id);
  res.json({ collaborators });
});

router.post('/:id/collaborators', (req, res) => {
  const { email, role = 'editor' } = req.body;
  // Find user by email and add as collaborator
  // Implementation needed
  res.json({ success: true });
});

router.delete('/:id/collaborators/:userId', async (req, res) => {
  await projectOps.removeCollaborator(req.params.id, req.params.userId);
  res.json({ success: true });
});

export default router;
