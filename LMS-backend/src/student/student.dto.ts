import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15, { message: 'Mobile number must not exceed 15 characters' })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Bio must not exceed 1000 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  profilePicture?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'GitHub URL must be a valid URL' })
  githubUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'LinkedIn URL must be a valid URL' })
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Portfolio URL must be a valid URL' })
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Twitter URL must be a valid URL' })
  twitterUrl?: string;
}
