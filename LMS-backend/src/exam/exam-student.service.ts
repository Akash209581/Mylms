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
import { isMcqCorrect, normalizeMcqLetter } from '../common/mcq-answer.util';

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

// Columns returned to student — NO correct answers, NO hidden test cases, secret hints revealed only if unlocked
function sanitizeQuestion(eq: ExamQuestion, unlockedIndices: number[] = []) {
  const q = eq.question;
  const qText = q.questionText || q.problemStatement || '';
  const pStmt = q.problemStatement || q.questionText || '';

  const hints = Array.isArray(q.hints) && q.hints.length > 0 && eq.hintsEnabled !== false
    ? q.hints.map((hText, idx) => {
        const isUnlocked = unlockedIndices.includes(idx);
        const penaltyType = eq.hintPenaltyType || 'MARKS';
        const defaultVal = penaltyType === 'TIME' ? 120 : 1;
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
    hints,
    hintPenaltyType: eq.hintPenaltyType || 'MARKS',
  };
  if (q.type === QuestionType.MCQ || q.type === QuestionType.OP) {
    return { ...base, options: q.options, problemStatement: pStmt, codeSnippet: q.codeSnippet };
  }
  if (q.type === QuestionType.FIB) {
    return { ...base, problemStatement: pStmt, blanks: q.blanks };
  }
  if (q.type === QuestionType.MQ) {
    return { ...base, problemStatement: pStmt, matchingPairs: q.matchingPairs, extraRightMatches: q.extraRightMatches };
  }
  if (q.type === QuestionType.JC) {
    return { ...base, problemStatement: pStmt, jumbledStatements: q.jumbledStatements };
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
    codeSnippet: q.codeSnippet,
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
    const attempt = this.attemptRepo.create({
      examId, studentId: user.sub,
      attemptNumber: attempts.length + 1,
      status: AttemptStatus.IN_PROGRESS,
      deadlineAt: deadline,
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
    if (!exam?.tabSwitchMonitoring) {
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

    // Score MCQs (accept stored letter A–D or option text)
    let mcqScore = 0;
    for (const eq of questions.filter(q => q.section === 'A')) {
      const q = eq.question || await this.questionRepo.findOneBy({ id: eq.questionId });
      if (!q) continue;
      const given = attempt.mcqAnswers?.[String(eq.questionId)];
      if (!given) continue;
      let qEarned = 0;
      if (isMcqCorrect(given, q.correctAnswer, q.options)) {
        qEarned = Number(eq.marks);
      } else if (exam.negativeMarking) {
        qEarned = -Number(eq.negativeMarks || exam.negativeMarksValue || 0);
      }
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
    mcqScore = Math.max(0, mcqScore);

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
        const correct = isMcqCorrect(given, q.correctAnswer, q.options);
        const correctLetter = normalizeMcqLetter(q.correctAnswer, q.options);
        const unlockedHints = attempt.unlockedHints?.[String(eq.questionId)] || [];
        const hintDeduction = eq.hintPenaltyType === 'MARKS' && unlockedHints.length > 0
          ? unlockedHints.reduce((sum, hIdx) => sum + (Array.isArray(eq.hintPenalties) && eq.hintPenalties[hIdx] !== undefined ? Number(eq.hintPenalties[hIdx]) : 1), 0)
          : 0;
        return {
          questionId: eq.questionId,
          questionText: q.questionText,
          problemStatement: q.problemStatement,
          options: q.options,
          yourAnswer: given || null,
          correctAnswer: exam.showCorrectAnswers ? correctLetter : undefined,
          explanation: exam.showExplanations ? q.explanation : undefined,
          marks: eq.marks, negativeMarks: eq.negativeMarks,
          hintsUnlocked: unlockedHints.length,
          hintDeduction,
          correct, earned: correct ? Math.max(0, Number(eq.marks) - hintDeduction) : (given ? -eq.negativeMarks : 0),
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

    const questions = eqs.map(eq => sanitizeQuestion(eq, attempt.unlockedHints?.[String(eq.questionId)] || []));

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
