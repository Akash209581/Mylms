import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyStreak } from '../entities/daily-streak.entity';
import { DailyStreakController } from './daily-streak.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DailyStreak])],
    controllers: [DailyStreakController],
})
export class DailyStreakModule { }
