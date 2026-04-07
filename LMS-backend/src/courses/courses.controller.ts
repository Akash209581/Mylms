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
  HttpException,
  HttpStatus,
  ParseIntPipe,
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
import { CollegeFilterService } from '../common/college-filter.service';
import { CreateCourseDto, UpdateCourseDto, AssignCourseDto } from './courses.dto';
import { CourseModule } from '../entities/module.entity';
import { Chapter } from '../entities/chapter.entity';
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
    @InjectRepository(Chapter)
    private chapterRepo: Repository<Chapter>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
    private notificationService: NotificationService,
    private collegeFilterService: CollegeFilterService,
  ) {}


  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any) {
    const userRole = req.user?.role;
    const userId = req.user?.sub;
    const userCollegeId = req.user?.collegeId;
    const userCollegeName = req.user?.collegeName;

    const qb = this.courseRepo.createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.approver', 'approver')
      .leftJoinAndSelect('course.assignedColleges', 'assignedCollege');

    // SUPERADMIN can see ALL courses
    if (userRole === UserRole.SUPERADMIN) {
      return qb.orderBy('course.createdAt', 'DESC').getMany();
    }

    if (!userCollegeId && !userCollegeName) {
      return [];
    }

    // Common WHERE clause for matching college (own + assigned)
    const collegeConditions = [];
    if (userCollegeId) {
      collegeConditions.push('course.collegeId = :userCollegeId OR assignedCollege.id = :userCollegeId');
    }
    if (userCollegeName) {
      // Legacy user fallback: match by string name instead
      collegeConditions.push('instructor.collegeName = :userCollegeName OR assignedCollege.name = :userCollegeName');
    }
    const collegeCondition = `(${collegeConditions.join(' OR ')})`;
    const params: any = { userCollegeId, userCollegeName };

    // ADMIN can see all courses (including pending for approval) within their college + assigned ones
    if (userRole === UserRole.ADMIN) {
      return qb.where(collegeCondition, params).getMany();
    }

    // INSTRUCTOR can see their own courses (all statuses) + approved courses from their college + assigned ones
    if (userRole === UserRole.INSTRUCTOR) {
      params.userId = userId;
      params.approvedStatus = CourseStatus.APPROVED;
      return qb.where(`(course.instructorId = :userId AND ${collegeCondition})`, params)
               .orWhere(`(course.status = :approvedStatus AND ${collegeCondition})`, params)
               .getMany();
    }

    // STUDENT (or unauthenticated) can only see approved and published courses within their college + assigned ones
    params.approvedStatus = CourseStatus.APPROVED;
    return qb.where(`course.status = :approvedStatus AND course.published = true`, params)
             .andWhere(collegeCondition, params)
             .getMany();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('public/browse')
  async browsePublicCourses(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('collegeId') queryCollegeId?: string,
  ) {
    const authUser = req.user;
    const isSuperAdmin = authUser && authUser.role === UserRole.SUPERADMIN;

    console.log('📚 Public browse request:', {
      page,
      limit,
      category,
      level,
      search,
      queryCollegeId,
      authUser: authUser ? { role: authUser.role, colId: authUser.collegeId, colName: authUser.collegeName } : null,
    });

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const queryBuilder = this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.approver', 'approver')
      .leftJoinAndSelect('course.assignedColleges', 'assignedCollege')
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

    // Determine effective college filtering
    let effectiveCollegeId = queryCollegeId ? parseInt(queryCollegeId) : null;
    let effectiveCollegeName = null;

    if (authUser && !isSuperAdmin) {
      // Force restriction to auth user's college
      effectiveCollegeId = authUser.collegeId;
      effectiveCollegeName = authUser.collegeName;
    }

    if (effectiveCollegeId || effectiveCollegeName) {
      const collegeConditions = [];
      const params: any = {};

      if (effectiveCollegeId) {
        collegeConditions.push('(course.collegeId = :effCollegeId OR assignedCollege.id = :effCollegeId)');
        params.effCollegeId = effectiveCollegeId;
      }
      if (effectiveCollegeName) {
        collegeConditions.push('(instructor.collegeName = :effCollegeName OR assignedCollege.name = :effCollegeName)');
        params.effCollegeName = effectiveCollegeName;
      }
      
      queryBuilder.andWhere(`(${collegeConditions.join(' OR ')})`, params);
    } else if (authUser && !isSuperAdmin) {
      // Guard: non-superadmin without any college assigned sees no courses
      queryBuilder.andWhere('1 = 0');
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
        const chapters = await this.chapterRepo.find({
          where: { moduleId: In(modules.map((m) => m.id)) },
        });
        const lessonCount = chapters.length > 0 
          ? await this.lessonRepo.count({
              where: { chapterId: In(chapters.map((c) => c.id)) },
            })
          : 0;


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
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    console.log(`📖 Fetching course ${id} for user:`, req.user);

    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['instructor', 'approver', 'assignedColleges'],
    });

    if (!course) {
      console.log(`❌ Course ${id} not found`);
      throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
    }

    const userRole = req.user?.role;
    const userId = req.user?.sub;
    const userCollegeId = req.user?.collegeId;

    const userCollegeName = req.user?.collegeName;

    console.log('🔍 Access check:', {
      userRole,
      userId,
      userCollegeId,
      userCollegeName,
      coursecollegeId: course.collegeId,
      courseInstructorId: course.instructorId,
      courseStatus: course.status
    });

    // SUPERADMIN can see any course from any college
    if (userRole === UserRole.SUPERADMIN) {
      return await this.getCourseWithStructure(course);
    }

    // Check if user can access this course's college (ADMIN/INSTRUCTOR/STUDENT must be in same college or assigned)
    const isCollegeMatch = 
      (userCollegeId && (
        course.collegeId === userCollegeId || 
        course.assignedColleges?.some(c => c.id === userCollegeId)
      )) || 
      (userCollegeName && (
        course.instructor?.collegeName === userCollegeName ||
        course.assignedColleges?.some(c => c.name === userCollegeName)
      ));

    if (userRole && !isCollegeMatch) {
      console.log(`❌ User cannot access course from different college`);
      throw new HttpException('You do not have access to this course', HttpStatus.FORBIDDEN);
    }

    // ADMIN can see any course within their college
    if (userRole === UserRole.ADMIN) {
      return await this.getCourseWithStructure(course);
    }

    // INSTRUCTOR can see their own courses or approved courses within their college
    if (userRole === UserRole.INSTRUCTOR) {
      if (
        course.instructorId === userId ||
        course.status === CourseStatus.APPROVED
      ) {
        return await this.getCourseWithStructure(course);
      }
      console.log(`❌ Instructor cannot access course ${id}`);
      throw new HttpException('You do not have access to this course', HttpStatus.FORBIDDEN);
    }

    // STUDENT can only see approved and published courses within their college
    if (course.status === CourseStatus.APPROVED && course.published) {
      console.log(`✅ Student accessing approved course ${id}`);
      return await this.getCourseWithStructure(course);
    }

    console.log(
      `❌ Course ${id} not accessible: status=${course.status}, published=${course.published}`,
    );
    throw new HttpException('Course not available', HttpStatus.FORBIDDEN);
  }

  private async getCourseWithStructure(course: Course) {
    // Fetch modules
    const modules = await this.moduleRepo.find({
      where: { courseId: course.id },
      order: { order: 'ASC' },
    });

    const modulesWithChapters = await Promise.all(
      modules.map(async (module) => {
        const chapters = await this.chapterRepo.find({
          where: { moduleId: module.id },
          order: { order: 'ASC' },
        });

        const chaptersWithLessons = await Promise.all(
          chapters.map(async (chapter) => {
            const lessons = await this.lessonRepo.find({
              where: { chapterId: chapter.id },
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
              ...chapter,
              lessons: lessonsWithResources,
            };
          }),
        );

        return {
          ...module,
          chapters: chaptersWithLessons,
        };
      }),
    );

    return {
      ...course,
      modules: modulesWithChapters,
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
        select: ['id', 'name', 'email', 'role', 'collegeId'],
      });

      console.log('User found:', user?.name, 'Role:', user?.role, 'College:', user?.collegeId);

      // Validate college access for ADMIN/INSTRUCTOR
      if (user.role !== UserRole.SUPERADMIN && !user.collegeId) {
        throw new HttpException(
          'Your account is not associated with a college. Please contact the administrator to assign you to a college before creating courses.',
          HttpStatus.BAD_REQUEST
        );
      }

      // SUPERADMIN courses are auto-approved. Other roles must explicitly submit later.
      const isSuperAdmin = user.role === UserRole.SUPERADMIN;
      const courseStatus = isSuperAdmin 
        ? CourseStatus.APPROVED 
        : CourseStatus.DRAFT;

      // Set collegeId: SUPERADMIN can specify, others use their own org
      const collegeId = isSuperAdmin && dto.collegeId 
        ? dto.collegeId 
        : user.collegeId;

      const course = this.courseRepo.create({
        ...dto,
        instructorId: req.user.sub,
        collegeId,
        status: courseStatus,
        published: isSuperAdmin ? dto.published ?? false : false, // SUPERADMIN can choose published status
        ...(isSuperAdmin && { approverId: req.user.sub, approvedAt: new Date() }), // Auto-approve for SUPERADMIN
      });

      console.log('Course entity created:', {
        title: course.title,
        status: course.status,
        instructorId: course.instructorId,
        collegeId: course.collegeId,
        published: course.published,
      });

      const savedCourse = await this.courseRepo.save(course);
      console.log('✅ Course saved to database with ID:', savedCourse.id);

      // Draft-first workflow: no admin notification on create.
      if (!isSuperAdmin) {
        return {
          ...savedCourse,
          message: 'Course saved as draft. Submit when you are ready for admin approval.',
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
  @Roles(UserRole.INSTRUCTOR)
  @Post(':id/submit')
  async submitCourse(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id, instructorId: req.user.sub } });
    if (!course) {
      return { message: 'Course not found or unauthorized' };
    }

    if (course.status === CourseStatus.PENDING_APPROVAL) {
      return { message: 'Course is already submitted for approval.' };
    }

    if (course.status === CourseStatus.APPROVED) {
      return { message: 'Approved courses cannot be submitted again.' };
    }

    course.status = CourseStatus.PENDING_APPROVAL;
    course.published = false;
    course.rejectionReason = null;
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
  @Roles(UserRole.SUPERADMIN)
  @Post(':id/assign')
  async assignCourse(
    @Param('id') id: number,
    @Body() dto: AssignCourseDto,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({ 
      where: { id },
      relations: ['assignedColleges']
    });

    if (!course) {
      throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
    }

    // Auto-approve and publish if assigning (Super Admin acts as final validator)
    course.published = true;
    if (course.status !== CourseStatus.APPROVED) {
      course.status = CourseStatus.APPROVED;
      // Mark who approved it
      if ((req.user as any)?.sub) {
        course.approvedBy = req.user.sub;
      }
    }

    course.assignedColleges = dto.collegeIds.map(cid => ({ id: cid } as any));
    await this.courseRepo.save(course);

    return { message: 'Course assigned, approved and published successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateCourseDto,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({ 
      where: { id },
      relations: ['instructor'] 
    });

    if (!course) {
      return { message: 'Course not found' };
    }

    const userRole = req.user.role;
    const userId = req.user.sub;
    const userCollegeId = req.user.collegeId;

    // SUPERADMIN can update any course
    if (userRole !== UserRole.SUPERADMIN) {
      // Check if course is assigned by SUPERADMIN
      if (course.instructor && course.instructor.role === UserRole.SUPERADMIN) {
        throw new HttpException('Courses assigned by SUPER ADMIN are view-only.', HttpStatus.FORBIDDEN);
      }

      // Check college access for non-SUPERADMIN users
      if (!this.collegeFilterService.canAccessCollege(
        userRole,
        userCollegeId,
        course.collegeId
      )) {
        throw new HttpException('Cannot update course from different college', HttpStatus.FORBIDDEN);
      }

      // INSTRUCTOR can only update their own courses
      if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
        throw new HttpException('You can only update your own courses', HttpStatus.FORBIDDEN);
      }
    }

    await this.courseRepo.update(id, dto);
    return this.courseRepo.findOne({ where: { id } });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.INSTRUCTOR)
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ 
      where: { id },
      relations: ['instructor'] 
    });

    if (!course) {
      return { message: 'Course not found' };
    }

    const userRole = req.user.role;
    const userId = req.user.sub;
    const userCollegeId = req.user.collegeId;

    // SUPERADMIN can delete any course
    if (userRole !== UserRole.SUPERADMIN) {
      // Check if course is assigned by SUPERADMIN
      if (course.instructor && course.instructor.role === UserRole.SUPERADMIN) {
        throw new HttpException('Courses assigned by SUPER ADMIN cannot be deleted by college staff.', HttpStatus.FORBIDDEN);
      }

      // ADMIN/INSTRUCTOR can only delete courses within their college
      if (!this.collegeFilterService.canAccessCollege(
        userRole,
        userCollegeId,
        course.collegeId
      )) {
        throw new HttpException('Cannot delete course from different college', HttpStatus.FORBIDDEN);
      }

      // INSTRUCTOR can only delete their own courses
      if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
        throw new HttpException('You can only delete your own courses', HttpStatus.FORBIDDEN);
      }
    }

    await this.courseRepo.delete(id);
    return { message: 'Course deleted' };
  }
}

