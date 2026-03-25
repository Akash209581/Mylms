import { Controller, Get, Post, Body, UseGuards, Query, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from '../entities/topic.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { UserRole } from '../entities/user.entity';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('topics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopicController {
  constructor(
    @InjectRepository(Topic)
    private topicRepo: Repository<Topic>,
  ) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getTopics(@Query('domainId') domainId?: number, @Query('domainName') domainName?: string) {
    if (domainId) {
      return this.topicRepo.find({ where: { domainId }, order: { name: 'ASC' } });
    }
    if (domainName) {
        return this.topicRepo.find({
            where: { domain: { name: domainName } },
            relations: ['domain'],
            order: { name: 'ASC' }
        });
    }
    return this.topicRepo.find({ relations: ['domain'], order: { name: 'ASC' } });
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async createTopic(@Body('name') name: string, @Body('domainId') domainId: number) {
    if (!name?.trim() || !domainId) throw new BadRequestException('Name and DomainId are required');

    const existing = await this.topicRepo.findOne({ where: { name: name.trim(), domainId } });
    if (existing) throw new ConflictException('Topic name already exists in this domain');

    const topic = this.topicRepo.create({ name: name.trim(), domainId });
    return this.topicRepo.save(topic);
  }
}
