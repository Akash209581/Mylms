import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  courseId: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class UpdateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class ReorderModulesDto {
  @IsInt({ each: true })
  moduleIds: number[];
}
