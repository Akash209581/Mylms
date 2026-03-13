import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { User, UserRole } from '../entities/user.entity';
import { NotificationService } from '../common/notification.service';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { CourseModule } from '../entities/module.entity';
import { Lesson } from '../entities/lesson.entity';
import { Resource } from '../entities/resource.entity';

@Controller('courses')
export class CoursesController {
  constructor(
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(CourseModule)
    private moduleRepo: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
    private notificationService: NotificationService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any) {
    const userRole = req.user?.role;
    const userId = req.user?.sub;

    // ADMIN can see all courses (including pending for approval)
    if (userRole === UserRole.ADMIN) {
      return this.courseRepo.find({ relations: ['instructor', 'approver'] });
    }

    // SUPERADMIN can only see APPROVED courses (NOT pending)
    if (userRole === UserRole.SUPERADMIN) {
      return this.courseRepo.find({
        where: { status: CourseStatus.APPROVED },
        relations: ['instructor', 'approver'],
      });
    }

    // INSTRUCTOR can see their own courses (all statuses) + approved courses from others
    if (userRole === UserRole.INSTRUCTOR) {
      return this.courseRepo.find({
        where: [
          { instructorId: userId }, // Own courses (including pending)
          { status: CourseStatus.APPROVED }, // Approved courses from others
        ],
        relations: ['instructor', 'approver'],
      });
    }

    // STUDENT (or unauthenticated) can only see approved and published courses
    return this.courseRepo.find({
      where: { status: CourseStatus.APPROVED, published: true },
      relations: ['instructor'],
    });
  }

  @Get('public/browse')
  async browsePublicCourses(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
  ) {
    console.log('📚 Public browse request:', {
      page,
      limit,
      category,
      level,
      search,
    });

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      status: CourseStatus.APPROVED,
      published: true,
    };

    if (category) {
      where.category = category;
    }

    if (level) {
      where.level = level;
    }

    // Get courses with pagination
    const queryBuilder = this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.status = :status', { status: CourseStatus.APPROVED })
      .andWhere('course.published = :published', { published: true });

    if (category) {
      queryBuilder.andWhere('course.category = :category', { category });
    }

    if (level) {
      queryBuilder.andWhere('course.level = :level', { level });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(course.title) LIKE LOWER(:search) OR LOWER(course.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [courses, total] = await queryBuilder
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Enhance with module and lesson counts
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const moduleCount = await this.moduleRepo.count({
          where: { courseId: course.id },
        });
        const modules = await this.moduleRepo.find({
          where: { courseId: course.id },
        });
        const lessonCount = await this.lessonRepo.count({
          where: { moduleId: In(modules.map((m) => m.id)) },
        });

        return {
          ...course,
          moduleCount,
          lessonCount,
        };
      }),
    );

    console.log(`✅ Found ${total} courses, returning page ${pageNum}`);

    return {
      courses: coursesWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req: any) {
    console.log(`📖 Fetching course ${id} for user:`, req.user);

    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['instructor', 'approver'],
    });

    if (!course) {
      console.log(`❌ Course ${id} not found`);
      return null;
    }

    const userRole = req.user?.role;
    const userId = req.user?.sub;

    // SUPERADMIN and ADMIN can see any course
    if (userRole === UserRole.SUPERADMIN || userRole === UserRole.ADMIN) {
      return await this.getCourseWithStructure(course);
    }

    // INSTRUCTOR can see their own courses (any status) or approved courses from others
    if (userRole === UserRole.INSTRUCTOR) {
      if (
        course.instructorId === userId ||
        course.status === CourseStatus.APPROVED
      ) {
        return await this.getCourseWithStructure(course);
      }
      console.log(`❌ Instructor cannot access course ${id}`);
      return null;
    }

    // STUDENT can only see approved and published courses
    if (course.status === CourseStatus.APPROVED && course.published) {
      console.log(`✅ Student accessing approved course ${id}`);
      return await this.getCourseWithStructure(course);
    }

    console.log(
      `❌ Course ${id} not accessible: status=${course.status}, published=${course.published}`,
    );
    return null;
  }

  private async getCourseWithStructure(course: Course) {
    // Fetch modules with lessons and resources
    const modules = await this.moduleRepo.find({
      where: { courseId: course.id },
      order: { order: 'ASC' },
    });

    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const lessons = await this.lessonRepo.find({
          where: { moduleId: module.id },
          order: { order: 'ASC' },
        });

        const lessonsWithResources = await Promise.all(
          lessons.map(async (lesson) => {
            const resources = await this.resourceRepo.find({
              where: { lessonId: lesson.id },
              order: { createdAt: 'ASC' },
            });

            return {
              ...lesson,
              resources,
            };
          }),
        );

        return {
          ...module,
          lessons: lessonsWithResources,
        };
      }),
    );

    return {
      ...course,
      modules: modulesWithLessons,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  async create(@Body() dto: CreateCourseDto, @Request() req: any) {
    console.log('📝 Course creation request received');
    console.log('User:', req.user);
    console.log('DTO:', dto);

    try {
      // Get instructor details
      const instructor = await this.userRepo.findOne({
        where: { id: req.user.sub },
        select: ['id', 'name', 'email'],
      });

      console.log('Instructor found:', instructor?.name);

      const course = this.courseRepo.create({
        ...dto,
        instructorId: req.user.sub,
        status: CourseStatus.DRAFT,
        published: false,
      });

      console.log('Course entity created:', {
        title: course.title,
        status: course.status,
        instructorId: course.instructorId,
      });

      const savedCourse = await this.courseRepo.save(course);
      console.log('✅ Course saved to database with ID:', savedCourse.id);

      return {
        ...savedCourse,
        message: 'Course draft created successfully.',
      };
    } catch (error) {
      console.error('❌ Error creating course:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post(':id/submit')
  async submitCourse(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id, instructorId: req.user.sub } });
    if (!course) {
      return { message: 'Course not found or unauthorized' };
    }

    course.status = CourseStatus.PENDING_APPROVAL;
    await this.courseRepo.save(course);

    try {
      const instructor = await this.userRepo.findOne({ where: { id: req.user.sub } });
      await this.notificationService.notifyAdminsOfPendingCourse(
        course.title,
        instructor?.name || 'Instructor',
        course.id,
      );
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError);
    }

    return { message: 'Course submitted for approval successfully.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post(':id/discard-drafts')
  async discardDrafts(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id, instructorId: req.user.sub } });
    if (!course) {
      return { success: false, message: 'Course not found or unauthorized' };
    }

    // Assuming we only allow this if the course is currently a DRAFT but we want to revert to APPROVED
    course.status = CourseStatus.APPROVED;
    course.published = true;
    await this.courseRepo.save(course);

    // Fetch all lessons in this course
    const modules = await this.moduleRepo.find({ where: { courseId: id } });
    if (modules.length > 0) {
      const lessons = await this.lessonRepo.find({
        where: { moduleId: In(modules.map(m => m.id)) }
      });

      for (const lesson of lessons) {
        if (lesson.draftContent) {
          lesson.draftContent = null;
          await this.lessonRepo.save(lesson);
        }
      }
    }

    return { success: true, message: 'Draft changes discarded successfully. Course is back to live.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body()
    dto: {
      title?: string;
      description?: string;
      thumbnail?: string;
      category?: string;
      level?: string;
      price?: number;
      objectives?: string;
      prerequisites?: string;
      targetAudience?: string;
      duration?: number;
      published?: boolean;
    },
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({
      where: { id, instructorId: req.user.sub },
    });

    if (!course) {
      return { success: false, message: 'Course not found' };
    }

    // If an instructor edits an approved course, or explicitly republishes a course, force it through approval again
    if (course.status === CourseStatus.APPROVED && (Object.keys(dto).length > 0)) {
      dto.published = false;
      course.status = CourseStatus.DRAFT;
      course.approvedBy = null;
      course.rejectionReason = null;
    }

    Object.assign(course, dto);
    await this.courseRepo.save(course);

    return {
      success: true,
      message: 'Course updated successfully',
      course,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.INSTRUCTOR)
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any) {
    if (req.user.role === UserRole.INSTRUCTOR) {
      const course = await this.courseRepo.findOne({ where: { id } });
      if (!course || course.instructorId !== req.user.sub) {
        return { message: 'Unauthorized or course not found' };
      }
    }
    await this.courseRepo.delete(id);
    return { message: 'Course deleted' };
  }
}
