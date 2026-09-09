import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface TestCaseResult {
  passed: boolean;
  input?: string; // only for public cases
  expected?: string; // only for public cases
  actual?: string; // only for public cases
  execTimeMs?: number;
}

@Injectable()
export class ExamRunnerService {
  private readonly logger = new Logger(ExamRunnerService.name);
  private readonly compilerUrl = process.env.COMPILER_URL || 'http://localhost:5000';

  /** Execute code against an input and return raw output */
  async runCode(code: string, language: string, stdin: string): Promise<RunResult> {
    try {
      const res = await axios.post(`${this.compilerUrl}/run`, { code, language, stdin }, { timeout: 40000 });
      const data = res.data;
      return {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exit_code ?? 0,
        error: data.error,
      };
    } catch (err) {
      this.logger.warn(`Compiler service unavailable: ${err.message}`);
      return { stdout: '', stderr: '', exitCode: 1, error: 'Execution service temporarily unavailable' };
    }
  }

  /** Run code against a list of test cases, returns per-case results */
  async runAgainstCases(
    code: string,
    language: string,
    testCases: { input: string; output: string; explanation?: string }[],
    exposeInputOutput: boolean,
  ): Promise<{ results: TestCaseResult[]; passedCount: number; totalCount: number }> {
    const results: TestCaseResult[] = [];

    for (const tc of testCases) {
      const raw = await this.runCode(code, language, tc.input);
      const actual = (raw.stdout || '').trim();
      const expected = (tc.output || '').trim();
      const passed = actual === expected;
      results.push({
        passed,
        // Only expose input/output for public test cases
        input: exposeInputOutput ? tc.input : undefined,
        expected: exposeInputOutput ? tc.output : undefined,
        actual: exposeInputOutput ? actual : undefined,
        execTimeMs: undefined,
      });
    }

    const passedCount = results.filter(r => r.passed).length;
    return { results, passedCount, totalCount: testCases.length };
  }
}
