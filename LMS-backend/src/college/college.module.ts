import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { College } from '../entities/college.entity';
import { User } from '../entities/user.entity';
import { CollegeService } from './college.service';
import { CollegeController } from './college.controller';

@Module({
  imports: [TypeOrmModule.forFeature([College, User])],
  providers: [CollegeService],
  controllers: [CollegeController],
  exports: [CollegeService],
})
export class CollegeModule {}
