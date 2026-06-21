import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

class FileService {
  constructor() {
    this.watchers = new Map();
  }

  /**
   * Get file tree for a project
   */
  async getFileTree(projectPath) {
    const tree = await this.buildTree(projectPath);
    return tree;
  }

  async buildTree(dir, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const children = [];

    for (const entry of entries) {
      if (this.shouldIgnore(entry.name)) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        children.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children: await this.buildTree(fullPath, relPath)
        });
      } else {
        const stats = await fs.stat(fullPath);
        children.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          size: stats.size,
          extension: path.extname(entry.name).slice(1)
        });
      }
    }

    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  shouldIgnore(name) {
    const ignored = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.DS_Store'];
    return ignored.includes(name) || name.startsWith('.');
  }

  /**
   * Read file content
   */
  async readFile(projectPath, filePath) {
    const fullPath = path.join(projectPath, filePath);
    // Security: prevent directory traversal
    if (!fullPath.startsWith(path.resolve(projectPath))) {
      throw new Error('Invalid file path');
    }
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write file content
   */
  async writeFile(projectPath, filePath, content) {
    const fullPath = path.join(projectPath, filePath);
    if (!fullPath.startsWith(path.resolve(projectPath))) {
      throw new Error('Invalid file path');
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true, path: filePath };
  }

  /**
   * Create file
   */
  async createFile(projectPath, filePath, content = '') {
    return this.writeFile(projectPath, filePath, content);
  }

  /**
   * Delete file or directory
   */
  async deleteFile(projectPath, filePath) {
    const fullPath = path.join(projectPath, filePath);
    if (!fullPath.startsWith(path.resolve(projectPath))) {
      throw new Error('Invalid file path');
    }
    await fs.rm(fullPath, { recursive: true, force: true });
    return { success: true };
  }

  /**
   * Rename/move file
   */
  async renameFile(projectPath, oldPath, newPath) {
    const fullOldPath = path.join(projectPath, oldPath);
    const fullNewPath = path.join(projectPath, newPath);
    
    if (!fullOldPath.startsWith(path.resolve(projectPath)) || 
        !fullNewPath.startsWith(path.resolve(projectPath))) {
      throw new Error('Invalid file path');
    }
    
    await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
    await fs.rename(fullOldPath, fullNewPath);
    return { success: true, oldPath, newPath };
  }

  /**
   * Watch project for changes
   */
  watchProject(projectId, projectPath, onChange) {
    if (this.watchers.has(projectId)) {
      this.watchers.get(projectId).close();
    }

    const watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\\/])\..|node_modules|dist|build|\.git/,
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('all', (event, filePath) => {
      const relativePath = path.relative(projectPath, filePath);
      if (onChange) onChange(projectId, event, relativePath);
    });

    this.watchers.set(projectId, watcher);
    return watcher;
  }

  unwatchProject(projectId) {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectId);
    }
  }

  flattenTree(projectPath) {
    return this._flatten(projectPath, '');
  }

  async _flatten(dir, relativePath) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (this.shouldIgnore(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this._flatten(fullPath, relPath));
      } else {
        files.push({ name: entry.name, path: relPath });
      }
    }
    return files;
  }

  async searchText(projectPath, pattern) {
    const results = [];
    const files = await this._flatten(projectPath, '');
    const textExtensions = new Set([
      'js','jsx','ts','tsx','json','html','css','scss','less','md','txt',
      'py','rb','java','go','rs','c','cpp','h','hpp','php','vue','svelte',
      'yaml','yml','toml','ini','cfg','sh','bash','env','gitignore','dockerfile',
      'xml','svg','sql','graphql','prisma'
    ]);
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !textExtensions.has(ext)) continue;
      try {
        const content = await fs.readFile(path.join(projectPath, file.path), 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(pattern.toLowerCase())) {
            results.push({ file: file.path, line: i + 1, column: lines[i].indexOf(pattern) + 1, text: lines[i].trim().slice(0, 120) });
            if (results.length >= 100) return results;
          }
        }
      } catch {}
    }
    return results;
  }
}

export const fileService = new FileService();
export default fileService;
