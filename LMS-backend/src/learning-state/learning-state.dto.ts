import { IsBoolean, IsInt, IsNumber, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// ValidateIf permits omitted PATCH fields, but rejects null and implicit coercion.
export class UpdateCourseLearningStateDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  saved?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  lastLessonId?: number;
}

export class UpdateLessonLearningStateDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20000)
  note?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  bookmarked?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(604800)
  videoSeconds?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100000)
  pdfPage?: number;
}
