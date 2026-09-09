import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseContentService, CourseReader } from '../common/course-content.service';
import { Course, CourseStatus } from '../entities/course.entity';
import { UserRole } from '../entities/user.entity';
import { LearningStateService } from './learning-state.service';

describe('Personal learning state', () => {
  const setup = () => {
    const user: CourseReader = { sub: 7, role: UserRole.STUDENT, collegeId: 1 };
    const course = { id: 52, title: 'Python', collegeId: 1, published: true, status: CourseStatus.APPROVED, assignedColleges: [] } as unknown as Course;
    const lesson = { id: 103, published: true, chapter: { module: { courseId: 52 } } };
    const stateRows = new Map<string, any>();
    const lessonRows = new Map<string, any>();
    const courseStates = {
      find: jest.fn().mockImplementation(async ({ where }) => [...stateRows.values()]
        .filter(row => row.studentId === where.studentId)
        .map(row => ({ ...row, course, lastLesson: row.lastLessonId ? lesson : null }))),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        const row = stateRows.get(`${where.studentId}:${where.courseId}`);
        return row ? { ...row, lastLesson: row.lastLessonId ? lesson : null } : null;
      }),
      upsert: jest.fn().mockImplementation(async (patch) => {
        const key = `${patch.studentId}:${patch.courseId}`;
        stateRows.set(key, { ...stateRows.get(key), ...patch, updatedAt: new Date() });
      }),
    };
    const lessonStates = {
      find: jest.fn().mockImplementation(async ({ where }) => [...lessonRows.values()]
        .filter(row => row.studentId === where.studentId && where.lessonId.value.includes(row.lessonId))),
      findOne: jest.fn().mockImplementation(async ({ where }) => lessonRows.get(`${where.studentId}:${where.lessonId}`) ?? null),
      upsert: jest.fn().mockImplementation(async (patch) => {
        const key = `${patch.studentId}:${patch.lessonId}`;
        lessonRows.set(key, { ...lessonRows.get(key), ...patch, updatedAt: new Date() });
      }),
    };
    const lessons = { findOne: jest.fn().mockResolvedValue(lesson), find: jest.fn().mockResolvedValue([lesson]) };
    const courses = { findOne: jest.fn().mockResolvedValue(course) };
    const enrollments = { findOne: jest.fn().mockResolvedValue({ studentId: user.sub, courseId: course.id }) };
    const contentAccess = new CourseContentService(courses as any, enrollments as any);
    const service = new LearningStateService(courseStates as any, lessonStates as any, lessons as any, contentAccess);
    return { user, course, lesson, stateRows, lessonRows, courseStates, lessonStates, lessons, enrollments, service };
  };

  it('allows saving a catalog course before enrollment without recording a fabricated visit', async () => {
    const { service, user, enrollments, stateRows } = setup();
    enrollments.findOne.mockResolvedValue(null);
    const result = await service.updateCourse(user, 52, { saved: true });
    expect(result).toMatchObject({ courseId: 52, saved: true, lastLessonId: null, lastViewedAt: null });
    expect(result.savedAt).toBeInstanceOf(Date);
    expect(stateRows.get('7:52').studentId).toBe(7);
  });

  it('requires enrollment to store a resume lesson even when the course can be saved', async () => {
    const { service, user, enrollments, courseStates } = setup();
    enrollments.findOne.mockResolvedValue(null);
    await expect(service.updateCourse(user, 52, { lastLessonId: 103 })).rejects.toThrow(ForbiddenException);
    expect(courseStates.upsert).not.toHaveBeenCalled();
  });

  it('preserves saved preference when recording a visit and preserves the visit when unsaving', async () => {
    const { service, user } = setup();
    await service.updateCourse(user, 52, { saved: true });
    const visit = await service.updateCourse(user, 52, { lastLessonId: 103 });
    expect(visit).toMatchObject({ saved: true, lastLessonId: 103 });
    expect(visit.lastViewedAt).toBeInstanceOf(Date);
    const unsaved = await service.updateCourse(user, 52, { saved: false });
    expect(unsaved).toMatchObject({ saved: false, savedAt: null, lastLessonId: 103, lastViewedAt: visit.lastViewedAt });
  });

  it('rejects a last lesson from another course without modifying preferences', async () => {
    const { service, user, lesson, courseStates } = setup();
    lesson.chapter.module.courseId = 99;
    await expect(service.updateCourse(user, 52, { saved: true, lastLessonId: 103 })).rejects.toThrow(NotFoundException);
    expect(courseStates.upsert).not.toHaveBeenCalled();
  });

  it('does not expose another student’s saved courses or private lesson note', async () => {
    const { service, user, stateRows, lessonRows } = setup();
    stateRows.set('8:52', { studentId: 8, courseId: 52, saved: true });
    lessonRows.set('8:103', { studentId: 8, lessonId: 103, note: 'Private note', bookmarked: true, videoSeconds: 150, pdfPage: 8 });
    expect(await service.listCourses(user)).toEqual([]);
    expect(await service.getLesson(user, 103)).toEqual({ lessonId: 103, note: '', bookmarked: false, videoSeconds: 0, pdfPage: 1, updatedAt: null });
  });

  it('writes only the authenticated student’s state and never accepts owner fields from the payload', async () => {
    const { service, user, lessonRows } = setup();
    lessonRows.set('8:103', { studentId: 8, lessonId: 103, note: 'Keep private' });
    const result = await service.updateLesson(user, 103, { note: 'My note', studentId: 8, lessonId: 99 } as any);
    expect(result.note).toBe('My note');
    expect(lessonRows.get('8:103').note).toBe('Keep private');
    expect(lessonRows.has('8:99')).toBe(false);
    expect(result).not.toHaveProperty('studentId');
  });

  it('keeps notes and bookmarks when a later autosave only changes video or PDF position', async () => {
    const { service, user } = setup();
    await service.updateLesson(user, 103, { note: 'Review the examples', bookmarked: true });
    await service.updateLesson(user, 103, { videoSeconds: 72.5 });
    expect(await service.updateLesson(user, 103, { pdfPage: 4 })).toMatchObject({
      note: 'Review the examples', bookmarked: true, videoSeconds: 72.5, pdfPage: 4,
    });
    expect(await service.updateLesson(user, 103, { note: '', bookmarked: false, videoSeconds: 0, pdfPage: 1 })).toMatchObject({
      note: '', bookmarked: false, videoSeconds: 0, pdfPage: 1,
    });
  });

  it.each([
    ['unpublished course', (state: ReturnType<typeof setup>) => { state.course.published = false; }],
    ['withdrawn course approval', (state: ReturnType<typeof setup>) => { state.course.status = CourseStatus.DRAFT; }],
    ['different college', (state: ReturnType<typeof setup>) => { state.user.collegeId = 2; }],
    ['missing college', (state: ReturnType<typeof setup>) => { state.user.collegeId = undefined; }],
    ['withdrawn enrollment', (state: ReturnType<typeof setup>) => { state.enrollments.findOne.mockResolvedValue(null); }],
  ])('denies private note reads and writes after %s', async (_name, change) => {
    const state = setup();
    change(state);
    await expect(state.service.getLesson(state.user, 103)).rejects.toThrow(ForbiddenException);
    await expect(state.service.updateLesson(state.user, 103, { note: 'No' })).rejects.toThrow(ForbiddenException);
    expect(state.lessonStates.findOne).not.toHaveBeenCalled();
    expect(state.lessonStates.upsert).not.toHaveBeenCalled();
  });

  it('preserves access when a published course is assigned to the student’s current college', async () => {
    const { service, user, course } = setup();
    course.collegeId = 9;
    course.assignedColleges = [{ id: 1 }] as any;
    expect(await service.updateLesson(user, 103, { bookmarked: true })).toMatchObject({ bookmarked: true });
  });

  it('hides unavailable courses from saved/recent listings', async () => {
    const { service, user, course, stateRows } = setup();
    stateRows.set('7:52', { studentId: 7, courseId: 52, saved: true });
    course.published = false;
    expect(await service.listCourses(user)).toEqual([]);
  });

  it('stops resuming an unpublished lesson but retains the student’s course preference', async () => {
    const { service, user, lesson } = setup();
    await service.updateCourse(user, 52, { saved: true, lastLessonId: 103 });
    lesson.published = false;
    expect(await service.getCourse(user, 52)).toMatchObject({ saved: true, lastLessonId: null });
    await expect(service.getLesson(user, 103)).rejects.toThrow(NotFoundException);
  });

  it('lists only the current student’s states for published lessons in the authorized course', async () => {
    const { service, user, lessonRows } = setup();
    lessonRows.set('7:103', { studentId: 7, lessonId: 103, note: 'Own note' });
    lessonRows.set('8:103', { studentId: 8, lessonId: 103, note: 'Another student' });
    lessonRows.set('7:999', { studentId: 7, lessonId: 999, note: 'Other course or unpublished' });
    expect(await service.listLessons(user, 52)).toEqual([expect.objectContaining({ lessonId: 103, note: 'Own note' })]);
  });

  it.each([UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN])('does not allow %s to use student state APIs', async role => {
    const { service, user, courseStates, lessonStates } = setup();
    user.role = role;
    await expect(service.listCourses(user)).rejects.toThrow(ForbiddenException);
    await expect(service.updateCourse(user, 52, { saved: true })).rejects.toThrow(ForbiddenException);
    await expect(service.getLesson(user, 103)).rejects.toThrow(ForbiddenException);
    expect(courseStates.find).not.toHaveBeenCalled();
    expect(lessonStates.findOne).not.toHaveBeenCalled();
  });

  it('rejects empty updates without creating a row', async () => {
    const { service, user, courseStates, lessonStates } = setup();
    await expect(service.updateCourse(user, 52, {})).rejects.toThrow(BadRequestException);
    await expect(service.updateLesson(user, 103, {})).rejects.toThrow(BadRequestException);
    expect(courseStates.upsert).not.toHaveBeenCalled();
    expect(lessonStates.upsert).not.toHaveBeenCalled();
  });
});
