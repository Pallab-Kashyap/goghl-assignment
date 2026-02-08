import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('api/transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(req.user.id, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions with optional filters' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Exact date filter (YYYY-MM-DD)',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of transactions with pagination',
  })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(req.user.id, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get transaction summary (total income, expense, balance)',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Transaction summary' })
  getSummary(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.getSummary(req.user.id, startDate, endDate);
  }

  @Get('chart-data')
  @ApiOperation({
    summary: 'Get weekly income vs expense chart data for a date range',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({
    status: 200,
    description: 'Chart data for income vs expenses by week',
  })
  getChartData(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionsService.getChartData(
      req.user.id,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(
      id,
      req.user.id,
      updateTransactionDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
