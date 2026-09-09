import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseContentService, CourseReader } from '../common/course-content.service';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { UserRole } from '../entities/user.entity';
import { CourseLearningState } from './course-learning-state.entity';
import { LessonLearningState } from './lesson-learning-state.entity';
import { UpdateCourseLearningStateDto, UpdateLessonLearningStateDto } from './learning-state.dto';

@Injectable()
export class LearningStateService {
  constructor(
    @InjectRepository(CourseLearningState) private readonly courseStates: Repository<CourseLearningState>,
    @InjectRepository(LessonLearningState) private readonly lessonStates: Repository<LessonLearningState>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    private readonly contentAccess: CourseContentService,
  ) {}

  private requireStudent(user: CourseReader) {
    if (user.role !== UserRole.STUDENT) throw new ForbiddenException('Personal learning state is available to students');
  }

  private requireId(id: number) {
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException('A positive resource ID is required');
  }

  private async requirePreview(user: CourseReader, courseId: number) {
    this.requireStudent(user);
    this.requireId(courseId);
    const course = await this.contentAccess.getCourse(courseId);
    if (!this.contentAccess.canPreview(user, course)) throw new ForbiddenException('Course is unavailable');
    return course;
  }

  private async requireLesson(user: CourseReader, lessonId: number, expectedCourseId?: number) {
    this.requireStudent(user);
    this.requireId(lessonId);
    const lesson = await this.lessons.findOne({
      where: { id: lessonId },
      relations: ['chapter', 'chapter.module'],
      select: { id: true, published: true, chapter: { id: true, module: { id: true, courseId: true } } },
    });
    const courseId = lesson?.chapter?.module?.courseId;
    if (!lesson?.published || !courseId || (expectedCourseId !== undefined && courseId !== expectedCourseId)) {
      throw new NotFoundException('Published lesson not found in this course');
    }
    await this.contentAccess.requireRead(user, courseId);
    return lesson;
  }

  /** Never expose state belonging to another account or a newly unavailable college/course. */
  async listCourses(user: CourseReader) {
    this.requireStudent(user);
    const states = await this.courseStates.find({
      where: { studentId: user.sub },
      relations: ['course', 'course.assignedColleges', 'lastLesson', 'lastLesson.chapter', 'lastLesson.chapter.module'],
      order: { updatedAt: 'DESC' },
    });
    const available = states.filter(state => state.course && this.contentAccess.canPreview(user, state.course));
    return Promise.all(available.map(state => this.courseResponse(user, state.course, state)));
  }

  async getCourse(user: CourseReader, courseId: number) {
    const course = await this.requirePreview(user, courseId);
    return this.readCourseState(user, course);
  }

  async updateCourse(user: CourseReader, courseId: number, body: UpdateCourseLearningStateDto) {
    const course = await this.requirePreview(user, courseId);
    if (body.saved === undefined && body.lastLessonId === undefined) {
      throw new BadRequestException('Provide a saved preference or last lesson');
    }
    const patch: Partial<CourseLearningState> = { studentId: user.sub, courseId };
    if (body.saved !== undefined) {
      patch.saved = body.saved;
      patch.savedAt = body.saved ? new Date() : null;
    }
    if (body.lastLessonId !== undefined) {
      await this.requireLesson(user, body.lastLessonId, courseId);
      patch.lastLessonId = body.lastLessonId;
      patch.lastViewedAt = new Date();
    }
    // ON CONFLICT updates only supplied fields: a background resume save cannot erase a saved preference.
    await this.courseStates.upsert(patch, ['studentId', 'courseId']);
    return this.readCourseState(user, course);
  }

  private async readCourseState(user: CourseReader, course: Course) {
    const state = await this.courseStates.findOne({
      where: { studentId: user.sub, courseId: course.id },
      relations: ['lastLesson', 'lastLesson.chapter', 'lastLesson.chapter.module'],
    });
    return this.courseResponse(user, course, state);
  }

  private async courseResponse(user: CourseReader, course: Course, state: CourseLearningState | null) {
    const currentLesson = state?.lastLesson;
    // A deleted, moved or unpublished lesson must not remain a resume destination.
    const validResume = currentLesson?.published && currentLesson.chapter?.module?.courseId === course.id &&
      await this.contentAccess.canRead(user, course);
    return {
      courseId: course.id,
      saved: state?.saved ?? false,
      savedAt: state?.savedAt ?? null,
      lastLessonId: validResume ? state!.lastLessonId : null,
      lastViewedAt: state?.lastViewedAt ?? null,
      updatedAt: state?.updatedAt ?? null,
      course: {
        id: course.id, title: course.title, thumbnail: course.thumbnail,
        category: course.category, level: course.level,
      },
    };
  }

  async getLesson(user: CourseReader, lessonId: number) {
    await this.requireLesson(user, lessonId);
    return this.readLessonState(user.sub, lessonId);
  }

  async listLessons(user: CourseReader, courseId: number) {
    this.requireStudent(user);
    this.requireId(courseId);
    await this.contentAccess.requireRead(user, courseId);
    const lessons = await this.lessons.find({
      where: { published: true, chapter: { module: { courseId } } },
      select: { id: true },
    });
    if (!lessons.length) return [];
    const states = await this.lessonStates.find({
      where: { studentId: user.sub, lessonId: In(lessons.map(lesson => lesson.id)) },
      order: { updatedAt: 'DESC' },
    });
    return states.map(state => this.lessonResponse(state.lessonId, state));
  }

  async updateLesson(user: CourseReader, lessonId: number, body: UpdateLessonLearningStateDto) {
    await this.requireLesson(user, lessonId);
    const patch: Partial<LessonLearningState> = { studentId: user.sub, lessonId };
    let hasUpdate = false;
    for (const key of ['note', 'bookmarked', 'videoSeconds', 'pdfPage'] as const) {
      if (body[key] !== undefined) {
        Object.assign(patch, { [key]: body[key] });
        hasUpdate = true;
      }
    }
    if (!hasUpdate) throw new BadRequestException('Provide a note, bookmark or media position');
    // A position-only autosave preserves note/bookmark data written by other requests.
    await this.lessonStates.upsert(patch, ['studentId', 'lessonId']);
    return this.readLessonState(user.sub, lessonId);
  }

  private async readLessonState(studentId: number, lessonId: number) {
    const state = await this.lessonStates.findOne({ where: { studentId, lessonId } });
    return this.lessonResponse(lessonId, state);
  }

  private lessonResponse(lessonId: number, state: LessonLearningState | null) {
    return {
      lessonId,
      note: state?.note ?? '',
      bookmarked: state?.bookmarked ?? false,
      videoSeconds: state?.videoSeconds ?? 0,
      pdfPage: state?.pdfPage ?? 1,
      updatedAt: state?.updatedAt ?? null,
    };
  }
}
