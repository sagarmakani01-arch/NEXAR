import { ollamaService } from './OllamaService.js';
import { fileService } from './FileService.js';
import { projectManager } from './ProjectManager.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const AGENT_SYSTEM_PROMPT = `You are a coding agent that writes files to disk.

First, list the project directory with [LIST DIR:] to see existing files.
Then read files you need to understand with [READ FILE: path].
Finally, write new files or modify existing ones using:

[WRITE FILE: path/to/file.ext]
... file content here ...
[/WRITE FILE]

Rules:
- Wrap EVERY file in [WRITE FILE: path] [/WRITE FILE]
- Output ONLY the blocks — no markdown, no conversation, no explanations
- Always write complete, working, production-ready code
- HTML/CSS/JS projects: write index.html, style.css, script.js as needed
- React projects: write src/App.jsx, src/App.css, src/index.css, index.html
- After writing files, verify with [LIST DIR:]

Available commands:
[READ FILE: path]
[LIST DIR: path]
[DELETE FILE: path]
[RUN: command]`;

export class AgentService {
  async run(socket, projectId, userMessage, conversationHistory = [], options = {}) {
    console.log('[AgentService.run] starting for project', projectId);
    const project = await projectManager.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const projectPath = project.path;
    console.log('[AgentService.run] project path:', projectPath);

    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...conversationHistory.slice(-20),
      { role: 'user', content: userMessage }
    ];

    const maxIterations = 30;

    for (let i = 0; i < maxIterations; i++) {
      console.log('[AgentService.run] iteration', i + 1, 'messages count:', messages.length);
      socket.emit('agent:step', { iteration: i + 1, step: 'Processing...' });

      let fullResponse = '';
      for await (const chunk of ollamaService.chat(messages, {
        modelId: options.modelId,
        params: { temperature: 0.3, max_tokens: 8192 }
      })) {
        fullResponse += chunk;
      }

      const preview = fullResponse.length > 120 ? fullResponse.slice(0, 120) + '...' : fullResponse;
      console.log('[AgentService.run] response:', JSON.stringify(preview));

      messages.push({ role: 'assistant', content: fullResponse });

      const blocks = this.parseBlocks(fullResponse);
      console.log('[AgentService.run] parsed blocks:', blocks.length, blocks.map(b => b.tool + ':' + (b.args.path || b.args.command || '')));

      if (blocks.length === 0) {
        if (i === 0 && fullResponse.trim()) {
          console.log('[AgentService.run] no blocks on first try, asking model to retry with code');
          messages.push({ role: 'system', content: `Write the actual code files now using [WRITE FILE: path] ... [/WRITE FILE] or triple backtick blocks. Output file content only, no explanations.` });
          continue;
        }
        console.log('[AgentService.run] no blocks, completing');
        socket.emit('agent:complete', { message: fullResponse, iterations: i + 1 });
        return;
      }

      for (const block of blocks) {
        socket.emit('agent:action', {
          iteration: i + 1,
          tool: block.tool,
          args: block.args
        });

        let result;
        let success = true;
        try {
          result = await this.executeBlock(projectPath, block);
        } catch (error) {
          success = false;
          result = { error: error.message };
        }

        socket.emit('agent:result', {
          iteration: i + 1,
          tool: block.tool,
          success,
          result
        });

        if (block.tool === 'write_file') {
          const relPath = block.args.path;
          messages.push({
            role: 'system',
            content: `[RESULT] Wrote ${relPath} (${result.size || '?'} bytes)[/RESULT]`
          });
        } else if (block.tool === 'read_file') {
          messages.push({
            role: 'system',
            content: `[RESULT] Contents of ${block.args.path} (${(result.content || '').length} chars):\n${(result.content || '').slice(0, 2000)}[/RESULT]`
          });
        } else if (block.tool === 'list_dir') {
          const files = result.files || [];
          const listing = files.map(f => `${f.type === 'directory' ? '📁' : '📄'} ${f.path}`).join('\n');
          messages.push({
            role: 'system',
            content: `[RESULT] Project files:\n${listing}[/RESULT]`
          });
        } else if (block.tool === 'delete_file') {
          messages.push({
            role: 'system',
            content: `[RESULT] Deleted ${block.args.path}[/RESULT]`
          });
        } else if (block.tool === 'run_command') {
          const output = result.stdout || result.stderr || '';
          messages.push({
            role: 'system',
            content: `[RESULT] Command output (${output.length} chars):\n${output.slice(0, 1000)}[/RESULT]`
          });
        }
      }
    }

    socket.emit('agent:error', { message: 'Agent reached the maximum number of steps without completing.' });
  }

  parseBlocks(response) {
    const blocks = [];

    // Helper: check if content looks like code (not natural language explanation)
    const isCodeContent = (text) => {
      if (text.length < 30) return false;
      const codePatterns = [
        /<[a-zA-Z!]/, /function\s/, /const\s/, /let\s/, /var\s/, /import\s/,
        /export\s/, /class\s/, /def\s/, /interface\s/, /type\s/,
        /{[\s\S]*}/, /;[\s\n]/, /=>/, /```/, /\/\//, /\/\*/,
        /^\s*(html|head|body|div|script|style|template)/im
      ];
      return codePatterns.some(p => p.test(text));
    };

    // 1. Parse markdown code fences (most reliable for smaller models)
    const fenceRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    while ((match = fenceRegex.exec(response)) !== null) {
      const content = match[2].trim();
      if (!content) continue;
      let path = this._inferFilename(content, blocks, response);
      blocks.push({
        tool: 'write_file',
        args: { path, content }
      });
    }

    // 2. Also parse [WRITE FILE: path]...[/WRITE FILE] blocks, but skip false positives
    const writeRegex = /\[WRITE FILE:\s*(.+?)\]\n?([\s\S]*?)\n?\[\/WRITE FILE\]/g;
    while ((match = writeRegex.exec(response)) !== null) {
      const path = match[1].trim();
      const content = match[2].trim();
      // Skip false positives where content is natural language explanation
      if (!isCodeContent(content) && this._isExplanatoryText(content)) continue;
      // Avoid duplicate if already captured via code fence
      if (blocks.some(b => b.tool === 'write_file' && b.args.path === path)) continue;
      blocks.push({
        tool: 'write_file',
        args: { path, content }
      });
    }

    // 3. Parse [READ FILE: path]
    const readRegex = /\[READ FILE:\s*(.+?)\]/g;
    while ((match = readRegex.exec(response)) !== null) {
      blocks.push({
        tool: 'read_file',
        args: { path: match[1].trim() }
      });
    }

    // 4. Parse [LIST DIR: path]
    const listRegex = /\[LIST DIR:\s*(.*?)\]/g;
    while ((match = listRegex.exec(response)) !== null) {
      blocks.push({
        tool: 'list_dir',
        args: { path: match[1].trim() || '' }
      });
    }

    // 5. Parse [DELETE FILE: path]
    const deleteRegex = /\[DELETE FILE:\s*(.+?)\]/g;
    while ((match = deleteRegex.exec(response)) !== null) {
      blocks.push({
        tool: 'delete_file',
        args: { path: match[1].trim() }
      });
    }

    // 6. Parse [RUN: command]
    const runRegex = /\[RUN:\s*(.+?)\]/g;
    while ((match = runRegex.exec(response)) !== null) {
      blocks.push({
        tool: 'run_command',
        args: { command: match[1].trim() }
      });
    }

    return blocks;
  }

  _isExplanatoryText(text) {
    const explanatory = [
      'this file', 'the file', 'here is', 'here\'s', 'you can',
      'note that', 'please note', 'this code', 'the code',
      'this will', 'this creates', 'this is', 'would look',
      'are used', 'designed for', 'typically'
    ];
    const lower = text.toLowerCase().slice(0, 100);
    return explanatory.some(e => lower.includes(e));
  }

  _inferFilename(content, existingBlocks, responseText) {
    const lines = responseText.split('\n');
    let lastMeaningfulLine = '';
    for (const line of lines) {
      if (line.includes(content.slice(0, 40))) break;
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('[')) {
        lastMeaningfulLine = trimmed;
      }
    }

    const pathMatch = lastMeaningfulLine.match(/(?:file|path)\s*[:`]\s*([\w./\\-]+\.[\w]+)/i);
    if (pathMatch) return pathMatch[1];

    const barePathMatch = lastMeaningfulLine.match(/([\w./\\-]+\.[\w]+)/);
    if (barePathMatch) return barePathMatch[1];

    const firstLine = content.split('\n')[0].trim();
    const inlinePath = firstLine.match(/(?:\/\/|#|--)\s*([\w./\\-]+\.[\w]+)/);
    if (inlinePath) return inlinePath[1];

    if (content.includes('<!DOCTYPE html>') || content.includes('<html') || content.includes('</html>')) return 'index.html';
    if (content.includes('<script') && content.includes('</script>') && !content.includes('<!DOCTYPE html>')) return 'index.html';
    if (content.includes('React') && content.match(/export\s+default/)) return 'src/App.jsx';
    if (content.startsWith('{') && content.includes('"scripts"')) return 'package.json';
    if (content.includes('@tailwind') || content.includes('tailwindcss')) return 'tailwind.config.js';
    if (content.includes('vite') && content.includes('defineConfig')) return 'vite.config.js';
    if (content.includes('module.exports')) return 'src/App.jsx';
    if (content.includes('@import') || content.includes('@use') || content.includes('body') && content.includes('margin')) return 'src/index.css';
    if (content.includes('function') && (content.includes('App') || content.includes('app'))) return 'src/App.jsx';

    return 'src/App.jsx';
  }

  async executeBlock(projectPath, block) {
    switch (block.tool) {
      case 'write_file': {
        // Strip markdown code fences if present
        let content = block.args.content;
        content = content.replace(/^```\w*\s*\n/gm, '').replace(/```\s*$/gm, '').trim();
        const result = await fileService.writeFile(projectPath, block.args.path, content);
        // Invalidate preview build cache
        const distDir = path.join(projectPath, 'dist');
        try { await fs.rm(distDir, { recursive: true, force: true }); } catch {}
        return { written: block.args.path, size: content.length };
      }

      case 'read_file': {
        const content = await fileService.readFile(projectPath, block.args.path);
        return { content };
      }

      case 'list_dir': {
        const tree = await fileService.getFileTree(projectPath);
        return { files: tree };
      }

      case 'delete_file': {
        await fileService.deleteFile(projectPath, block.args.path);
        return { deleted: block.args.path };
      }

      case 'run_command': {
        const { stdout, stderr } = await execAsync(block.args.command, {
          cwd: projectPath,
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, PATH: process.env.PATH }
        });
        return { stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 2000) };
      }

      default:
        throw new Error(`Unknown tool: ${block.tool}`);
    }
  }
}

export const agentService = new AgentService();
