import { canEditCourse } from '../common/course-access';
import { CourseContentService } from '../common/course-content.service';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Chapter } from '../entities/chapter.entity';
import { Course } from '../entities/course.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
  CreateLessonDto,
  UpdateLessonDto,
  ReorderLessonsDto,
  UpdateContentDto,
} from './lesson.dto';

@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private contentAccess: CourseContentService,
  ) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.CONTENT_CREATOR)
  async create(@Body() dto: CreateLessonDto, @Req() req: any) {
    const chapter = await this.chapterRepository.findOne({
      where: { id: dto.chapterId },
      relations: ['module', 'module.course'],
    });

    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (!canEditCourse(req.user, chapter.module.course)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const maxOrder = await this.lessonRepository
      .createQueryBuilder('topic')
      .select('MAX(topic.order)', 'max')
      .where('topic.chapterId = :chapterId', { chapterId: dto.chapterId })
      .getRawOne();

    const lesson = this.lessonRepository.create({
      ...dto,
      order: dto.order ?? (maxOrder?.max ?? -1) + 1,
    });

    return await this.lessonRepository.save(lesson);
  }

  @Get('chapter/:chapterId')
  async findByChapter(@Param('chapterId', ParseIntPipe) chapterId: number, @Req() req: any) {
    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId }, relations: ['module'] });
    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);
    const course = await this.contentAccess.requireRead(req.user, chapter.module.courseId);
    return this.lessonRepository.find({
      where: { chapterId, ...(!canEditCourse(req.user, course) && { published: true }) },
      order: { order: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id }, relations: ['chapter', 'chapter.module'] });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
    const course = await this.contentAccess.requireRead(req.user, lesson.chapter.module.courseId);
    if (!lesson.published && !canEditCourse(req.user, course)) throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
    const { chapter, ...result } = lesson;
    return result;
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.CONTENT_CREATOR)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLessonDto, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    const chapter = await this.chapterRepository.findOne({
      where: { id: lesson.chapterId },
      relations: ['module', 'module.course'],
    });

    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (!canEditCourse(req.user, chapter.module.course)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    Object.assign(lesson, dto);
    return this.lessonRepository.save(lesson);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.CONTENT_CREATOR)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    const chapter = await this.chapterRepository.findOne({
      where: { id: lesson.chapterId },
      relations: ['module', 'module.course'],
    });

    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (!canEditCourse(req.user, chapter.module.course)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    await this.lessonRepository.remove(lesson);
    return { message: 'Topic deleted' };
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.CONTENT_CREATOR)
  async reorder(@Body() dto: ReorderLessonsDto, @Req() req: any) {
    const lessons = await this.lessonRepository.find({
      where: { id: In(dto.lessonIds) },
      relations: ['chapter', 'chapter.module', 'chapter.module.course'],
    });
    if (lessons.length !== new Set(dto.lessonIds).size || lessons.some(lesson => !canEditCourse(req.user, lesson.chapter.module.course))) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    for (let i = 0; i < dto.lessonIds.length; i++) {
      await this.lessonRepository.update(dto.lessonIds[i], { order: i });
    }
    return { message: 'Topics reordered' };
  }

  @Put(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.CONTENT_CREATOR)
  async updateContent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContentDto, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    if (req.user.role !== UserRole.SUPERADMIN) {
      const chapter = await this.chapterRepository.findOne({
        where: { id: lesson.chapterId },
        relations: ['module', 'module.course'],
      });
      if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);
      if (!canEditCourse(req.user, chapter.module.course)) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    }

    this.validateContentPayload(dto.content);

    lesson.content = dto.content;
    lesson.version = (lesson.version || 1) + 1;
    lesson.lastEditedBy = req.user.name || req.user.email || String(req.user.sub);

    return await this.lessonRepository.save(lesson);
  }

  private isNotebookLike(value: any): boolean {
    return !!value && typeof value === 'object' && value.type === 'notebook' && Array.isArray(value.cells);
  }

  private validateContentPayload(content: Record<string, any>) {
    const type = content?.type;

    // Regular course lesson editor content
    if (type === 'notebook' && Array.isArray(content.cells)) {
      return;
    }

    // Quiz builder payload
    if (type === 'quiz-builder') {
      if (!Array.isArray(content.questionIds) || content.questionIds.some((id: any) => typeof id !== 'number')) {
        throw new HttpException('Invalid quiz content: questionIds must be number[]', HttpStatus.BAD_REQUEST);
      }
      const settings = content.settings;
      if (!settings || typeof settings !== 'object') {
        throw new HttpException('Invalid quiz content: settings are required', HttpStatus.BAD_REQUEST);
      }
      const numericFields = ['timeLimitMinutes', 'passPercentage', 'maxAttempts'];
      for (const field of numericFields) {
        if (typeof settings[field] !== 'number' || Number.isNaN(settings[field])) {
          throw new HttpException(`Invalid quiz content: settings.${field} must be a number`, HttpStatus.BAD_REQUEST);
        }
      }
      const booleanFields = ['shuffleQuestions', 'shuffleOptions'];
      for (const field of booleanFields) {
        if (typeof settings[field] !== 'boolean') {
          throw new HttpException(`Invalid quiz content: settings.${field} must be boolean`, HttpStatus.BAD_REQUEST);
        }
      }
      if (settings.questionsToServe !== undefined && settings.questionsToServe !== null) {
        if (typeof settings.questionsToServe !== 'number' || Number.isNaN(settings.questionsToServe)) {
          throw new HttpException('Invalid quiz content: settings.questionsToServe must be a number', HttpStatus.BAD_REQUEST);
        }
      }
      return;
    }

    // Assignment builder payload
    if (type === 'assignment-builder') {
      if (typeof content.instructions !== 'string' || !content.instructions.trim()) {
        throw new HttpException('Invalid assignment content: instructions are required', HttpStatus.BAD_REQUEST);
      }
      if (!['text', 'file', 'both'].includes(content.submissionType)) {
        throw new HttpException('Invalid assignment content: submissionType must be text|file|both', HttpStatus.BAD_REQUEST);
      }
      if (typeof content.maxMarks !== 'number' || Number.isNaN(content.maxMarks) || content.maxMarks <= 0) {
        throw new HttpException('Invalid assignment content: maxMarks must be a positive number', HttpStatus.BAD_REQUEST);
      }
      if (typeof content.dueInDays !== 'number' || Number.isNaN(content.dueInDays) || content.dueInDays <= 0) {
        throw new HttpException('Invalid assignment content: dueInDays must be a positive number', HttpStatus.BAD_REQUEST);
      }
      if (content.checklist !== undefined && (!Array.isArray(content.checklist) || content.checklist.some((item: any) => typeof item !== 'string'))) {
        throw new HttpException('Invalid assignment content: checklist must be string[]', HttpStatus.BAD_REQUEST);
      }
      return;
    }

    // Programming builder payload
    if (type === 'programming-builder') {
      const problemStatement = content.problemStatement;
      const validProblemStatement = this.isNotebookLike(problemStatement)
        || (problemStatement && typeof problemStatement === 'object' && problemStatement.type === 'markdown' && typeof problemStatement.source === 'string');
      if (!validProblemStatement) {
        throw new HttpException('Invalid programming content: problemStatement must be notebook/markdown content', HttpStatus.BAD_REQUEST);
      }
      if (!Array.isArray(content.allowedLanguages) || content.allowedLanguages.length === 0 || content.allowedLanguages.some((lang: any) => typeof lang !== 'string')) {
        throw new HttpException('Invalid programming content: allowedLanguages must be non-empty string[]', HttpStatus.BAD_REQUEST);
      }
      if (!Array.isArray(content.testCases) || content.testCases.length === 0) {
        throw new HttpException('Invalid programming content: testCases must be non-empty', HttpStatus.BAD_REQUEST);
      }
      for (const tc of content.testCases) {
        if (!tc || typeof tc !== 'object' || typeof tc.input !== 'string' || typeof tc.output !== 'string') {
          throw new HttpException('Invalid programming content: each test case requires string input/output', HttpStatus.BAD_REQUEST);
        }
      }
      return;
    }

    // Backward compatibility: allow legacy markdown payloads.
    if (type === 'markdown' && typeof content.source === 'string') {
      return;
    }

    throw new HttpException('Unsupported content format', HttpStatus.BAD_REQUEST);
  }
}
