import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, CreateUserDto, SuperAdminCreateUserDto } from './auth.dto';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { College } from '../entities/college.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(College) private collegeRepo: Repository<College>,
  ) {}

  // Public endpoint to get all colleges for signup dropdown
  @Get('colleges')
  async getColleges() {
    const colleges = await this.collegeRepo.find({
      where: { active: true },
      select: ['id', 'name', 'logoUrl'],
      order: { name: 'ASC' },
    });
    return colleges;
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post('create-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async createUser(@Body() dto: CreateUserDto, @Request() req) {
    // Role-based validation
    if (req.user.role === UserRole.ADMIN) {
      // ADMIN can only create INSTRUCTOR or STUDENT
      if (dto.role !== 'INSTRUCTOR' && dto.role !== 'STUDENT') {
        throw new ForbiddenException('ADMIN can only create INSTRUCTOR or STUDENT accounts');
      }
    }
    
    if (req.user.role === UserRole.INSTRUCTOR) {
      // INSTRUCTOR can only create STUDENT
      if (dto.role !== 'STUDENT') {
        throw new ForbiddenException('INSTRUCTOR can only create STUDENT accounts');
      }
    }

    // Pass the creator's info to the service for automatic college inheritance
    return this.authService.createUser(dto, req.user.sub, req.user.collegeId, req.user.role, req.user.collegeName);
  }

  // Dedicated endpoint for SUPERADMIN to create users with college selection
  @Post('superadmin/create-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async superAdminCreateUser(@Body() dto: SuperAdminCreateUserDto, @Request() req) {
    // SUPERADMIN can create any role with explicit college selection
    return this.authService.createUserWithCollege(dto, req.user.sub);
  }
}
