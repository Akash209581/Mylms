import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import {
  CODE_EXECUTION_QUEUE,
  CodeJobPayload,
  ExecutionJobResult,
  ExecutionStatus,
  resolveLanguageConfig,
  SingleCaseResult,
} from './compiler.constants';
import { DockerSandboxService } from './docker-sandbox.service';
import { GradingService } from './grading.service';
import { CompilerGateway } from './compiler.gateway';
import { CompilerQueueService } from './compiler-queue.service';
import { ExamCodingSubmission, SubmissionStatus } from '../entities/exam-coding-submission.entity';
import { ExamAttempt, AttemptStatus } from '../entities/exam-attempt.entity';

@Injectable()
export class CompilerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompilerWorker.name);
  private worker: Worker<CodeJobPayload> | null = null;
  private redisConnection: IORedis | null = null;

  constructor(
    private readonly sandbox: DockerSandboxService,
    private readonly grading: GradingService,
    private readonly gateway: CompilerGateway,
    private readonly queueService: CompilerQueueService,
    @InjectRepository(ExamCodingSubmission)
    private readonly submissionRepo: Repository<ExamCodingSubmission>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
  ) {}

  async onModuleInit() {
    // Register worker logic with queue service for local FIFO fallback
    this.queueService.setFallbackProcessor((jobPayload) => this.processExecutionJob(jobPayload));

    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    this.redisConnection = new IORedis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    try {
      await this.redisConnection.connect();
      // Worker initialized with strictly concurrency: 1 for FIFO processing
      this.worker = new Worker<CodeJobPayload>(
        CODE_EXECUTION_QUEUE,
        async (job: Job<CodeJobPayload>) => {
          return await this.processExecutionJob(job.data);
        },
        {
          connection: this.redisConnection,
          concurrency: 1, // STRICTLY ONE CODING JOB AT A TIME
        },
      );

      this.worker.on('active', (job) => {
        this.logger.log(`[BullMQ Worker] Job ${job.id} is now ACTIVE (concurrency=1)`);
      });

      this.worker.on('completed', (job) => {
        this.logger.log(`[BullMQ Worker] Job ${job.id} COMPLETED`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`[BullMQ Worker] Job ${job?.id} FAILED: ${err.message}`);
      });

      this.logger.log(`CompilerWorker listening on "${CODE_EXECUTION_QUEUE}" with CONCURRENCY=1`);
    } catch (err) {
      this.logger.warn(`CompilerWorker Redis connection not available (${err.message}). Local FIFO worker will handle jobs.`);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
    }
  }

  /** Core execution processor: handles compilation, test cases, grading, DB persistence */
  async processExecutionJob(payload: CodeJobPayload): Promise<Partial<ExecutionJobResult>> {
    const { jobId, attemptId, questionId, language, code, testCases, isFinal, totalMarks } = payload;
    const startTime = Date.now();

    this.logger.log(`Starting execution for Job ${jobId} [Lang: ${language}, Type: ${payload.executionType}, Cases: ${testCases?.length || 0}]`);
    this.queueService.updateJobProgress(jobId, ExecutionStatus.RUNNING);
    this.gateway.emitJobProgress(jobId, 0, testCases?.length || 0);

    // 1. Verify Attempt is still active and valid
    if (attemptId) {
      const attempt = await this.attemptRepo.findOne({ where: { id: attemptId } });
      if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
        const errorMsg = 'Exam attempt has already ended or is not active.';
        this.queueService.setJobFailed(jobId, errorMsg);
        this.gateway.emitJobFailed(jobId, errorMsg);
        return { jobId, status: ExecutionStatus.CANCELLED };
      }
    }

    // 2. Resolve Language Configuration
    const langConfig = resolveLanguageConfig(language);
    if (!langConfig) {
      const errorMsg = `Unsupported programming language: "${language}"`;
      this.queueService.setJobFailed(jobId, errorMsg);
      this.gateway.emitJobFailed(jobId, errorMsg);
      return { jobId, status: ExecutionStatus.SYSTEM_ERROR };
    }

    // 3. Prepare Disposable Workspace
    const workspaceDir = this.sandbox.prepareWorkspace(langConfig, code);

    try {
      // 4. Compile (if language requires compilation)
      const compileRes = await this.sandbox.compileCode(langConfig, workspaceDir);
      if (!compileRes.success) {
        const overallResult: ExecutionJobResult = {
          jobId,
          attemptId,
          questionId,
          status: ExecutionStatus.COMPILATION_ERROR,
          passedCases: 0,
          totalCases: testCases?.length || 0,
          score: 0,
          executionTimeMs: Date.now() - startTime,
          compilationError: compileRes.compilationError,
          publicResults: [],
          submittedAt: new Date().toISOString(),
        };

        await this.persistSubmissionRecord(payload, overallResult);
        const sanitized = this.grading.sanitizeResultsForClient(overallResult);
        this.queueService.setJobCompleted(jobId, sanitized);
        this.gateway.emitJobCompleted(jobId, sanitized);
        return sanitized;
      }

      // 5. Run Test Cases Sequentially (One Job owns all its test cases)
      const caseResults: SingleCaseResult[] = [];
      const casesToRun = testCases || [];

      for (let i = 0; i < casesToRun.length; i++) {
        const tc = casesToRun[i];
        this.gateway.emitJobProgress(jobId, i + 1, casesToRun.length);

        const raw = await this.sandbox.executeTestCase(langConfig, workspaceDir, tc.input);
        const actual = raw.stdout || '';
        const expected = tc.output || '';
        const passed = raw.status === ExecutionStatus.ACCEPTED && this.grading.compareOutput(actual, expected);

        caseResults.push({
          testCaseIndex: i + 1,
          passed,
          isPublic: tc.isPublic !== false,
          input: tc.isPublic !== false ? tc.input : undefined,
          expected: tc.isPublic !== false ? expected : undefined,
          actual: tc.isPublic !== false ? actual.trim() : undefined,
          stderr: tc.isPublic !== false ? raw.stderr : undefined,
          execTimeMs: raw.execTimeMs,
          status: passed ? ExecutionStatus.ACCEPTED : raw.status,
        });
      }

      // 6. Grade and Calculate Final Score
      const passedCount = caseResults.filter((r) => r.passed).length;
      const totalCount = caseResults.length;
      const score = this.grading.calculateScore(passedCount, totalCount, totalMarks);
      const overallStatus = this.grading.determineOverallStatus(caseResults);

      const overallResult: ExecutionJobResult = {
        jobId,
        attemptId,
        questionId,
        status: overallStatus,
        passedCases: passedCount,
        totalCases: totalCount,
        score,
        executionTimeMs: Date.now() - startTime,
        publicResults: caseResults,
        submittedAt: new Date().toISOString(),
      };

      // 7. Persist to PostgreSQL
      await this.persistSubmissionRecord(payload, overallResult);

      // 8. Sanitize (mask hidden cases) and Broadcast to Client
      const sanitized = this.grading.sanitizeResultsForClient(overallResult);
      this.queueService.setJobCompleted(jobId, sanitized);
      this.gateway.emitJobCompleted(jobId, sanitized);

      return sanitized;
    } catch (err) {
      this.logger.error(`Error executing job ${jobId}: ${err.message}`, err.stack);
      const errorMsg = `Execution system error: ${err.message}`;
      this.queueService.setJobFailed(jobId, errorMsg);
      this.gateway.emitJobFailed(jobId, errorMsg);
      return { jobId, status: ExecutionStatus.SYSTEM_ERROR };
    } finally {
      // 9. Destroy Disposable Workspace & Container Files
      this.sandbox.cleanupWorkspace(workspaceDir);
    }
  }

  /** Persist or update execution record in exam_coding_submissions */
  private async persistSubmissionRecord(
    payload: CodeJobPayload,
    result: ExecutionJobResult,
  ) {
    try {
      if (!payload.attemptId || !payload.questionId) return;

      let mappedStatus = SubmissionStatus.PENDING;
      switch (result.status) {
        case ExecutionStatus.ACCEPTED: mappedStatus = SubmissionStatus.ACCEPTED; break;
        case ExecutionStatus.PARTIAL: mappedStatus = SubmissionStatus.PARTIAL; break;
        case ExecutionStatus.WRONG_ANSWER: mappedStatus = SubmissionStatus.WRONG_ANSWER; break;
        case ExecutionStatus.COMPILATION_ERROR: mappedStatus = SubmissionStatus.COMPILE_ERROR; break;
        case ExecutionStatus.RUNTIME_ERROR: mappedStatus = SubmissionStatus.RUNTIME_ERROR; break;
        case ExecutionStatus.TIME_LIMIT_EXCEEDED: mappedStatus = SubmissionStatus.TIME_LIMIT; break;
        case ExecutionStatus.MEMORY_LIMIT_EXCEEDED: mappedStatus = SubmissionStatus.MEMORY_LIMIT; break;
        default: mappedStatus = SubmissionStatus.PENDING; break;
      }

      if (payload.isFinal) {
        await this.submissionRepo
          .delete({ attemptId: payload.attemptId, questionId: payload.questionId, isFinal: true })
          .catch(() => {});
      }

      const publicCases = (result.publicResults || []).filter((r) => r.isPublic);
      const hiddenCases = (result.publicResults || []).filter((r) => !r.isPublic);

      const sub = this.submissionRepo.create({
        attemptId: payload.attemptId,
        questionId: payload.questionId,
        language: payload.language,
        code: payload.code,
        passedCases: publicCases.filter((r) => r.passed).length,
        totalCases: publicCases.length,
        hiddenPassed: hiddenCases.filter((r) => r.passed).length,
        hiddenTotal: hiddenCases.length,
        score: payload.isFinal ? result.score : 0,
        execTimeMs: result.executionTimeMs,
        compilationError: result.compilationError,
        status: mappedStatus,
        isFinal: !!payload.isFinal,
      });

      await this.submissionRepo.save(sub);
      this.logger.log(`Persisted submission record for Attempt ${payload.attemptId}, Question ${payload.questionId}, Score: ${sub.score}`);
    } catch (err) {
      this.logger.error(`Failed to persist submission record: ${err.message}`);
    }
  }
}
