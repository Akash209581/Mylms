import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  IsBoolean,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  contentUrl?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  duration?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsInt()
  moduleId: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

export class UpdateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  contentUrl?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  duration?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class ReorderLessonsDto {
  @IsInt({ each: true })
  lessonIds: number[];
}

export class UpdateContentDto {
  /** TipTap JSON document */
  @IsObject()
  @IsNotEmpty()
  content: Record<string, any>;
}
