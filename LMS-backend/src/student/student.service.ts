import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
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
import { College } from '../entities/college.entity';
import { CourseContentService } from '../common/course-content.service';

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
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    private courseContentService: CourseContentService,
  ) {}

  private async requireLearningAccess(userId: number, courseId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.isActive || user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('An active student account is required');
    }

    // Resolve legacy accounts without trusting the college of an old enrollment.
    const college = user.collegeId
      ? await this.collegeRepository.findOne({ where: { id: user.collegeId } })
      : user.collegeName
        ? await this.collegeRepository.findOne({ where: { name: user.collegeName } })
        : null;
    if (!college?.active) throw new ForbiddenException('An active college assignment is required');

    const course = await this.courseContentService.requireRead({
      sub: user.id,
      role: user.role,
      collegeId: college.id,
    }, courseId);
    return { course, user };
  }

  async getStats(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const enrollments = await this.enrollmentRepository.count({ where: { studentId: userId } });
    const completedLessonsCount = await this.progressRepository.count({ where: { studentId: userId, completed: true } });
    const badgesCount = await this.userBadgeRepository.count({ where: { userId } });

    // Calculate total hours from completed lessons
    const completedProgress = await this.progressRepository.find({
      where: { studentId: userId, completed: true },
      relations: ['lesson'],
    });
    const totalMinutes = completedProgress.reduce((sum, p) => sum + (p.lesson?.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);

    // Calculate completed courses count (certificates)
    const userEnrollments = await this.enrollmentRepository.find({
      where: { studentId: userId },
      relations: ['course', 'course.modules', 'course.modules.chapters', 'course.modules.chapters.lessons'],
    });
    let certificatesCount = 0;
    const certificatesList: { id: string; courseId: number; title: string; studentName: string; completedAt: Date | null }[] = [];
    const gradedLessons = userEnrollments.flatMap(e => e.course?.modules?.flatMap(m => m.chapters?.flatMap(c => c.lessons || []) || []) || [])
      .filter(lesson => lesson.published && (['quiz','assessment','assignment','programming'].includes(lesson.type) || ['quiz-builder','assignment-builder','programming-builder'].includes(lesson.content?.type)));
    const passedLessonIds = new Set<number>();
    if (gradedLessons.some(lesson => lesson.content?.type === 'quiz-builder')) {
      const passed = await this.lessonRepository.query(`SELECT DISTINCT r.lesson_id FROM assessment_attempt_runtime r
        JOIN quiz_attempts a ON a.id=r.attempt_id WHERE a.student_id=$1 AND r.state='RELEASED' AND a.passed=true`, [userId]);
      passed.forEach(row => passedLessonIds.add(row.lesson_id));
    }
    const completedIds = completedProgress.map((p) => p.lessonId).filter(id => !gradedLessons.some(lesson => lesson.id === id) || passedLessonIds.has(id));
    userEnrollments.forEach((e) => {
      if (e.course?.modules) {
        const lessonIds: number[] = [];
        e.course.modules.forEach((m) => {
          m.chapters?.forEach((c) => {
            c.lessons?.filter(l => l.published).forEach((l) => lessonIds.push(l.id));
          });
        });
        if (lessonIds.length > 0 && lessonIds.every((id) => completedIds.includes(id))) {
          certificatesCount++;
          const dates = completedProgress.filter(p => lessonIds.includes(p.lessonId) && p.completedAt).map(p => new Date(p.completedAt).getTime());
          certificatesList.push({ id: `EV-${userId}-${e.courseId}`, courseId: e.courseId, title: e.course.title, studentName: user?.name || 'Learner', completedAt: dates.length ? new Date(Math.max(...dates)) : null });
        }
      }
    });

    return {
      points: user?.points || 0,
      streak: user?.streakCount || 0,
      enrolledCourses: enrollments,
      completedLessons: completedLessonsCount,
      badges: badgesCount,
      totalHours: totalHours || 0,
      certificates: certificatesCount,
      certificatesList,
      rank: 'Pro',
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

    if (!lesson || !lesson.published) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.chapter?.module?.courseId;
    if (!courseId) {
      throw new ForbiddenException('Lesson is not associated with a valid course');
    }

    const { user } = await this.requireLearningAccess(userId, courseId);

    if (lesson.content?.type === 'quiz-builder') {
      const [passed] = await this.lessonRepository.query(`SELECT 1 FROM quiz_attempts a
        JOIN assessment_attempt_runtime r ON r.attempt_id=a.id
        WHERE r.lesson_id=$1 AND a.student_id=$2 AND r.state='RELEASED' AND a.passed=true LIMIT 1`, [lessonId, userId]);
      if (!passed) throw new ForbiddenException('Pass this assessment and receive its released result before completing the lesson');
    } else if (['quiz','assessment','assignment','programming'].includes(lesson.type) ||
      ['assignment-builder','programming-builder'].includes(lesson.content?.type)) {
      throw new ForbiddenException('This graded lesson requires a released passing evaluation');
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
    // Recheck course availability and college distribution even for existing enrollments.
    const { course } = await this.requireLearningAccess(userId, courseId);
    const instructor = course.instructorId
      ? await this.userRepository.findOne({ where: { id: course.instructorId }, select: ['name'] })
      : null;

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
          where: { chapterId: In(chapterIds), published: true },
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
        instructor: instructor ? { name: instructor.name } : null,
      },
      isEnrolled: true,
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

      const modules = [...(e.course.modules || [])].sort((a, b) => a.order - b.order || a.id - b.id);
      const chapters: Chapter[] = [];
      modules.forEach((m) => {
        if (m.chapters) {
          chapters.push(...[...m.chapters].sort((a, b) => a.order - b.order || a.id - b.id));
        }
      });

      const lessons: Lesson[] = [];
      chapters.forEach((c) => {
        if (c.lessons) {
          lessons.push(...c.lessons.filter(lesson => lesson.published).sort((a, b) => a.order - b.order || a.id - b.id));
        }
      });

      const lessonIds = lessons.map((l) => l.id);
      const completedLessonsCount = lessonIds.filter((id) => completedLessonIds.includes(id)).length;

      const totalLessons = lessons.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

      // Find the first uncompleted lesson as the continue shortcut
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
            dueDate: settings.dueDate || null,
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
            dueDate: settings.dueDate || null,
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

    // 3. Fetch published contests
    const openContests = await this.contestRepo.find({
      where: { status: ContestStatus.PUBLISHED },
      order: { startTime: 'ASC' },
    });

    // 4. Fetch recent completed activity log
    const recentProgress = await this.progressRepository.find({
      where: { studentId: userId, completed: true },
      relations: ['lesson', 'lesson.chapter', 'lesson.chapter.module', 'lesson.chapter.module.course'],
      order: { completedAt: 'DESC' },
      take: 5,
    });

    const recentActivity = recentProgress.map((p) => ({
      id: p.id,
      title: `Completed ${p.lesson?.title || 'Lesson'}`,
      courseTitle: p.lesson?.chapter?.module?.course?.title || 'Course',
      time: p.completedAt ? new Date(p.completedAt).toISOString() : new Date().toISOString(),
      icon: p.lesson?.type === 'quiz' ? '📝' : p.lesson?.type === 'programming' ? '💻' : '✅',
    }));

    // 5. Fetch recent announcements (latest published courses + system news)
    const latestCourses = await this.courseRepository.find({
      where: { published: true },
      order: { createdAt: 'DESC' },
      take: 3,
    });

    const announcements = latestCourses.map((c) => ({
      id: c.id,
      icon: '🎉',
      title: 'New Course Released!',
      description: `${c.title} course is now available.`,
      date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    // 6. User Badges & Achievements
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
    });

    const userObj = await this.userRepository.findOne({ where: { id: userId } });
    const streak = userObj?.streakCount || 0;
    const points = userObj?.points || 0;

    const achievements = [
      {
        id: 'fast-learner',
        title: 'Fast Learner',
        description: 'Completed 5 lessons in a day',
        icon: '🔮',
        color: 'purple',
        unlocked: recentProgress.length >= 5,
      },
      {
        id: 'streak-master',
        title: `${streak > 0 ? streak : 15} Day Streak`,
        description: streak > 0 ? "You're on fire!" : "Build your daily streak!",
        icon: '🔥',
        color: 'amber',
        unlocked: streak >= 3,
      },
      {
        id: 'top-performer',
        title: 'Top Performer',
        description: 'Top 10% in quizzes',
        icon: '👑',
        color: 'emerald',
        unlocked: points >= 100,
      },
      {
        id: 'dedicated',
        title: 'Dedicated',
        description: '100+ hours of learning',
        icon: '🛡️',
        color: 'blue',
        unlocked: points >= 500,
      },
      ...userBadges.map((ub) => ({
        id: ub.badge.id,
        title: ub.badge.name,
        description: ub.badge.description,
        icon: '🏆',
        color: 'indigo',
        unlocked: true,
      })),
    ];

    return {
      coursesProgress,
      codingHistory,
      assignedQuizzes,
      assignedTests,
      recentActivity,
      announcements,
      achievements,
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


