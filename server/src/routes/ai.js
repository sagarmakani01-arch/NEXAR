import express from 'express';
import { ollamaService } from '../services/OllamaService.js';
import { projectManager } from '../services/ProjectManager.js';
import { fileService } from '../services/FileService.js';
import { authenticate } from '../middleware/auth.js';
import { rateMonitor } from '../services/ProviderRateMonitor.js';

const router = express.Router();

/**
 * Check AI status (Ollama connectivity, loaded model) — no auth required
 */
router.get('/status', async (req, res) => {
  const configuredModels = Object.entries(ollamaService.config.models).map(([id, m]) => ({
    id,
    label: m.label,
    provider: m.provider,
    model: m.model
  }));

  // Debug provider config
  const providers = ollamaService.config.providers;
  const debugProviders = {};
  for (const [name, cfg] of Object.entries(providers)) {
    debugProviders[name] = {
      baseURL: cfg.baseURL,
      hasKey: !!cfg.apiKey,
      keyPrefix: cfg.apiKey ? cfg.apiKey.substring(0, 8) + '...' : null
    };
  }

  try {
    const modelId = req.query.model || 'ollama-default';
    const cfg = ollamaService.getConfig(modelId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${cfg.baseURL.replace(/\/+$/, '')}/models`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await resp.json();
    const modelList = data.data || data.models || [];
    const available = modelList.some(m => m.id === cfg.model || m.model === cfg.model || m.name === cfg.model);
    res.json({
      provider: cfg.provider,
      model: cfg.model,
      baseURL: cfg.baseURL,
      available: !!available,
      modelCount: modelList.length,
      models: modelList.map(m => m.id || m.name || m.model),
      configuredModels,
      debugProviders,
      usage: {
        groq: {
          daily: rateMonitor.getDailyUsage('groq'),
          limit: rateMonitor.getLimits('groq').daily,
          percent: Math.round(rateMonitor.getDailyPercent('groq'))
        },
        openrouter: {
          daily: rateMonitor.getDailyUsage('openrouter'),
          limit: rateMonitor.getLimits('openrouter').daily,
          percent: Math.round(rateMonitor.getDailyPercent('openrouter'))
        }
      }
    });
  } catch (error) {
    res.json({
      error: error.message,
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434/v1',
      configuredModels,
      debugProviders,
      usage: {
        groq: {
          daily: rateMonitor.getDailyUsage('groq'),
          limit: rateMonitor.getLimits('groq').daily,
          percent: Math.round(rateMonitor.getDailyPercent('groq'))
        },
        openrouter: {
          daily: rateMonitor.getDailyUsage('openrouter'),
          limit: rateMonitor.getLimits('openrouter').daily,
          percent: Math.round(rateMonitor.getDailyPercent('openrouter'))
        }
      }
    });
  }
});

// All other routes require authentication
router.use(authenticate);

/**
 * Generate complete project from specification
 */
router.post('/generate-project', async (req, res) => {
  try {
    const { specification, framework = 'vite-react', projectName, options } = req.body;
    
    if (!specification) {
      return res.status(400).json({ error: 'Specification is required' });
    }

    // Create project first
    const project = await projectManager.createProject(req.userId, {
      name: projectName || 'AI Generated Project',
      description: specification.slice(0, 200),
      framework,
      template: 'blank'
    });

    // Stream generation
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const projectContext = { projectFiles: {} };
    let fileManifest = '';

    for await (const chunk of ollamaService.generateProject(specification, options || {})) {
      fileManifest += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Parse file manifest and write files
    const files = parseFileManifest(fileManifest);
    for (const [filePath, content] of Object.entries(files)) {
      try {
        await fileService.writeFile(project.path, filePath, content);
        res.write(`data: ${JSON.stringify({ type: 'file', filePath, content })}\n\n`);
      } catch (fileErr) {
        console.error(`[generate-project] Skipping file "${filePath}": ${fileErr.message}`);
        res.write(`data: ${JSON.stringify({ type: 'skip', filePath, reason: fileErr.message })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', project })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Chat with Ollama
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, projectId, context, options } = req.body;
    
    if (projectId) {
      const project = await projectManager.getProject(projectId);
      if (!project || project.user_id !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const chunk of ollamaService.chat(messages, options)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Generate code snippet
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, projectId, currentFile, options } = req.body;
    
    let context = { projectFiles: {} };
    if (projectId) {
      const project = await projectManager.getProject(projectId);
      if (project && project.user_id === req.userId) {
        context.projectFiles = await getProjectFilesAsObject(project.path);
      }
    }
    if (currentFile) context.currentFile = currentFile;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const chunk of ollamaService.generateCode(prompt, context, options)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

function parseFileManifest(manifest) {
  const files = {};
  const regex = /===FILE: (.*?)===\n([\s\S]*?)===ENDFILE===/g;
  let match;
  while ((match = regex.exec(manifest)) !== null) {
    let filePath = match[1].trim();
    filePath = filePath.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
    if (filePath) {
      files[filePath] = match[2].trim();
    }
  }
  return files;
}

async function getProjectFilesAsObject(projectPath) {
  const files = {};
  async function walk(dir, relative = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else {
        files[relPath] = await fs.readFile(fullPath, 'utf-8');
      }
    }
  }
  await walk(projectPath);
  return files;
}

import fs from 'fs/promises';
import path from 'path';
import https from 'https';

router.get('/test-connectivity', async (req, res) => {
  const results = {};
  const services = [
    { name: 'Groq', url: 'https://api.groq.com/openai/v1/models', key: process.env.GROQ_API_KEY },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/models', key: process.env.OPENROUTER_API_KEY },
    { name: 'Ollama', url: 'http://host.docker.internal:11434/v1/models', key: null },
  ];
  for (const svc of services) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const headers = svc.key ? { Authorization: `Bearer ${svc.key}` } : {};
      const resp = await fetch(svc.url, { method: 'GET', headers, signal: controller.signal });
      results[svc.name] = { status: resp.status, ok: resp.ok, ms: Date.now() - start };
    } catch (e) {
      results[svc.name] = { error: e.message, ms: Date.now() - start };
    }
  }
  res.json({
    hasGroqKey: !!process.env.GROQ_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    results
  });
});

export default router;
