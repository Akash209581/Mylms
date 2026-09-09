import { StudentService } from './student.service';
import { ForbiddenException } from '@nestjs/common';
import { CourseContentService } from '../common/course-content.service';
import { Course, CourseStatus } from '../entities/course.entity';
import { User, UserRole } from '../entities/user.entity';

describe('Student course certificates', () => {
  const setup = (lessons: any[], completed: number[]) => {
    const service = Object.create(StudentService.prototype) as StudentService;
    Object.assign(service, {
      userRepository: { findOne: jest.fn().mockResolvedValue({ name: 'Learner', points: 10 }) },
      enrollmentRepository: {
        count: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockResolvedValue([{ courseId: 52, course: { title: 'Python', modules: [{ chapters: [{ lessons }] }] } }]),
      },
      progressRepository: {
        count: jest.fn().mockResolvedValue(completed.length),
        find: jest.fn().mockResolvedValue(completed.map(lessonId => ({ lessonId, completedAt: new Date('2026-09-08T00:00:00Z'), lesson: { duration: 10 } }))),
      },
      userBadgeRepository: { count: jest.fn().mockResolvedValue(0) },
    });
    return service;
  };
  it('returns a downloadable certificate after all published lessons are completed', async () => {
    const result = await setup([{ id: 1, published: true }, { id: 2, published: false }], [1]).getStats(7);
    expect(result.certificates).toBe(1);
    expect(result.certificatesList[0]).toMatchObject({ id: 'EV-7-52', title: 'Python', studentName: 'Learner' });
  });
  it('does not issue certificates for an unfinished course', async () => {
    const result = await setup([{ id: 1, published: true }, { id: 2, published: true }], [1]).getStats(7);
    expect(result.certificatesList).toEqual([]);
  });
  it('does not issue certificates for empty courses', async () => {
    expect((await setup([], []).getStats(7)).certificatesList).toEqual([]);
  });
});

describe('Student learning access after enrollment', () => {
  const setup = () => {
    const user = { id: 7, name: 'Learner', isActive: true, role: UserRole.STUDENT, collegeId: 1, points: 10 } as User;
    const college = { id: 1, name: 'University', active: true };
    const course = {
      id: 52, title: 'Python', collegeId: 1, assignedColleges: [],
      published: true, status: CourseStatus.APPROVED,
    } as unknown as Course;
    const lesson = { id: 3, chapterId: 2, published: true, chapter: { module: { courseId: 52 } }, content: { type: 'markdown', source: 'Lesson content' } };
    const users = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn().mockResolvedValue(user) };
    const colleges = { findOne: jest.fn().mockResolvedValue(college) };
    const courses = { findOne: jest.fn().mockResolvedValue(course) };
    const enrollments = { findOne: jest.fn().mockResolvedValue({ studentId: 7, courseId: 52 }) };
    const progress = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(value => value),
      save: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(2),
    };
    const modules = { find: jest.fn().mockResolvedValue([{ id: 1, courseId: 52, order: 0 }]) };
    const chapters = { find: jest.fn().mockResolvedValue([{ id: 2, moduleId: 1, order: 0 }]) };
    const lessons = { findOne: jest.fn().mockResolvedValue(lesson), find: jest.fn().mockResolvedValue([lesson]) };
    const service = Object.create(StudentService.prototype) as StudentService;
    Object.assign(service, {
      userRepository: users,
      collegeRepository: colleges,
      progressRepository: progress,
      courseModuleRepository: modules,
      chapterRepository: chapters,
      lessonRepository: lessons,
      courseContentService: new CourseContentService(courses as any, enrollments as any),
      getCompletedLessons: jest.fn().mockResolvedValue([]),
    });
    return { service, user, college, course, lesson, users, colleges, enrollments, progress, modules, lessons };
  };

  describe.each([
    ['learning path', (service: StudentService) => service.getLearningPath(7, 52)],
    ['lesson completion', (service: StudentService) => service.completeLesson(7, 3)],
  ] as const)('%s', (_label, request) => {
    it.each([
      ['course is unpublished', (state: ReturnType<typeof setup>) => { state.course.published = false; }],
      ['course approval is withdrawn', (state: ReturnType<typeof setup>) => { state.course.status = CourseStatus.DRAFT; }],
      ['college distribution is removed', (state: ReturnType<typeof setup>) => { state.course.collegeId = 2; state.course.assignedColleges = []; }],
      ['student moves to another college', (state: ReturnType<typeof setup>) => { state.user.collegeId = 3; state.college.id = 3; }],
      ['student is inactive', (state: ReturnType<typeof setup>) => { state.user.isActive = false; }],
      ['college is inactive', (state: ReturnType<typeof setup>) => { state.college.active = false; }],
      ['account becomes an instructor', (state: ReturnType<typeof setup>) => { state.user.role = UserRole.INSTRUCTOR; }],
      ['enrollment is removed', (state: ReturnType<typeof setup>) => { state.enrollments.findOne.mockResolvedValue(null); }],
    ] as const)('denies access when %s without changing progress or points', async (_reason, change) => {
      const state = setup();
      change(state);
      await expect(request(state.service)).rejects.toThrow(ForbiddenException);
      expect(state.modules.find).not.toHaveBeenCalled();
      expect(state.progress.save).not.toHaveBeenCalled();
      expect(state.users.save).not.toHaveBeenCalled();
    });
  });

  it('keeps course 52 learning content and hierarchy available to an enrolled student', async () => {
    const { service, lessons } = setup();
    const result = await service.getLearningPath(7, 52);
    expect(result).toMatchObject({ course: { id: 52, title: 'Python' }, isEnrolled: true });
    expect(result.modules[0].chapters[0].lessons[0].content.source).toBe('Lesson content');
    expect(lessons.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ published: true }) }));
  });

  it('allows a course explicitly distributed to the current college', async () => {
    const { service, course } = setup();
    course.collegeId = 2;
    course.assignedColleges = [{ id: 1 }] as any;
    await expect(service.getLearningPath(7, 52)).resolves.toMatchObject({ isEnrolled: true });
  });

  it('resolves an active legacy college name before checking course access', async () => {
    const { service, user, colleges } = setup();
    user.collegeId = undefined;
    user.collegeName = 'University';
    await expect(service.getLearningPath(7, 52)).resolves.toMatchObject({ isEnrolled: true });
    expect(colleges.findOne).toHaveBeenCalledWith({ where: { name: 'University' } });
  });

  it('completes an available lesson and keeps the existing ten-point reward', async () => {
    const { service, progress, users } = setup();
    await expect(service.completeLesson(7, 3)).resolves.toEqual({ success: true, pointsEarned: 10 });
    expect(progress.save).toHaveBeenCalledWith(expect.objectContaining({ studentId: 7, lessonId: 3, completed: true }));
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ points: 20 }));
  });

  it('does not reward an already completed lesson again', async () => {
    const { service, progress, users } = setup();
    progress.findOne.mockResolvedValue({ studentId: 7, lessonId: 3, completed: true });
    await expect(service.completeLesson(7, 3)).resolves.toEqual({ message: 'Lesson already completed' });
    expect(progress.save).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });
});
