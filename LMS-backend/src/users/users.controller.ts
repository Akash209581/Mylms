import { Controller, Get, UseGuards, Request, Put, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IsString, IsOptional } from 'class-validator';

class UpdateProfileDto {
    @IsString() @IsOptional() name?: string;
}

@Controller('users')
export class UsersController {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req: any) {
        const user = await this.userRepo.findOne({ where: { id: req.user.sub } });
        const { passwordHash, ...result } = user!;
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Put('profile')
    async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
        await this.userRepo.update(req.user.sub, { name: dto.name });
        return { message: 'Profile updated' };
    }
}
