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
  ) { }

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateModuleDto, @Req() req: any) {
    console.log('📚 Creating module:', dto);
    console.log('👤 Logged-in user ID:', req.user.sub);

    // Verify course exists and user owns it or has permission
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
      // Protect SUPERADMIN courses
      if (course.instructor?.role === UserRole.SUPERADMIN) {
        throw new HttpException('Courses assigned by SUPER ADMIN are view-only.', HttpStatus.FORBIDDEN);
      }

      if (course.instructorId !== req.user.sub) {
        throw new HttpException(
          'You can only add modules to your own courses',
          HttpStatus.FORBIDDEN,
        );
      }
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
  async findByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    const modules = await this.moduleRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
    return modules;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
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
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
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

    if (req.user.role !== UserRole.SUPERADMIN) {
      // Protect SUPERADMIN courses
      if (module.course.instructor?.role === UserRole.SUPERADMIN) {
        throw new HttpException('Courses assigned by SUPER ADMIN are view-only.', HttpStatus.FORBIDDEN);
      }

      if (module.course.instructorId !== req.user.sub) {
        throw new HttpException(
          'You can only edit modules in your own courses',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    Object.assign(module, dto);
    return this.moduleRepository.save(module);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
      // Protect SUPERADMIN courses
      if (module.course.instructor?.role === UserRole.SUPERADMIN) {
        throw new HttpException('Courses assigned by SUPER ADMIN cannot be modified.', HttpStatus.FORBIDDEN);
      }

      if (module.course.instructorId !== req.user.sub) {
        throw new HttpException(
          'You can only delete modules from your own courses',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    await this.moduleRepository.remove(module);
    return { message: 'Module deleted successfully' };
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.SUPERADMIN)
  async reorder(@Body() dto: ReorderModulesDto, @Req() req: any) {
    const modules = await this.moduleRepository.findBy({ id: In(dto.moduleIds) });

    // Verify all modules belong to courses owned by the user
    const courses = await this.courseRepository.findBy({
      id: In(modules.map((m) => m.courseId)),
    });

    if (req.user.role !== UserRole.SUPERADMIN) {
      const allOwned = courses.every((c) => c.instructorId === req.user.sub);
      if (!allOwned) {
        throw new HttpException(
          'You can only reorder modules in your own courses',
          HttpStatus.FORBIDDEN,
        );
      }
    }


    // Update order
    for (let i = 0; i < dto.moduleIds.length; i++) {
      await this.moduleRepository.update(dto.moduleIds[i], { order: i });
    }

    return { message: 'Modules reordered successfully' };
  }
}
