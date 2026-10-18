import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Exam, ExamStatus } from '../entities/exam.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamAssignment } from '../entities/exam-assignment.entity';
import { ExamAttempt, AttemptStatus } from '../entities/exam-attempt.entity';
import { ExamCodingSubmission, SubmissionStatus } from '../entities/exam-coding-submission.entity';
import { Question, QuestionType } from '../entities/question.entity';
import { UserRole } from '../entities/user.entity';
import { SaveMcqAnswersDto, RunCodeDto, SubmitExamDto, UnlockHintDto } from './exam.dto';
import { ExamRunnerService } from './exam-runner.service';
import { ExamService } from './exam.service';
import { CompilerQueueService } from '../compiler/compiler-queue.service';
import { CodeJobPayload } from '../compiler/compiler.constants';
import { isMcqCorrect, normalizeMcqLetter, optionTextForLetter } from '../common/mcq-answer.util';

interface RequestUser { sub: number; role: UserRole; collegeId?: number; }

function isPublicTestCase(tc: any): boolean {
  if (!tc || typeof tc !== 'object') return true;
  if (typeof tc.isHidden === 'boolean') return !tc.isHidden;
  if (typeof tc.isPublic === 'boolean') return tc.isPublic;
  return true;
}

function publicTestCases(allCases: any[]): any[] {
  if (!allCases?.length) return [];
  const hasFlags = allCases.some((tc: any) => typeof tc?.isHidden === 'boolean' || typeof tc?.isPublic === 'boolean');
  if (hasFlags) return allCases.filter(isPublicTestCase);
  const limit = Math.max(1, Math.floor(allCases.length / 2));
  return allCases.slice(0, limit);
}

function shuffleList<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isOptionCorrectForAttempt(
  given: string | null | undefined,
  correctAnswer: string | null | undefined,
  originalOptions?: string[] | null,
  attemptOptions?: string[] | null,
): boolean {
  if (!given) return false;
  if (!attemptOptions || !originalOptions) {
    return isMcqCorrect(given, correctAnswer, originalOptions);
  }
  const origLetter = normalizeMcqLetter(correctAnswer, originalOptions);
  const correctText = optionTextForLetter(origLetter, originalOptions) || correctAnswer;
  const studentLetter = normalizeMcqLetter(given, attemptOptions);
  const chosenText = optionTextForLetter(studentLetter, attemptOptions) || given;
  return String(chosenText).trim().toLowerCase() === String(correctText).trim().toLowerCase();
}

interface NonCodingEvaluation {
  isCorrect: boolean;
  score: number;
  details?: any;
}

function evaluateSectionAQuestion(
  q: Question,
  given: string | null | undefined,
  attemptOpts: string[] | undefined,
  marks: number,
  negativeMarks: number,
  negativeMarkingEnabled: boolean,
): NonCodingEvaluation {
  if (!given || !String(given).trim()) {
    return { isCorrect: false, score: 0 };
  }

  // 1. JUMBLED CODE (JC)
  if (q.type === QuestionType.JC) {
    let studentOrder: string[] = [];
    try {
      const parsed = JSON.parse(given);
      if (Array.isArray(parsed)) studentOrder = parsed;
    } catch {
      studentOrder = String(given).split('\n');
    }
    studentOrder = studentOrder.map(s => String(s).trim()).filter(Boolean);

    // Reference order is q.jumbledStatements (saved in correct order in question bank) or q.correctCode
    let correctOrder: string[] = [];
    if (Array.isArray(q.jumbledStatements) && q.jumbledStatements.length > 0) {
      correctOrder = q.jumbledStatements.map(s => String(s).trim()).filter(Boolean);
    } else if (q.correctCode) {
      correctOrder = q.correctCode.split('\n').map(s => String(s).trim()).filter(Boolean);
    }

    if (!correctOrder.length || !studentOrder.length) {
      return { isCorrect: false, score: 0 };
    }

    let matchedLines = 0;
    const totalLines = correctOrder.length;
    for (let i = 0; i < totalLines; i++) {
      if (studentOrder[i] && studentOrder[i] === correctOrder[i]) {
        matchedLines++;
      }
    }

    const isAllCorrect = matchedLines === totalLines && studentOrder.length === totalLines;
    if (isAllCorrect) {
      return { isCorrect: true, score: Number(marks) };
    }

    if (matchedLines > 0 && totalLines > 0) {
      const partialRatio = matchedLines / totalLines;
      return {
        isCorrect: false,
        score: Math.round(Number(marks) * partialRatio * 100) / 100,
        details: { matchedLines, totalLines },
      };
    }

    return {
      isCorrect: false,
      score: negativeMarkingEnabled ? -Number(negativeMarks || 0) : 0,
    };
  }

  // 2. MATCHING QUESTION (MQ)
  if (q.type === QuestionType.MQ) {
    let studentPairs: Record<string, string> = {};
    try {
      const parsed = JSON.parse(given);
      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (p && p.left) studentPairs[String(p.left).trim()] = String(p.right || '').trim();
          });
        } else {
          Object.entries(parsed).forEach(([k, v]) => {
            studentPairs[String(k).trim()] = String(v || '').trim();
          });
        }
      }
    } catch {
      studentPairs = {};
    }

    const referencePairs = q.matchingPairs || [];
    if (!referencePairs.length) {
      return { isCorrect: false, score: 0 };
    }

    let correctMatches = 0;
    const totalPairs = referencePairs.length;
    referencePairs.forEach(p => {
      const leftKey = String(p.left).trim();
      const expectedRight = String(p.right).trim();
      const chosenRight = studentPairs[leftKey];
      if (chosenRight && chosenRight.toLowerCase() === expectedRight.toLowerCase()) {
        correctMatches++;
      }
    });

    const isAllCorrect = correctMatches === totalPairs;
    if (isAllCorrect) {
      return { isCorrect: true, score: Number(marks) };
    }

    if (correctMatches > 0) {
      const partialRatio = correctMatches / totalPairs;
      return {
        isCorrect: false,
        score: Math.round(Number(marks) * partialRatio * 100) / 100,
        details: { correctMatches, totalPairs },
      };
    }

    return {
      isCorrect: false,
      score: negativeMarkingEnabled ? -Number(negativeMarks || 0) : 0,
    };
  }

  // 3. Standard MCQ / OP / Default
  const isCorrect = isOptionCorrectForAttempt(given, q.correctAnswer, q.options, attemptOpts);
  if (isCorrect) {
    return { isCorrect: true, score: Number(marks) };
  }
  return {
    isCorrect: false,
    score: negativeMarkingEnabled ? -Number(negativeMarks || 0) : 0,
  };
}

// Columns returned to student — NO correct answers, NO hidden test cases, secret hints revealed only if unlocked
function sanitizeQuestion(eq: ExamQuestion, unlockedIndices: number[] = [], customOptions?: string[]) {
  const q = eq.question;
  const qText = q.questionText || q.problemStatement || '';
  const pStmt = q.problemStatement || q.questionText || '';

  const hints = Array.isArray(q.hints) && q.hints.length > 0 && eq.hintsEnabled !== false
    ? q.hints.map((hText, idx) => {
        const isUnlocked = unlockedIndices.includes(idx);
        const penaltyType = eq.hintPenaltyType || 'MARKS';
        const defaultVal = penaltyType === 'TIME' ? 2 : 1;
        const penaltyValue = Array.isArray(eq.hintPenalties) && eq.hintPenalties[idx] !== undefined
          ? Number(eq.hintPenalties[idx])
          : defaultVal;
        return {
          index: idx,
          penaltyType,
          penaltyValue,
          isUnlocked,
          text: isUnlocked ? hText : undefined,
        };
      })
    : [];

  const base = {
    id: q.id,
    questionText: qText,
    type: q.type,
    difficulty: q.difficulty,
    marks: eq.marks,
    negativeMarks: eq.negativeMarks,
    section: eq.section,
    sortOrder: eq.sortOrder,
    domain: q.domain,
    topicNames: q.topicNames,
    programmingLanguage: q.programmingLanguage,
    likesCount: q.likesCount || 0,
    codeSnippet: q.codeSnippet,
    hints,
    hintPenaltyType: eq.hintPenaltyType || 'MARKS',
  };
  if (q.type === QuestionType.MCQ || q.type === QuestionType.OP) {
    return { ...base, options: customOptions || q.options, problemStatement: pStmt };
  }
  if (q.type === QuestionType.FIB) {
    return { ...base, problemStatement: pStmt, blanks: q.blanks };
  }
  if (q.type === QuestionType.MQ) {
    const leftItems = (q.matchingPairs || []).map(p => p.left);
    const rightItems = [
      ...(q.matchingPairs || []).map(p => p.right),
      ...(q.extraRightMatches || []),
    ].filter(Boolean);
    const shuffledRights = customOptions || shuffleList([...rightItems]);
    return {
      ...base,
      problemStatement: pStmt,
      leftItems,
      rightItems: shuffledRights,
      extraRightMatches: q.extraRightMatches,
    };
  }
  if (q.type === QuestionType.JC) {
    const stmts = q.jumbledStatements || (q.correctCode ? q.correctCode.split('\n') : []);
    const shuffledStmts = customOptions || shuffleList([...stmts]);
    return { ...base, problemStatement: pStmt, jumbledStatements: shuffledStmts };
  }
  const samples = publicTestCases(q.testCases || []).slice(0, 2).map(tc => ({
    input: tc.input, output: tc.output, explanation: tc.explanation,
  }));
  return {
    ...base,
    problemStatement: pStmt,
    inputFormat: q.inputFormat,
    outputFormat: q.outputFormat,
    constraints: q.constraints,
    allowedLanguages: q.allowedLanguages,
    sampleTestCases: samples,
  };
}

@Injectable()
export class ExamStudentService {
  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion) private eqRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamAssignment) private assignRepo: Repository<ExamAssignment>,
    @InjectRepository(ExamAttempt) private attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(ExamCodingSubmission) private subRepo: Repository<ExamCodingSubmission>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    private readonly db: DataSource,
    private readonly runner: ExamRunnerService,
    private readonly queueService: CompilerQueueService,
    private readonly examService: ExamService,
  ) {}

  // ─── My Exams ─────────────────────────────────────────────────────────────

  async myExams(user: RequestUser) {
    await this.examService.syncExamStatuses();
    return this.db.query(`
      SELECT DISTINCT e.id, e.title, e.description, e.duration_minutes AS "durationMinutes",
        e.start_at AS "startAt", e.end_at AS "endAt",
        e.total_marks AS "totalMarks", e.passing_marks AS "passingMarks", e.status,
        e.tab_switch_monitoring AS "tabSwitchMonitoring",
        a.id AS "attemptId", a.status AS "attemptStatus",
        a.total_score AS "totalScore", a.passed,
        a.deadline_at AS "deadlineAt"
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id AND ea.student_id = $1
      LEFT JOIN LATERAL (
        SELECT id, status, total_score, passed, deadline_at
        FROM exam_attempts
        WHERE exam_id = e.id AND student_id = $1
        ORDER BY attempt_number DESC LIMIT 1
      ) a ON true
      WHERE (ea.student_id = $1 OR ($2::int IS NOT NULL AND e.college_id = $2::int))
        AND e.status IN ('SCHEDULED','LIVE','COMPLETED')
      ORDER BY e.start_at DESC NULLS LAST
    `, [user.sub, user.collegeId || null]);
  }

  // ─── Exam Instructions ────────────────────────────────────────────────────

  async instructions(user: RequestUser, examId: number) {
    await this.examService.syncExamStatuses();
    const exam = await this.getAssignedExam(user, examId);
    const sections = await this.eqRepo.query(`
      SELECT section, COUNT(*) AS count, SUM(marks) AS marks
      FROM exam_questions WHERE exam_id = $1 GROUP BY section ORDER BY section
    `, [examId]);
    const existing = await this.attemptRepo.findOne({
      where: { examId, studentId: user.sub },
      order: { attemptNumber: 'DESC' },
    });
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      startAt: exam.startAt,
      endAt: exam.endAt,
      serverTime: new Date().toISOString(),
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      attemptLimit: exam.attemptLimit,
      negativeMarking: exam.negativeMarking,
      tabSwitchMonitoring: exam.tabSwitchMonitoring,
      maxTabSwitches: exam.maxTabSwitches ?? 3,
      timingMode: exam.timingMode || 'TOTAL',
      sectionDurations: exam.sectionDurations,
      questionDurationSeconds: exam.questionDurationSeconds,
      showResults: exam.showResults,
      rankingEnabled: exam.rankingEnabled,
      sections,
      existingAttempt: existing ? { id: existing.id, status: existing.status } : null,
    };
  }

  // ─── Start Attempt ────────────────────────────────────────────────────────

  async start(user: RequestUser, examId: number) {
    await this.examService.syncExamStatuses();
    const exam = await this.getAssignedExam(user, examId);
    const now = new Date();

    if (exam.status === ExamStatus.SCHEDULED) {
      if (exam.startAt && new Date(exam.startAt) <= now) {
        exam.status = ExamStatus.LIVE;
        await this.examRepo.update(exam.id, { status: ExamStatus.LIVE });
      } else {
        const timeStr = exam.startAt ? new Date(exam.startAt).toLocaleString() : 'scheduled time';
        throw new ConflictException(`This exam is scheduled and will open at ${timeStr}`);
      }
    }

    if (exam.endAt && new Date(exam.endAt) < now) {
      exam.status = ExamStatus.COMPLETED;
      await this.examRepo.update(exam.id, { status: ExamStatus.COMPLETED });
      throw new ConflictException('This exam has already ended');
    }

    if (exam.status !== ExamStatus.LIVE)
      throw new ConflictException('This exam is not currently live');

    const attempts = await this.attemptRepo.find({ where: { examId, studentId: user.sub }, order: { attemptNumber: 'DESC' } });
    const inProgress = attempts.find(a => a.status === AttemptStatus.IN_PROGRESS);
    if (inProgress) return this.buildAttemptResponse(user, inProgress);

    if (attempts.length >= exam.attemptLimit)
      throw new ConflictException('Attempt limit reached');

    const deadline = this.computeDeadline(exam);

    const examQuestions = await this.eqRepo.find({ where: { examId }, order: { section: 'ASC', sortOrder: 'ASC' } });
    let qOrder: number[] | undefined = undefined;
    if (exam.randomizeQuestions) {
      const secA = shuffleList(examQuestions.filter(e => e.section === 'A').map(e => e.questionId));
      const secB = shuffleList(examQuestions.filter(e => e.section === 'B').map(e => e.questionId));
      const other = shuffleList(examQuestions.filter(e => e.section !== 'A' && e.section !== 'B').map(e => e.questionId));
      qOrder = [...secA, ...secB, ...other];
    }

    const optMappings: Record<string, string[]> = {};
    for (const eq of examQuestions) {
      const q = eq.question || await this.questionRepo.findOneBy({ id: eq.questionId });
      if (!q) continue;
      const qIdKey = String(q.id);
      if (q.type === QuestionType.MCQ && exam.randomizeOptions && Array.isArray(q.options) && q.options.length > 1) {
        optMappings[qIdKey] = shuffleList(q.options);
      } else if (q.type === QuestionType.JC && Array.isArray(q.jumbledStatements) && q.jumbledStatements.length > 1) {
        optMappings[qIdKey] = shuffleList(q.jumbledStatements);
      } else if (q.type === QuestionType.MQ && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 1) {
        const rights = [
          ...q.matchingPairs.map(p => p.right),
          ...(q.extraRightMatches || []),
        ].filter(Boolean);
        optMappings[qIdKey] = shuffleList(rights);
      }
    }

    const attempt = this.attemptRepo.create({
      examId, studentId: user.sub,
      attemptNumber: attempts.length + 1,
      status: AttemptStatus.IN_PROGRESS,
      deadlineAt: deadline,
      questionOrder: qOrder,
      optionMappings: Object.keys(optMappings).length > 0 ? optMappings : undefined,
    });
    await this.attemptRepo.save(attempt);
    return this.buildAttemptResponse(user, attempt);
  }

  // ─── Get Attempt ──────────────────────────────────────────────────────────

  async getAttempt(user: RequestUser, attemptId: number) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    // Auto-submit if deadline passed
    if (attempt.status === AttemptStatus.IN_PROGRESS && new Date() >= new Date(attempt.deadlineAt)) {
      await this.submitAttempt(user, attemptId, { reason: 'TIMER' });
      attempt.status = AttemptStatus.SUBMITTED;
    }
    return this.buildAttemptResponse(user, attempt);
  }

  // ─── Lightweight Heartbeat ───────────────────────────────────────────────

  async getHeartbeat(user: RequestUser, attemptId: number) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    // Auto-submit if deadline passed
    if (attempt.status === AttemptStatus.IN_PROGRESS && new Date() >= new Date(attempt.deadlineAt)) {
      await this.submitAttempt(user, attemptId, { reason: 'TIMER' });
      attempt.status = AttemptStatus.SUBMITTED;
    }
    return {
      deadlineAt: attempt.deadlineAt,
      serverTime: new Date().toISOString(),
      remainingSeconds: this.remainingSeconds(attempt),
      status: attempt.status,
      tabSwitchCount: attempt.tabSwitchCount || 0,
    };
  }

  // ─── Save MCQ Answers ─────────────────────────────────────────────────────

  async saveAnswers(user: RequestUser, attemptId: number, dto: SaveMcqAnswersDto) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    this.assertInProgress(attempt);

    const merged = { ...attempt.mcqAnswers, ...(dto.answers || {}) };
    const timeSpent = dto.timeSpent
      ? { ...attempt.timeSpent, ...dto.timeSpent }
      : attempt.timeSpent;

    const updatePayload: Partial<ExamAttempt> = {
      mcqAnswers: merged,
      timeSpent,
      markedReview: dto.markedReview ?? attempt.markedReview,
    };
    if (dto.faceCoveragePercent !== undefined) updatePayload.faceCoveragePercent = dto.faceCoveragePercent;
    if (dto.faceViolationsCount !== undefined) updatePayload.faceViolationsCount = dto.faceViolationsCount;
    if (dto.inactivityDurationSeconds !== undefined) updatePayload.inactivityDurationSeconds = dto.inactivityDurationSeconds;
    if (dto.tabSwitchCount !== undefined) updatePayload.tabSwitchCount = dto.tabSwitchCount;
    if (dto.tabSwitchLog) updatePayload.tabSwitchLog = dto.tabSwitchLog;

    await this.attemptRepo.update(attemptId, updatePayload);
    return { saved: true, serverTime: new Date().toISOString() };
  }

  // ─── Run / Submit Coding (Non-blocking FIFO Queue via BullMQ) ─────────────

  async runCode(user: RequestUser, attemptId: number, dto: RunCodeDto) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    this.assertInProgress(attempt);

    const eq = await this.eqRepo.findOne({
      where: { examId: attempt.examId, questionId: dto.questionId, section: 'B' },
    });
    if (!eq) throw new NotFoundException('Coding question not found in this exam');
    const q = await this.questionRepo.findOneBy({ id: dto.questionId });
    if (!q) throw new NotFoundException('Question not found');

    const allCases = q.testCases || [];
    const visible = publicTestCases(allCases);
    if (dto.isFinal && !allCases.length) throw new BadRequestException('No test cases configured');

    let casesToRun: Array<{ input: string; output: string; explanation?: string; isPublic?: boolean; isHidden?: boolean }> = allCases;
    if (!dto.isFinal) {
      const stdin = dto.stdin != null && dto.stdin !== '' ? dto.stdin : (visible[0]?.input ?? '');
      casesToRun = [{ input: stdin, output: visible[0]?.output ?? '', isPublic: true }];
    }

    const jobId = `code-${attemptId}-${dto.questionId}-${Date.now()}`;
    const payload: CodeJobPayload = {
      jobId,
      attemptId,
      questionId: dto.questionId,
      userId: user.sub,
      language: dto.language,
      code: dto.code,
      stdin: dto.stdin,
      executionType: dto.isFinal ? 'SUBMIT' : 'RUN',
      isFinal: !!dto.isFinal,
      totalMarks: Number(eq.marks) || 10,
      testCases: casesToRun.map((tc) => ({
        input: tc.input,
        output: tc.output,
        isPublic: dto.isFinal ? isPublicTestCase(tc) : true,
        explanation: tc.explanation,
      })),
    };

    const enqueued = await this.queueService.enqueueJob(payload);

    return {
      jobId: enqueued.jobId,
      status: enqueued.status,
      position: enqueued.position,
      executionType: payload.executionType,
      isFinal: !!dto.isFinal,
      serverTime: new Date().toISOString(),
    };
  }

  /** Retrieve job status and live queue position or execution result */
  async getJobStatus(user: RequestUser, attemptId: number, jobId: string) {
    await this.getStudentAttempt(user, attemptId);
    if (!jobId?.startsWith(`code-${attemptId}-`)) {
      throw new ForbiddenException('Job does not belong to this attempt');
    }
    return this.queueService.getJobStatus(jobId);
  }

  async recordTabSwitch(user: RequestUser, attemptId: number, questionId?: number) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    this.assertInProgress(attempt);
    const exam = await this.examRepo.findOneBy({ id: attempt.examId });
    if (exam && exam.tabSwitchMonitoring === false) {
      return { count: attempt.tabSwitchCount || 0, autoSubmit: false };
    }
    const count = (attempt.tabSwitchCount || 0) + 1;
    const elapsedSeconds = attempt.startTime
      ? Math.max(0, Math.floor((Date.now() - new Date(attempt.startTime).getTime()) / 1000))
      : 0;
    const tabSwitchLog = Array.isArray(attempt.tabSwitchLog) ? [...attempt.tabSwitchLog] : [];
    tabSwitchLog.push({
      timestamp: new Date().toISOString(),
      elapsedSeconds,
      questionId,
    });
    await this.attemptRepo.update(attemptId, { tabSwitchCount: count, tabSwitchLog });
    const maxAllowed = exam?.maxTabSwitches ?? 3;
    if (count >= maxAllowed) {
      await this.submitAttempt(user, attemptId, { reason: 'TAB_SWITCH', tabSwitchCount: count, tabSwitchLog });
      return { count, autoSubmit: true, submitted: true };
    }
    return { count, autoSubmit: false, submitted: false };
  }

  async unlockHint(user: RequestUser, attemptId: number, dto: UnlockHintDto) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    this.assertInProgress(attempt);

    const eq = await this.eqRepo.findOne({
      where: { examId: attempt.examId, questionId: dto.questionId },
    });
    if (!eq) throw new NotFoundException('Question not found in this exam');
    if (eq.hintsEnabled === false) throw new BadRequestException('Hints are disabled for this question');

    const q = await this.questionRepo.findOneBy({ id: dto.questionId });
    if (!q || !Array.isArray(q.hints) || q.hints[dto.hintIndex] === undefined) {
      throw new NotFoundException('Hint not found');
    }

    const qKey = String(dto.questionId);
    const currentUnlocked: number[] = attempt.unlockedHints?.[qKey] || [];
    if (currentUnlocked.includes(dto.hintIndex)) {
      return {
        unlocked: true,
        alreadyUnlocked: true,
        hintIndex: dto.hintIndex,
        hintText: q.hints[dto.hintIndex],
        penaltyType: eq.hintPenaltyType || 'MARKS',
        deadlineAt: attempt.deadlineAt,
        remainingSeconds: this.remainingSeconds(attempt),
      };
    }

    // Must unlock sequentially (e.g. Hint 0 before Hint 1)
    if (dto.hintIndex > 0 && !currentUnlocked.includes(dto.hintIndex - 1)) {
      throw new BadRequestException(`Please unlock Hint ${dto.hintIndex} before unlocking Hint ${dto.hintIndex + 1}`);
    }

    const penaltyType = eq.hintPenaltyType || 'MARKS';
    const defaultVal = penaltyType === 'TIME' ? 120 : 1;
    const penaltyValue = Array.isArray(eq.hintPenalties) && eq.hintPenalties[dto.hintIndex] !== undefined
      ? Number(eq.hintPenalties[dto.hintIndex])
      : defaultVal;

    let updatedDeadlineAt = attempt.deadlineAt;
    let newTimeDeducted = attempt.timeDeductedSeconds || 0;

    if (penaltyType === 'TIME' && penaltyValue > 0) {
      const penaltySeconds = Math.round(penaltyValue);
      newTimeDeducted += penaltySeconds;
      updatedDeadlineAt = new Date(new Date(attempt.deadlineAt).getTime() - penaltySeconds * 1000);
    }

    const nextUnlocked = {
      ...(attempt.unlockedHints || {}),
      [qKey]: [...currentUnlocked, dto.hintIndex],
    };

    await this.attemptRepo.update(attemptId, {
      unlockedHints: nextUnlocked,
      timeDeductedSeconds: newTimeDeducted,
      deadlineAt: updatedDeadlineAt,
    });

    attempt.unlockedHints = nextUnlocked;
    attempt.timeDeductedSeconds = newTimeDeducted;
    attempt.deadlineAt = updatedDeadlineAt;

    return {
      unlocked: true,
      hintIndex: dto.hintIndex,
      hintText: q.hints[dto.hintIndex],
      penaltyType,
      penaltyValue,
      deadlineAt: updatedDeadlineAt,
      remainingSeconds: this.remainingSeconds(attempt),
    };
  }

  // ─── Final Submit ─────────────────────────────────────────────────────────

  async submitAttempt(user: RequestUser, attemptId: number, dto?: SubmitExamDto) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.EVALUATED)
      return { message: 'Already submitted' };

    if (dto?.answers && Object.keys(dto.answers).length) {
      attempt.mcqAnswers = { ...attempt.mcqAnswers, ...dto.answers };
    }
    if (dto?.markedReview) {
      attempt.markedReview = dto.markedReview;
    }

    const exam = await this.examRepo.findOneBy({ id: attempt.examId });
    if (!exam) throw new NotFoundException('Exam not found');

    const autoSubmit = dto?.reason === 'TIMER' || dto?.reason === 'TAB_SWITCH';
    const waitMs = autoSubmit ? 45000 : 15000;
    const codingReady = await this.queueService.waitForAttemptJobs(attemptId, waitMs);
    if (!codingReady && !autoSubmit) {
      throw new ConflictException(
        'Coding evaluation is still in progress. Wait for your code to finish, then submit the exam. Your exam was not submitted.',
      );
    }
    const questions = await this.eqRepo.find({ where: { examId: attempt.examId }, order: { section: 'ASC', sortOrder: 'ASC' } });

    // Score Section A (MCQs, Matching, Jumbled Code)
    let mcqScore = 0;
    for (const eq of questions.filter(q => q.section === 'A')) {
      const q = eq.question || await this.questionRepo.findOneBy({ id: eq.questionId });
      if (!q) continue;
      const given = attempt.mcqAnswers?.[String(eq.questionId)];
      if (!given) continue;
      const attemptOpts = attempt.optionMappings?.[String(eq.questionId)] || q.options;
      const evaluation = evaluateSectionAQuestion(
        q,
        given,
        attemptOpts,
        Number(eq.marks),
        Number(eq.negativeMarks || exam.negativeMarksValue || 0),
        Boolean(exam.negativeMarking),
      );
      let qEarned = evaluation.score;
      if (qEarned > 0 && eq.hintPenaltyType === 'MARKS' && attempt.unlockedHints?.[String(eq.questionId)]) {
        const hintsUnlocked = attempt.unlockedHints[String(eq.questionId)] || [];
        const hintDeduction = hintsUnlocked.reduce((sum, hIdx) => {
          const val = Array.isArray(eq.hintPenalties) && eq.hintPenalties[hIdx] !== undefined ? Number(eq.hintPenalties[hIdx]) : 1;
          return sum + val;
        }, 0);
        qEarned = Math.max(0, qEarned - hintDeduction);
      }
      mcqScore += qEarned;
    }
    mcqScore = Math.max(0, Math.round(mcqScore * 100) / 100);

    // Coding score = sum of final submissions minus MARKS hint penalties
    const codingSubs = await this.subRepo.find({ where: { attemptId, isFinal: true } });
    let codingScore = 0;
    for (const eq of questions.filter(q => q.section === 'B')) {
      const sub = codingSubs.find(s => s.questionId === eq.questionId);
      if (!sub) continue;
      let rawScore = Number(sub.score || 0);
      if (rawScore > 0 && eq.hintPenaltyType === 'MARKS' && attempt.unlockedHints?.[String(eq.questionId)]) {
        const hintsUnlocked = attempt.unlockedHints[String(eq.questionId)] || [];
        const hintDeduction = hintsUnlocked.reduce((sum, hIdx) => {
          const val = Array.isArray(eq.hintPenalties) && eq.hintPenalties[hIdx] !== undefined ? Number(eq.hintPenalties[hIdx]) : 1;
          return sum + val;
        }, 0);
        rawScore = Math.max(0, rawScore - hintDeduction);
      }
      codingScore += rawScore;
    }

    const totalScore = mcqScore + codingScore;
    const passed = totalScore >= exam.passingMarks;
    const reason = dto?.reason && ['TAB_SWITCH', 'TIMER'].includes(dto.reason) ? dto.reason : attempt.autoSubmittedReason;

    const locked = await this.attemptRepo.createQueryBuilder()
      .update(ExamAttempt)
      .set({
        status: AttemptStatus.SUBMITTED,
        endTime: new Date(),
        mcqAnswers: attempt.mcqAnswers,
        markedReview: attempt.markedReview,
        mcqScore,
        codingScore,
        totalScore,
        passed,
        faceCoveragePercent: dto?.faceCoveragePercent ?? attempt.faceCoveragePercent ?? 100,
        faceViolationsCount: dto?.faceViolationsCount ?? attempt.faceViolationsCount ?? 0,
        inactivityDurationSeconds: dto?.inactivityDurationSeconds ?? attempt.inactivityDurationSeconds ?? 0,
        tabSwitchCount: dto?.tabSwitchCount ?? attempt.tabSwitchCount ?? 0,
        tabSwitchLog: dto?.tabSwitchLog ?? attempt.tabSwitchLog ?? [],
        autoSubmittedReason: reason || null,
      })
      .where('id = :id AND status = :status', { id: attemptId, status: AttemptStatus.IN_PROGRESS })
      .execute();

    if (!locked.affected) return { message: 'Already submitted', totalScore, passed };

    return { message: 'Submitted successfully', totalScore, passed };
  }

  // ─── Result ───────────────────────────────────────────────────────────────

  async result(user: RequestUser, attemptId: number) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    if (attempt.status === AttemptStatus.IN_PROGRESS)
      throw new ConflictException('Exam is still in progress');

    const exam = await this.examRepo.findOneBy({ id: attempt.examId });
    if (!exam) throw new NotFoundException('Exam not found');
    if (!exam.showResults) return { message: 'Results are not yet released' };

    const questions = await this.eqRepo.find({
      where: { examId: attempt.examId },
      order: { section: 'ASC', sortOrder: 'ASC' },
    });

    const codingSubs = await this.subRepo.find({ where: { attemptId, isFinal: true } });

    const mcqDetails = questions
      .filter(eq => eq.section === 'A')
      .map(eq => {
        const q = eq.question;
        const given = attempt.mcqAnswers?.[String(eq.questionId)];
        const attemptOpts = attempt.optionMappings?.[String(eq.questionId)] || q.options;
        const evaluated = evaluateSectionAQuestion(
          q,
          given,
          attemptOpts,
          Number(eq.marks),
          Number(eq.negativeMarks || exam.negativeMarksValue || 0),
          Boolean(exam.negativeMarking),
        );
        const unlockedHints = attempt.unlockedHints?.[String(eq.questionId)] || [];
        const hintDeduction = eq.hintPenaltyType === 'MARKS' && unlockedHints.length > 0
          ? unlockedHints.reduce((sum, hIdx) => sum + (Array.isArray(eq.hintPenalties) && eq.hintPenalties[hIdx] !== undefined ? Number(eq.hintPenalties[hIdx]) : 1), 0)
          : 0;

        let formattedCorrectAnswer: string | null | undefined = undefined;
        if (exam.showCorrectAnswers) {
          if (q.type === QuestionType.JC) {
            formattedCorrectAnswer = q.correctCode || (q.jumbledStatements || []).join('\n');
          } else if (q.type === QuestionType.MQ) {
            formattedCorrectAnswer = (q.matchingPairs || []).map((p, idx) => `${idx + 1}. ${p.left} ➔ ${p.right}`).join('\n');
          } else {
            const origLetter = normalizeMcqLetter(q.correctAnswer, q.options);
            const correctText = optionTextForLetter(origLetter, q.options) || q.correctAnswer;
            formattedCorrectAnswer = normalizeMcqLetter(correctText, attemptOpts) || undefined;
          }
        }

        const earnedScore = evaluated.score > 0
          ? Math.max(0, Math.round((evaluated.score - hintDeduction) * 100) / 100)
          : evaluated.score;

        return {
          questionId: eq.questionId,
          type: q.type,
          questionText: q.questionText,
          problemStatement: q.problemStatement,
          codeSnippet: q.codeSnippet,
          programmingLanguage: q.programmingLanguage,
          options: attemptOpts,
          matchingPairs: q.matchingPairs,
          jumbledStatements: q.jumbledStatements,
          yourAnswer: given || null,
          correctAnswer: formattedCorrectAnswer,
          explanation: exam.showExplanations ? q.explanation : undefined,
          marks: eq.marks,
          negativeMarks: eq.negativeMarks,
          hintsUnlocked: unlockedHints.length,
          hintDeduction,
          correct: evaluated.isCorrect,
          earned: earnedScore,
          evaluationDetails: evaluated.details,
        };
      });

    const codingDetails = questions
      .filter(eq => eq.section === 'B')
      .map(eq => {
        const sub = codingSubs.find(s => s.questionId === eq.questionId);
        const unlockedHints = attempt.unlockedHints?.[String(eq.questionId)] || [];
        const hintDeduction = eq.hintPenaltyType === 'MARKS' && unlockedHints.length > 0
          ? unlockedHints.reduce((sum, hIdx) => sum + (Array.isArray(eq.hintPenalties) && eq.hintPenalties[hIdx] !== undefined ? Number(eq.hintPenalties[hIdx]) : 1), 0)
          : 0;
        const rawScore = Number(sub?.score || 0);
        const finalScore = Math.max(0, rawScore - hintDeduction);
        return {
          questionId: eq.questionId,
          problemStatement: eq.question?.problemStatement,
          marks: eq.marks,
          status: sub?.status || 'NOT_ATTEMPTED',
          score: finalScore,
          rawScore,
          hintsUnlocked: unlockedHints.length,
          hintDeduction,
          passedPublic: sub?.passedCases || 0,
          totalPublic: sub?.totalCases || 0,
          language: sub?.language,
        };
      });

    const ranking = exam.rankingEnabled
      ? await this.db.query(`
        SELECT COUNT(*) + 1 AS rank FROM exam_attempts
        WHERE exam_id = $1 AND status != 'IN_PROGRESS' AND total_score > $2
      `, [attempt.examId, attempt.totalScore])
      : null;

    return {
      attemptId, examTitle: exam.title,
      status: attempt.status,
      mcqScore: attempt.mcqScore, codingScore: attempt.codingScore,
      totalScore: attempt.totalScore, totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks, passed: attempt.passed,
      timeDeductedSeconds: attempt.timeDeductedSeconds || 0,
      timeTaken: attempt.endTime && attempt.startTime
        ? Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000)
        : null,
      rank: ranking ? parseInt(ranking[0]?.rank) : undefined,
      mcqDetails, codingDetails,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getAssignedExam(user: RequestUser, examId: number): Promise<Exam> {
    const exam = await this.examRepo.findOneBy({ id: examId });
    if (!exam) throw new NotFoundException('Exam not found');

    const assignment = await this.assignRepo.findOne({ where: { examId, studentId: user.sub } });
    if (!assignment) {
      if (user.collegeId && exam.collegeId === user.collegeId) {
        // Auto-assign student
        await this.assignRepo.save({ examId, studentId: user.sub });
        return exam;
      }
      throw new ForbiddenException('You are not assigned to this exam');
    }
    return exam;
  }

  private async getStudentAttempt(user: RequestUser, attemptId: number): Promise<ExamAttempt> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: ['exam'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId !== user.sub) throw new ForbiddenException('Not your attempt');
    return attempt;
  }

  private computeDeadline(exam: Exam): Date {
    const fromDuration = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
    if (exam.endAt && new Date(exam.endAt).getTime() < fromDuration.getTime()) {
      return new Date(exam.endAt);
    }
    return fromDuration;
  }

  private remainingSeconds(attempt: ExamAttempt): number {
    return Math.max(0, Math.floor((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000));
  }

  private assertInProgress(attempt: ExamAttempt) {
    if (attempt.status !== AttemptStatus.IN_PROGRESS)
      throw new ConflictException('Exam is not in progress');
    if (new Date() >= new Date(attempt.deadlineAt))
      throw new ConflictException('Exam time has expired');
  }

  private async buildAttemptResponse(user: RequestUser, attempt: ExamAttempt) {
    const exam = attempt.exam || await this.examRepo.findOneBy({ id: attempt.examId });
    if (!exam) throw new NotFoundException('Exam not found');
    const eqs = await this.eqRepo.find({
      where: { examId: attempt.examId },
      order: { section: 'ASC', sortOrder: 'ASC' },
    });

    // Load full question details
    for (const eq of eqs) {
      if (!eq.question) {
        const q = await this.questionRepo.findOneBy({ id: eq.questionId });
        if (q) eq.question = q;
      }
    }

    // Lazy initialize randomizations if attempt was started without them
    let needAttemptSave = false;
    if (exam.randomizeQuestions && (!attempt.questionOrder || !attempt.questionOrder.length)) {
      const secA = shuffleList(eqs.filter(e => e.section === 'A').map(e => e.questionId));
      const secB = shuffleList(eqs.filter(e => e.section === 'B').map(e => e.questionId));
      const other = shuffleList(eqs.filter(e => e.section !== 'A' && e.section !== 'B').map(e => e.questionId));
      attempt.questionOrder = [...secA, ...secB, ...other];
      needAttemptSave = true;
    }

    if (!attempt.optionMappings) attempt.optionMappings = {};
    for (const eq of eqs) {
      const q = eq.question;
      if (!q) continue;
      const qKey = String(eq.questionId);
      if (q.type === QuestionType.MCQ && exam.randomizeOptions && Array.isArray(q.options) && q.options.length > 1 && !attempt.optionMappings[qKey]) {
        attempt.optionMappings[qKey] = shuffleList(q.options);
        needAttemptSave = true;
      } else if (q.type === QuestionType.JC && Array.isArray(q.jumbledStatements) && q.jumbledStatements.length > 1 && !attempt.optionMappings[qKey]) {
        attempt.optionMappings[qKey] = shuffleList(q.jumbledStatements);
        needAttemptSave = true;
      } else if (q.type === QuestionType.MQ && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 1 && !attempt.optionMappings[qKey]) {
        const rights = [
          ...q.matchingPairs.map(p => p.right),
          ...(q.extraRightMatches || []),
        ].filter(Boolean);
        attempt.optionMappings[qKey] = shuffleList(rights);
        needAttemptSave = true;
      }
    }

    if (needAttemptSave) {
      await this.attemptRepo.update(attempt.id, {
        questionOrder: attempt.questionOrder,
        optionMappings: attempt.optionMappings,
      });
    }

    let orderedEqs = eqs;
    if (attempt.questionOrder && attempt.questionOrder.length > 0) {
      const orderMap = new Map<number, number>();
      attempt.questionOrder.forEach((qId, idx) => orderMap.set(qId, idx));
      orderedEqs = [...eqs].sort((a, b) => {
        const orderA = orderMap.has(a.questionId) ? orderMap.get(a.questionId)! : a.sortOrder;
        const orderB = orderMap.has(b.questionId) ? orderMap.get(b.questionId)! : b.sortOrder;
        return orderA - orderB;
      });
    }

    const questions = orderedEqs.map(eq => {
      const customOpts = attempt.optionMappings?.[String(eq.questionId)];
      return sanitizeQuestion(eq, attempt.unlockedHints?.[String(eq.questionId)] || [], customOpts);
    });

    // Get saved coding submissions for this attempt
    const codingSubs = await this.subRepo.find({ where: { attemptId: attempt.id }, order: { submittedAt: 'DESC' } });
    const latestCoding: Record<number, any> = {};
    for (const s of codingSubs) {
      if (!latestCoding[s.questionId]) {
        latestCoding[s.questionId] = { code: s.code, language: s.language, status: s.status, score: s.score };
      }
    }

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: exam.title,
      status: attempt.status,
      startTime: attempt.startTime,
      deadlineAt: attempt.deadlineAt,
      serverTime: new Date().toISOString(),
      remainingSeconds: this.remainingSeconds(attempt),
      durationMinutes: exam.durationMinutes,
      negativeMarking: exam.negativeMarking,
      tabSwitchMonitoring: exam.tabSwitchMonitoring,
      maxTabSwitches: exam.maxTabSwitches ?? 3,
      timingMode: exam.timingMode || 'TOTAL',
      sectionDurations: exam.sectionDurations,
      questionDurationSeconds: exam.questionDurationSeconds,
      tabSwitchCount: attempt.tabSwitchCount || 0,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      mcqAnswers: attempt.mcqAnswers || {},
      timeSpent: attempt.timeSpent || {},
      markedReview: attempt.markedReview || [],
      unlockedHints: attempt.unlockedHints || {},
      timeDeductedSeconds: attempt.timeDeductedSeconds || 0,
      questions,
      latestCoding,
    };
  }
}
