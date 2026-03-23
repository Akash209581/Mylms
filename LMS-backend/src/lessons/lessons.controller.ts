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
import { Repository } from 'typeorm';
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
  ) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateLessonDto, @Req() req: any) {
    const chapter = await this.chapterRepository.findOne({
      where: { id: dto.chapterId },
      relations: ['module', 'module.course'],
    });

    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (req.user.role !== UserRole.SUPERADMIN && chapter.module.course.instructorId !== req.user.sub) {
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
  async findByChapter(@Param('chapterId', ParseIntPipe) chapterId: number) {
    return this.lessonRepository.find({
      where: { chapterId },
      order: { order: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
    return lesson;
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLessonDto, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    const chapter = await this.chapterRepository.findOne({
      where: { id: lesson.chapterId },
      relations: ['module', 'module.course'],
    });

    if (req.user.role !== UserRole.SUPERADMIN && chapter.module.course.instructorId !== req.user.sub) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    Object.assign(lesson, dto);
    return this.lessonRepository.save(lesson);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    const chapter = await this.chapterRepository.findOne({
      where: { id: lesson.chapterId },
      relations: ['module', 'module.course'],
    });

    if (req.user.role !== UserRole.SUPERADMIN && chapter.module.course.instructorId !== req.user.sub) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    await this.lessonRepository.remove(lesson);
    return { message: 'Topic deleted' };
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async reorder(@Body() dto: ReorderLessonsDto) {
    for (let i = 0; i < dto.lessonIds.length; i++) {
      await this.lessonRepository.update(dto.lessonIds[i], { order: i });
    }
    return { message: 'Topics reordered' };
  }

  @Put(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async updateContent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContentDto, @Req() req: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

    if (req.user.role !== UserRole.SUPERADMIN) {
      const chapter = await this.chapterRepository.findOne({
        where: { id: lesson.chapterId },
        relations: ['module', 'module.course'],
      });
      if (chapter.module.course.instructorId !== req.user.sub) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    }

    lesson.content = dto.content;
    lesson.version = (lesson.version || 1) + 1;
    lesson.lastEditedBy = req.user.name || req.user.email || String(req.user.sub);

    return await this.lessonRepository.save(lesson);
  }
}
