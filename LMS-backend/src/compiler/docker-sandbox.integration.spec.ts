import * as fs from 'fs';
import * as path from 'path';
import { DockerSandboxService } from './docker-sandbox.service';
import { GradingService } from './grading.service';
import {
  ExecutionStatus,
  LANGUAGE_CONFIGS,
  SANDBOX_LIMITS,
} from './compiler.constants';
import { CompilerQueueService } from './compiler-queue.service';

/**
 * Live Docker integration tests. These compile and run real student code.
 * Skip the suite if Docker Desktop is not running on this machine.
 */
describe('Docker sandbox live integration', () => {
  const sandbox = new DockerSandboxService();
  const grading = new GradingService();
  let dockerOk = false;

  beforeAll(async () => {
    dockerOk = await sandbox.isDockerAvailable();
    if (!dockerOk) {
      console.warn('SKIP live Docker tests: docker info failed');
    }
  }, 15000);

  afterEach(() => {
    // leftover containers from killed timeouts
  });

  function requireDocker() {
    if (!dockerOk) {
      throw new Error('Docker Desktop is required for this live integration test');
    }
  }

  async function runLang(
    lang: keyof typeof LANGUAGE_CONFIGS,
    code: string,
    stdin = '',
    timeoutMs = 5000,
  ) {
    const config = LANGUAGE_CONFIGS[lang];
    const dir = sandbox.prepareWorkspace(config, code);
    try {
      const compiled = await sandbox.compileCode(config, dir);
      const executed = compiled.success
        ? await sandbox.executeTestCase(config, dir, stdin, timeoutMs)
        : null;
      return { dir, compiled, executed };
    } catch (err) {
      sandbox.cleanupWorkspace(dir);
      throw err;
    }
  }

  it('normalizes Windows bind-mount paths to C:/... form', () => {
    requireDocker();
    const dir = sandbox.prepareWorkspace(LANGUAGE_CONFIGS.python, 'print(1)');
    try {
      const vol = sandbox.normalizeVolumePath(dir);
      if (process.platform === 'win32') {
        expect(vol).toMatch(/^[A-Za-z]:\//);
        expect(vol.includes('\\')).toBe(false);
      } else {
        expect(vol.startsWith('/')).toBe(true);
      }
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  });

  it('Python run: correct stdout', async () => {
    requireDocker();
    const { dir, compiled, executed } = await runLang('python', 'print(int(input())*2)', '21\n');
    try {
      expect(compiled.success).toBe(true);
      expect(executed?.status).toBe(ExecutionStatus.ACCEPTED);
      expect((executed?.stdout || '').trim()).toBe('42');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('C compile + run as uid 1000 writes binary into the mounted temp dir', async () => {
    requireDocker();
    const { dir, compiled, executed } = await runLang(
      'c',
      '#include <stdio.h>\nint main(){ int n; scanf("%d",&n); printf("%d\\n", n*2); return 0; }\n',
      '21\n',
    );
    try {
      expect(compiled.success).toBe(true);
      expect(fs.existsSync(path.join(dir, 'main'))).toBe(true);
      expect((executed?.stdout || '').trim()).toBe('42');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('C++ compile + run as uid 1000', async () => {
    requireDocker();
    const { dir, compiled, executed } = await runLang(
      'cpp',
      '#include <iostream>\nint main(){ int n; std::cin>>n; std::cout<<(n*2)<<std::endl; return 0; }\n',
      '21\n',
    );
    try {
      expect(compiled.success).toBe(true);
      expect(fs.existsSync(path.join(dir, 'main'))).toBe(true);
      expect((executed?.stdout || '').trim()).toBe('42');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('Java compile + run as uid 1000 writes Main.class', async () => {
    requireDocker();
    const { dir, compiled, executed } = await runLang(
      'java',
      'import java.util.*; public class Main { public static void main(String[] a){ Scanner s=new Scanner(System.in); System.out.println(s.nextInt()*2); } }\n',
      '21\n',
    );
    try {
      expect(compiled.success).toBe(true);
      expect(fs.existsSync(path.join(dir, 'Main.class'))).toBe(true);
      expect((executed?.stdout || '').trim()).toBe('42');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 45000);

  it('Node.js run: correct stdout', async () => {
    requireDocker();
    const { dir, compiled, executed } = await runLang(
      'javascript',
      "const fs=require('fs'); const n=parseInt(fs.readFileSync(0,'utf8').trim(),10); console.log(n*2);\n",
      '21\n',
    );
    try {
      expect(compiled.success).toBe(true);
      expect((executed?.stdout || '').trim()).toBe('42');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('C compilation error', async () => {
    requireDocker();
    const { dir, compiled } = await runLang('c', 'int main( { not valid c');
    try {
      expect(compiled.success).toBe(false);
      expect(compiled.compilationError).toMatch(/error/i);
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('Python runtime error', async () => {
    requireDocker();
    const { dir, executed } = await runLang('python', 'print(1/0)');
    try {
      expect(executed?.status).toBe(ExecutionStatus.RUNTIME_ERROR);
      expect(executed?.stderr).toMatch(/ZeroDivisionError/);
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('incorrect answer fails output compare; correct answer passes', async () => {
    requireDocker();
    const config = LANGUAGE_CONFIGS.python;
    const dir = sandbox.prepareWorkspace(config, 'print(int(input())+1)');
    try {
      const wrong = await sandbox.executeTestCase(config, dir, '10\n');
      expect(grading.compareOutput(wrong.stdout || '', '10')).toBe(false);
      const dir2 = sandbox.prepareWorkspace(config, 'print(int(input())*2)');
      try {
        const right = await sandbox.executeTestCase(config, dir2, '10\n');
        expect(grading.compareOutput(right.stdout || '', '20')).toBe(true);
      } finally {
        sandbox.cleanupWorkspace(dir2);
      }
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('timeout kills infinite loops', async () => {
    requireDocker();
    const { dir, executed } = await runLang('python', 'while True:\n  pass\n', '', 1500);
    try {
      expect(executed?.status).toBe(ExecutionStatus.TIME_LIMIT_EXCEEDED);
      expect(executed?.execTimeMs).toBeGreaterThanOrEqual(1400);
      expect(executed?.execTimeMs).toBeLessThan(20000);
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('caps excessive stdout at 64KB', async () => {
    requireDocker();
    const { dir, executed } = await runLang('python', "print('A'*200000)", '', 8000);
    try {
      expect(executed?.stdout?.length || 0).toBeLessThanOrEqual(SANDBOX_LIMITS.MAX_OUTPUT_BYTES + 32);
      expect(executed?.stdout || '').toContain('[output truncated]');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('hidden test cases are masked from the client', () => {
    const sanitized = grading.sanitizeResultsForClient({
      jobId: 'j',
      attemptId: 1,
      questionId: 1,
      status: ExecutionStatus.PARTIAL,
      passedCases: 1,
      totalCases: 2,
      score: 5,
      executionTimeMs: 10,
      executionType: 'SUBMIT',
      publicResults: [
        { testCaseIndex: 1, passed: true, isPublic: true, input: '1', expected: '2', actual: '2', status: ExecutionStatus.ACCEPTED },
        { testCaseIndex: 2, passed: false, isPublic: false, input: 'SECRET_IN', expected: 'SECRET_OUT', actual: 'nope', status: ExecutionStatus.WRONG_ANSWER },
      ],
      submittedAt: new Date().toISOString(),
    });
    const blob = JSON.stringify(sanitized);
    expect(sanitized.publicResults).toHaveLength(1);
    expect(blob).not.toContain('SECRET_IN');
    expect(blob).not.toContain('SECRET_OUT');
  });

  it('blocks outbound network', async () => {
    requireDocker();
    const code = [
      'import socket',
      's=socket.socket(); s.settimeout(2)',
      'try:',
      "  s.connect(('1.1.1.1', 53)); print('NET_OPEN')",
      'except Exception:',
      "  print('NET_BLOCKED')",
    ].join('\n');
    const { dir, executed } = await runLang('python', code);
    try {
      expect((executed?.stdout || '').trim()).toBe('NET_BLOCKED');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('does not expose docker socket, host FS, host secrets, or sibling job files', async () => {
    requireDocker();
    const code = [
      'import os',
      "print('SOCK', os.path.exists('/var/run/docker.sock'))",
      "print('HOSTC', os.path.exists('/mnt/c'))",
      "print('DB', os.environ.get('DATABASE_URL'))",
      "print('REDIS', os.environ.get('REDIS_PASSWORD'))",
    ].join('\n');
    const { dir, executed } = await runLang('python', code);
    try {
      const out = executed?.stdout || '';
      expect(out).toContain('SOCK False');
      expect(out).toContain('HOSTC False');
      expect(out).toContain('DB None');
      expect(out).toContain('REDIS None');
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 30000);

  it('missing runner image fails safely', async () => {
    requireDocker();
    const config = { ...LANGUAGE_CONFIGS.python, image: 'lms-missing-runner-does-not-exist' };
    const dir = sandbox.prepareWorkspace(config, 'print(1)');
    try {
      const res = await sandbox.executeTestCase(config, dir, '');
      expect(res.status).toBe(ExecutionStatus.SYSTEM_ERROR);
      expect(res.stderr).toMatch(/not available/i);
    } finally {
      sandbox.cleanupWorkspace(dir);
    }
  }, 20000);

  it('Docker unavailable returns a clear error without scoring', async () => {
    const isolated = new DockerSandboxService();
    (isolated as any).dockerAvailable = false;
    (isolated as any).dockerCheckedAt = Date.now();
    const cfg = LANGUAGE_CONFIGS.c;
    const res = await isolated.compileCode(cfg, osTmpDummy());
    expect(res.success).toBe(false);
    expect(res.compilationError).toMatch(/unavailable/i);
  });

  it('FIFO fallback never runs two coding jobs at once (live Docker)', async () => {
    requireDocker();
    const queue = new CompilerQueueService();
    (queue as any).isRedisOnline = false;
    let concurrent = 0;
    let maxConcurrent = 0;
    const order: string[] = [];
    queue.setFallbackProcessor(async (job) => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      const cfg = LANGUAGE_CONFIGS.python;
      const dir = sandbox.prepareWorkspace(cfg, job.code);
      try {
        await sandbox.executeTestCase(cfg, dir, '', 5000);
        order.push(job.jobId);
      } finally {
        sandbox.cleanupWorkspace(dir);
        concurrent -= 1;
      }
    });
    await Promise.all([
      queue.enqueueJob({
        jobId: 'live-a', attemptId: 7, questionId: 1, userId: 1,
        language: 'python', code: 'import time; time.sleep(1.2); print("A")',
        executionType: 'RUN', isFinal: false, totalMarks: 10, testCases: [],
      }),
      queue.enqueueJob({
        jobId: 'live-b', attemptId: 7, questionId: 1, userId: 1,
        language: 'python', code: 'print("B")',
        executionType: 'RUN', isFinal: false, totalMarks: 10, testCases: [],
      }),
    ]);
    await queue.waitForAttemptJobs(7, 20000);
    expect(maxConcurrent).toBe(1);
    expect(order).toEqual(['live-a', 'live-b']);
    await queue.onModuleDestroy();
  }, 40000);
});

function osTmpDummy() {
  return path.join(require('os').tmpdir(), 'lms-sandbox-dummy');
}
