import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CollegeService } from './college.service';
import { CreateCollegeDto, UpdateCollegeDto } from './college.dto';

@Controller('colleges')
@UseGuards(JwtAuthGuard)
export class CollegeController {
  constructor(private collegeService: CollegeService) {}

  // SUPERADMIN ONLY - Create college directly
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async createCollege(@Body() dto: CreateCollegeDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.collegeService.createCollege(dto, userId);
  }

  // All authenticated users can view colleges
  @Get()
  async getAllColleges() {
    return this.collegeService.getAllColleges();
  }

  // Get active colleges only
  @Get('active')
  async getActiveColleges() {
    return this.collegeService.getActiveColleges();
  }

  // Get college by ID
  @Get(':id')
  async getCollegeById(@Param('id', ParseIntPipe) id: number) {
    return this.collegeService.getCollegeById(id);
  }

  // Get college stats (SUPERADMIN only)
  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getCollegeStats(@Param('id', ParseIntPipe) id: number) {
    return this.collegeService.getCollegeStats(id);
  }

  // SUPERADMIN ONLY - Update college
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async updateCollege(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollegeDto,
  ) {
    return this.collegeService.updateCollege(id, dto);
  }

  // SUPERADMIN ONLY - Delete college
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async deleteCollege(@Param('id', ParseIntPipe) id: number) {
    return this.collegeService.deleteCollege(id);
  }
}
