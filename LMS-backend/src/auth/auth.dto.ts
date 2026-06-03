import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
    message: 'Invalid mobile number format',
  })
  mobileNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.country?.toLowerCase() === 'india')
  @IsNotEmpty({ message: 'State is required for Indian learners' })
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @IsString()
  @IsNotEmpty({ message: 'Course is required' })
  @MaxLength(100, { message: 'Course must not exceed 100 characters' })
  course: string;

  @IsString()
  @IsNotEmpty({ message: 'Branch is required' })
  @MaxLength(100, { message: 'Branch must not exceed 100 characters' })
  branch: string;

  @IsInt({ message: 'Pursuing year must be a number' })
  @Min(1, { message: 'Pursuing year must be at least 1' })
  @Max(6, { message: 'Pursuing year must not exceed 6' })
  pursuingYear: number;

  @IsInt({ message: 'Semester must be a number' })
  @Min(1, { message: 'Semester must be at least 1' })
  @Max(12, { message: 'Semester must not exceed 12' })
  semester: number;

  @IsString()
  @IsNotEmpty({ message: 'Registration number is required' })
  @MaxLength(100, { message: 'Registration number must not exceed 100 characters' })
  registrationNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'College name is required' })
  @MaxLength(200, { message: 'College name must not exceed 200 characters' })
  collegeName: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string; // ADMIN, INSTRUCTOR, STUDENT

  // collegeId is NOT in the DTO for ADMIN/INSTRUCTOR creation
  // It will be automatically inherited from the creator
  // This prevents admins and instructors from changing the college when creating users

  // collegeName is NOT in the DTO - it will be automatically inherited from the creator
  // This prevents admins and instructors from changing the college when creating users

  // Optional Student fields
  @IsOptional()
  @IsString()
  @MaxLength(15)
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  course?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsOptional()
  @IsInt()
  pursuingYear?: number;

  @IsOptional()
  @IsInt()
  semester?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;
}

// DTO for SUPERADMIN to create users with college name (auto-creates college if doesn't exist)
export class SuperAdminCreateUserDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'College/University name is required' })
  @MaxLength(200, { message: 'College name must not exceed 200 characters' })
  collegeName: string;

  @IsOptional()
  @IsString()
  collegeLogo?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
