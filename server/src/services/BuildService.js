import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { buildOps } from '../config/database.js';

class BuildService {
  constructor() {
    this.buildDir = process.env.BUILD_DIR || './data/builds';
  }

  /**
   * Build project for production
   */
  async build(project) {
    const buildId = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const buildPath = path.join(this.buildDir, buildId);
    
    await fs.mkdir(buildPath, { recursive: true });
    
    // Record build start
    await buildOps.create({ id: buildId, projectId: project.id, status: 'building' });

    try {
      // Copy project files
      await this.copyProject(project.path, buildPath);
      
      // Install dependencies
      await this.installDependencies(buildPath);
      
      // Run build command
      await this.runBuild(buildPath, project.framework);
      
      // Determine output directory
      const outputDir = this.getOutputDir(buildPath, project.framework);
      
      // Update build record
      await buildOps.update(buildId, { status: 'success', output_path: outputDir, completed_at: new Date().toISOString() });
      
      return { success: true, buildId, outputDir };
    } catch (error) {
      await buildOps.update(buildId, { status: 'failed', error: error.message, completed_at: new Date().toISOString() });
      throw error;
    }
  }

  async copyProject(src, dest) {
    const { execSync } = await import('child_process');
    execSync(`cp -r "${src}"/* "${dest}/" 2>/dev/null || true`, { stdio: 'inherit' });
    execSync(`cp -r "${src}"/.[^.]* "${dest}/" 2>/dev/null || true`, { stdio: 'ignore' });
  }

  async installDependencies(projectPath) {
    const hasPackageLock = await this.fileExists(path.join(projectPath, 'package-lock.json'));
    const hasYarnLock = await this.fileExists(path.join(projectPath, 'yarn.lock'));
    const hasPnpmLock = await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml'));
    
    let command = 'npm ci';
    if (hasYarnLock) command = 'yarn install --frozen-lockfile';
    else if (hasPnpmLock) command = 'pnpm install --frozen-lockfile';
    else if (!hasPackageLock) command = 'npm install';
    
    execSync(command, { cwd: projectPath, stdio: 'inherit', timeout: 120000 });
  }

  async runBuild(projectPath, framework) {
    const buildCommands = {
      'vite-react': 'npm run build',
      'vite-vue': 'npm run build',
      'vite-svelte': 'npm run build',
      'nextjs': 'npm run build',
      'express-api': 'echo "No build step for Express"',
      'fullstack': 'npm run build'
    };
    
    const command = buildCommands[framework] || 'npm run build';
    execSync(command, { cwd: projectPath, stdio: 'inherit', timeout: 180000 });
  }

  getOutputDir(buildPath, framework) {
    const outputDirs = {
      'vite-react': 'dist',
      'vite-vue': 'dist',
      'vite-svelte': 'dist',
      'nextjs': '.next/standalone',
      'express-api': '.',
      'fullstack': 'dist'
    };
    
    const outputDir = outputDirs[framework] || 'dist';
    return path.join(buildPath, outputDir);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get build history
   */
  async getBuilds(projectId) {
    return await buildOps.getByProject(projectId);
  }
}

export const buildService = new BuildService();
export default buildService;
