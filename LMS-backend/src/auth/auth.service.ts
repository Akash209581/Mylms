import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { SignupDto, LoginDto, CreateUserDto } from './auth.dto';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate state requirement for India
    if (dto.country?.toLowerCase() === 'india' && !dto.state) {
      throw new ConflictException('State is required for Indian learners');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.STUDENT,
      organizationId: dto.organizationId,
      mobileNumber: dto.mobileNumber,
      country: dto.country,
      state: dto.state,
      course: dto.course,
      branch: dto.branch,
      pursuingYear: dto.pursuingYear,
      semester: dto.semester,
      registrationNumber: dto.registrationNumber,
      collegeName: dto.collegeName,
    });
    await this.userRepository.save(user);

    return { message: 'Account created successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organizationId: user.organizationId,
      collegeName: user.collegeName, // Include collegeName in JWT for inheritance
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        collegeName: user.collegeName, // Include collegeName in response
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...result } = user;
    return result;
  }

  async createUser(dto: CreateUserDto, createdBy: number, creatorOrgId?: number, creatorRole?: string, creatorCollegeName?: string) {
    // Check if email already exists
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate role
    if (dto.role !== 'ADMIN' && dto.role !== 'INSTRUCTOR' && dto.role !== 'STUDENT') {
      throw new ConflictException('Invalid role. Must be ADMIN, INSTRUCTOR, or STUDENT');
    }

    // Determine organization ID based on creator role
    let organizationId: number | undefined;
    
    if (creatorRole === 'ADMIN' || creatorRole === 'INSTRUCTOR') {
      // ADMIN and INSTRUCTOR: automatically inherit organization from creator
      if (!creatorOrgId) {
        throw new ConflictException('Creator must belong to an organization');
      }
      organizationId = creatorOrgId;
    } else {
      throw new ConflictException('Invalid creator role');
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new ConflictException('Organization not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      organizationId: organizationId,
      collegeName: creatorCollegeName, // Automatically inherit college name from creator
      // Student fields (optional)
      mobileNumber: dto.mobileNumber,
      country: dto.country,
      state: dto.state,
      course: dto.course,
      branch: dto.branch,
      pursuingYear: dto.pursuingYear,
      semester: dto.semester,
      registrationNumber: dto.registrationNumber,
    });
    await this.userRepository.save(user);

    const { passwordHash: _, ...result } = user;
    return {
      message: `${dto.role} account created successfully`,
      user: result,
    };
  }

  // Dedicated method for SUPERADMIN to create users with explicit organization selection
  async createUserWithOrganization(dto: any, createdBy: number) {
    // Check if email already exists
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate role
    if (dto.role !== 'ADMIN' && dto.role !== 'INSTRUCTOR' && dto.role !== 'STUDENT') {
      throw new ConflictException('Invalid role. Must be ADMIN, INSTRUCTOR, or STUDENT');
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new ConflictException('Organization not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      organizationId: dto.organizationId,
      collegeName: dto.collegeName,
      // Student fields (optional)
      mobileNumber: dto.mobileNumber,
      country: dto.country,
      state: dto.state,
      course: dto.course,
      branch: dto.branch,
      pursuingYear: dto.pursuingYear,
      semester: dto.semester,
      registrationNumber: dto.registrationNumber,
    });
    await this.userRepository.save(user);

    const { passwordHash: _, ...result } = user;
    return {
      message: `${dto.role} account created successfully`,
      user: result,
    };
  }
}
