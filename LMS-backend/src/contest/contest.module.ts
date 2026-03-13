import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contest } from '../entities/contest.entity';
import { ContestController } from './contest.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contest])],
  controllers: [ContestController],
})
export class ContestModule {}
