import { Controller, Get, Post, Body, UseGuards, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain } from '../entities/domain.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { UserRole } from '../entities/user.entity';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('domains')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DomainController {
  constructor(
    @InjectRepository(Domain)
    private domainRepo: Repository<Domain>,
  ) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  async getDomains() {
    return this.domainRepo.find({ order: { name: 'ASC' } });
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async createDomain(@Body('name') name: string) {
    if (!name?.trim()) throw new BadRequestException('Domain name is required');
    
    const existing = await this.domainRepo.findOne({ where: { name: name.trim() } });
    if (existing) throw new ConflictException('Domain name already exists');

    const domain = this.domainRepo.create({ name: name.trim() });
    return this.domainRepo.save(domain);
  }
}
