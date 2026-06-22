import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { projectManager } from '../services/ProjectManager.js';
import { fileService } from '../services/FileService.js';
import { ollamaService } from '../services/OllamaService.js';
import { agentService } from '../services/AgentService.js';
import { terminalService } from '../services/TerminalService.js';
import { rateMonitor } from '../services/ProviderRateMonitor.js';

const connectedClients = new Map(); // socketId -> { userId, projectId, cursor }

export function initializeWebSocket(server, allowedOrigins = ['*']) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (User: ${socket.userId})`);
    connectedClients.set(socket.id, { userId: socket.userId });

    // Join project room
    socket.on('join-project', async ({ projectId }) => {
      const project = await projectManager.getProject(projectId);
      if (!project || project.user_id !== socket.userId) {
        socket.emit('error', { message: 'Project not found or access denied' });
        return;
      }

      socket.join(`project:${projectId}`);
      const client = connectedClients.get(socket.id);
      if (client) client.projectId = projectId;
      
      // Send current file tree
      socket.emit('file-tree', { files: project.files });
      
      // Notify others
      socket.to(`project:${projectId}`).emit('user-joined', { 
        userId: socket.userId, 
        socketId: socket.id 
      });
    });

    // File operations
    socket.on('file:read', async ({ projectId, filePath }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }
        
        const content = await fileService.readFile(project.path, filePath);
        socket.emit('file:content', { filePath, content });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('file:write', async ({ projectId, filePath, content }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }
        
        await fileService.writeFile(project.path, filePath, content);
        
        // Broadcast to other clients in project
        socket.to(`project:${projectId}`).emit('file:changed', { 
          filePath, 
          content,
          userId: socket.userId 
        });
        
        socket.emit('file:saved', { filePath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('file:create', async ({ projectId, filePath, content }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }
        await fileService.createFile(project.path, filePath, content);
        
        io.to(`project:${projectId}`).emit('file:created', { filePath });
        socket.emit('file:created', { filePath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('file:delete', async ({ projectId, filePath }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }
        await fileService.deleteFile(project.path, filePath);
        
        io.to(`project:${projectId}`).emit('file:deleted', { filePath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('file:rename', async ({ projectId, oldPath, newPath }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }
        await fileService.renameFile(project.path, oldPath, newPath);
        
        io.to(`project:${projectId}`).emit('file:renamed', { oldPath, newPath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Cursor position sharing
    socket.on('cursor:move', ({ projectId, filePath, position, selection }) => {
      connectedClients.get(socket.id).cursor = { filePath, position, selection };
      socket.to(`project:${projectId}`).emit('cursor:update', {
        userId: socket.userId,
        socketId: socket.id,
        filePath,
        position,
        selection
      });
    });

    // AI Chat
    socket.on('ai:chat', async ({ projectId, messages, context, options }) => {
      try {
        if (projectId) {
          const project = await projectManager.getProject(projectId);
          if (!project || project.user_id !== socket.userId) {
            return socket.emit('ai:error', { message: 'Access denied' });
          }
        }

        for await (const chunk of ollamaService.chat(messages, {
          systemPrompt: options?.systemPrompt,
          modelId: options?.modelId,
          params: { ...options?.params, timeout: 60000 }
        })) {
          socket.emit('ai:chunk', { chunk });
        }
        
        socket.emit('ai:complete', { projectId });
      } catch (error) {
        socket.emit('ai:error', { message: error.message });
      }
    });

    // AI Code Generation — streams response to chat AND writes files to project
    socket.on('ai:generate', async ({ projectId, prompt, context, options }) => {
      try {
        if (projectId) {
          const project = await projectManager.getProject(projectId);
          if (!project || project.user_id !== socket.userId) {
            return socket.emit('ai:error', { message: 'Access denied' });
          }
        }

        let fullResponse = '';
        for await (const chunk of ollamaService.generateCode(prompt, context, options)) {
          fullResponse += chunk;
          socket.emit('ai:chunk', { chunk });
        }

        // Parse and write files from the response
        if (projectId) {
          const project = await projectManager.getProject(projectId);
          const files = parseAIFiles(fullResponse);
          let fileCount = 0;
          for (const [filePath, content] of Object.entries(files)) {
            try {
              await fileService.writeFile(project.path, filePath, content);
              fileCount++;
              io.to(`project:${projectId}`).emit('file:created', { filePath, content });
            } catch (fileErr) {
              console.error(`[ai:generate] Skipping "${filePath}": ${fileErr.message}`);
            }
          }
          if (fileCount > 0) {
            socket.emit('ai:chunk', { chunk: `\n\n✅ Generated ${fileCount} file(s): ${Object.keys(files).join(', ')}` });
          }
        }
        
        socket.emit('ai:complete', { projectId });
      } catch (error) {
        socket.emit('ai:error', { message: error.message });
      }
    });

    // AI Agent (tool-calling mode)
    socket.on('agent:chat', async ({ projectId, message, history, modelId }) => {
      try {
        if (projectId) {
          const project = await projectManager.getProject(projectId);
          if (!project || project.user_id !== socket.userId) {
            return socket.emit('agent:error', { message: 'Access denied' });
          }
        }

        await agentService.run(socket, projectId, message, history || [], { modelId });
      } catch (error) {
        socket.emit('agent:error', { message: error.message });
      }
    });

    // Project build
    socket.on('project:build', async ({ projectId }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.emit('build:started', { projectId });
        
        const result = await projectManager.buildProject(projectId);
        
        socket.emit('build:complete', { projectId, ...result });
      } catch (error) {
        socket.emit('build:failed', { projectId, error: error.message });
      }
    });

    // Project deploy
    socket.on('project:deploy', async ({ projectId, options }) => {
      try {
        const project = await projectManager.getProject(projectId);
        if (!project || project.user_id !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.emit('deploy:started', { projectId });
        
        const result = await projectManager.deployProject(projectId, options);
        
        socket.emit('deploy:complete', { projectId, ...result });
      } catch (error) {
        socket.emit('deploy:failed', { projectId, error: error.message });
      }
    });

    // Terminal execution
    socket.on('terminal:command', ({ projectId, command }) => {
      if (!command || !command.trim()) return;
      terminalService.execute(socket, projectId, command.trim());
    });

    socket.on('terminal:kill', ({ projectId }) => {
      terminalService.kill(socket.id, projectId);
    });

    socket.on('disconnect', () => {
      terminalService.killAllForSocket(socket.id);
    });

    // Disconnect
    socket.on('disconnect', () => {
      const client = connectedClients.get(socket.id);
      if (client?.projectId) {
        socket.to(`project:${client.projectId}`).emit('user-left', { 
          userId: socket.userId 
        });
      }
      connectedClients.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Rate monitor notifications — broadcast to all connected clients
  rateMonitor.onMilacheck(({ provider, percent, milestone }) => {
    const limits = rateMonitor.getLimits(provider);
    const used = rateMonitor.getDailyUsage(provider);
    const msg = {
      type: 'usage_warning',
      provider,
      percent,
      used,
      limit: limits.daily,
      message: `${limits.name}: ${percent}% used (${used}/${limits.daily} requests)`
    };
    // If at 80%+, also include fallback info
    if (percent >= 80) {
      msg.fallback = true;
      msg.fallbackProvider = 'Ollama (local)';
      msg.message += ' — auto-switched to local Ollama';
    }
    io.emit('notification', msg);
  });

  return io;
}

// Parse AI response for file blocks — supports ===FILE=== format and markdown code blocks with paths
function parseAIFiles(response) {
  const files = {};

  // Try ===FILE: path===...===ENDFILE=== format
  const fileRegex = /===FILE:\s*(.+?)===\n([\s\S]*?)===ENDFILE===/g;
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    let filePath = match[1].trim().replace(/^[/\\]+|[/\\]+$/g, '');
    if (filePath) files[filePath] = match[2].trim();
  }

  // Fallback: try markdown code blocks with file path in the opening tag
  if (Object.keys(files).length === 0) {
    const blockRegex = /```(?:\w+)?\s*(?:\/\/)?\s*([^\n]+?\.\w+)\s*\n([\s\S]*?)```/g;
    while ((match = blockRegex.exec(response)) !== null) {
      let filePath = match[1].trim().replace(/^[/\\]+|[/\\]+$/g, '');
      if (filePath) files[filePath] = match[2].trim();
    }
  }

  return files;
}
