import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateTransactionDto {
  @ApiProperty({ example: 150.5, description: 'Transaction amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    enum: TransactionType,
    example: 'EXPENSE',
    description: 'Transaction type',
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({
    example: 'Grocery shopping',
    description: 'Transaction description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '2026-02-04',
    description: 'Transaction date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'clx_cat_123', description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 200, description: 'New transaction amount' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Transaction type',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '2026-02-05',
    description: 'Transaction date',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'clx_cat_456', description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter by transaction type',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    example: 'clx_cat_123',
    description: 'Filter by category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-02-04',
    description:
      'Filter transactions for exact date (overrides startDate/endDate)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter transactions from this date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-02-28',
    description: 'Filter transactions until this date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of results to return',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Number of results to skip' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
