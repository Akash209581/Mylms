import { ConflictException } from '@nestjs/common';
import { ExamStudentService } from './exam-student.service';
import { AttemptStatus } from '../entities/exam-attempt.entity';
import { ExamStatus } from '../entities/exam.entity';
import { UserRole } from '../entities/user.entity';

const user = { sub: 7, role: UserRole.STUDENT, collegeId: 1 };

function makeService(opts: {
  attempt?: any;
  exam?: any;
  jobsReady?: boolean;
  lockAffected?: number;
} = {}) {
  const exam = {
    id: 1,
    title: 'Midterm',
    durationMinutes: 60,
    endAt: null as Date | null,
    passingMarks: 40,
    negativeMarking: false,
    tabSwitchMonitoring: true,
    showResults: true,
    status: ExamStatus.LIVE,
    ...opts.exam,
  };
  const attempt = {
    id: 10,
    examId: 1,
    studentId: 7,
    status: AttemptStatus.IN_PROGRESS,
    deadlineAt: new Date(Date.now() + 60_000),
    mcqAnswers: {},
    markedReview: [],
    tabSwitchCount: 0,
    exam,
    ...opts.attempt,
  };

  const attemptRepo = {
    findOne: jest.fn().mockResolvedValue(attempt),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => ({ id: 10, ...row })),
    update: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn(() => ({
      update: () => ({
        set: () => ({
          where: () => ({
            execute: async () => ({ affected: opts.lockAffected ?? 1 }),
          }),
        }),
      }),
    })),
  };
  const examRepo = {
    findOneBy: jest.fn().mockResolvedValue(exam),
    update: jest.fn(),
  };
  const eqRepo = { find: jest.fn().mockResolvedValue([]), query: jest.fn() };
  const assignRepo = { findOne: jest.fn().mockResolvedValue({ examId: 1, studentId: 7 }) };
  const subRepo = { find: jest.fn().mockResolvedValue([]) };
  const questionRepo = { findOneBy: jest.fn() };
  const queueService = {
    waitForAttemptJobs: jest.fn().mockResolvedValue(opts.jobsReady ?? true),
    enqueueJob: jest.fn(),
    getJobStatus: jest.fn(),
  };
  const examService = { syncExamStatuses: jest.fn() };
  const db = { query: jest.fn().mockResolvedValue([]) };

  const service = new ExamStudentService(
    examRepo as any,
    eqRepo as any,
    assignRepo as any,
    attemptRepo as any,
    subRepo as any,
    questionRepo as any,
    db as any,
    {} as any,
    queueService as any,
    examService as any,
  );

  return { service, attemptRepo, examRepo, queueService, attempt, exam };
}

describe('ExamStudentService timer and submit', () => {
  afterEach(() => jest.useRealTimers());

  it('caps the attempt deadline at exam.endAt', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));
    const { service } = makeService();
    const deadline = (service as any).computeDeadline({
      durationMinutes: 120,
      endAt: new Date('2026-09-12T12:10:00.000Z'),
    });
    expect(deadline.toISOString()).toBe('2026-09-12T12:10:00.000Z');
  });

  it('uses duration when endAt is later than the window', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));
    const { service } = makeService();
    const deadline = (service as any).computeDeadline({
      durationMinutes: 30,
      endAt: new Date('2026-09-12T18:00:00.000Z'),
    });
    expect(deadline.toISOString()).toBe('2026-09-12T12:30:00.000Z');
  });

  it('never returns negative remainingSeconds', () => {
    const { service } = makeService();
    expect((service as any).remainingSeconds({
      deadlineAt: new Date(Date.now() - 5000),
    })).toBe(0);
  });

  it('TIMER submit waits for jobs then always finalizes', async () => {
    const { service, queueService, attemptRepo } = makeService({ jobsReady: false });
    const result = await service.submitAttempt(user, 10, { reason: 'TIMER' });
    expect(queueService.waitForAttemptJobs).toHaveBeenCalledWith(10, 45000);
    expect(attemptRepo.createQueryBuilder).toHaveBeenCalled();
    expect(result.message).toBe('Submitted successfully');
  });

  it('manual submit returns 409 while coding jobs are pending', async () => {
    const { service, queueService } = makeService({ jobsReady: false });
    await expect(service.submitAttempt(user, 10, { reason: 'MANUAL' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(queueService.waitForAttemptJobs).toHaveBeenCalledWith(10, 15000);
  });

  it('duplicate submit is idempotent', async () => {
    const { service } = makeService({
      attempt: { status: AttemptStatus.SUBMITTED },
    });
    await expect(service.submitAttempt(user, 10, {})).resolves.toEqual({
      message: 'Already submitted',
    });
  });

  it('row lock prevents a second in-progress submit from scoring twice', async () => {
    const { service } = makeService({ lockAffected: 0 });
    const result = await service.submitAttempt(user, 10, {});
    expect(result.message).toBe('Already submitted');
  });

  it('third tab switch submits on the server', async () => {
    const { service, attemptRepo, queueService } = makeService({
      attempt: { tabSwitchCount: 2 },
    });
    const result = await service.recordTabSwitch(user, 10);
    expect(attemptRepo.update).toHaveBeenCalledWith(10, { tabSwitchCount: 3 });
    expect(queueService.waitForAttemptJobs).toHaveBeenCalled();
    expect(result).toMatchObject({ count: 3, autoSubmit: true, submitted: true });
  });
});
