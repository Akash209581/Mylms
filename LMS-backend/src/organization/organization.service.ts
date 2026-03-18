import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto, createdBy: number) {
    // Check if organization with same name exists
    const existing = await this.organizationRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Organization with this name already exists');
    }

    const organization = this.organizationRepository.create({
      ...dto,
      createdBy,
      active: true,
    });

    return await this.organizationRepository.save(organization);
  }

  async findAll() {
    return await this.organizationRepository.find({
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users', 'courses'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: number, dto: UpdateOrganizationDto) {
    const organization = await this.findOne(id);

    // Check if name is being changed and if new name already exists
    if (dto.name && dto.name !== organization.name) {
      const existing = await this.organizationRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          'Organization with this name already exists',
        );
      }
    }

    Object.assign(organization, dto);
    return await this.organizationRepository.save(organization);
  }

  async remove(id: number) {
    const organization = await this.findOne(id);

    // Check if organization has users
    if (organization.users && organization.users.length > 0) {
      throw new ConflictException(
        'Cannot delete organization with existing users',
      );
    }

    await this.organizationRepository.remove(organization);
    return { message: 'Organization deleted successfully' };
  }

  async getOrganizationStats(id: number) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users', 'courses', 'questions'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const adminCount =
      organization.users?.filter((u) => u.role === 'ADMIN').length || 0;
    const instructorCount =
      organization.users?.filter((u) => u.role === 'INSTRUCTOR').length || 0;
    const studentCount =
      organization.users?.filter((u) => u.role === 'STUDENT').length || 0;

    return {
      id: organization.id,
      name: organization.name,
      totalUsers: organization.users?.length || 0,
      admins: adminCount,
      instructors: instructorCount,
      students: studentCount,
      totalCourses: organization.courses?.length || 0,
      totalQuestions: organization.questions?.length || 0,
      active: organization.active,
    };
  }
}
