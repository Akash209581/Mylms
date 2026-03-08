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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { CourseModule } from '../entities/module.entity';
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
    @InjectRepository(CourseModule)
    private moduleRepository: Repository<CourseModule>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR)
  async create(@Body() dto: CreateLessonDto, @Req() req: any) {
    console.log('🎥 Creating lesson:', dto);
    console.log('👤 Logged-in user ID:', req.user.sub);

    // Verify module exists and user owns the course
    const module = await this.moduleRepository.findOne({
      where: { id: dto.moduleId },
      relations: ['course'],
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    console.log('📖 Course instructorId:', module.course.instructorId);
    console.log('🔍 IDs match:', module.course.instructorId === req.user.sub);

    if (module.course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only add lessons to your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    // Get highest order number
    const maxOrder = await this.lessonRepository
      .createQueryBuilder('lesson')
      .select('MAX(lesson.order)', 'max')
      .where('lesson.moduleId = :moduleId', { moduleId: dto.moduleId })
      .getRawOne();

    const lesson = this.lessonRepository.create({
      ...dto,
      order: dto.order ?? (maxOrder?.max ?? -1) + 1,
    });

    const saved = await this.lessonRepository.save(lesson);
    console.log('✅ Lesson created:', saved.id);

    return saved;
  }

  @Get('module/:moduleId')
  async findByModule(@Param('moduleId') moduleId: number) {
    const lessons = await this.lessonRepository.find({
      where: { moduleId },
      order: { order: 'ASC' },
    });
    return lessons;
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
    });

    if (!lesson) {
      throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
    }

    return lesson;
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR)
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLessonDto,
    @Req() req: any,
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
    });

    if (!lesson) {
      throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
    }

    // Check ownership
    const module = await this.moduleRepository.findOne({
      where: { id: lesson.moduleId },
      relations: ['course'],
    });

    if (module.course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only edit lessons in your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    Object.assign(lesson, dto);
    return this.lessonRepository.save(lesson);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR)
  async delete(@Param('id') id: number, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
    });

    if (!lesson) {
      throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
    }

    // Check ownership
    const module = await this.moduleRepository.findOne({
      where: { id: lesson.moduleId },
      relations: ['course'],
    });

    if (module.course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only delete lessons from your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.lessonRepository.remove(lesson);
    return { message: 'Lesson deleted successfully' };
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR)
  async reorder(@Body() dto: ReorderLessonsDto, @Req() req: any) {
    const lessons = await this.lessonRepository.findByIds(dto.lessonIds);

    // Verify ownership
    const moduleIds = [...new Set(lessons.map((l) => l.moduleId))];
    const modules = await this.moduleRepository.find({
      where: moduleIds.map((id) => ({ id })),
      relations: ['course'],
    });

    const allOwned = modules.every(
      (m) => m.course.instructorId === req.user.sub,
    );
    if (!allOwned) {
      throw new HttpException(
        'You can only reorder lessons in your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    // Update order
    for (let i = 0; i < dto.lessonIds.length; i++) {
      await this.lessonRepository.update(dto.lessonIds[i], { order: i });
    }

    return { message: 'Lessons reordered successfully' };
  }

  /**
   * PUT /lessons/:id/content
   * Save block-based TipTap JSON content for a lesson.
   * Accessible by: INSTRUCTOR (owner), ADMIN, SUPERADMIN
   */
  @Put(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateContent(
    @Param('id') id: number,
    @Body() dto: UpdateContentDto,
    @Req() req: any,
  ) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });

    if (!lesson) {
      throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
    }

    // Validate that content is a proper TipTap doc object
    if (!dto.content || typeof dto.content !== 'object') {
      throw new HttpException(
        'Invalid content: must be a TipTap JSON document object',
        HttpStatus.BAD_REQUEST,
      );
    }

    // INSTRUCTOR must own the parent course
    if (req.user.role === UserRole.INSTRUCTOR) {
      const module = await this.moduleRepository.findOne({
        where: { id: lesson.moduleId },
        relations: ['course'],
      });
      if (!module || module.course.instructorId !== req.user.sub) {
        throw new HttpException(
          'You can only edit content in your own courses',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Increment version, record who saved it
    lesson.content = dto.content;
    lesson.version = (lesson.version || 1) + 1;
    lesson.lastEditedBy = req.user.name || req.user.email || String(req.user.sub);

    const saved = await this.lessonRepository.save(lesson);

    return {
      id: saved.id,
      title: saved.title,
      content: saved.content,
      version: saved.version,
      lastEditedBy: saved.lastEditedBy,
      updatedAt: saved.updatedAt,
      message: 'Content saved successfully',
    };
  }
}
