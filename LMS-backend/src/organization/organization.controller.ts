import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() dto: CreateOrganizationDto, @Request() req) {
    return await this.organizationService.create(dto, req.user.sub);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN)
  async findAll() {
    return await this.organizationService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findOne(@Param('id') id: string, @Request() req) {
    const orgId = parseInt(id);

    // ADMIN can only view their own organization
    if (req.user.role === UserRole.ADMIN && req.user.organizationId !== orgId) {
      throw new Error('You can only view your own organization');
    }

    return await this.organizationService.findOne(orgId);
  }

  @Get(':id/stats')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getStats(@Param('id') id: string, @Request() req) {
    const orgId = parseInt(id);

    // ADMIN can only view their own organization stats
    if (req.user.role === UserRole.ADMIN && req.user.organizationId !== orgId) {
      throw new Error('You can only view your own organization statistics');
    }

    return await this.organizationService.getOrganizationStats(orgId);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return await this.organizationService.update(parseInt(id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async remove(@Param('id') id: string) {
    return await this.organizationService.remove(parseInt(id));
  }
}
