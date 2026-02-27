import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { UserRole } from '../entities/user.entity';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class CreateCourseDto {
    @IsString() title: string;
    @IsString() @IsOptional() description?: string;
    @IsString() @IsOptional() thumbnail?: string;
}

class UpdateCourseDto {
    @IsString() @IsOptional() title?: string;
    @IsString() @IsOptional() description?: string;
    @IsString() @IsOptional() thumbnail?: string;
    @IsBoolean() @IsOptional() published?: boolean;
}

@Controller('courses')
export class CoursesController {
    constructor(
        @InjectRepository(Course)
        private courseRepo: Repository<Course>,
    ) { }

    @Get()
    async findAll() {
        return this.courseRepo.find({ where: { published: true }, relations: ['instructor'] });
    }

    @Get(':id')
    async findOne(@Param('id') id: number) {
        return this.courseRepo.findOne({ where: { id }, relations: ['instructor'] });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
    @Post()
    async create(@Body() dto: CreateCourseDto, @Request() req: any) {
        const course = this.courseRepo.create({ ...dto, instructorId: req.user.sub });
        return this.courseRepo.save(course);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
    @Put(':id')
    async update(@Param('id') id: number, @Body() dto: UpdateCourseDto) {
        await this.courseRepo.update(id, dto);
        return this.courseRepo.findOne({ where: { id } });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    @Delete(':id')
    async remove(@Param('id') id: number) {
        await this.courseRepo.delete(id);
        return { message: 'Course deleted' };
    }
}
