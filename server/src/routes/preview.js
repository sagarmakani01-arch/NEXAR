import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { projectOps } from '../config/database.js';

const router = express.Router();
const building = new Set();

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

function ensureBuilt(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return projectPath;

  const distDir = path.join(projectPath, 'dist');
  if (fs.existsSync(distDir) && fs.readdirSync(distDir).length > 0) {
    const distMtime = fs.statSync(distDir).mtimeMs;
    const srcMtime = getLatestMtime(projectPath);
    if (srcMtime <= distMtime) return distDir;
    // Source files newer than dist — invalidate cache
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  if (building.has(projectPath)) return null;

  building.add(projectPath);
  try {
    if (!fs.existsSync(path.join(projectPath, 'node_modules'))) {
      execSync('npm install --include=dev', { cwd: projectPath, stdio: 'pipe', timeout: 180000 });
    }
    execSync('npm run build 2>/dev/null', { cwd: projectPath, stdio: 'pipe', timeout: 300000 });
  } catch {
    building.delete(projectPath);
    return projectPath;
  }
  building.delete(projectPath);
  return fs.existsSync(distDir) && fs.readdirSync(distDir).length > 0 ? distDir : projectPath;
}

router.use((req, res, next) => {
  res.set('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

router.use('/:projectId', async (req, res, next) => {
  const project = await projectOps.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  req.project = project;
  next();
});

router.get('/:projectId', (req, res) => {
  const result = ensureBuilt(req.project.path);
  if (!result) return res.status(503).json({ error: 'Build in progress. Please try again in a moment.' });

  const indexPath = path.join(result, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).json({ error: 'No index.html found.' });

  const html = fs.readFileSync(indexPath, 'utf-8');
  const rewritten = html
    .replace(/src="\//g, 'src="./')
    .replace(/href="\//g, 'href="./');
  res.type('html').send(rewritten);
});

router.get('/:projectId/*', (req, res) => {
  const result = ensureBuilt(req.project.path);
  if (!result) return res.status(503).json({ error: 'Build in progress' });

  const filePath = req.params[0];
  const fullPath = path.resolve(result, filePath);

  if (!fullPath.startsWith(path.resolve(result))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(fullPath)) {
    const indexPath = path.join(result, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(fullPath);
});

export default router;
