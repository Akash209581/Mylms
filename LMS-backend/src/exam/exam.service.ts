import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Exam, ExamStatus } from '../entities/exam.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamAssignment } from '../entities/exam-assignment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { Question, QuestionType } from '../entities/question.entity';
import { User, UserRole } from '../entities/user.entity';
import { College } from '../entities/college.entity';
import {
  CreateExamDto, UpdateExamDto, AddManyExamQuestionsDto,
  AssignStudentsDto, AssignCollegesDto, ImportMcqConfirmDto,
  CloneExamDto, UpdateQuestionMarksDto,
} from './exam.dto';

/** Shape of the JWT payload stored on req.user */
interface RequestUser {
  sub: number;
  role: UserRole;
  collegeId?: number;
}

@Injectable()
export class ExamService implements OnModuleInit, OnModuleDestroy {
  private syncTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion) private eqRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamAssignment) private assignRepo: Repository<ExamAssignment>,
    @InjectRepository(ExamAttempt) private attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(College) private collegeRepo: Repository<College>,
    private readonly db: DataSource,
  ) {}

  async onModuleInit() {
    await this.runSelfHealingMigrations();
    this.syncExamStatuses().catch(() => {});
    this.syncTimer = setInterval(() => {
      this.syncExamStatuses().catch(() => {});
    }, 30000);
  }

  private async runSelfHealingMigrations() {
    try {
      await this.db.query(`
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_tab_switches integer DEFAULT 3;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS timing_mode varchar(20) DEFAULT 'TOTAL';
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS section_durations jsonb;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_duration_seconds integer;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_branches jsonb;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_batches jsonb;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS tab_switch_monitoring boolean DEFAULT true;
        ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS marks numeric(7,2) DEFAULT 1;
        ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS negative_marks numeric(7,2) DEFAULT 0;
        ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS section varchar(1) DEFAULT 'A';
      `);
    } catch (err: any) {
      console.warn('Exam self-healing migration warning:', err?.message || err);
    }
  }

  onModuleDestroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  /** Automatically transition SCHEDULED exams to LIVE and expired exams to COMPLETED */
  async syncExamStatuses() {
    try {
      const now = new Date();
      // 1. SCHEDULED -> LIVE (startAt reached, and endAt not yet passed)
      await this.examRepo
        .createQueryBuilder()
        .update(Exam)
        .set({ status: ExamStatus.LIVE })
        .where('status = :scheduled', { scheduled: ExamStatus.SCHEDULED })
        .andWhere('start_at IS NOT NULL AND start_at <= :now', { now })
        .andWhere('(end_at IS NULL OR end_at > :now)', { now })
        .execute();

      // 2. SCHEDULED or LIVE -> COMPLETED (endAt passed)
      await this.examRepo
        .createQueryBuilder()
        .update(Exam)
        .set({ status: ExamStatus.COMPLETED })
        .where('status IN (:...statuses)', { statuses: [ExamStatus.LIVE, ExamStatus.SCHEDULED] })
        .andWhere('end_at IS NOT NULL AND end_at <= :now', { now })
        .execute();
    } catch (err) {
      console.warn('syncExamStatuses failed:', err);
    }
  }

  // ─── Access helpers ───────────────────────────────────────────────────────

  private assertAdmin(user: RequestUser) {
    if (user.role === UserRole.STUDENT) throw new ForbiddenException('Admin access required');
  }

  private async assertOwns(user: RequestUser, exam: Exam) {
    if (user.role === UserRole.SUPERADMIN) return;
    if (exam.collegeId && exam.collegeId !== user.collegeId)
      throw new ForbiddenException('This exam belongs to a different college');
    if (user.role === UserRole.INSTRUCTOR && exam.createdById !== user.sub)
      throw new ForbiddenException('You did not create this exam');
  }

  private async getExamOrFail(id: number): Promise<Exam> {
    await this.syncExamStatuses();
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new NotFoundException(`Exam #${id} not found`);
    return exam;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(user: RequestUser, dto: CreateExamDto): Promise<Exam> {
    this.assertAdmin(user);
    const exam = this.examRepo.create({
      ...dto,
      tabSwitchMonitoring: dto.tabSwitchMonitoring ?? true,
      maxTabSwitches: dto.maxTabSwitches ?? 3,
      timingMode: dto.timingMode || 'TOTAL',
      sectionDurations: dto.sectionDurations,
      questionDurationSeconds: dto.questionDurationSeconds,
      targetBranches: dto.targetBranches,
      targetBatches: dto.targetBatches,
      collegeId: user.role === UserRole.SUPERADMIN ? undefined : user.collegeId,
      createdById: user.sub,
      status: ExamStatus.DRAFT,
    });
    return this.examRepo.save(exam);
  }

  async list(user: RequestUser) {
    this.assertAdmin(user);
    await this.syncExamStatuses();
    try {
      const qb = this.examRepo.createQueryBuilder('e')
        .orderBy('e.createdAt','DESC');
      if (user.role !== UserRole.SUPERADMIN) {
        if (!user.collegeId) throw new ForbiddenException('College required');
        qb.where('e.collegeId = :cid', { cid: user.collegeId });
      }
      return await qb.getMany();
    } catch (err: any) {
      console.warn('Exam list query error, applying self-healing migration and retrying:', err?.message || err);
      await this.runSelfHealingMigrations();
      const qb = this.examRepo.createQueryBuilder('e')
        .orderBy('e.createdAt','DESC');
      if (user.role !== UserRole.SUPERADMIN && user.collegeId) {
        qb.where('e.collegeId = :cid', { cid: user.collegeId });
      }
      return await qb.getMany();
    }
  }

  async findOne(user: RequestUser, id: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    const questions = await this.eqRepo.find({
      where: { examId: id },
      order: { section: 'ASC', sortOrder: 'ASC' },
      relations: ['question'],
    });
    const assignedCount = await this.assignRepo.count({ where: { examId: id } });
    const attemptsCount = await this.attemptRepo.count({ where: { examId: id } });

    return { ...exam, questions, assignedStudents: assignedCount, attempts: attemptsCount };
  }

  async update(user: RequestUser, id: number, dto: UpdateExamDto): Promise<Exam> {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);
    if (exam.status === ExamStatus.ARCHIVED)
      throw new ConflictException('Archived exams cannot be edited');

    if (dto.startAt !== undefined) exam.startAt = dto.startAt ? new Date(dto.startAt) : (null as any);
    if (dto.endAt !== undefined) exam.endAt = dto.endAt ? new Date(dto.endAt) : (null as any);
    if (dto.title !== undefined) exam.title = dto.title;
    if (dto.description !== undefined) exam.description = dto.description;
    if (dto.instructions !== undefined) exam.instructions = dto.instructions;
    if (dto.durationMinutes !== undefined) exam.durationMinutes = dto.durationMinutes;
    if (dto.passingMarks !== undefined) exam.passingMarks = dto.passingMarks;
    if (dto.negativeMarking !== undefined) exam.negativeMarking = dto.negativeMarking;
    if (dto.negativeMarksValue !== undefined) exam.negativeMarksValue = dto.negativeMarksValue;
    if (dto.attemptLimit !== undefined) exam.attemptLimit = dto.attemptLimit;
    if (dto.randomizeQuestions !== undefined) exam.randomizeQuestions = dto.randomizeQuestions;
    if (dto.randomizeOptions !== undefined) exam.randomizeOptions = dto.randomizeOptions;
    if (dto.autoSubmit !== undefined) exam.autoSubmit = dto.autoSubmit;
    if (dto.showResults !== undefined) exam.showResults = dto.showResults;
    if (dto.showCorrectAnswers !== undefined) exam.showCorrectAnswers = dto.showCorrectAnswers;
    if (dto.showExplanations !== undefined) exam.showExplanations = dto.showExplanations;
    if (dto.rankingEnabled !== undefined) exam.rankingEnabled = dto.rankingEnabled;
    if (dto.tabSwitchMonitoring !== undefined) exam.tabSwitchMonitoring = dto.tabSwitchMonitoring;
    if (dto.maxTabSwitches !== undefined) exam.maxTabSwitches = dto.maxTabSwitches;
    if (dto.timingMode !== undefined) exam.timingMode = dto.timingMode;
    if (dto.sectionDurations !== undefined) exam.sectionDurations = dto.sectionDurations;
    if (dto.questionDurationSeconds !== undefined) exam.questionDurationSeconds = dto.questionDurationSeconds;
    if (dto.targetBranches !== undefined) exam.targetBranches = dto.targetBranches;
    if (dto.targetBatches !== undefined) exam.targetBatches = dto.targetBatches;
    if (dto.status !== undefined) exam.status = dto.status;

    return this.examRepo.save(exam);
  }

  async remove(user: RequestUser, id: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Only DRAFT exams can be deleted');
    await this.examRepo.delete(id);
    return { message: 'Exam deleted' };
  }

  async publish(user: RequestUser, id: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Already published');

    const qCount = await this.eqRepo.count({ where: { examId: id } });
    if (qCount === 0)
      throw new BadRequestException('Add at least one question before publishing');

    const newStatus = exam.startAt && new Date(exam.startAt) > new Date()
      ? ExamStatus.SCHEDULED : ExamStatus.LIVE;

    await this.examRepo.update(id, { status: newStatus });
    return { message: `Exam is now ${newStatus}`, status: newStatus };
  }

  // ─── Questions ────────────────────────────────────────────────────────────

  private async validateQuestionsAccess(user: RequestUser, exam: Exam, questionIds: number[], section: 'A' | 'B') {
    const expectedType = section === 'A' ? QuestionType.MCQ : QuestionType.PQ;
    const questions = await this.questionRepo.findBy({ id: In(questionIds) });
    if (questions.length !== questionIds.length)
      throw new NotFoundException('One or more questions not found');
    for (const q of questions) {
      if (q.type !== expectedType)
        throw new BadRequestException(`Section ${section} only accepts ${expectedType} questions`);
      if (user.role !== UserRole.SUPERADMIN && q.collegeId && q.collegeId !== user.collegeId)
        throw new ForbiddenException(`Question #${q.id} belongs to a different college`);
    }
    return questions;
  }

  async addQuestions(user: RequestUser, id: number, dto: AddManyExamQuestionsDto, section: 'A' | 'B') {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Can only modify questions on DRAFT exams');

    const qIds = dto.questions.map(q => q.questionId);
    await this.validateQuestionsAccess(user, exam, qIds, section);

    const maxOrder = await this.eqRepo.maximum('sortOrder', { examId: id, section }) ?? -1;
    const existing = await this.eqRepo.find({
      where: { examId: id, questionId: In(qIds) },
      select: ['questionId'],
    });
    const existingSet = new Set(existing.map(e => e.questionId));
    const rows: ExamQuestion[] = [];
    for (let i = 0; i < dto.questions.length; i++) {
      const d = dto.questions[i];
      if (existingSet.has(d.questionId)) continue;
      rows.push(this.eqRepo.create({
        examId: id, questionId: d.questionId, section,
        marks: d.marks, negativeMarks: d.negativeMarks ?? 0,
        sortOrder: (maxOrder as number) + i + 1,
      }));
    }
    if (rows.length) await this.eqRepo.save(rows);

    // Recalculate totalMarks
    await this.recalcTotalMarks(id);
    return { added: rows.length };
  }

  async removeQuestion(user: RequestUser, examId: number, qId: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(examId);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Can only modify questions on DRAFT exams');
    await this.eqRepo.delete({ examId, questionId: qId });
    await this.recalcTotalMarks(examId);
    return { message: 'Question removed' };
  }

  async reorderQuestions(user: RequestUser, examId: number, orderedIds: number[]) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(examId);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT) throw new ConflictException('Exam must be DRAFT');
    for (let i = 0; i < orderedIds.length; i++) {
      await this.eqRepo.update({ examId, questionId: orderedIds[i] }, { sortOrder: i });
    }
    return { message: 'Order updated' };
  }

  private async recalcTotalMarks(examId: number) {
    const result = await this.eqRepo
      .createQueryBuilder('eq')
      .select('SUM(eq.marks)', 'total')
      .where('eq.examId = :examId', { examId })
      .getRawOne();
    await this.examRepo.update(examId, { totalMarks: parseFloat(result?.total || '0') });
  }

  // ─── Assign students ──────────────────────────────────────────────────────

  async assign(user: RequestUser, id: number, dto: AssignStudentsDto) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    const students = await this.userRepo.findBy({ id: In(dto.studentIds), role: UserRole.STUDENT });
    if (students.length !== dto.studentIds.length)
      throw new BadRequestException('One or more student IDs are invalid');

    const rows = students.map(s => this.assignRepo.create({ examId: id, studentId: s.id }));
    await this.assignRepo
      .createQueryBuilder()
      .insert()
      .into(ExamAssignment)
      .values(rows)
      .orIgnore()
      .execute();

    return { assigned: rows.length };
  }

  async unassign(user: RequestUser, id: number, studentId: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);
    await this.assignRepo.delete({ examId: id, studentId });
    return { message: 'Student unassigned' };
  }

  async listAssigned(user: RequestUser, id: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    return this.db.query(`
      SELECT u.id, u.name, u.email, u.college_id AS "collegeId", c.name AS "collegeName",
        ea.assigned_at AS "assignedAt",
        a.status AS "attemptStatus", a.total_score AS "totalScore"
      FROM exam_assignments ea
      JOIN users u ON u.id = ea.student_id
      LEFT JOIN colleges c ON c.id = u.college_id
      LEFT JOIN LATERAL (
        SELECT status, total_score FROM exam_attempts
        WHERE exam_id = ea.exam_id AND student_id = ea.student_id
        ORDER BY attempt_number DESC LIMIT 1
      ) a ON true
      WHERE ea.exam_id = $1
      ORDER BY u.name
    `, [id]);
  }

  // ─── Assign Institutions / Colleges ───────────────────────────────────────

  async getColleges(user: RequestUser) {
    this.assertAdmin(user);
    const colleges = await this.collegeRepo.find({ order: { name: 'ASC' } });

    const counts = await this.userRepo
      .createQueryBuilder('u')
      .select('u.collegeId', 'collegeId')
      .addSelect('COUNT(u.id)', 'studentCount')
      .where('u.role = :role', { role: UserRole.STUDENT })
      .andWhere('u.collegeId IS NOT NULL')
      .groupBy('u.collegeId')
      .getRawMany();

    const countMap: Record<number, number> = {};
    for (const c of counts) {
      countMap[Number(c.collegeId)] = parseInt(c.studentCount, 10) || 0;
    }

    return colleges.map(col => ({
      id: col.id,
      name: col.name,
      type: col.type,
      city: col.city,
      state: col.state,
      studentCount: countMap[col.id] || 0,
    }));
  }

  async assignColleges(user: RequestUser, id: number, dto: AssignCollegesDto) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    if (!dto.collegeIds?.length) {
      return { assigned: 0, message: 'No institutions selected' };
    }

    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.collegeId'])
      .where('u.role = :role', { role: UserRole.STUDENT })
      .andWhere('u.collegeId IN (:...cids)', { cids: dto.collegeIds });

    const branches = dto.branches?.length ? dto.branches : exam.targetBranches;
    if (branches && branches.length > 0) {
      qb.andWhere('u.branch IN (:...branches)', { branches });
    }

    const batches = dto.batches?.length ? dto.batches : exam.targetBatches;
    if (batches && batches.length > 0) {
      qb.andWhere('(CAST(u.pursuingYear AS text) IN (:...batches) OR u.course IN (:...batches))', { batches });
    }

    const students = await qb.getMany();

    if (students.length === 0) {
      return { assigned: 0, message: 'No registered students found in selected institutions matching criteria' };
    }

    const rows = students.map(s => this.assignRepo.create({ examId: id, studentId: s.id }));
    await this.assignRepo
      .createQueryBuilder()
      .insert()
      .into(ExamAssignment)
      .values(rows)
      .orIgnore()
      .execute();

    return { assigned: rows.length, collegeCount: dto.collegeIds.length, totalStudents: students.length };
  }

  async updateQuestionMarks(user: RequestUser, examId: number, questionId: number, dto: UpdateQuestionMarksDto) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(examId);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Can only modify marks on DRAFT exams');

    const eq = await this.eqRepo.findOne({ where: { examId, questionId } });
    if (!eq) throw new NotFoundException('Question not assigned to this exam');

    if (dto.marks !== undefined) eq.marks = dto.marks;
    if (dto.negativeMarks !== undefined) eq.negativeMarks = dto.negativeMarks;
    await this.eqRepo.save(eq);
    await this.recalcTotalMarks(examId);

    return eq;
  }

  async cloneExam(user: RequestUser, examId: number, dto: CloneExamDto) {
    this.assertAdmin(user);
    const original = await this.getExamOrFail(examId);
    await this.assertOwns(user, original);

    let targetCollegeId: number | undefined = original.collegeId;
    if (user.role === UserRole.SUPERADMIN) {
      targetCollegeId = dto.collegeId !== undefined ? dto.collegeId : original.collegeId;
    } else {
      targetCollegeId = user.collegeId;
    }

    const cloned = this.examRepo.create({
      title: dto.title || `${original.title} (Copy)`,
      description: original.description,
      instructions: original.instructions,
      durationMinutes: original.durationMinutes,
      totalMarks: original.totalMarks,
      passingMarks: original.passingMarks,
      negativeMarking: original.negativeMarking,
      negativeMarksValue: original.negativeMarksValue,
      attemptLimit: original.attemptLimit,
      randomizeQuestions: original.randomizeQuestions,
      randomizeOptions: original.randomizeOptions,
      autoSubmit: original.autoSubmit,
      showResults: original.showResults,
      showCorrectAnswers: original.showCorrectAnswers,
      showExplanations: original.showExplanations,
      rankingEnabled: original.rankingEnabled,
      tabSwitchMonitoring: original.tabSwitchMonitoring,
      maxTabSwitches: original.maxTabSwitches,
      timingMode: original.timingMode,
      sectionDurations: original.sectionDurations,
      questionDurationSeconds: original.questionDurationSeconds,
      targetBranches: dto.targetBranches || original.targetBranches,
      targetBatches: dto.targetBatches || original.targetBatches,
      startAt: dto.startAt ? new Date(dto.startAt) : (null as any),
      endAt: dto.endAt ? new Date(dto.endAt) : (null as any),
      collegeId: targetCollegeId || undefined,
      createdById: user.sub,
      status: ExamStatus.DRAFT,
    });

    const savedExam = await this.examRepo.save(cloned);

    const originalQuestions = await this.eqRepo.find({ where: { examId } });
    if (originalQuestions.length > 0) {
      const clonedQuestions = originalQuestions.map((q) =>
        this.eqRepo.create({
          examId: savedExam.id,
          questionId: q.questionId,
          section: q.section,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          sortOrder: q.sortOrder,
        }),
      );
      await this.eqRepo.save(clonedQuestions);
      await this.recalcTotalMarks(savedExam.id);
    }

    if (targetCollegeId) {
      await this.assignColleges(user, savedExam.id, {
        collegeIds: [targetCollegeId],
        branches: dto.targetBranches || savedExam.targetBranches,
        batches: dto.targetBatches || savedExam.targetBatches,
      }).catch(() => {});
    }

    return savedExam;
  }

  async unassignCollege(user: RequestUser, id: number, collegeId: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    await this.db.query(`
      DELETE FROM exam_assignments ea
      USING users u
      WHERE ea.student_id = u.id
        AND ea.exam_id = $1
        AND u.college_id = $2
    `, [id, collegeId]);

    return { message: 'Institution unassigned' };
  }

  async listAssignedColleges(user: RequestUser, id: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(id);
    await this.assertOwns(user, exam);

    return this.db.query(`
      SELECT c.id, c.name, c.type, c.city, c.state,
        COUNT(DISTINCT ea.student_id)::int AS "assignedStudentCount",
        MIN(ea.assigned_at) AS "assignedAt"
      FROM exam_assignments ea
      JOIN users u ON u.id = ea.student_id
      JOIN colleges c ON c.id = u.college_id
      WHERE ea.exam_id = $1
      GROUP BY c.id, c.name, c.type, c.city, c.state
      ORDER BY c.name ASC
    `, [id]);
  }

  // ─── Excel Import ─────────────────────────────────────────────────────────

  async confirmImport(user: RequestUser, examId: number, dto: ImportMcqConfirmDto) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(examId);
    await this.assertOwns(user, exam);
    if (exam.status !== ExamStatus.DRAFT)
      throw new ConflictException('Can only import into DRAFT exams');

    const maxOrder = await this.eqRepo.maximum('sortOrder', { examId, section: 'A' }) ?? -1;
    let order = (maxOrder as number) + 1;
    const created: ExamQuestion[] = [];

    for (const row of dto.rows) {
      let questionId: number;

      if (dto.saveToBank) {
        // Persist question to global question bank first
        const q = this.questionRepo.create({
          type: QuestionType.MCQ,
          questionText: row.question,
          options: [row.optionA, row.optionB, row.optionC, row.optionD],
          correctAnswer: row.correctAnswer,
          difficulty: row.difficulty || 'MEDIUM',
          topicNames: row.topic || 'General',
          explanation: row.explanation,
          collegeId: user.collegeId || undefined,
          questionNumber: await this.generateQuestionNumber(),
        });
        const saved = await this.questionRepo.save(q);
        questionId = saved.id;
      } else {
        // Still need a question row — create it (inactive) for exam-only use
        const q = this.questionRepo.create({
          type: QuestionType.MCQ,
          questionText: row.question,
          options: [row.optionA, row.optionB, row.optionC, row.optionD],
          correctAnswer: row.correctAnswer,
          difficulty: row.difficulty || 'MEDIUM',
          topicNames: row.topic || 'General',
          explanation: row.explanation,
          collegeId: user.collegeId || undefined,
          questionNumber: await this.generateQuestionNumber(),
          isActive: false,
        });
        const saved = await this.questionRepo.save(q);
        questionId = saved.id;
      }

      created.push(this.eqRepo.create({
        examId, questionId, section: 'A',
        marks: row.marks || 1,
        negativeMarks: row.negativeMarks || 0,
        sortOrder: order++,
      }));
    }

    if (created.length) {
      await this.eqRepo.save(created);
      await this.recalcTotalMarks(examId);
    }

    return { imported: created.length };
  }

  private async generateQuestionNumber(): Promise<string> {
    const last = await this.questionRepo.findOne({ where: { type: QuestionType.MCQ }, order: { id: 'DESC' } });
    let n = 1;
    if (last?.questionNumber) {
      const num = parseInt(last.questionNumber.replace('MCQ', ''), 10);
      if (!isNaN(num)) n = num + 1;
    }
    let code = `MCQ${String(n).padStart(4, '0')}`;
    while (await this.questionRepo.findOne({ where: { questionNumber: code } })) {
      n++;
      code = `MCQ${String(n).padStart(4, '0')}`;
    }
    return code;
  }

  // ─── Attempt list (admin) ─────────────────────────────────────────────────

  async listAttempts(user: RequestUser, examId: number) {
    this.assertAdmin(user);
    const exam = await this.getExamOrFail(examId);
    await this.assertOwns(user, exam);
    return this.db.query(`
      SELECT a.id, a.student_id AS "studentId", u.name AS "studentName", u.email,
        a.attempt_number AS "attemptNumber", a.status,
        a.total_score AS "totalScore", a.passed, a.start_time AS "startTime",
        a.end_time AS "endTime"
      FROM exam_attempts a JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 ORDER BY a.created_at DESC LIMIT 500
    `, [examId]);
  }
}
