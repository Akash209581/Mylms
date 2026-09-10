import { GradingService } from './grading.service';
import {
  ExecutionStatus,
  resolveLanguageConfig,
  SANDBOX_LIMITS,
  SingleCaseResult,
} from './compiler.constants';
import { CompilerQueueService } from './compiler-queue.service';

describe('Secure Code Execution Module Tests', () => {
  let gradingService: GradingService;

  beforeEach(() => {
    gradingService = new GradingService();
  });

  describe('1. Language Runner Configurations & Isolation', () => {
    it('should resolve C runner with lms-c-runner and compile flags', () => {
      const cConfig = resolveLanguageConfig('c');
      expect(cConfig).toBeDefined();
      expect(cConfig?.image).toBe('lms-c-runner');
      expect(cConfig?.compileCmd).toContain('gcc');
      expect(cConfig?.sourceFile).toBe('main.c');
    });

    it('should resolve C++ runner with lms-cpp-runner and g++ flags', () => {
      const cppConfig = resolveLanguageConfig('cpp');
      expect(cppConfig).toBeDefined();
      expect(cppConfig?.image).toBe('lms-cpp-runner');
      expect(cppConfig?.compileCmd).toContain('g++');
      expect(cppConfig?.sourceFile).toBe('main.cpp');

      // Test aliases
      expect(resolveLanguageConfig('c++')?.image).toBe('lms-cpp-runner');
    });

    it('should resolve Java runner with lms-java-runner', () => {
      const javaConfig = resolveLanguageConfig('java');
      expect(javaConfig).toBeDefined();
      expect(javaConfig?.image).toBe('lms-java-runner');
      expect(javaConfig?.sourceFile).toBe('Main.java');
      expect(javaConfig?.compileCmd).toContain('javac');
    });

    it('should resolve Python runner with lms-python-runner', () => {
      const pyConfig = resolveLanguageConfig('python');
      expect(pyConfig).toBeDefined();
      expect(pyConfig?.image).toBe('lms-python-runner');
      expect(pyConfig?.compileCmd).toBeUndefined(); // Interpreted
      expect(pyConfig?.runCmd).toContain('python3');
    });

    it('should resolve JavaScript runner with lms-node-runner', () => {
      const jsConfig = resolveLanguageConfig('javascript');
      expect(jsConfig).toBeDefined();
      expect(jsConfig?.image).toBe('lms-node-runner');
      expect(jsConfig?.runCmd).toContain('node');
    });

    it('should return null for unsupported languages', () => {
      expect(resolveLanguageConfig('brainfuck')).toBeNull();
    });
  });

  describe('2. Docker Sandbox Security Limits', () => {
    it('should enforce strict security resource bounds', () => {
      expect(SANDBOX_LIMITS.NETWORK).toBe('none');
      expect(SANDBOX_LIMITS.MEMORY).toBe('256m');
      expect(SANDBOX_LIMITS.CPUS).toBe('1.0');
      expect(SANDBOX_LIMITS.PIDS_LIMIT).toBe(64);
      expect(SANDBOX_LIMITS.USER).toBe('1000:1000');
      expect(SANDBOX_LIMITS.TIME_LIMIT_MS).toBe(5000);
    });
  });

  describe('3. Grading & Output Comparison', () => {
    it('should match identical outputs with whitespace trimming', () => {
      expect(gradingService.compareOutput('hello\n', 'hello')).toBe(true);
      expect(gradingService.compareOutput('  5\r\n', '5')).toBe(true);
      expect(gradingService.compareOutput('10 20\n', '10 20')).toBe(true);
      expect(gradingService.compareOutput('wrong', 'correct')).toBe(false);
    });

    it('should calculate proportional scores accurately', () => {
      expect(gradingService.calculateScore(5, 5, 10)).toBe(10);
      expect(gradingService.calculateScore(3, 5, 10)).toBe(6);
      expect(gradingService.calculateScore(0, 5, 10)).toBe(0);
      expect(gradingService.calculateScore(8, 10, 10)).toBe(8);
    });

    it('should determine ACCEPTED when all test cases pass', () => {
      const cases: SingleCaseResult[] = [
        { testCaseIndex: 1, passed: true, isPublic: true, status: ExecutionStatus.ACCEPTED },
        { testCaseIndex: 2, passed: true, isPublic: false, status: ExecutionStatus.ACCEPTED },
      ];
      expect(gradingService.determineOverallStatus(cases)).toBe(ExecutionStatus.ACCEPTED);
    });

    it('should determine PARTIAL when some test cases pass', () => {
      const cases: SingleCaseResult[] = [
        { testCaseIndex: 1, passed: true, isPublic: true, status: ExecutionStatus.ACCEPTED },
        { testCaseIndex: 2, passed: false, isPublic: false, status: ExecutionStatus.WRONG_ANSWER },
      ];
      expect(gradingService.determineOverallStatus(cases)).toBe(ExecutionStatus.PARTIAL);
    });

    it('should determine COMPILATION_ERROR when compilation fails', () => {
      expect(
        gradingService.determineOverallStatus([], 'syntax error on line 4'),
      ).toBe(ExecutionStatus.COMPILATION_ERROR);
    });

    it('should determine TIME_LIMIT_EXCEEDED when timeout occurs and none passed', () => {
      const cases: SingleCaseResult[] = [
        { testCaseIndex: 1, passed: false, isPublic: true, status: ExecutionStatus.TIME_LIMIT_EXCEEDED },
      ];
      expect(gradingService.determineOverallStatus(cases)).toBe(ExecutionStatus.TIME_LIMIT_EXCEEDED);
    });
  });

  describe('4. Hidden Test Case Masking Security', () => {
    it('should NEVER leak hidden test case input or expected output', () => {
      const rawResult = {
        jobId: 'test-job-1',
        attemptId: 1,
        questionId: 10,
        status: ExecutionStatus.PARTIAL,
        passedCases: 1,
        totalCases: 2,
        score: 5,
        executionTimeMs: 120,
        publicResults: [
          {
            testCaseIndex: 1,
            passed: true,
            isPublic: true,
            input: '2 3',
            expected: '5',
            actual: '5',
            status: ExecutionStatus.ACCEPTED,
          },
          {
            testCaseIndex: 2,
            passed: false,
            isPublic: false,
            input: 'SECRET_INPUT_9999',
            expected: 'SECRET_OUTPUT_8888',
            actual: 'WRONG',
            status: ExecutionStatus.WRONG_ANSWER,
          },
        ],
        submittedAt: new Date().toISOString(),
      };

      const sanitized = gradingService.sanitizeResultsForClient(rawResult);

      expect(sanitized.publicResults).toHaveLength(1);
      expect(sanitized.publicResults?.[0].input).toBe('2 3');

      // Verify no mention of secret values in the sanitized object
      const serialized = JSON.stringify(sanitized);
      expect(serialized).not.toContain('SECRET_INPUT_9999');
      expect(serialized).not.toContain('SECRET_OUTPUT_8888');
    });
  });

  describe('5. Strict FIFO Queue Processing (Concurrency = 1)', () => {
    it('should process jobs strictly one-by-one in arrival order using sequential fallback', async () => {
      const queueService = new CompilerQueueService();
      // Test the local FIFO sequential engine
      (queueService as any).isRedisOnline = false;

      const executionOrder: string[] = [];
      let concurrentExecutions = 0;
      let maxConcurrencyRecorded = 0;

      // Register processor that records concurrency and execution sequence
      queueService.setFallbackProcessor(async (job) => {
        concurrentExecutions++;
        if (concurrentExecutions > maxConcurrencyRecorded) {
          maxConcurrencyRecorded = concurrentExecutions;
        }

        // Simulate work taking time
        await new Promise((resolve) => setTimeout(resolve, 30));
        executionOrder.push(job.jobId);

        concurrentExecutions--;
        return { status: ExecutionStatus.ACCEPTED };
      });

      // Enqueue 5 jobs simultaneously
      const jobs = [
        queueService.enqueueJob({
          jobId: 'fifo-job-1', attemptId: 1, questionId: 1, userId: 1,
          language: 'python', code: 'print(1)', executionType: 'RUN',
          isFinal: false, totalMarks: 10, testCases: [],
        }),
        queueService.enqueueJob({
          jobId: 'fifo-job-2', attemptId: 1, questionId: 1, userId: 2,
          language: 'python', code: 'print(2)', executionType: 'RUN',
          isFinal: false, totalMarks: 10, testCases: [],
        }),
        queueService.enqueueJob({
          jobId: 'fifo-job-3', attemptId: 1, questionId: 1, userId: 3,
          language: 'python', code: 'print(3)', executionType: 'RUN',
          isFinal: false, totalMarks: 10, testCases: [],
        }),
        queueService.enqueueJob({
          jobId: 'fifo-job-4', attemptId: 1, questionId: 1, userId: 4,
          language: 'python', code: 'print(4)', executionType: 'RUN',
          isFinal: false, totalMarks: 10, testCases: [],
        }),
        queueService.enqueueJob({
          jobId: 'fifo-job-5', attemptId: 1, questionId: 1, userId: 5,
          language: 'python', code: 'print(5)', executionType: 'RUN',
          isFinal: false, totalMarks: 10, testCases: [],
        }),
      ];

      const results = await Promise.all(jobs);

      // Verify each job received its correct queue position
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(2);
      expect(results[2].position).toBe(3);
      expect(results[3].position).toBe(4);
      expect(results[4].position).toBe(5);

      // Wait for all 5 jobs to finish sequentially
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Strictly one job at a time
      expect(maxConcurrencyRecorded).toBe(1);

      // Strictly FIFO order: fifo-job-1 -> fifo-job-2 -> fifo-job-3 -> fifo-job-4 -> fifo-job-5
      expect(executionOrder).toEqual(['fifo-job-1', 'fifo-job-2', 'fifo-job-3', 'fifo-job-4', 'fifo-job-5']);

      await queueService.onModuleDestroy();
    });

    it('should process BullMQ jobs strictly sequentially in FIFO order (concurrency: 1)', async () => {
      const { Queue, Worker } = require('bullmq');
      const testQueueName = `test-fifo-${Date.now()}`;
      const connection = { host: '127.0.0.1', port: 6379 };

      const testQueue = new Queue(testQueueName, { connection });
      const processedOrder: string[] = [];
      let activeCount = 0;
      let maxActive = 0;

      // Single worker with strictly concurrency: 1
      const worker = new Worker(
        testQueueName,
        async (job: any) => {
          activeCount++;
          if (activeCount > maxActive) maxActive = activeCount;
          await new Promise((resolve) => setTimeout(resolve, 30));
          processedOrder.push(job.data.id);
          activeCount--;
          return { done: true };
        },
        { connection, concurrency: 1 },
      );

      // Add 4 jobs
      await testQueue.add('exec', { id: 'bull-1' });
      await testQueue.add('exec', { id: 'bull-2' });
      await testQueue.add('exec', { id: 'bull-3' });
      await testQueue.add('exec', { id: 'bull-4' });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(maxActive).toBe(1);
      expect(processedOrder).toEqual(['bull-1', 'bull-2', 'bull-3', 'bull-4']);

      await worker.close();
      await testQueue.obliterate({ force: true });
      await testQueue.close();
    });
  });
});
