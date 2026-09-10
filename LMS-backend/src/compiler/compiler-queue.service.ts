import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  CODE_EXECUTION_QUEUE,
  CodeJobPayload,
  ExecutionJobResult,
  ExecutionStatus,
} from './compiler.constants';

@Injectable()
export class CompilerQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompilerQueueService.name);
  private queue: Queue<CodeJobPayload>;
  private redisConnection: IORedis | null = null;
  private isRedisOnline = false;

  // In-memory registry for fast result polling and fallback
  private jobResults = new Map<string, { status: ExecutionStatus; result?: any; error?: string; position?: number }>();

  // In-memory fallback queue if Redis server is not yet running
  private fallbackQueue: CodeJobPayload[] = [];
  private fallbackProcessing = false;
  private fallbackProcessor: ((job: CodeJobPayload) => Promise<any>) | null = null;

  async onModuleInit() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    this.redisConnection = new IORedis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn(`Redis connection retries exhausted (${times}). Utilizing sequential in-memory fallback.`);
          return null; // Stop retrying automatically
        }
        return Math.min(times * 1000, 3000);
      },
    });

    try {
      await this.redisConnection.connect();
      this.isRedisOnline = true;
      this.queue = new Queue(CODE_EXECUTION_QUEUE, {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 1, // Do NOT endlessly retry student execution jobs
        },
      });
      this.logger.log(`BullMQ Queue "${CODE_EXECUTION_QUEUE}" initialized with Redis at ${host}:${port}`);
    } catch (err) {
      this.isRedisOnline = false;
      if (this.redisConnection) {
        try { this.redisConnection.disconnect(); } catch {}
        this.redisConnection = null;
      }
      this.logger.warn(`Redis is not running at ${host}:${port} (${err.message}). Queue will operate in local in-memory FIFO mode.`);
    }
  }

  async onModuleDestroy() {
    if (this.queue) {
      try { await this.queue.close(); } catch {}
    }
    if (this.redisConnection) {
      try { await this.redisConnection.quit(); } catch {
        try { this.redisConnection.disconnect(); } catch {}
      }
      this.redisConnection = null;
    }
  }

  /** Register the worker execution callback for local sequential fallback */
  setFallbackProcessor(processor: (job: CodeJobPayload) => Promise<any>) {
    this.fallbackProcessor = processor;
  }

  /** Add a coding job to the FIFO queue (Strictly without priority or delay) */
  async enqueueJob(
    payload: CodeJobPayload,
  ): Promise<{ jobId: string; status: ExecutionStatus; position: number }> {
    this.jobResults.set(payload.jobId, { status: ExecutionStatus.QUEUED });

    if (this.isRedisOnline && this.queue) {
      try {
        // Enqueue with strict FIFO (no priority, no delay)
        await this.queue.add('execute-code', payload, {
          jobId: payload.jobId,
        });

        const position = await this.getQueuePosition(payload.jobId);
        this.jobResults.set(payload.jobId, { status: ExecutionStatus.QUEUED, position });
        return { jobId: payload.jobId, status: ExecutionStatus.QUEUED, position };
      } catch (err) {
        this.logger.warn(`Failed to add to Redis BullMQ: ${err.message}. Enqueuing in local FIFO fallback.`);
      }
    }

    // Local in-memory sequential FIFO fallback
    const position = this.fallbackQueue.length + 1 + (this.fallbackProcessing ? 1 : 0);
    this.fallbackQueue.push(payload);
    this.jobResults.set(payload.jobId, { status: ExecutionStatus.QUEUED, position });
    this.processFallbackNext();

    return { jobId: payload.jobId, status: ExecutionStatus.QUEUED, position };
  }

  /** Calculate approximate queue position ahead of the job */
  async getQueuePosition(jobId: string): Promise<number> {
    if (this.isRedisOnline && this.queue) {
      try {
        const [waitingJobs, activeJobs] = await Promise.all([
          this.queue.getWaiting(0, 100),
          this.queue.getActive(0, 10),
        ]);
        const isActive = activeJobs.some((j) => j.id === jobId);
        if (isActive) return 1;

        const waitingIdx = waitingJobs.findIndex((j) => j.id === jobId);
        if (waitingIdx >= 0) {
          return waitingIdx + 1 + (activeJobs.length > 0 ? 1 : 0);
        }

        const [waitingCount, activeCount] = await Promise.all([
          this.queue.getWaitingCount(),
          this.queue.getActiveCount(),
        ]);
        return Math.max(1, waitingCount + activeCount);
      } catch {
        return 1;
      }
    }

    const idx = this.fallbackQueue.findIndex((j) => j.jobId === jobId);
    if (idx >= 0) {
      return idx + 1 + (this.fallbackProcessing ? 1 : 0);
    }
    return 1;
  }

  /** Get cached or BullMQ job status */
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: ExecutionStatus;
    position?: number;
    result?: Partial<ExecutionJobResult>;
    error?: string;
  }> {
    const cached = this.jobResults.get(jobId);
    if (cached) {
      return {
        jobId,
        status: cached.status,
        position: cached.position,
        result: cached.result,
        error: cached.error,
      };
    }

    if (this.isRedisOnline && this.queue) {
      try {
        const job = await this.queue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          let status = ExecutionStatus.QUEUED;
          if (state === 'active') status = ExecutionStatus.RUNNING;
          if (state === 'completed') status = job.returnvalue?.status || ExecutionStatus.ACCEPTED;
          if (state === 'failed') status = ExecutionStatus.SYSTEM_ERROR;

          const position = state === 'waiting' ? await this.getQueuePosition(jobId) : undefined;

          return {
            jobId,
            status,
            position,
            result: job.returnvalue,
            error: job.failedReason,
          };
        }
      } catch {}
    }

    return { jobId, status: ExecutionStatus.QUEUED, position: 1 };
  }

  /** Update job progress state in registry */
  updateJobProgress(jobId: string, status: ExecutionStatus, currentCase?: number, totalCases?: number) {
    this.jobResults.set(jobId, { status });
  }

  /** Store completed job result */
  setJobCompleted(jobId: string, result: Partial<ExecutionJobResult>) {
    this.jobResults.set(jobId, {
      status: result.status || ExecutionStatus.ACCEPTED,
      result,
    });
  }

  /** Store failed job result */
  setJobFailed(jobId: string, error: string) {
    this.jobResults.set(jobId, {
      status: ExecutionStatus.SYSTEM_ERROR,
      error,
    });
  }

  /** Process next job sequentially in local fallback mode (concurrency = 1) */
  private async processFallbackNext() {
    if (this.fallbackProcessing || this.fallbackQueue.length === 0 || !this.fallbackProcessor) {
      return;
    }

    this.fallbackProcessing = true;
    const nextJob = this.fallbackQueue.shift();

    if (nextJob) {
      try {
        await this.fallbackProcessor(nextJob);
      } catch (err) {
        this.logger.error(`Fallback worker failed for job ${nextJob.jobId}: ${err.message}`);
      }
    }

    this.fallbackProcessing = false;
    this.processFallbackNext();
  }
}
