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
import { CourseModule } from '../entities/module.entity';
import { Course } from '../entities/course.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
  CreateModuleDto,
  UpdateModuleDto,
  ReorderModulesDto,
} from './module.dto';

@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModulesController {
  constructor(
    @InjectRepository(CourseModule)
    private moduleRepository: Repository<CourseModule>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR)
  async create(@Body() dto: CreateModuleDto, @Req() req: any) {
    console.log('📚 Creating module:', dto);
    console.log('👤 Logged-in user ID:', req.user.sub);

    // Verify course exists and user owns it
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
    }

    console.log('📖 Course instructorId:', course.instructorId);
    console.log('🔍 IDs match:', course.instructorId === req.user.sub);

    if (course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only add modules to your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    // Get highest order number
    const maxOrder = await this.moduleRepository
      .createQueryBuilder('module')
      .select('MAX(module.order)', 'max')
      .where('module.courseId = :courseId', { courseId: dto.courseId })
      .getRawOne();

    const module = this.moduleRepository.create({
      ...dto,
      order: dto.order ?? (maxOrder?.max ?? -1) + 1,
    });

    const saved = await this.moduleRepository.save(module);
    console.log('✅ Module created:', saved.id);

    return saved;
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId') courseId: number) {
    const modules = await this.moduleRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
    return modules;
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    return module;
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR)
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateModuleDto,
    @Req() req: any,
  ) {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    if (module.course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only edit modules in your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    Object.assign(module, dto);
    return this.moduleRepository.save(module);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR)
  async delete(@Param('id') id: number, @Req() req: any) {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    if (module.course.instructorId !== req.user.sub) {
      throw new HttpException(
        'You can only delete modules from your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.moduleRepository.remove(module);
    return { message: 'Module deleted successfully' };
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR)
  async reorder(@Body() dto: ReorderModulesDto, @Req() req: any) {
    const modules = await this.moduleRepository.findByIds(dto.moduleIds);

    // Verify all modules belong to courses owned by the user
    const courses = await this.courseRepository.findByIds(
      modules.map((m) => m.courseId),
    );

    const allOwned = courses.every((c) => c.instructorId === req.user.sub);
    if (!allOwned) {
      throw new HttpException(
        'You can only reorder modules in your own courses',
        HttpStatus.FORBIDDEN,
      );
    }

    // Update order
    for (let i = 0; i < dto.moduleIds.length; i++) {
      await this.moduleRepository.update(dto.moduleIds[i], { order: i });
    }

    return { message: 'Modules reordered successfully' };
  }
}
