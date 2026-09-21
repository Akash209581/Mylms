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
  private dockerAvailable = false;
  private dockerCheckedAt = 0;
  private static readonly DOCKER_CHECK_TTL_MS = 4000;

  /** Check whether Docker is installed and running */
  async isDockerAvailable(): Promise<boolean> {
    if (this.dockerCheckedAt && Date.now() - this.dockerCheckedAt < DockerSandboxService.DOCKER_CHECK_TTL_MS) {
      return this.dockerAvailable;
    }
    try {
      execSync('docker info --format "{{.ServerVersion}}"', { stdio: 'pipe', timeout: 12000 });
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
    }
    this.dockerCheckedAt = Date.now();
    return this.dockerAvailable;
  }

  imageExists(image: string): boolean {
    if (!image || /[\s;|&<>]/.test(image)) return false;
    try {
      execSync('docker image inspect ' + image, { stdio: 'pipe', timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert a host path to a Docker Desktop bind-mount source.
   * Verified on Windows: C:/Users/... is accepted by Docker Desktop WSL2.
   */
  normalizeVolumePath(p: string): string {
    const resolved = path.resolve(p);
    if (process.platform === 'win32') {
      return resolved.replace(/\\/g, '/');
    }
    return resolved;
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

  private sandboxDockerArgs(opts: {
    containerName: string;
    workspaceDir: string;
    writableWorkspace: boolean;
    interactive?: boolean;
    image: string;
  }): string[] {
    const source = this.normalizeVolumePath(opts.workspaceDir);
    const mode = opts.writableWorkspace ? 'rw' : 'ro';
    return [
      'run',
      '--name', opts.containerName,
      '--rm',
      ...(opts.interactive ? ['-i'] : []),
      '--network', SANDBOX_LIMITS.NETWORK,
      '--memory', SANDBOX_LIMITS.MEMORY,
      '--memory-swap', SANDBOX_LIMITS.MEMORY_SWAP,
      '--cpus', SANDBOX_LIMITS.CPUS,
      '--pids-limit', String(SANDBOX_LIMITS.PIDS_LIMIT),
      '--user', SANDBOX_LIMITS.USER,
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m',
      '--env', 'HOME=/tmp',
      '--env', 'TMPDIR=/tmp',
      '-v', `${source}:/workspace:${mode}`,
      '-w', '/workspace',
      opts.image,
    ];
  }

  resolveImage(config: LanguageRunnerConfig): string | null {
    const candidates = [
      config.image,
      config.languageKey === 'python' ? 'python-compiler' : undefined,
      config.languageKey === 'python' ? 'lms-python-runner' : undefined,
      config.languageKey === 'python' ? 'python:3.10-slim' : undefined,
      config.languageKey === 'c' || config.languageKey === 'cpp' ? 'c-compiler' : undefined,
      config.languageKey === 'c' || config.languageKey === 'cpp' ? 'lms-c-runner' : undefined,
      config.languageKey === 'c' || config.languageKey === 'cpp' ? 'gcc:latest' : undefined,
      config.languageKey === 'java' ? 'java-compiler' : undefined,
      config.languageKey === 'java' ? 'lms-java-runner' : undefined,
      config.languageKey === 'java' ? 'eclipse-temurin:17-jdk-jammy' : undefined,
      config.languageKey === 'javascript' ? 'javascript-compiler' : undefined,
      config.languageKey === 'javascript' ? 'lms-node-runner' : undefined,
      config.languageKey === 'javascript' ? 'node:18-slim' : undefined,
    ].filter(Boolean) as string[];

    for (const img of candidates) {
      if (this.imageExists(img)) return img;
    }
    return null;
  }

  /** Run compilation inside the language-specific Docker container */
  async compileCode(
    config: LanguageRunnerConfig,
    workspaceDir: string,
  ): Promise<{ success: boolean; compilationError?: string }> {
    if (!config.compileCmd) {
      return { success: true };
    }

    const isAvailable = await this.isDockerAvailable();
    if (!isAvailable) {
      return {
        success: false,
        compilationError: 'Docker sandbox engine is currently unavailable. Please contact the administrator.',
      };
    }

    const targetImage = this.resolveImage(config);
    if (!targetImage) {
      return {
        success: false,
        compilationError: `Runner image "${config.image}" is not available on this server.`,
      };
    }

    const containerName = `compile-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const dockerArgs = [
      ...this.sandboxDockerArgs({
        containerName,
        workspaceDir,
        writableWorkspace: true,
        image: targetImage,
      }),
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
    const unavailable = (stderr: string): RawExecutionResult => ({
      stdout: '',
      stderr,
      exitCode: 1,
      execTimeMs: 0,
      status: ExecutionStatus.SYSTEM_ERROR,
    });

    const isAvailable = await this.isDockerAvailable();
    if (!isAvailable) {
      return unavailable('Docker sandbox engine is currently unavailable. Please contact the administrator.');
    }

    const targetImage = this.resolveImage(config);
    if (!targetImage) {
      return unavailable(`Runner image "${config.image}" is not available on this server.`);
    }

    const containerName = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const dockerArgs = [
      ...this.sandboxDockerArgs({
        containerName,
        workspaceDir,
        writableWorkspace: false,
        interactive: true,
        image: targetImage,
      }),
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

      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });

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

      let stdoutTruncated = false;
      let stderrTruncated = false;

      child.stdout?.on('data', (d) => {
        if (stdoutTruncated) return;
        const chunk = d.toString();
        if (stdout.length + chunk.length > SANDBOX_LIMITS.MAX_OUTPUT_BYTES) {
          stdout = (stdout + chunk).slice(0, SANDBOX_LIMITS.MAX_OUTPUT_BYTES) + '\n[output truncated]';
          stdoutTruncated = true;
          return;
        }
        stdout += chunk;
      });

      child.stderr?.on('data', (d) => {
        if (stderrTruncated) return;
        const chunk = d.toString();
        if (stderr.length + chunk.length > SANDBOX_LIMITS.MAX_OUTPUT_BYTES) {
          stderr = (stderr + chunk).slice(0, SANDBOX_LIMITS.MAX_OUTPUT_BYTES) + '\n[output truncated]';
          stderrTruncated = true;
          return;
        }
        stderr += chunk;
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
    if (!name || /[\s;|&<>]/.test(name)) return;
    try {
      execSync('docker rm -f ' + name, { stdio: 'ignore', timeout: 2000 });
    } catch {}
  }
}
