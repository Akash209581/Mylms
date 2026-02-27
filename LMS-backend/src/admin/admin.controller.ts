import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminController {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Course) private courseRepo: Repository<Course>,
        @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    ) { }

    @Get('dashboard')
    async getDashboard() {
        const totalUsers = await this.userRepo.count();
        const totalCourses = await this.courseRepo.count();
        const totalEnrollments = await this.enrollRepo.count();
        const recentUsers = await this.userRepo.find({
            order: { createdAt: 'DESC' },
            take: 5,
            select: ['id', 'name', 'email', 'role', 'createdAt'],
        });
        return { totalUsers, totalCourses, totalEnrollments, recentUsers };
    }

    @Get('users')
    async getUsers() {
        return this.userRepo.find({ select: ['id', 'name', 'email', 'role', 'createdAt'] });
    }

    @Delete('users/:id')
    async deleteUser(@Param('id') id: number) {
        await this.userRepo.delete(id);
        return { message: 'User deleted' };
    }

    @Get('courses')
    async getCourses() {
        return this.courseRepo.find({ relations: ['instructor'] });
    }
}
