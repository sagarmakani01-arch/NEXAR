import express from 'express';
import { deployService } from '../services/DeployService.js';
import { projectOps, deployOps } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Deploy project
router.post('/:projectId', async (req, res) => {
  try {
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const { skipBuild = false, envVars = {} } = req.body;
    
    const result = await deployService.deploy(project, { skipBuild, envVars });
    
    res.json({ 
      success: true, 
      deployment: result,
      url: result.url 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployment status
router.get('/:projectId/:deploymentId', (req, res) => {
  // Get specific deployment
  res.json({ deployment: null });
});

// Stop deployment
router.delete('/:projectId/:deploymentId', async (req, res) => {
  try {
    await deployService.stopDeployment(req.params.deploymentId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployment logs
router.get('/:projectId/:deploymentId/logs', async (req, res) => {
  try {
    const logs = await deployService.getLogs(req.params.deploymentId);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all deployments for project
router.get('/:projectId', async (req, res) => {
  const deployments = await deployOps.getByProject(req.params.projectId);
  res.json({ deployments });
});

export default router;
