import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  @MaxLength(200, {
    message: 'Organization name must not exceed 200 characters',
  })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Type must not exceed 100 characters' })
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Address must not exceed 255 characters' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid contact email format' })
  @MaxLength(255, { message: 'Contact email must not exceed 255 characters' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Contact phone must not exceed 20 characters' })
  contactPhone?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Organization name must not exceed 200 characters',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Type must not exceed 100 characters' })
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Address must not exceed 255 characters' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid contact email format' })
  @MaxLength(255, { message: 'Contact email must not exceed 255 characters' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Contact phone must not exceed 20 characters' })
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
