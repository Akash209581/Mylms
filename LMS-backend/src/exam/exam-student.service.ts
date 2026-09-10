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
import { SaveMcqAnswersDto, RunCodeDto } from './exam.dto';
import { ExamRunnerService } from './exam-runner.service';
import { CompilerQueueService } from '../compiler/compiler-queue.service';
import { CodeJobPayload, ExecutionStatus } from '../compiler/compiler.constants';

interface RequestUser { sub: number; role: UserRole; collegeId?: number; }

// Columns returned to student — NO correct answers, NO hidden test cases
function sanitizeQuestion(eq: ExamQuestion) {
  const q = eq.question;
  const base = {
    id: q.id,
    questionText: q.questionText,
    type: q.type,
    difficulty: q.difficulty,
    marks: eq.marks,
    negativeMarks: eq.negativeMarks,
    section: eq.section,
    sortOrder: eq.sortOrder,
  };
  if (q.type === QuestionType.MCQ) {
    return { ...base, options: q.options };
  }
  // Coding question
  return {
    ...base,
    problemStatement: q.problemStatement,
    inputFormat: q.inputFormat,
    outputFormat: q.outputFormat,
    constraints: q.constraints,
    allowedLanguages: q.allowedLanguages,
    codeSnippet: q.codeSnippet,
    // Only public test cases (those without isHidden flag — we use index convention: first half = public)
    sampleTestCases: (q.testCases || []).slice(0, 2).map(tc => ({
      input: tc.input, output: tc.output, explanation: tc.explanation,
    })),
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
  ) {}

  // ─── My Exams ─────────────────────────────────────────────────────────────

  async myExams(user: RequestUser) {
    return this.db.query(`
      SELECT e.id, e.title, e.description, e.duration_minutes AS "durationMinutes",
        e.start_at AS "startAt", e.end_at AS "endAt",
        e.total_marks AS "totalMarks", e.passing_marks AS "passingMarks", e.status,
        e.tab_switch_monitoring AS "tabSwitchMonitoring",
        a.id AS "attemptId", a.status AS "attemptStatus",
        a.total_score AS "totalScore", a.passed,
        a.deadline_at AS "deadlineAt"
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      LEFT JOIN LATERAL (
        SELECT id, status, total_score, passed, deadline_at
        FROM exam_attempts
        WHERE exam_id = ea.exam_id AND student_id = $1
        ORDER BY attempt_number DESC LIMIT 1
      ) a ON true
      WHERE ea.student_id = $1 AND e.status IN ('LIVE','COMPLETED')
      ORDER BY e.start_at DESC NULLS LAST
    `, [user.sub]);
  }

  // ─── Exam Instructions ────────────────────────────────────────────────────

  async instructions(user: RequestUser, examId: number) {
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
      id: exam.id, title: exam.title, description: exam.description,
      instructions: exam.instructions, durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks, passingMarks: exam.passingMarks,
      attemptLimit: exam.attemptLimit, negativeMarking: exam.negativeMarking,
      tabSwitchMonitoring: exam.tabSwitchMonitoring,
      showResults: exam.showResults, rankingEnabled: exam.rankingEnabled,
      sections,
      existingAttempt: existing ? { id: existing.id, status: existing.status } : null,
    };
  }

  // ─── Start Attempt ────────────────────────────────────────────────────────

  async start(user: RequestUser, examId: number) {
    const exam = await this.getAssignedExam(user, examId);
    if (exam.status !== ExamStatus.LIVE)
      throw new ConflictException('This exam is not currently live');

    const attempts = await this.attemptRepo.find({ where: { examId, studentId: user.sub }, order: { attemptNumber: 'DESC' } });
    const inProgress = attempts.find(a => a.status === AttemptStatus.IN_PROGRESS);
    if (inProgress) return this.buildAttemptResponse(user, inProgress);

    if (attempts.length >= exam.attemptLimit)
      throw new ConflictException('Attempt limit reached');

    const deadline = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
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
      await this.submitAttempt(user, attemptId);
      attempt.status = AttemptStatus.SUBMITTED;
    }
    return this.buildAttemptResponse(user, attempt);
  }

  // ─── Save MCQ Answers ─────────────────────────────────────────────────────

  async saveAnswers(user: RequestUser, attemptId: number, dto: SaveMcqAnswersDto) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    this.assertInProgress(attempt);

    const merged = { ...attempt.mcqAnswers, ...dto.answers };
    const timeSpent = dto.timeSpent
      ? { ...attempt.timeSpent, ...dto.timeSpent }
      : attempt.timeSpent;

    await this.attemptRepo.update(attemptId, {
      mcqAnswers: merged,
      timeSpent,
      markedReview: dto.markedReview ?? attempt.markedReview,
    });
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
    if (!q || !q.testCases?.length) throw new BadRequestException('No test cases configured');

    const allCases = q.testCases || [];
    const publicCases = allCases.filter((tc: any) => tc.isPublic === true);
    const hiddenCases = allCases.filter((tc: any) => tc.isPublic === false);

    // If isPublic flag is not explicitly stored on objects, fallback to first-half convention
    const hasExplicitPublicFlags = publicCases.length > 0 || hiddenCases.length > 0;
    const defaultPublicLimit = Math.max(1, Math.floor(allCases.length / 2));

    let casesToRun = allCases;
    if (!dto.isFinal) {
      // Run Code only executes public test cases
      casesToRun = hasExplicitPublicFlags
        ? publicCases
        : allCases.slice(0, defaultPublicLimit);
    }

    const jobId = `code-${attemptId}-${dto.questionId}-${Date.now()}`;
    const payload: CodeJobPayload = {
      jobId,
      attemptId,
      questionId: dto.questionId,
      userId: user.sub,
      language: dto.language,
      code: dto.code,
      executionType: dto.isFinal ? 'SUBMIT' : 'RUN',
      isFinal: !!dto.isFinal,
      totalMarks: Number(eq.marks) || 10,
      testCases: casesToRun.map((tc, idx) => ({
        input: tc.input,
        output: tc.output,
        isPublic: dto.isFinal
          ? (hasExplicitPublicFlags ? (tc as any).isPublic !== false : idx < defaultPublicLimit)
          : true,
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
    const attempt = await this.getStudentAttempt(user, attemptId);
    return this.queueService.getJobStatus(jobId);
  }

  // ─── Final Submit ─────────────────────────────────────────────────────────

  async submitAttempt(user: RequestUser, attemptId: number) {
    const attempt = await this.getStudentAttempt(user, attemptId);
    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.EVALUATED)
      return { message: 'Already submitted' };

    const exam = await this.examRepo.findOneBy({ id: attempt.examId });
    if (!exam) throw new NotFoundException('Exam not found');
    const questions = await this.eqRepo.find({ where: { examId: attempt.examId }, order: { section: 'ASC', sortOrder: 'ASC' } });

    // Score MCQs
    let mcqScore = 0;
    for (const eq of questions.filter(q => q.section === 'A')) {
      const q = eq.question || await this.questionRepo.findOneBy({ id: eq.questionId });
      const given = attempt.mcqAnswers?.[String(eq.questionId)];
      if (!given) continue;
      if (given === q.correctAnswer) {
        mcqScore += Number(eq.marks);
      } else if (exam.negativeMarking) {
        mcqScore -= Number(eq.negativeMarks || exam.negativeMarksValue || 0);
      }
    }
    mcqScore = Math.max(0, mcqScore);

    // Coding score = sum of final submissions
    const codingSubs = await this.subRepo.find({ where: { attemptId, isFinal: true } });
    const codingScore = codingSubs.reduce((sum, s) => sum + Number(s.score), 0);

    const totalScore = mcqScore + codingScore;
    const passed = totalScore >= exam.passingMarks;

    await this.attemptRepo.update(attemptId, {
      status: AttemptStatus.SUBMITTED,
      endTime: new Date(),
      mcqScore, codingScore, totalScore, passed,
    });

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
        const correct = given === q.correctAnswer;
        return {
          questionId: eq.questionId,
          questionText: q.questionText,
          options: q.options,
          yourAnswer: given || null,
          correctAnswer: exam.showCorrectAnswers ? q.correctAnswer : undefined,
          explanation: exam.showExplanations ? q.explanation : undefined,
          marks: eq.marks, negativeMarks: eq.negativeMarks,
          correct, earned: correct ? eq.marks : (given ? -eq.negativeMarks : 0),
        };
      });

    const codingDetails = questions
      .filter(eq => eq.section === 'B')
      .map(eq => {
        const sub = codingSubs.find(s => s.questionId === eq.questionId);
        return {
          questionId: eq.questionId,
          problemStatement: eq.question?.problemStatement,
          marks: eq.marks,
          status: sub?.status || 'NOT_ATTEMPTED',
          score: sub?.score || 0,
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
      timeTaken: attempt.endTime && attempt.startTime
        ? Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000)
        : null,
      rank: ranking ? parseInt(ranking[0]?.rank) : undefined,
      mcqDetails, codingDetails,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getAssignedExam(user: RequestUser, examId: number): Promise<Exam> {
    const assignment = await this.assignRepo.findOne({ where: { examId, studentId: user.sub } });
    if (!assignment) throw new ForbiddenException('You are not assigned to this exam');
    const exam = await this.examRepo.findOneBy({ id: examId });
    if (!exam) throw new NotFoundException('Exam not found');
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

    const questions = eqs.map(eq => sanitizeQuestion(eq));

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
      durationMinutes: exam.durationMinutes,
      negativeMarking: exam.negativeMarking,
      tabSwitchMonitoring: exam.tabSwitchMonitoring,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      mcqAnswers: attempt.mcqAnswers || {},
      timeSpent: attempt.timeSpent || {},
      markedReview: attempt.markedReview || [],
      questions,
      latestCoding,
    };
  }
}
