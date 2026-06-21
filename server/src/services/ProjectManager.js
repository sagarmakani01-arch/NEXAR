import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { projectOps, deployOps } from '../config/database.js';
import { fileService } from './FileService.js';
import { buildService } from './BuildService.js';
import { deployService } from './DeployService.js';

class ProjectManager {
  constructor() {
    this.projectsDir = process.env.PROJECTS_DIR || './data/projects';
    this.ensureProjectsDir();
  }

  async ensureProjectsDir() {
    await fs.mkdir(this.projectsDir, { recursive: true });
  }

  /**
   * Create a new project
   */
  async createProject(userId, { name, description, template = 'blank', framework = 'vite-react' }) {
    const projectId = uuidv4();
    const projectPath = path.join(this.projectsDir, projectId);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    // Initialize git repo
    await this.initGit(projectPath);
    
    // Create project in database
    await projectOps.create({
      id: projectId, userId, name, description, framework, path: projectPath
    });
    
    // Apply template if not blank
    if (template !== 'blank') {
      await this.applyTemplate(projectPath, template, framework);
    } else {
      await this.createDefaultFiles(projectPath, framework);
    }
    
    // Initialize file watcher
    fileService.watchProject(projectId, projectPath);
    
    return this.getProject(projectId);
  }

  /**
   * Apply project template
   */
  async applyTemplate(projectPath, template, framework) {
    const templates = {
      'vite-react': this.getViteReactTemplate(),
      'nextjs': this.getNextJSTemplate(),
      'vite-vue': this.getViteVueTemplate(),
      'vite-svelte': this.getViteSvelteTemplate(),
      'express-api': this.getExpressTemplate(),
      'fullstack': this.getFullstackTemplate()
    };
    
    const templateFiles = templates[template] || templates['vite-react'];
    
    for (const [filePath, content] of Object.entries(templateFiles)) {
      const fullPath = path.join(projectPath, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  /**
   * Get project with files
   */
  async getProject(projectId) {
    const project = await projectOps.get(projectId);
    if (!project) return null;
    
    const files = await fileService.getFileTree(project.path);
    return { ...project, files };
  }

  /**
   * List user projects
   */
  async listProjects(userId) {
    return await projectOps.getByUser(userId);
  }

  /**
   * Update project metadata
   */
  async updateProject(projectId, updates) {
    await projectOps.update(projectId, updates);
    return this.getProject(projectId);
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const project = await this.getProject(projectId);
    if (!project) return false;
    
    await fs.rm(project.path, { recursive: true, force: true });
    await projectOps.delete(projectId);
    fileService.unwatchProject(projectId);
    return true;
  }

  /**
   * Build project for production
   */
  async buildProject(projectId) {
    const project = await this.getProject(projectId);
    return buildService.build(project);
  }

  /**
   * Deploy project
   */
  async deployProject(projectId, options = {}) {
    const project = await this.getProject(projectId);
    return deployService.deploy(project, options);
  }

  /**
   * Get deployment history
   */
  async getDeployments(projectId) {
    return await deployOps.getByProject(projectId);
  }

  // Template definitions
  getViteReactTemplate() {
    return {
      'package.json': JSON.stringify({
        name: 'ai-generated-app',
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.2.1',
          vite: '^5.0.0'
        }
      }, null, 2),
      'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true }
})`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'src/App.jsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="app">
      <header>
        <h1>🚀 AI Generated App</h1>
      </header>
      <main>
        <button onClick={() => setCount(c => c + 1)}>
          Count: {count}
        </button>
      </main>
    </div>
  )
}

export default App`,
      'src/index.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
.app { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem; }
header { text-align: center; margin-bottom: 2rem; }
h1 { color: #1a1a2e; font-size: 2.5rem; }
button { padding: 1rem 2rem; font-size: 1.1rem; background: #1a1a2e; color: white; border: none; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
button:hover { transform: scale(1.05); }`,
      'src/App.css': ``,
      '.gitignore': `node_modules
dist
.env
*.log
.DS_Store`
    };
  }

  getNextJSTemplate() {
    return {
      'package.json': JSON.stringify({
        name: 'ai-nextjs-app',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          next: '14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        }
      }, null, 2),
      'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = { output: 'standalone' }
module.exports = nextConfig`,
      'app/page.jsx': `export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">🚀 Next.js AI App</h1>
    </main>
  )
}`,
      'app/layout.jsx': `export const metadata = { title: 'AI App' }
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
      '.gitignore': `node_modules
.next
.env
*.log`
    };
  }

  getFullstackTemplate() {
    return {
      ...this.getViteReactTemplate(),
      'server/index.js': `import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(\`Server running on \${PORT}\`))`,
      'package.json': JSON.stringify({
        name: 'ai-fullstack-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'concurrently "vite" "node server/index.js"',
          build: 'vite build',
          start: 'node server/index.js'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          express: '^4.18.2',
          cors: '^2.8.5'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.2.1',
          vite: '^5.0.0',
          concurrently: '^8.2.2'
        }
      }, null, 2)
    };
  }

  getViteVueTemplate() { return {}; }
  getViteSvelteTemplate() { return {}; }
  getExpressTemplate() { return {}; }

  async createDefaultFiles(projectPath, framework) {
    const templates = this.getViteReactTemplate();
    for (const [filePath, content] of Object.entries(templates)) {
      const fullPath = path.join(projectPath, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  async initGit(projectPath) {
    try {
      const { execSync } = await import('child_process');
      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
      execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });
    } catch (e) {
      console.warn('Git init failed:', e.message);
    }
  }
}

export const projectManager = new ProjectManager();
export default projectManager;
