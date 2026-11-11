import { ArgumentMetadata, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateStudentProfileDto } from '../student/student.dto';
import { SignupDto } from '../auth/auth.dto';
import { AuthService } from '../auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { College } from '../entities/college.entity';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

describe('Security Controls', () => {
  describe('Profile Mass-Assignment Prevention', () => {
    let target: ValidationPipe;

    beforeEach(() => {
      target = new ValidationPipe({ whitelist: true, transform: true });
    });

    it('should strip role and keep allowed fields', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: UpdateStudentProfileDto,
        data: '',
      };

      const rawData = {
        name: 'John Doe',
        mobileNumber: '1234567890',
        role: 'SUPERADMIN', // Unallowed field (mass-assignment target)
        isAdmin: true,       // Unallowed field
      };

      const result = await target.transform(rawData, metadata);

      expect(result.name).toBe('John Doe');
      expect(result.mobileNumber).toBe('1234567890');
      expect(result.role).toBeUndefined();
      expect((result as any).isAdmin).toBeUndefined();
    });
  });

  describe('Password Complexity Validation', () => {
    let target: ValidationPipe;

    beforeEach(() => {
      target = new ValidationPipe({ transform: true });
    });

    it('should fail validation for weak passwords', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SignupDto,
        data: '',
      };

      const weakData = {
        name: 'Learner',
        email: 'learner@edu.com',
        password: 'weak', // fails minLength and regex
        mobileNumber: '9999999999',
        country: 'India',
        state: 'Karnataka',
        course: 'CS',
        branch: 'IS',
        pursuingYear: 4,
        semester: 8,
        registrationNumber: 'REG123',
        collegeName: 'Test College',
      };

      await expect(target.transform(weakData, metadata)).rejects.toThrow();
    });

    it('should pass validation for strong passwords', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SignupDto,
        data: '',
      };

      const strongData = {
        name: 'Learner',
        email: 'learner@edu.com',
        password: 'ValidPassword123!', // passes rules
        mobileNumber: '9999999999',
        country: 'India',
        state: 'Karnataka',
        course: 'CS',
        branch: 'IS',
        pursuingYear: 4,
        semester: 8,
        registrationNumber: 'REG123',
        collegeName: 'Test College',
      };

      const result = await target.transform(strongData, metadata);
      expect(result.password).toBe('ValidPassword123!');
    });
  });

  describe('AuthService Security Checks', () => {
    let service: AuthService;
    afterEach(() => jest.restoreAllMocks());

    beforeEach(async () => {
      const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockJwt = {
        sign: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: mockRepo },
          { provide: getRepositoryToken(College), useValue: mockRepo },
          { provide: JwtService, useValue: mockJwt },
        ],
      }).compile();

      service = module.get<AuthService>(AuthService);
    });

    it('should detect and throw BadRequestException for pwned/breached passwords', async () => {
      const breachedPassword = 'Password123!';
      const suffix = createHash('sha1').update(breachedPassword).digest('hex').toUpperCase().slice(5);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true, text: async () => `${suffix}:100\r\nOTHER:2`,
      } as Response);
      await expect(service['checkPasswordBreached'](breachedPassword)).rejects.toThrow(
        BadRequestException,
      );
    }, 15000);

    it('should allow strong unbreached password', async () => {
      const safePassword = 'K39&2pLm$9xZ!qW5_vN8';
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true, text: async () => 'OTHER:2',
      } as Response);
      await expect(service['checkPasswordBreached'](safePassword)).resolves.not.toThrow();
    }, 15000);
  });
});
