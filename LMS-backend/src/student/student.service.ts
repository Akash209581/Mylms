import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Progress } from '../entities/progress.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { Badge } from '../entities/badge.entity';

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

  async updateProfile(userId: number, updateData: any) {
    await this.userRepository.update(userId, updateData);
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async completeLesson(userId: number, lessonId: number) {
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
}
