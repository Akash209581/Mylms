import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../entities/user.entity';
import { SignupDto, LoginDto, CreateUserDto, SuperAdminCreateUserDto } from './auth.dto';
import { College } from '../entities/college.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    await this.checkPasswordBreached(dto.password);
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate state requirement for India
    if (dto.country?.toLowerCase() === 'india' && !dto.state) {
      throw new ConflictException('State is required for Indian learners');
    }

    // Public registration may join an existing active college; only authorized
    // platform provisioning can create a college.
    let college = await this.collegeRepository.findOne({
      where: { name: dto.collegeName },
    });
    
    if (!college?.active) throw new BadRequestException('Select an available college from the registration list');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.STUDENT,
      collegeId: college.id,
      collegeName: college.name,
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

    return { message: 'Account created successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'role', 'collegeId', 'collegeName', 'isActive', 'passwordHash'],
    });
    if (!user || !user.passwordHash || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    let college: College | null = null;
    if (user.collegeId) {
      college = await this.collegeRepository.findOne({ where: { id: user.collegeId } });
    } else if (user.collegeName) {
      college = await this.collegeRepository.findOne({ where: { name: user.collegeName } });
    }

    if ((user.collegeId || user.collegeName) && (!college || !college.active)) {
      throw new UnauthorizedException('Your college account is unavailable');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId || college?.id,
      collegeName: college?.name || user.collegeName,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId || college?.id,
        collegeName: user.collegeName || college?.name,
        collegeLogo: college?.logoUrl,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    
    let college: College | null = null;
    if (user.collegeId) {
      college = await this.collegeRepository.findOne({ where: { id: user.collegeId } });
    } else if (user.collegeName) {
      college = await this.collegeRepository.findOne({ where: { name: user.collegeName } });
    }
    const { passwordHash, ...result } = user;
    return { 
      ...result, 
      collegeId: user.collegeId || college?.id,
      collegeName: user.collegeName || college?.name,
      collegeLogo: college?.logoUrl 
    };
  }

  async createUser(dto: CreateUserDto, createdBy: number, creatorCollegeId?: number, creatorRole?: string, creatorCollegeName?: string) {
    // Check if email already exists
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate role based on creator's role
    const validRoles = this.getAllowedRolesToCreate(creatorRole || '');
    if (!validRoles.includes(dto.role)) {
      throw new BadRequestException(`${creatorRole} can only create: ${validRoles.join(', ')}`);
    }

    // Determine college ID based on creator role
    let collegeId: number | undefined;
    let collegeName: string | undefined;
    
    if (creatorRole === UserRole.ADMIN || creatorRole === UserRole.INSTRUCTOR) {
      // ADMIN and INSTRUCTOR: automatically inherit college from creator
      if (!creatorCollegeId) {
        throw new BadRequestException(
          `${creatorRole} account is not associated with any college. Please contact SUPERADMIN to assign you to a college first.`
        );
      }
      collegeId = creatorCollegeId;
      collegeName = creatorCollegeName;
      
      // Validate college exists
      const college = await this.collegeRepository.findOne({
        where: { id: collegeId },
      });
      if (!college) {
        throw new ConflictException(
          `Your assigned college (ID: ${collegeId}) no longer exists in the system. Please contact SUPERADMIN.`
        );
      }
    } else if (creatorRole === UserRole.SUPERADMIN) {
      // SUPERADMIN should use SuperAdminCreateUserDto endpoint
      throw new BadRequestException('SUPERADMIN should use dedicated endpoint with college assignment');
    } else {
      throw new BadRequestException('Invalid creator role');
    }

    await this.checkPasswordBreached(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      collegeId: collegeId,
      collegeName: collegeName, // Automatically inherit college name from creator
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

  // Helper method to determine allowed roles based on creator's role
  private getAllowedRolesToCreate(creatorRole: string): string[] {
    switch (creatorRole) {
      case UserRole.SUPERADMIN:
        return ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
      case UserRole.ADMIN:
        return ['INSTRUCTOR', 'STUDENT'];
      case UserRole.INSTRUCTOR:
        return ['STUDENT'];
      default:
        return [];
    }
  }

  // Dedicated method for SUPERADMIN to create users with college name (auto-creates college if needed)
  async createUserWithCollege(dto: SuperAdminCreateUserDto, createdBy: number) {
    // Check if email already exists
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Validate role - SUPERADMIN can create ADMIN, INSTRUCTOR, or STUDENT
    const allowedRoles = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
    if (!allowedRoles.includes(dto.role)) {
      throw new BadRequestException('Invalid role. Must be ADMIN, INSTRUCTOR, or STUDENT');
    }

    // Find or create college by name
    let college = await this.collegeRepository.findOne({
      where: { name: dto.collegeName },
    });
    
    if (!college) {
      // Auto-create college if it doesn't exist
      college = this.collegeRepository.create({
        name: dto.collegeName,
        createdBy: createdBy,
        active: true,
        logoUrl: dto.collegeLogo,
      });
      await this.collegeRepository.save(college);
    } else if (dto.collegeLogo) {
      // Update logo if provided and college exists
      college.logoUrl = dto.collegeLogo;
      await this.collegeRepository.save(college);
    }

    await this.checkPasswordBreached(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      collegeId: college.id,
      collegeName: college.name,
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
      message: `${dto.role} account created successfully in ${college.name}`,
      user: result,
    };
  }

  private async checkPasswordBreached(password: string): Promise<void> {
    const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) {
        console.error(`PwnedPasswords API returned status ${response.status}`);
        return;
      }
      const data = await response.text();
      const lines = data.split('\n');
      const matches = lines.some((line) => {
        const parts = line.split(':');
        return parts[0].trim() === suffix;
      });

      if (matches) {
        throw new BadRequestException('This password has been found in a public data breach and is unsafe. Please choose a different password.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      console.warn('Could not complete HaveIBeenPwned check:', err.message);
    }
  }
}
