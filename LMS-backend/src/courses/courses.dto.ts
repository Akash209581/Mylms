import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  description: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Category must not exceed 100 characters' })
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Level must not exceed 50 characters' })
  level?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Price must be a positive number' })
  price?: number;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  prerequisites?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Duration must be a positive number' })
  duration?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Organization ID must be a positive number' })
  organizationId?: number; // SUPERADMIN can specify organization when creating course
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Category must not exceed 100 characters' })
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Level must not exceed 50 characters' })
  level?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Price must be a positive number' })
  price?: number;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  prerequisites?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Duration must be a positive number' })
  duration?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class ApproveCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters' })
  note?: string;
}

export class RejectCourseDto {
  @IsString()
  @MinLength(10, {
    message: 'Rejection reason must be at least 10 characters long',
  })
  @MaxLength(1000, {
    message: 'Rejection reason must not exceed 1000 characters',
  })
  reason: string;
}
