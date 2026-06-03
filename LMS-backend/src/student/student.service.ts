import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Progress } from '../entities/progress.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Course } from '../entities/course.entity';
import { CourseModule } from '../entities/module.entity';
import { Chapter } from '../entities/chapter.entity';
import { Lesson } from '../entities/lesson.entity';
import { Badge } from '../entities/badge.entity';
import { Contest, ContestStatus, ContestType } from '../entities/contest.entity';
import { UpdateStudentProfileDto } from './student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseModule)
    private courseModuleRepository: Repository<CourseModule>,
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
    @InjectRepository(Contest)
    private contestRepo: Repository<Contest>,
  ) {}

  async getStats(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const enrollments = await this.enrollmentRepository.count({ where: { studentId: userId } });
    const completedLessons = await this.progressRepository.count({ where: { studentId: userId, completed: true } });
    const badges = await this.userBadgeRepository.count({ where: { userId } });

    return {
      points: user?.points || 0,
      streak: user?.streakCount || 0,
      enrolledCourses: enrollments,
      completedLessons,
      badges,
      rank: 'Pro', // Placeholder for now
    };
  }

  async getActivity(userId: number) {
    // Fetch last 365 days of progress
    const activities = await this.progressRepository
      .createQueryBuilder('progress')
      .select("TO_CHAR(progress.completed_at, 'YYYY-MM-DD')", 'date')
      .addSelect('CAST(COUNT(*) AS INTEGER)', 'count')
      .where('progress.student_id = :userId', { userId })
      .andWhere('progress.completed = true')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return activities;
  }

  async getSkills(userId: number) {
    // Fetch completed lessons with course categories
    const progress = await this.progressRepository.find({
      where: { studentId: userId, completed: true },
      relations: ['lesson', 'lesson.chapter', 'lesson.chapter.module', 'lesson.chapter.module.course'],
    });

    const skillMap: Record<string, number> = {};

    progress.forEach((p) => {
      const category = p.lesson?.chapter?.module?.course?.category || 'General';
      skillMap[category] = (skillMap[category] || 0) + 1;
    });

    return Object.keys(skillMap).map((key) => ({
      subject: key,
      value: skillMap[key],
      fullMark: 20, // Threshold for radar chart
    }));
  }

  async getCompletedLessons(userId: number, courseId?: number) {
    const query = this.progressRepository
      .createQueryBuilder('progress')
      .leftJoinAndSelect('progress.lesson', 'lesson')
      .leftJoinAndSelect('lesson.chapter', 'chapter')
      .leftJoinAndSelect('chapter.module', 'module')
      .where('progress.student_id = :userId', { userId })
      .andWhere('progress.completed = true');

    if (courseId) {
      query.andWhere('module.course_id = :courseId', { courseId });
    }

    const completed = await query.getMany();
    return completed.map((p) => p.lessonId);
  }

  async getBadges(userId: number) {
    return this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
    });
  }

  async updateProfile(userId: number, updateData: UpdateStudentProfileDto) {
    await this.userRepository.update(userId, updateData);
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async completeLesson(userId: number, lessonId: number) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['chapter', 'chapter.module'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.chapter?.module?.courseId;
    if (!courseId) {
      throw new ForbiddenException('Lesson is not associated with a valid course');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in the course containing this lesson');
    }

    const existing = await this.progressRepository.findOne({
      where: { studentId: userId, lessonId },
    });

    if (existing && existing.completed) {
      return { message: 'Lesson already completed' };
    }

    // Mark as completed
    if (existing) {
      existing.completed = true;
      existing.completedAt = new Date();
      await this.progressRepository.save(existing);
    } else {
      const progress = this.progressRepository.create({
        studentId: userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      });
      await this.progressRepository.save(progress);
    }

    // Award Points
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.points = (user.points || 0) + 10;

      // Handle Streak
      const now = new Date();
      const lastUpdate = user.lastStreakUpdate ? new Date(user.lastStreakUpdate) : null;
      
      if (!lastUpdate) {
        user.streakCount = 1;
      } else {
        const diffInDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays === 1) {
          user.streakCount += 1;
        } else if (diffInDays > 1) {
          user.streakCount = 1;
        }
      }
      user.lastStreakUpdate = now;
      await this.userRepository.save(user);

      // Check for Badges (e.g., first lesson)
      const lessonCount = await this.progressRepository.count({ where: { studentId: userId, completed: true } });
      if (lessonCount === 1) {
        await this.awardBadge(userId, 'Early Bird');
      }
    }

    return { success: true, pointsEarned: 10 };
  }

  private async awardBadge(userId: number, badgeName: string) {
    const badge = await this.badgeRepository.findOne({ where: { name: badgeName } });
    if (badge) {
      const alreadyHas = await this.userBadgeRepository.findOne({ where: { userId, badge_id: badge.id } });
      if (!alreadyHas) {
        const userBadge = this.userBadgeRepository.create({ userId, badge_id: badge.id });
        await this.userBadgeRepository.save(userBadge);
      }
    }
  }


  async getLeaderboard(userId: number, scope?: string) {
    const requestingUser = await this.userRepository.findOne({ where: { id: userId } });

    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.points', 'u.streakCount', 'u.collegeName'])
      .where('u.role = :role', { role: 'STUDENT' })
      .orderBy('u.points', 'DESC')
      .addOrderBy('u.streakCount', 'DESC')
      .take(100);

    if (scope === 'college' && requestingUser?.collegeName) {
      qb.andWhere(
        '(LOWER(TRIM(u.college_name)) = LOWER(TRIM(:cname)))',
        { cname: requestingUser.collegeName },
      );
    }

    const users = await qb.getMany();

    const userBadgeCounts = await this.userBadgeRepository
      .createQueryBuilder('ub')
      .select('ub.user_id', 'userId')
      .addSelect('COUNT(ub.id)', 'count')
      .groupBy('ub.user_id')
      .getRawMany();

    const badgeMap = new Map<number, number>();
    userBadgeCounts.forEach((b) => badgeMap.set(Number(b.userId), Number(b.count)));

    return users.map((u, idx) => ({
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      email: u.email,
      collegeName: u.collegeName,
      points: u.points || 0,
      streak: u.streakCount || 0,
      badges: badgeMap.get(u.id) || 0,
    }));
  }

  async getLearningPath(userId: number, courseId: number) {
    // 1. Load the course with full hierarchy (modules → chapters → lessons with content)
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // 2. Check enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
    });
    const isEnrolled = !!enrollment;

    if (!isEnrolled) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // 3. Load modules with chapters and lessons (including rich content)
    const modules = await this.courseModuleRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });

    if (modules.length > 0) {
      const moduleIds = modules.map((m) => m.id);
      const chapters = await this.chapterRepository.find({
        where: { moduleId: In(moduleIds) },
        order: { order: 'ASC' },
      });

      const chaptersByModule: { [key: number]: Chapter[] } = {};
      chapters.forEach((c) => {
        if (!chaptersByModule[c.moduleId]) {
          chaptersByModule[c.moduleId] = [];
        }
        chaptersByModule[c.moduleId].push(c);
      });

      if (chapters.length > 0) {
        const chapterIds = chapters.map((c) => c.id);
        const lessons = await this.lessonRepository.find({
          select: [
            'id',
            'title',
            'description',
            'type',
            'videoUrl',
            'contentUrl',
            'duration',
            'order',
            'published',
            'content',
            'chapterId',
          ],
          where: { chapterId: In(chapterIds) },
          order: { order: 'ASC' },
        });

        const lessonsByChapter: { [key: number]: Lesson[] } = {};
        lessons.forEach((l) => {
          if (!lessonsByChapter[l.chapterId]) {
            lessonsByChapter[l.chapterId] = [];
          }
          lessonsByChapter[l.chapterId].push(l);
        });

        chapters.forEach((c) => {
          (c as any).lessons = lessonsByChapter[c.id] || [];
        });
      }

      modules.forEach((m) => {
        (m as any).chapters = chaptersByModule[m.id] || [];
      });
    }

    // 4. Get completed lesson IDs for this student in this course
    const completedLessonIds = await this.getCompletedLessons(userId, courseId);

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        instructor: course.instructor ? { name: course.instructor.name } : null,
      },
      isEnrolled,
      completedLessonIds,
      modules,
    };
  }

  async getDashboardDetails(userId: number) {
    // 1. Get student enrolled courses with nested relations
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: userId },
      relations: [
        'course',
        'course.modules',
        'course.modules.chapters',
        'course.modules.chapters.lessons',
      ],
    });

    const completedProgress = await this.progressRepository.find({
      where: { studentId: userId, completed: true },
    });
    const completedLessonIds = completedProgress.map((p) => p.lessonId);

    const coursesProgress: any[] = [];
    const assignedQuizzes: any[] = [];
    const assignedTests: any[] = [];

    for (const e of enrollments) {
      if (!e.course) continue;

      const modules = e.course.modules || [];
      const chapters: Chapter[] = [];
      modules.forEach((m) => {
        if (m.chapters) {
          chapters.push(...m.chapters);
        }
      });

      const lessons: Lesson[] = [];
      chapters.forEach((c) => {
        if (c.lessons) {
          lessons.push(...c.lessons);
        }
      });

      const lessonIds = lessons.map((l) => l.id);
      const completedLessonsCount = lessonIds.filter((id) => completedLessonIds.includes(id)).length;

      const totalLessons = lessons.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

      // Find the first uncompleted lesson as the continue shortcut
      lessons.sort((a, b) => a.id - b.id);
      const nextLesson = lessons.find((l) => !completedLessonIds.includes(l.id));

      coursesProgress.push({
        id: e.id,
        courseId: e.courseId,
        title: e.course.title,
        thumbnail: e.course.thumbnail,
        category: e.course.category,
        completedLessons: completedLessonsCount,
        totalLessons,
        progressPercent,
        nextLessonId: nextLesson?.id || null,
        nextLessonTitle: nextLesson?.title || null,
      });

      // Filter quizzes and tests linked to this course
      for (const lesson of lessons) {
        const isQuiz = lesson.type === 'quiz' || lesson.content?.type === 'quiz-builder';
        const isTest = lesson.type === 'test' || lesson.type === 'assessment';
        const isCompleted = completedLessonIds.includes(lesson.id);

        if (isQuiz) {
          const settings = lesson.content?.settings || {};
          assignedQuizzes.push({
            id: lesson.id,
            title: lesson.title,
            courseTitle: e.course.title,
            courseId: e.courseId,
            timeLimitMinutes: settings.timeLimitMinutes || 20,
            questionsCount: settings.questionsToServe || lesson.content?.questionIds?.length || 10,
            completed: isCompleted,
            dueDate: new Date(new Date(e.enrolledAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        if (isTest) {
          const settings = lesson.content?.settings || {};
          assignedTests.push({
            id: lesson.id,
            title: lesson.title,
            courseTitle: e.course.title,
            courseId: e.courseId,
            timeLimitMinutes: settings.timeLimitMinutes || 45,
            questionsCount: settings.questionsToServe || lesson.content?.questionIds?.length || 20,
            completed: isCompleted,
            dueDate: new Date(new Date(e.enrolledAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }
    }

    // 2. Fetch completed coding practice lessons
    const completedProgramming = await this.progressRepository.find({
      where: { studentId: userId, completed: true },
      relations: ['lesson', 'lesson.chapter', 'lesson.chapter.module', 'lesson.chapter.module.course'],
    });

    const codingHistory = completedProgramming
      .filter((p) => p.lesson?.type === 'programming' || p.lesson?.type === 'programming-builder')
      .map((p) => {
        const content = p.lesson.content as any;
        const allowed = Array.isArray(content?.allowedLanguages) ? content.allowedLanguages : ['python', 'cpp', 'java'];
        const randomLang = allowed[p.id % allowed.length] || 'PYTHON';
        return {
          id: p.id,
          lessonId: p.lessonId,
          title: p.lesson.title,
          courseTitle: p.lesson.chapter?.module?.course?.title || 'General Practice',
          date: p.completedAt || new Date(),
          xp: 100,
          language: randomLang.toUpperCase(),
          difficulty: ['EASY', 'MEDIUM', 'HARD'][p.lessonId % 3],
          status: 'ACCEPTED',
        };
      });

    // 3. Fetch published contests (no mock seed fallback)
    const openContests = await this.contestRepo.find({
      where: { status: ContestStatus.PUBLISHED },
      order: { startTime: 'ASC' },
    });

    return {
      coursesProgress,
      codingHistory,
      assignedQuizzes,
      assignedTests,
      openContests: openContests.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        durationMinutes: c.durationMinutes,
        startTime: c.startTime,
        endTime: c.endTime,
        registeredCount: 0,
        totalMarks: c.totalMarks,
      })),
    };
  }
}


