import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ example: 500, description: 'Budget amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    example: 2,
    minimum: 1,
    maximum: 12,
    description: 'Month (1-12)',
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Year' })
  @IsNumber()
  @Type(() => Number)
  year: number;

  @ApiProperty({ example: 'clx_cat_123', description: 'Category ID' })
  @IsString()
  categoryId: string;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 600, description: 'New budget amount' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

export class BudgetQueryDto {
  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    maximum: 12,
    description: 'Filter by month',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 2026, description: 'Filter by year' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;
}
