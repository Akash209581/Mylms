import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, execSync } from 'child_process';
import {
  ExecutionStatus,
  LanguageRunnerConfig,
  SANDBOX_LIMITS,
} from './compiler.constants';

export interface RawExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  execTimeMs: number;
  status: ExecutionStatus;
  oomKilled?: boolean;
}

@Injectable()
export class DockerSandboxService {
  private readonly logger = new Logger(DockerSandboxService.name);
  private dockerChecked = false;
  private dockerAvailable = false;

  /** Check whether Docker is installed and running */
  async isDockerAvailable(): Promise<boolean> {
    try {
      execSync('docker info --format "{{.ServerVersion}}"', { stdio: 'pipe', timeout: 3000 });
      this.dockerAvailable = true;
      return true;
    } catch {
      this.dockerAvailable = false;
      return false;
    }
  }

  /** Prepare an isolated temporary directory with student code */
  prepareWorkspace(config: LanguageRunnerConfig, code: string): string {
    const tempBase = path.join(os.tmpdir(), 'lms-sandbox');
    if (!fs.existsSync(tempBase)) {
      fs.mkdirSync(tempBase, { recursive: true });
    }
    const jobDir = fs.mkdtempSync(path.join(tempBase, 'job-'));
    const filePath = path.join(jobDir, config.sourceFile);
    fs.writeFileSync(filePath, code, { encoding: 'utf-8', mode: 0o644 });
    return jobDir;
  }

  /** Safely cleanup temporary workspace directory */
  cleanupWorkspace(workspaceDir: string) {
    try {
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    } catch (err) {
      this.logger.warn(`Failed to cleanup workspace ${workspaceDir}: ${err.message}`);
    }
  }

  /** Run compilation inside the language-specific Docker container */
  async compileCode(
    config: LanguageRunnerConfig,
    workspaceDir: string,
  ): Promise<{ success: boolean; compilationError?: string }> {
    if (!config.compileCmd) {
      return { success: true };
    }

    const containerName = `compile-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const normalizedDir = this.normalizeVolumePath(workspaceDir);

    const dockerArgs = [
      'run',
      '--name', containerName,
      '--rm',
      '--network', SANDBOX_LIMITS.NETWORK,
      '--memory', SANDBOX_LIMITS.MEMORY,
      '--memory-swap', SANDBOX_LIMITS.MEMORY_SWAP,
      '--cpus', SANDBOX_LIMITS.CPUS,
      '--pids-limit', String(SANDBOX_LIMITS.PIDS_LIMIT),
      '--security-opt', 'no-new-privileges',
      '-v', `${normalizedDir}:/workspace:rw`,
      '-w', '/workspace',
      config.image,
      'sh', '-c', config.compileCmd,
    ];

    try {
      const res = await this.spawnProcess('docker', dockerArgs, '', SANDBOX_LIMITS.COMPILE_TIME_LIMIT_MS, containerName);
      if (res.exitCode !== 0) {
        return {
          success: false,
          compilationError: (res.stderr || res.stdout || 'Compilation failed').trim(),
        };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        compilationError: `Compilation system error: ${err.message}`,
      };
    } finally {
      this.forceKillContainer(containerName);
    }
  }

  /** Run single test case execution inside the language-specific Docker container */
  async executeTestCase(
    config: LanguageRunnerConfig,
    workspaceDir: string,
    stdin: string,
    timeoutMs: number = SANDBOX_LIMITS.TIME_LIMIT_MS,
  ): Promise<RawExecutionResult> {
    const isAvailable = await this.isDockerAvailable();
    if (!isAvailable) {
      return {
        stdout: '',
        stderr: 'Docker sandbox engine is currently unavailable. Please contact the administrator.',
        exitCode: 1,
        execTimeMs: 0,
        status: ExecutionStatus.SYSTEM_ERROR,
      };
    }

    const containerName = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const normalizedDir = this.normalizeVolumePath(workspaceDir);

    const dockerArgs = [
      'run',
      '-i',
      '--name', containerName,
      '--rm',
      '--network', SANDBOX_LIMITS.NETWORK,
      '--memory', SANDBOX_LIMITS.MEMORY,
      '--memory-swap', SANDBOX_LIMITS.MEMORY_SWAP,
      '--cpus', SANDBOX_LIMITS.CPUS,
      '--pids-limit', String(SANDBOX_LIMITS.PIDS_LIMIT),
      '--security-opt', 'no-new-privileges',
      '-v', `${normalizedDir}:/workspace:ro`,
      '-w', '/workspace',
      config.image,
      'sh', '-c', config.runCmd,
    ];

    try {
      return await this.spawnProcess('docker', dockerArgs, stdin, timeoutMs, containerName);
    } finally {
      this.forceKillContainer(containerName);
    }
  }

  /** Spawns a container process, feeds stdin, handles timeouts, and measures execution time */
  private spawnProcess(
    cmd: string,
    args: string[],
    stdin: string,
    timeoutMs: number,
    containerName?: string,
  ): Promise<RawExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;
      let hasEnded = false;

      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      const timer = setTimeout(() => {
        isTimedOut = true;
        if (containerName) {
          this.forceKillContainer(containerName);
        }
        try {
          child.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      if (stdin && child.stdin) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {}
      } else if (child.stdin) {
        child.stdin.end();
      }

      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        if (hasEnded) return;
        hasEnded = true;
        resolve({
          stdout,
          stderr: `Process launch failed: ${err.message}`,
          exitCode: 1,
          execTimeMs: Date.now() - startTime,
          status: ExecutionStatus.SYSTEM_ERROR,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (hasEnded) return;
        hasEnded = true;
        const execTimeMs = Date.now() - startTime;

        if (isTimedOut) {
          resolve({
            stdout,
            stderr: 'Time Limit Exceeded (execution exceeded allowed timeout)',
            exitCode: 124,
            execTimeMs,
            status: ExecutionStatus.TIME_LIMIT_EXCEEDED,
          });
          return;
        }

        // Docker exit code 137 is SIGKILL (often OOM)
        const oomKilled = code === 137;
        let status = ExecutionStatus.ACCEPTED;
        if (oomKilled) {
          status = ExecutionStatus.MEMORY_LIMIT_EXCEEDED;
        } else if (code !== 0) {
          status = ExecutionStatus.RUNTIME_ERROR;
        }

        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
          execTimeMs,
          status,
          oomKilled,
        });
      });
    });
  }

  /** Force kill a container if still active */
  private forceKillContainer(name: string) {
    try {
      execSync(`docker rm -f ${name}`, { stdio: 'ignore', timeout: 2000 });
    } catch {}
  }

  /** Converts Windows paths to Unix-friendly Docker volume format */
  private normalizeVolumePath(p: string): string {
    return p.replace(/\\/g, '/');
  }
}
