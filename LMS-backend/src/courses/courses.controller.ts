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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
    const collegeConditions: string[] = [];
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
      const collegeConditions: string[] = [];
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
    const courseIds = courses.map((c) => c.id);
    const modulesByCourse: { [key: number]: CourseModule[] } = {};
    const chaptersByModule: { [key: number]: Chapter[] } = {};
    const lessonsByChapter: { [key: number]: Lesson[] } = {};

    if (courseIds.length > 0) {
      const allModules = await this.moduleRepo.find({
        where: { courseId: In(courseIds) },
      });
      allModules.forEach((m) => {
        if (!modulesByCourse[m.courseId]) {
          modulesByCourse[m.courseId] = [];
        }
        modulesByCourse[m.courseId].push(m);
      });

      const moduleIds = allModules.map((m) => m.id);
      if (moduleIds.length > 0) {
        const allChapters = await this.chapterRepo.find({
          where: { moduleId: In(moduleIds) },
        });
        allChapters.forEach((c) => {
          if (!chaptersByModule[c.moduleId]) {
            chaptersByModule[c.moduleId] = [];
          }
          chaptersByModule[c.moduleId].push(c);
        });

        const chapterIds = allChapters.map((c) => c.id);
        if (chapterIds.length > 0) {
          const allLessons = await this.lessonRepo.find({
            where: { chapterId: In(chapterIds) },
          });
          allLessons.forEach((l) => {
            if (!lessonsByChapter[l.chapterId]) {
              lessonsByChapter[l.chapterId] = [];
            }
            lessonsByChapter[l.chapterId].push(l);
          });
        }
      }
    }

    const coursesWithStats = courses.map((course) => {
      const modules = modulesByCourse[course.id] || [];
      const moduleCount = modules.length;
      let lessonCount = 0;
      modules.forEach((m) => {
        const chapters = chaptersByModule[m.id] || [];
        chapters.forEach((ch) => {
          const lessons = lessonsByChapter[ch.id] || [];
          lessonCount += lessons.length;
        });
      });

      return {
        ...course,
        moduleCount,
        lessonCount,
      };
    });

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
    // Fetch all modules
    const modules = await this.moduleRepo.find({
      where: { courseId: course.id },
      order: { order: 'ASC' },
    });

    if (modules.length === 0) {
      return {
        ...course,
        modules: [],
      };
    }

    const moduleIds = modules.map((m) => m.id);
    const chapters = await this.chapterRepo.find({
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

    const lessonsByChapter: { [key: number]: Lesson[] } = {};
    if (chapters.length > 0) {
      const chapterIds = chapters.map((c) => c.id);
      const lessons = await this.lessonRepo.find({
        where: { chapterId: In(chapterIds) },
        order: { order: 'ASC' },
      });

      lessons.forEach((l) => {
        if (!lessonsByChapter[l.chapterId]) {
          lessonsByChapter[l.chapterId] = [];
        }
        lessonsByChapter[l.chapterId].push(l);
      });

      if (lessons.length > 0) {
        const lessonIds = lessons.map((l) => l.id);
        const resources = await this.resourceRepo.find({
          where: { lessonId: In(lessonIds) },
          order: { createdAt: 'ASC' },
        });

        const resourcesByLesson: { [key: number]: Resource[] } = {};
        resources.forEach((r) => {
          if (!resourcesByLesson[r.lessonId]) {
            resourcesByLesson[r.lessonId] = [];
          }
          resourcesByLesson[r.lessonId].push(r);
        });

        // Attach resources to lessons
        lessons.forEach((l) => {
          (l as any).resources = resourcesByLesson[l.id] || [];
        });
      }

      // Attach lessons to chapters
      chapters.forEach((c) => {
        (c as any).lessons = lessonsByChapter[c.id] || [];
      });
    }

    // Attach chapters to modules
    const modulesWithChapters = modules.map((m) => {
      return {
        ...m,
        chapters: chaptersByModule[m.id] || [],
      };
    });

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

      if (!user) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      console.log('User found:', user.name, 'Role:', user.role, 'College:', user.collegeId);

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
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.INSTRUCTOR)
  @Post('upload-ppt')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadPptCourse(
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.handleUploadPresentation(file, body, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.INSTRUCTOR)
  @Post('upload-pdf')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadPdfCourse(
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.handleUploadPresentation(file, body, req);
  }

  private async handleUploadPresentation(
    file: any,
    body: any,
    req: any,
  ) {
    if (file && file.size > 10 * 1024 * 1024) {
      throw new HttpException('File size exceeds the 10MB limit. Please upload a smaller file.', HttpStatus.BAD_REQUEST);
    }

    const userRole = req.user?.role;
    const userId = req.user?.sub;
    const userCollegeId = req.user?.collegeId;

    const title = body.title || 'Untitled PDF Presentation Course';
    const description = body.description || 'Interactive slide presentation course.';
    const category = body.category || 'General';
    const level = body.level || 'Beginner';

    let slides: any[] = [];
    if (typeof body.slides === 'string') {
      try { slides = JSON.parse(body.slides); } catch (e) { slides = []; }
    } else if (Array.isArray(body.slides)) {
      slides = body.slides;
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (file) {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'ppt');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, file.buffer);
      fileUrl = `/uploads/ppt/${safeName}`;
      fileName = file.originalname;

      // Convert PPTX slides to PNG images using PowerPoint COM automation (Windows only)
      if ((file.originalname.toLowerCase().endsWith('.pptx') || file.originalname.toLowerCase().endsWith('.ppt')) && process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');
          const slideImagesDir = path.join(process.cwd(), 'uploads', 'ppt', 'slides');
          const slideDirName = `${Date.now()}-slides`;
          const outputDir = path.join(slideImagesDir, slideDirName);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Use PowerShell + PowerPoint COM to export each slide as PNG
          const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint -ErrorAction SilentlyContinue
$pptApp = New-Object -ComObject PowerPoint.Application
$pptApp.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
try {
  $pptFile = $pptApp.Presentations.Open('${filePath.replace(/\\/g, '\\\\')}', $true, $false, $false)
  $slideCount = $pptFile.Slides.Count
  Write-Output "SLIDE_COUNT:$slideCount"
  for ($i = 1; $i -le $slideCount; $i++) {
    $outPath = '${outputDir.replace(/\\/g, '\\\\')}\\\\slide_$i.png'
    $pptFile.Slides($i).Export($outPath, 'PNG', 1920, 1080)
    Write-Output "SLIDE_EXPORTED:$i"
  }
  $pptFile.Close()
} finally {
  $pptApp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pptApp) | Out-Null
}
`;
          const psScriptPath = path.join(outputDir, 'export_slides.ps1');
          fs.writeFileSync(psScriptPath, psScript);

          const result = execSync(
            `powershell -ExecutionPolicy Bypass -NonInteractive -File "${psScriptPath}"`,
            { timeout: 120000, encoding: 'utf8' }
          );

          // Collect exported slide PNG images
          const slideImages = fs.readdirSync(outputDir)
            .filter((f: string) => f.startsWith('slide_') && f.endsWith('.png'))
            .sort((a: string, b: string) => {
              const numA = parseInt(a.match(/\d+/)![0]);
              const numB = parseInt(b.match(/\d+/)![0]);
              return numA - numB;
            });

          if (slideImages.length > 0) {
            slides = slideImages.map((imgFile: string, idx: number) => ({
              slideNumber: idx + 1,
              title: `${title} - Slide ${idx + 1}`,
              content: '',
              imageUrl: `/uploads/ppt/slides/${slideDirName}/${imgFile}`,
            }));
            console.log(`✅ Exported ${slideImages.length} slides as PNG images`);
          }
        } catch (pptErr) {
          console.error('⚠️ Could not export PPTX slides via PowerPoint COM:', pptErr);
          // Fallback: try JSZip text extraction
          try {
            const JSZip = require('jszip');
            const zip = await JSZip.loadAsync(file.buffer);
            const slideFiles = Object.keys(zip.files)
              .filter((name: string) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
              .sort((a: string, b: string) => {
                const numA = parseInt(a.match(/\d+/)![0]);
                const numB = parseInt(b.match(/\d+/)![0]);
                return numA - numB;
              });

            const extractedSlides: any[] = [];
            for (let i = 0; i < slideFiles.length; i++) {
              const xmlText = await zip.files[slideFiles[i]].async('text');
              const matches = Array.from(xmlText.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)).map((m: any) => m[1]);
              const cleanTexts = matches
                .map((t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim())
                .filter((t: string) => t.length > 0);
              const slideTitle = cleanTexts[0] || `${title} - Slide ${i + 1}`;
              const slideBody = cleanTexts.length > 1 ? cleanTexts.slice(1).map((t: string) => `• ${t}`).join('\n') : (cleanTexts[0] || `Presentation Slide ${i + 1}`);
              extractedSlides.push({ slideNumber: i + 1, title: slideTitle, content: slideBody });
            }
            if (extractedSlides.length > 0) slides = extractedSlides;
          } catch (zipErr) {
            console.error('⚠️ JSZip fallback also failed:', zipErr);
          }
        }
      }

      if (slides.length === 0) {
        slides = [
          { slideNumber: 1, title: `${title} - Introduction`, content: `Welcome to ${title}. Navigate through presentation slides using Next and Previous.` },
          { slideNumber: 2, title: `${title} - Presentation Overview`, content: `Overview of topics covered in ${title}.` },
          { slideNumber: 3, title: `${title} - Summary`, content: `Summary and key takeaways.` },
        ];
      }
    }

    if (slides.length === 0) {
      slides = [
        { slideNumber: 1, title: `${title} - Slide 1`, content: `Presentation content for ${title}.` }
      ];
    }

    const isAutoApprove = userRole === UserRole.SUPERADMIN || userRole === UserRole.ADMIN;
    const status = isAutoApprove ? CourseStatus.APPROVED : CourseStatus.DRAFT;
    const published = isAutoApprove ? true : false;

    let collegeId = userCollegeId;
    if (userRole === UserRole.SUPERADMIN && body.collegeId) {
      collegeId = parseInt(body.collegeId);
    }

    const course = this.courseRepo.create({
      title,
      description,
      category,
      level,
      instructorId: userId,
      collegeId,
      status,
      published,
      ...(isAutoApprove && { approvedBy: userId }),
    });

    const savedCourse = await this.courseRepo.save(course);

    let collegeIdsToAssign: number[] = [];
    if (body.collegeIds) {
      const rawColleges = typeof body.collegeIds === 'string' ? JSON.parse(body.collegeIds) : body.collegeIds;
      if (Array.isArray(rawColleges)) {
        collegeIdsToAssign = rawColleges.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
      }
    } else if (collegeId) {
      collegeIdsToAssign = [collegeId];
    }

    if (collegeIdsToAssign.length > 0) {
      savedCourse.assignedColleges = collegeIdsToAssign.map(id => ({ id } as any));
      await this.courseRepo.save(savedCourse);
    }

    const module = this.moduleRepo.create({
      title: 'Presentation Module',
      order: 1,
      courseId: savedCourse.id,
    });
    const savedModule = await this.moduleRepo.save(module);

    const chapter = this.chapterRepo.create({
      title: 'Interactive Slides',
      order: 1,
      moduleId: savedModule.id,
    });
    const savedChapter = await this.chapterRepo.save(chapter);

    const isPdfFile = file?.originalname?.toLowerCase().endsWith('.pdf') || false;

    const lesson = this.lessonRepo.create({
      title: `${title} - Slides`,
      type: 'ppt',
      published: true,
      order: 1,
      chapterId: savedChapter.id,
      content: {
        isPpt: true,
        isPdf: isPdfFile,
        fileUrl,
        fileName,
        slides,
      },
    });
    await this.lessonRepo.save(lesson);

    return {
      message: 'Presentation Course created and assigned successfully!',
      course: savedCourse,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
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

    // Auto-approve and publish if assigning (Super Admin / Admin acts as final validator)
    course.published = true;
    if (course.status !== CourseStatus.APPROVED) {
      course.status = CourseStatus.APPROVED;
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

