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
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { User, UserRole } from '../entities/user.entity';
import { NotificationService } from '../common/notification.service';
import { OrganizationFilterService } from '../common/organization-filter.service';
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
    private organizationFilterService: OrganizationFilterService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any) {
    const userRole = req.user?.role;
    const userId = req.user?.sub;
    const userOrganizationId = req.user?.organizationId;

    // Get organization filter based on user role
    const orgFilter = this.organizationFilterService.getOrganizationFilter(
      userRole,
      userOrganizationId,
    );

    // ADMIN can see all courses (including pending for approval) within their organization
    if (userRole === UserRole.ADMIN) {
      return this.courseRepo.find({ 
        where: orgFilter,
        relations: ['instructor', 'approver'] 
      });
    }

    // SUPERADMIN can see ALL courses (including pending and approved) across all organizations
    if (userRole === UserRole.SUPERADMIN) {
      return this.courseRepo.find({
        relations: ['instructor', 'approver'],
        order: { createdAt: 'DESC' },
      });
    }

    // INSTRUCTOR can see their own courses (all statuses) + approved courses from their organization
    if (userRole === UserRole.INSTRUCTOR) {
      return this.courseRepo.find({
        where: [
          { instructorId: userId, ...orgFilter }, // Own courses (including pending) within org
          { status: CourseStatus.APPROVED, ...orgFilter }, // Approved courses within org
        ],
        relations: ['instructor', 'approver'],
      });
    }

    // STUDENT (or unauthenticated) can only see approved and published courses within their organization
    return this.courseRepo.find({
      where: { status: CourseStatus.APPROVED, published: true, ...orgFilter },
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
    @Query('organizationId') organizationId?: string,
  ) {
    console.log('📚 Public browse request:', {
      page,
      limit,
      category,
      level,
      search,
      organizationId,
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

    // Filter by organization if provided
    if (organizationId) {
      where.organizationId = parseInt(organizationId);
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

    if (organizationId) {
      queryBuilder.andWhere('course.organizationId = :organizationId', { 
        organizationId: parseInt(organizationId) 
      });
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
    const userOrganizationId = req.user?.organizationId;

    // SUPERADMIN can see any course from any organization
    if (userRole === UserRole.SUPERADMIN) {
      return await this.getCourseWithStructure(course);
    }

    // Check if user can access this course's organization (ADMIN/INSTRUCTOR/STUDENT must be in same org)
    if (userRole && !this.organizationFilterService.canAccessOrganization(
      userRole, 
      userOrganizationId, 
      course.organizationId
    )) {
      console.log(`❌ User cannot access course from different organization`);
      return null;
    }

    // ADMIN can see any course within their organization
    if (userRole === UserRole.ADMIN) {
      return await this.getCourseWithStructure(course);
    }

    // INSTRUCTOR can see their own courses or approved courses within their organization
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

    // STUDENT can only see approved and published courses within their organization
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
      // Get user details
      const user = await this.userRepo.findOne({
        where: { id: req.user.sub },
        select: ['id', 'name', 'email', 'role', 'organizationId'],
      });

      console.log('User found:', user?.name, 'Role:', user?.role, 'Organization:', user?.organizationId);

      // Validate organization access for ADMIN/INSTRUCTOR
      if (user.role !== UserRole.SUPERADMIN && !user.organizationId) {
        throw new Error('User must belong to an organization to create courses');
      }

      // SUPERADMIN courses are auto-approved, INSTRUCTOR courses need approval
      const isSuperAdmin = user.role === UserRole.SUPERADMIN;
      const courseStatus = isSuperAdmin 
        ? CourseStatus.APPROVED 
        : CourseStatus.PENDING_APPROVAL;

      // Set organizationId: SUPERADMIN can specify, others use their own org
      const organizationId = isSuperAdmin && dto.organizationId 
        ? dto.organizationId 
        : user.organizationId;

      const course = this.courseRepo.create({
        ...dto,
        instructorId: req.user.sub,
        organizationId,
        status: courseStatus,
        published: isSuperAdmin ? dto.published ?? false : false, // SUPERADMIN can choose published status
        ...(isSuperAdmin && { approverId: req.user.sub, approvedAt: new Date() }), // Auto-approve for SUPERADMIN
      });

      console.log('Course entity created:', {
        title: course.title,
        status: course.status,
        instructorId: course.instructorId,
        organizationId: course.organizationId,
        published: course.published,
      });

      const savedCourse = await this.courseRepo.save(course);
      console.log('✅ Course saved to database with ID:', savedCourse.id);

      // Only notify admins if course is created by INSTRUCTOR and needs approval
      if (!isSuperAdmin) {
        try {
          await this.notificationService.notifyAdminsOfPendingCourse(
            savedCourse.title,
            user.name,
            savedCourse.id,
          );
          console.log('📧 Admin notification sent');
        } catch (notifError) {
          console.error('⚠️ Failed to send notification:', notifError.message);
        }

        return {
          ...savedCourse,
          message: 'Course created successfully. Awaiting admin approval.',
        };
      }

      return {
        ...savedCourse,
        message: 'Course created and approved successfully!',
      };
    } catch (error) {
      console.error('❌ Error creating course:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateCourseDto,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({ where: { id } });

    if (!course) {
      return { message: 'Course not found' };
    }

    const userRole = req.user.role;
    const userId = req.user.sub;
    const userOrganizationId = req.user.organizationId;

    // SUPERADMIN can update any course
    if (userRole !== UserRole.SUPERADMIN) {
      // Check organization access for non-SUPERADMIN users
      if (!this.organizationFilterService.canAccessOrganization(
        userRole,
        userOrganizationId,
        course.organizationId
      )) {
        return { message: 'Cannot update course from different organization' };
      }

      // INSTRUCTOR can only update their own courses
      if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
        return { message: 'You can only update your own courses' };
      }
    }

    await this.courseRepo.update(id, dto);
    return this.courseRepo.findOne({ where: { id } });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id } });

    if (!course) {
      return { message: 'Course not found' };
    }

    const userRole = req.user.role;
    const userOrganizationId = req.user.organizationId;

    // SUPERADMIN can delete any course
    if (userRole !== UserRole.SUPERADMIN) {
      // ADMIN can only delete courses within their organization
      if (!this.organizationFilterService.canAccessOrganization(
        userRole,
        userOrganizationId,
        course.organizationId
      )) {
        return { message: 'Cannot delete course from different organization' };
      }
    }

    await this.courseRepo.delete(id);
    return { message: 'Course deleted' };
  }
}
