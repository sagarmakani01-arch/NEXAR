import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { deployOps } from '../config/database.js';
import { buildService } from './BuildService.js';

class DeployService {
  constructor() {
    this.deployDir = process.env.DEPLOY_DIR || './data/deployments';
    this.domain = process.env.DEPLOY_DOMAIN || 'localhost';
    this.port = parseInt(process.env.DEPLOY_PORT) || 8080;
  }

  /**
   * Deploy project - builds and serves
   */
  async deploy(project, options = {}) {
    const deploymentId = `deploy_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const deployPath = path.join(this.deployDir, deploymentId);
    
    await fs.mkdir(deployPath, { recursive: true });
    
    // Record deployment
    await deployOps.create({
      id: deploymentId,
      projectId: project.id,
      status: 'deploying',
      url: this.getDeploymentUrl(deploymentId),
      config: { started_at: new Date().toISOString() }
    });

    try {
      // Build if needed
      let outputDir;
      if (options.skipBuild) {
        outputDir = project.path;
      } else {
        const buildResult = await buildService.build(project);
        outputDir = buildResult.outputDir;
      }
      
      // Copy build output to deployment directory
      await this.copyBuildOutput(outputDir, deployPath, project.framework);
      
      // Generate nginx config for this deployment
      await this.generateNginxConfig(deploymentId, deployPath, project.framework);
      
      // Start/reload nginx
      await this.reloadNginx();
      
      const url = this.getDeploymentUrl(deploymentId);
      
      // Update deployment record
      await deployOps.update(deploymentId, { status: 'active', url, completed_at: new Date().toISOString() });
      
      return { success: true, deploymentId, url, path: deployPath };
    } catch (error) {
      await deployOps.update(deploymentId, { status: 'failed', error: error.message, completed_at: new Date().toISOString() });
      throw error;
    }
  }

  async copyBuildOutput(src, dest, framework) {
    const { execSync } = await import('child_process');
    
    if (framework === 'nextjs') {
      // Next.js standalone output
      execSync(`cp -r "${src}"/* "${dest}/"`, { stdio: 'inherit' });
      // Copy public folder
      execSync(`cp -r "${path.join(src, '..', 'public')}" "${dest}/" 2>/dev/null || true`, { stdio: 'ignore' });
    } else {
      // Static output (Vite, etc.)
      execSync(`cp -r "${src}"/* "${dest}/"`, { stdio: 'inherit' });
    }
    
    // Create a simple server for SPAs
    await this.createSPAServer(dest, framework);
  }

  async createSPAServer(deployPath, framework) {
    // For SPAs, create a simple Express server that serves index.html for all routes
    if (['vite-react', 'vite-vue', 'vite-svelte'].includes(framework)) {
      const serverCode = `
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(join(__dirname)));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`SPA server running on port \${PORT}\`);
});
`;
      await fs.writeFile(path.join(deployPath, 'server.mjs'), serverCode);
      
      // Add package.json for the server
      const packageJson = {
        name: 'deployed-app',
        version: '1.0.0',
        type: 'module',
        main: 'server.mjs',
        scripts: { start: 'node server.mjs' },
        dependencies: { express: '^4.18.2' }
      };
      await fs.writeFile(path.join(deployPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      // Install deps
      execSync('npm install --production', { cwd: deployPath, stdio: 'inherit' });
    }
  }

  async generateNginxConfig(deploymentId, deployPath, framework) {
    const port = this.getAvailablePort();
    const url = this.getDeploymentUrl(deploymentId);
    const hostname = url.replace('http://', '').replace('https://', '');
    
    let upstreamConfig = '';
    if (['vite-react', 'vite-vue', 'vite-svelte', 'fullstack', 'express-api'].includes(framework)) {
      upstreamConfig = `
upstream ${deploymentId} {
    server 127.0.0.1:${port};
    keepalive 32;
}`;
    }
    
    const config = `${upstreamConfig}

server {
    listen 80;
    server_name ${hostname};
    
    location / {
        ${['vite-react', 'vite-vue', 'vite-svelte', 'fullstack', 'express-api'].includes(framework) 
          ? `proxy_pass http://${deploymentId};`
          : `root ${deployPath};
        try_files \\$uri \\$uri/ /index.html;`}
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://${deploymentId};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\$host;
    }
}`;

    const nginxConfDir = '/etc/nginx/sites-enabled';
    await fs.writeFile(path.join(nginxConfDir, `${deploymentId}.conf`), config);
  }

  async reloadNginx() {
    try {
      execSync('nginx -t && nginx -s reload', { stdio: 'inherit' });
    } catch (e) {
      console.warn('Nginx reload failed:', e.message);
    }
  }

  getAvailablePort() {
    // Simple port allocation - in production use a proper port manager
    return 3000 + Math.floor(Math.random() * 1000);
  }

  getDeploymentUrl(deploymentId) {
    const protocol = process.env.DEPLOY_SSL === 'true' ? 'https' : 'http';
    return `${protocol}://${deploymentId}.${this.domain}`;
  }

  /**
   * Stop deployment
   */
  async stopDeployment(deploymentId) {
    // Remove nginx config
    const nginxConfDir = '/etc/nginx/sites-enabled';
    const configPath = path.join(nginxConfDir, `${deploymentId}.conf`);
    try {
      await fs.unlink(configPath);
      await this.reloadNginx();
    } catch (e) {
      // Config might not exist
    }
    
    // Update database
    await deployOps.update(deploymentId, { status: 'stopped' });
    
    return { success: true };
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId) {
    // In production, integrate with logging system (PM2, Docker logs, etc.)
    return await deployOps.getLogs(deploymentId, 100);
  }
}

export const deployService = new DeployService();
export default deployService;
