import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export class ClaudeRunner extends EventEmitter {
  constructor() {
    super();
    this.activeProcess = null;
    this.currentTaskId = null;
  }

  isRunning() {
    return this.activeProcess !== null;
  }

  run(taskId, { prompt, projectDir, allowedTools }) {
    if (this.isRunning()) {
      throw new Error(`Already running task ${this.currentTaskId}`);
    }

    this.currentTaskId = taskId;
    const output = [];
    const args = ['--print', '--output-format', 'text'];

    if (allowedTools) {
      for (const tool of allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    args.push(prompt);

    const proc = spawn('claude', args, {
      cwd: projectDir || process.env.HOME,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.activeProcess = proc;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output.push(text);
      this.emit('output', { taskId, text, stream: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      output.push(text);
      this.emit('output', { taskId, text, stream: 'stderr' });
    });

    return new Promise((resolve, reject) => {
      proc.on('close', (code) => {
        this.activeProcess = null;
        this.currentTaskId = null;
        const fullOutput = output.join('');

        if (code === 0) {
          this.emit('done', { taskId, output: fullOutput, code });
          resolve({ output: fullOutput, code });
        } else {
          this.emit('error', { taskId, output: fullOutput, code });
          reject(new Error(`Claude exited with code ${code}: ${fullOutput.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        this.activeProcess = null;
        this.currentTaskId = null;
        this.emit('error', { taskId, error: err.message });
        reject(err);
      });
    });
  }

  abort() {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
      const taskId = this.currentTaskId;
      this.currentTaskId = null;
      this.emit('aborted', { taskId });
      return true;
    }
    return false;
  }
}
