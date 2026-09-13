import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/jwt.guard';
import { CompilerQueueService } from './compiler-queue.service';
import {
  LANGUAGE_CONFIGS,
  resolveLanguageConfig,
  ExecutionStatus,
  CodeJobPayload,
} from './compiler.constants';
import { CP_STARTERS } from '../common/starter-code.util';

export class RunCodeDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  stdin?: string;
}

const STARTER_TEMPLATES: Record<string, { label: string; version: string; defaultCode: string; mode: string }> = {
  python: {
    label: 'Python 3',
    version: '3.11',
    mode: 'python',
    defaultCode: CP_STARTERS.python,
  },
  java: {
    label: 'Java 17',
    version: '17',
    mode: 'java',
    defaultCode: CP_STARTERS.java,
  },
  c: {
    label: 'C (GCC 13)',
    version: '13.2.0',
    mode: 'c',
    defaultCode: CP_STARTERS.c,
  },
  cpp: {
    label: 'C++ (G++ 13)',
    version: '13.2.0',
    mode: 'cpp',
    defaultCode: CP_STARTERS.cpp,
  },
  javascript: {
    label: 'JavaScript (Node 20)',
    version: '20.x',
    mode: 'javascript',
    defaultCode: CP_STARTERS.javascript,
  },
};

@Controller('compiler')
export class CompilerController {
  constructor(private readonly queueService: CompilerQueueService) {}

  /**
   * GET /compiler/languages
   * List supported languages, version info, and starter boilerplate code
   */
  @Get('languages')
  getLanguages() {
    return Object.keys(STARTER_TEMPLATES).map((key) => {
      const template = STARTER_TEMPLATES[key];
      const config = LANGUAGE_CONFIGS[key];
      return {
        key,
        label: template.label,
        version: template.version,
        mode: template.mode,
        sourceFile: config?.sourceFile || `${key}.txt`,
        starterCode: template.defaultCode,
      };
    });
  }

  /**
   * POST /compiler/run
   * Enqueues a standalone practice code execution job and waits for completion
   */
  @Post('run')
  @UseGuards(JwtAuthGuard)
  async runCode(@Request() req: any, @Body() dto: RunCodeDto) {
    if (!dto.language || !dto.code?.trim()) {
      throw new BadRequestException('Programming language and code are required.');
    }

    const langConfig = resolveLanguageConfig(dto.language);
    if (!langConfig) {
      throw new BadRequestException(
        `Unsupported programming language: "${dto.language}". Supported: python, java, c, cpp, javascript.`,
      );
    }

    const userId = req.user?.sub || req.user?.id || 0;
    const jobId = `practice-${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const payload: CodeJobPayload = {
      jobId,
      userId,
      language: langConfig.languageKey,
      code: dto.code,
      stdin: dto.stdin || '',
      executionType: 'RUN',
      isFinal: false,
      totalMarks: 0,
      testCases: [
        {
          input: dto.stdin || '',
          output: '',
          isPublic: true,
        },
      ],
    };

    const enqueueResult = await this.queueService.enqueueJob(payload);

    // Wait up to 12s for execution completion
    const startTime = Date.now();
    const maxWaitMs = 12000;
    const pollIntervalMs = 150;

    while (Date.now() - startTime < maxWaitMs) {
      const statusData = await this.queueService.getJobStatus(jobId);

      if (
        statusData &&
        statusData.status !== ExecutionStatus.QUEUED &&
        statusData.status !== ExecutionStatus.RUNNING
      ) {
        // Job has finished!
        const result = statusData.result || {};
        return {
          jobId,
          status: statusData.status,
          stdout: result.stdout || '',
          stderr: result.stderr || statusData.error || '',
          exitCode: result.exitCode ?? (statusData.status === ExecutionStatus.ACCEPTED ? 0 : 1),
          executionTimeMs: result.executionTimeMs || Date.now() - startTime,
          compilationError: result.compilationError,
          runtimeError: result.runtimeError,
          error: statusData.error,
        };
      }

      await new Promise((res) => setTimeout(res, pollIntervalMs));
    }

    // If still in progress after 12s, return current queue status
    const currentStatus = await this.queueService.getJobStatus(jobId);
    return {
      jobId,
      status: currentStatus.status || ExecutionStatus.RUNNING,
      position: currentStatus.position,
      message: 'Code is executing in the background.',
    };
  }

  /**
   * GET /compiler/status/:jobId
   * Polling endpoint to check status of long-running execution
   */
  @Get('status/:jobId')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('jobId') jobId: string) {
    const statusData = await this.queueService.getJobStatus(jobId);
    if (!statusData) {
      throw new NotFoundException(`Job with ID "${jobId}" not found.`);
    }

    const result = statusData.result || {};
    return {
      jobId,
      status: statusData.status,
      position: statusData.position,
      stdout: result.stdout || '',
      stderr: result.stderr || statusData.error || '',
      exitCode: result.exitCode ?? (statusData.status === ExecutionStatus.ACCEPTED ? 0 : 1),
      executionTimeMs: result.executionTimeMs,
      compilationError: result.compilationError,
      runtimeError: result.runtimeError,
      error: statusData.error,
    };
  }
}
