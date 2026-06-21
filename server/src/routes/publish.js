import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { projectOps } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const PUBLISH_DIR = process.env.PUBLISH_DIR || './data/published';

function ensureBuilt(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  const distDir = path.join(projectPath, 'dist');
  if (fs.existsSync(distDir) && fs.readdirSync(distDir).length > 0) {
    const distMtime = fs.statSync(distDir).mtimeMs;
    const srcMtime = getLatestMtime(projectPath);
    if (srcMtime <= distMtime) return distDir;
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(distDir)) {
    if (!fs.existsSync(path.join(projectPath, 'node_modules'))) {
      execSync('npm install --include=dev', { cwd: projectPath, stdio: 'pipe', timeout: 180000 });
    }
    execSync('npm run build 2>/dev/null', { cwd: projectPath, stdio: 'pipe', timeout: 180000 });
  }

  return fs.existsSync(distDir) && fs.readdirSync(distDir).length > 0 ? distDir : null;
}

function getLatestMtime(dir) {
  let latest = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        latest = Math.max(latest, getLatestMtime(fullPath));
      } else {
        const stat = fs.statSync(fullPath);
        latest = Math.max(latest, stat.mtimeMs);
      }
    }
  } catch {}
  return latest;
}

// List published projects for the current user
router.get('/', async (req, res) => {
  try {
    const publishedDir = path.resolve(PUBLISH_DIR);
    const entries = [];
    if (fs.existsSync(publishedDir)) {
      const dirs = fs.readdirSync(publishedDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      for (const dir of dirs) {
        const project = await projectOps.get(dir.name);
        const indexPath = path.join(publishedDir, dir.name, 'index.html');
        entries.push({
          projectId: dir.name,
          projectName: project?.name || 'Unknown',
          hasIndex: fs.existsSync(indexPath),
          publishedAt: fs.statSync(path.join(publishedDir, dir.name)).mtimeMs
        });
      }
    }
    entries.sort((a, b) => b.publishedAt - a.publishedAt);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId', async (req, res) => {
  try {
    const project = await projectOps.get(req.params.projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const distDir = ensureBuilt(project.path);
    if (!distDir) {
      return res.status(500).json({ error: 'Build failed. Check your project for errors.' });
    }

    const publishPath = path.join(PUBLISH_DIR, req.params.projectId);
    fs.rmSync(publishPath, { recursive: true, force: true });
    fs.mkdirSync(publishPath, { recursive: true });
    execSync(`cp -r "${distDir}"/* "${publishPath}/"`, { stdio: 'pipe' });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host || 'localhost:3001';
    const url = `${protocol}://${host}/published/${req.params.projectId}/`;

    res.json({ success: true, url, publishedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
