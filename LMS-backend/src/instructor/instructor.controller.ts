import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserRole } from '../entities/user.entity';

@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
export class InstructorController {
    constructor(
        @InjectRepository(Course)
        private courseRepo: Repository<Course>,
        @InjectRepository(Enrollment)
        private enrollRepo: Repository<Enrollment>,
    ) { }

    @Get('dashboard')
    async getDashboard(@Request() req: any) {
        const courses = await this.courseRepo.find({ where: { instructorId: req.user.sub } });
        const courseIds = courses.map(c => c.id);
        const totalStudents = courseIds.length
            ? await this.enrollRepo.count({ where: courseIds.map(id => ({ courseId: id })) as any })
            : 0;
        return {
            totalCourses: courses.length,
            totalStudents,
            courses,
        };
    }

    @Get('courses')
    async getMyCourses(@Request() req: any) {
        return this.courseRepo.find({ where: { instructorId: req.user.sub } });
    }
}
