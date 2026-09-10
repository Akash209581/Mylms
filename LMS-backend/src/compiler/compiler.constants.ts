export const CODE_EXECUTION_QUEUE = 'code-execution';

export enum ExecutionStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  PARTIAL = 'PARTIAL',
  WRONG_ANSWER = 'WRONG_ANSWER',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CANCELLED = 'CANCELLED',
}

export interface LanguageRunnerConfig {
  languageKey: string;
  aliases: string[];
  image: string;
  sourceFile: string;
  compileCmd?: string;
  runCmd: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageRunnerConfig> = {
  c: {
    languageKey: 'c',
    aliases: ['c'],
    image: 'lms-c-runner',
    sourceFile: 'main.c',
    compileCmd: 'gcc -O2 main.c -o main',
    runCmd: './main',
  },
  cpp: {
    languageKey: 'cpp',
    aliases: ['cpp', 'c++', 'cxx'],
    image: 'lms-cpp-runner',
    sourceFile: 'main.cpp',
    compileCmd: 'g++ -O2 main.cpp -o main',
    runCmd: './main',
  },
  java: {
    languageKey: 'java',
    aliases: ['java'],
    image: 'lms-java-runner',
    sourceFile: 'Main.java',
    compileCmd: 'javac Main.java',
    runCmd: 'java Main',
  },
  python: {
    languageKey: 'python',
    aliases: ['python', 'python3', 'py'],
    image: 'lms-python-runner',
    sourceFile: 'main.py',
    runCmd: 'python3 main.py',
  },
  javascript: {
    languageKey: 'javascript',
    aliases: ['javascript', 'js', 'node'],
    image: 'lms-node-runner',
    sourceFile: 'main.js',
    runCmd: 'node main.js',
  },
};

export function resolveLanguageConfig(lang: string): LanguageRunnerConfig | null {
  const normalized = (lang || '').trim().toLowerCase();
  for (const key of Object.keys(LANGUAGE_CONFIGS)) {
    const config = LANGUAGE_CONFIGS[key];
    if (config.languageKey === normalized || config.aliases.includes(normalized)) {
      return config;
    }
  }
  return null;
}

export const SANDBOX_LIMITS = {
  MEMORY: '256m',
  MEMORY_SWAP: '256m',
  CPUS: '1.0',
  PIDS_LIMIT: 64,
  USER: '1000:1000',
  NETWORK: 'none',
  CAP_DROP: 'ALL',
  TIME_LIMIT_MS: 5000, // 5 seconds per test case
  COMPILE_TIME_LIMIT_MS: 10000, // 10 seconds for compilation
  MAX_OUTPUT_BYTES: 64 * 1024,
};

export interface TestCasePayload {
  input: string;
  output: string;
  isPublic?: boolean;
  explanation?: string;
}

export interface CodeJobPayload {
  jobId: string;
  attemptId: number;
  questionId: number;
  userId: number;
  language: string;
  code: string;
  stdin?: string;
  executionType: 'RUN' | 'SUBMIT';
  isFinal: boolean;
  totalMarks: number;
  testCases: TestCasePayload[];
}

export interface SingleCaseResult {
  testCaseIndex: number;
  passed: boolean;
  isPublic: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  stderr?: string;
  execTimeMs?: number;
  status: ExecutionStatus;
}

export interface ExecutionJobResult {
  jobId: string;
  attemptId: number;
  questionId: number;
  status: ExecutionStatus;
  passedCases: number;
  totalCases: number;
  score: number;
  executionTimeMs: number;
  compilationError?: string;
  runtimeError?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionType?: 'RUN' | 'SUBMIT';
  publicResults: SingleCaseResult[];
  submittedAt: string;
}
