import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserRole } from '../entities/user.entity';
import { canEditCourse } from './course-access';

export type CourseReader = { sub: number; role: UserRole; collegeId?: number };

export function matchesCourseCollege(user: CourseReader, course: Course): boolean {
  return !!user.collegeId && (course.collegeId === user.collegeId ||
    course.assignedColleges?.some(college => college.id === user.collegeId));
}

@Injectable()
export class CourseContentService {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(Enrollment) private enrollments: Repository<Enrollment>,
  ) {}

  async getCourse(id: number) {
    const course = await this.courses.findOne({ where: { id }, relations: ['assignedColleges'] });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  canPreview(user: CourseReader | undefined, course: Course): boolean {
    if (user && canEditCourse(user, course)) return true;
    return course.published && course.status === CourseStatus.APPROVED &&
      (!user || matchesCourseCollege(user, course));
  }

  async canRead(user: CourseReader | undefined, course: Course): Promise<boolean> {
    if (!user) return false;
    if (canEditCourse(user, course)) return true;
    if (!this.canPreview(user, course)) return false;
    // Published courses distributed to staff are available as read-only previews.
    if ([UserRole.ADMIN, UserRole.INSTRUCTOR].includes(user.role)) return true;
    return !!await this.enrollments.findOne({ where: { studentId: user.sub, courseId: course.id } });
  }

  async requireRead(user: CourseReader, courseId: number): Promise<Course> {
    const course = await this.getCourse(courseId);
    if (!await this.canRead(user, course)) throw new ForbiddenException('Enroll in an available course to access its lessons');
    return course;
  }
}

/** Explicit curriculum projection: no content, media, resources or editor identities. */
export function coursePreview(course: any) {
  const { id, title, description, thumbnail, category, level, price, objectives, prerequisites,
    targetAudience, duration, instructor, instructorId, collegeId, published, status, createdAt, updatedAt } = course;
  return {
    id, title, description, thumbnail, category, level, price, objectives, prerequisites,
    targetAudience, duration, instructor, instructorId, collegeId, published, status, createdAt, updatedAt,
    modules: (course.modules || []).map((module: any) => ({
      id: module.id, title: module.title, description: module.description, order: module.order, courseId: id,
      chapters: (module.chapters || []).map((chapter: any) => ({
        id: chapter.id, title: chapter.title, description: chapter.description, order: chapter.order, moduleId: module.id,
        lessons: (chapter.lessons || []).filter((lesson: any) => lesson.published).map((lesson: any) => ({
          id: lesson.id, title: lesson.title, type: lesson.type, duration: lesson.duration,
          order: lesson.order, chapterId: chapter.id, published: true,
        })),
      })),
    })),
  };
}
