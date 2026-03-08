import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Contest,
  ContestType,
  ContestStatus,
} from '../entities/contest.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
} from 'class-validator';

class CreateContestDto {
  @IsString() title: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(ContestType) @IsOptional() type?: ContestType;
  @IsInt() @IsOptional() durationMinutes?: number;
  @IsArray() @IsOptional() questionIds?: number[];
  @IsDateString() @IsOptional() startTime?: string;
  @IsDateString() @IsOptional() endTime?: string;
  @IsString() @IsOptional() targetRole?: string;
  @IsInt() @IsOptional() totalMarks?: number;
  @IsInt() @IsOptional() passingMarks?: number;
}

@Controller('contests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
export class ContestController {
  constructor(
    @InjectRepository(Contest)
    private contestRepo: Repository<Contest>,
  ) {}

  @Get()
  getAll() {
    return this.contestRepo.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.contestRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
  }

  @Post()
  async create(@Body() dto: CreateContestDto) {
    const contest = this.contestRepo.create(dto);
    return this.contestRepo.save(contest);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateContestDto>,
  ) {
    await this.contestRepo.update(id, dto);
    return this.contestRepo.findOneBy({ id });
  }

  @Put(':id/publish')
  async publish(@Param('id', ParseIntPipe) id: number) {
    await this.contestRepo.update(id, { status: ContestStatus.PUBLISHED });
    return { message: 'Contest published' };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.contestRepo.delete(id);
    return { message: 'Contest deleted' };
  }
}
