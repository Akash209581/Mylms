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
import { Chapter } from '../entities/chapter.entity';
import { CourseModule } from '../entities/module.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('chapters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChaptersController {
  constructor(
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
    @InjectRepository(CourseModule)
    private moduleRepository: Repository<CourseModule>,
  ) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async create(@Body() dto: { title: string; description?: string; moduleId: number }, @Req() req: any) {
    console.log('📖 New Chapter request:', dto);
    const module = await this.moduleRepository.findOne({
      where: { id: dto.moduleId },
      relations: ['course'],
    });

    if (!module) {
        console.error('❌ Module not found:', dto.moduleId);
        throw new HttpException(`Module ${dto.moduleId} not found in database`, HttpStatus.NOT_FOUND);
    }



    if (req.user.role !== UserRole.SUPERADMIN && module.course.instructorId !== req.user.sub) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const chapter = this.chapterRepository.create(dto);
    return this.chapterRepository.save(chapter);
  }

  @Get('module/:moduleId')
  async findByModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.chapterRepository.find({
      where: { moduleId },
      order: { order: 'ASC' },
      relations: ['lessons'],
    });
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    const chapter = await this.chapterRepository.findOne({ where: { id }, relations: ['module', 'module.course'] });
    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (req.user.role !== UserRole.SUPERADMIN && chapter.module.course.instructorId !== req.user.sub) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    Object.assign(chapter, dto);
    return this.chapterRepository.save(chapter);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const chapter = await this.chapterRepository.findOne({ where: { id }, relations: ['module', 'module.course'] });
    if (!chapter) throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);

    if (req.user.role !== UserRole.SUPERADMIN && chapter.module.course.instructorId !== req.user.sub) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    await this.chapterRepository.remove(chapter);
    return { message: 'Chapter deleted' };
  }
}
