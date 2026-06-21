import { spawn } from 'child_process';
import treeKill from 'tree-kill';
import { projectManager } from './ProjectManager.js';

const activeProcesses = new Map();

class TerminalService {
  async execute(socket, projectId, command) {
    const project = await projectManager.getProject(projectId);
    if (!project) {
      socket.emit('terminal:error', { message: 'Project not found' });
      return;
    }

    const cwd = project.path;

    socket.emit('terminal:output', { output: `$ ${command}\n`, cwd });

    const proc = spawn(command, [], {
      cwd,
      shell: true,
      env: { ...process.env, PATH: process.env.PATH },
      windowsHide: true
    });

    const key = `${socket.id}:${projectId}`;
    activeProcesses.set(key, proc);

    proc.stdout.on('data', (data) => {
      socket.emit('terminal:output', { output: data.toString(), cwd });
    });

    proc.stderr.on('data', (data) => {
      socket.emit('terminal:output', { output: data.toString(), cwd });
    });

    proc.on('close', (code) => {
      socket.emit('terminal:output', { output: `\n[Process exited with code ${code}]\n`, cwd });
      activeProcesses.delete(key);
    });

    proc.on('error', (err) => {
      socket.emit('terminal:error', { message: err.message, cwd });
      activeProcesses.delete(key);
    });
  }

  kill(socketId, projectId) {
    const key = `${socketId}:${projectId}`;
    const proc = activeProcesses.get(key);
    if (proc) {
      treeKill(proc.pid);
      activeProcesses.delete(key);
    }
  }

  killAll() {
    for (const [key, proc] of activeProcesses) {
      treeKill(proc.pid);
    }
    activeProcesses.clear();
  }

  killAllForSocket(socketId) {
    for (const [key, proc] of activeProcesses) {
      if (key.startsWith(`${socketId}:`)) {
        treeKill(proc.pid);
        activeProcesses.delete(key);
      }
    }
  }
}

export const terminalService = new TerminalService();
export default terminalService;
