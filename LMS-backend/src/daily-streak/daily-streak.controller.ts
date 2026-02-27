import { Controller, Get, Post, Put, Body, UseGuards, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyStreak } from '../entities/daily-streak.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('daily-streak')
export class DailyStreakController {
    constructor(
        @InjectRepository(DailyStreak)
        private streakRepo: Repository<DailyStreak>,
    ) { }

    @Get('today')
    async getToday() {
        const today = new Date().toISOString().slice(0, 10);
        return this.streakRepo.findOneBy({ date: today, isActive: true });
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPERADMIN)
    getAll() {
        return this.streakRepo.find({ order: { date: 'DESC' } });
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPERADMIN)
    async setStreak(@Body() dto: { date: string; questionId: number; questionType: string }) {
        // Deactivate any existing streak for that date
        await this.streakRepo.update({ date: dto.date }, { isActive: false });
        const streak = this.streakRepo.create({ ...dto, isActive: true });
        return this.streakRepo.save(streak);
    }
}
