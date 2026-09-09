import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
class AnswerDto {
  @IsInt() @Min(1) questionId: number;
  @IsString() @MaxLength(20000) value: string;
}
export class SaveAnswersDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => AnswerDto) answers: AnswerDto[];
}
class GradeDto {
  @IsInt() @Min(1) questionId: number;
  @IsInt() @Min(0) marks: number;
}
export class GradeAttemptDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => GradeDto) grades: GradeDto[];
  @IsString() @MaxLength(20000) feedback: string;
  @IsBoolean() release: boolean;
}
