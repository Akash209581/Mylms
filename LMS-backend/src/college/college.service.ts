import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { College } from '../entities/college.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateCollegeDto, UpdateCollegeDto } from './college.dto';

@Injectable()
export class CollegeService {
  constructor(
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createCollege(dto: CreateCollegeDto, createdBy: number) {
    // Check if college name already exists
    const existing = await this.collegeRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('College name already exists');
    }

    const college = this.collegeRepository.create({
      ...dto,
      createdBy,
    });

    return this.collegeRepository.save(college);
  }

  async getAllColleges() {
    return this.collegeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getActiveColleges() {
    return this.collegeRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  async getCollegeById(id: number) {
    const college = await this.collegeRepository.findOne({
      where: { id },
    });
    if (!college) {
      throw new NotFoundException('College not found');
    }
    return college;
  }

  async updateCollege(id: number, dto: UpdateCollegeDto) {
    const college = await this.getCollegeById(id);

    // If name is being updated, check for duplicates
    if (dto.name && dto.name !== college.name) {
      const existing = await this.collegeRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('College name already exists');
      }
    }

    Object.assign(college, dto);
    return this.collegeRepository.save(college);
  }

  async deleteCollege(id: number) {
    const college = await this.getCollegeById(id);
    
    // Check if there are users associated with this college
    const userCount = await this.userRepository.count({
      where: { collegeId: id },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete college. ${userCount} users are associated with this college.`,
      );
    }

    await this.collegeRepository.remove(college);
    return { message: 'College deleted successfully' };
  }

  async getCollegeStats(collegeId: number) {
    const college = await this.getCollegeById(collegeId);

    const adminCount = await this.userRepository.count({
      where: { collegeId, role: UserRole.ADMIN },
    });

    const instructorCount = await this.userRepository.count({
      where: { collegeId, role: UserRole.INSTRUCTOR },
    });

    const studentCount = await this.userRepository.count({
      where: { collegeId, role: UserRole.STUDENT },
    });

    return {
      college,
      adminCount,
      instructorCount,
      studentCount,
      totalUsers: adminCount + instructorCount + studentCount,
    };
  }

  async getAllCollegesWithStats() {
    const colleges = await this.collegeRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });

    const collegesWithStats = await Promise.all(
      colleges.map(async (college) => {
        const adminCount = await this.userRepository.count({
          where: { collegeId: college.id, role: UserRole.ADMIN },
        });

        const instructorCount = await this.userRepository.count({
          where: { collegeId: college.id, role: UserRole.INSTRUCTOR },
        });

        const studentCount = await this.userRepository.count({
          where: { collegeId: college.id, role: UserRole.STUDENT },
        });

        return {
          ...college,
          adminCount,
          instructorCount,
          studentCount,
          totalUsers: adminCount + instructorCount + studentCount,
        };
      }),
    );

    return collegesWithStats;
  }
}
