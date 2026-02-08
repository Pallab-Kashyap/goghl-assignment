import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries', description: 'Category name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: CategoryType,
    example: 'EXPENSE',
    description: 'Category type',
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ example: '🛒', description: 'Category icon (emoji)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Category color (hex)',
  })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Food & Groceries' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: CategoryType })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({ example: '🍕' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#FFC107' })
  @IsOptional()
  @IsString()
  color?: string;
}
