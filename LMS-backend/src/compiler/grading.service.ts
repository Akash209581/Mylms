import { Injectable } from '@nestjs/common';
import {
  ExecutionStatus,
  SingleCaseResult,
  TestCasePayload,
  ExecutionJobResult,
} from './compiler.constants';

@Injectable()
export class GradingService {
  /** Compare actual and expected program outputs with whitespace trimming */
  compareOutput(actual: string, expected: string): boolean {
    const normActual = (actual || '').replace(/\r\n/g, '\n').trim();
    const normExpected = (expected || '').replace(/\r\n/g, '\n').trim();
    return normActual === normExpected;
  }

  /** Calculate question score based on passed test cases */
  calculateScore(passedCount: number, totalCount: number, questionMarks: number): number {
    if (totalCount <= 0 || questionMarks <= 0) return 0;
    const ratio = passedCount / totalCount;
    const score = ratio * questionMarks;
    return Math.round(score * 100) / 100;
  }

  /** Determine overall status from test case execution results */
  determineOverallStatus(
    caseResults: SingleCaseResult[],
    compilationError?: string,
  ): ExecutionStatus {
    if (compilationError) {
      return ExecutionStatus.COMPILATION_ERROR;
    }

    if (!caseResults || caseResults.length === 0) {
      return ExecutionStatus.WRONG_ANSWER;
    }

    const hasTimeout = caseResults.some((r) => r.status === ExecutionStatus.TIME_LIMIT_EXCEEDED);
    const hasOom = caseResults.some((r) => r.status === ExecutionStatus.MEMORY_LIMIT_EXCEEDED);
    const hasRuntime = caseResults.some((r) => r.status === ExecutionStatus.RUNTIME_ERROR);

    const passedCount = caseResults.filter((r) => r.passed).length;
    const totalCount = caseResults.length;

    if (passedCount === totalCount) {
      return ExecutionStatus.ACCEPTED;
    }

    if (passedCount > 0) {
      return ExecutionStatus.PARTIAL;
    }

    if (hasTimeout) return ExecutionStatus.TIME_LIMIT_EXCEEDED;
    if (hasOom) return ExecutionStatus.MEMORY_LIMIT_EXCEEDED;
    if (hasRuntime) return ExecutionStatus.RUNTIME_ERROR;

    return ExecutionStatus.WRONG_ANSWER;
  }

  /** Mask hidden test cases from the client response */
  sanitizeResultsForClient(result: ExecutionJobResult): Partial<ExecutionJobResult> {
    const isRun = result.executionType === 'RUN';
    return {
      jobId: result.jobId,
      attemptId: result.attemptId,
      questionId: result.questionId,
      status: result.status,
      passedCases: isRun ? undefined : result.passedCases,
      totalCases: isRun ? undefined : result.totalCases,
      score: isRun ? 0 : result.score,
      executionTimeMs: result.executionTimeMs,
      compilationError: result.compilationError,
      runtimeError: result.runtimeError,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionType: result.executionType,
      // Run Code is stdout only; Submit Code includes public cases (hidden cases masked)
      publicResults: isRun
        ? []
        : (result.publicResults || [])
            .filter((r) => r.isPublic)
            .map((r) => ({
              testCaseIndex: r.testCaseIndex,
              passed: r.passed,
              isPublic: true,
              input: r.input,
              expected: r.expected,
              actual: r.actual,
              stderr: r.stderr,
              execTimeMs: r.execTimeMs,
              status: r.status,
            })),
      submittedAt: result.submittedAt,
    };
  }
}
