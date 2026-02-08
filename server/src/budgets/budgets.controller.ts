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
import { BudgetsService } from './budgets.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetQueryDto,
} from './dto/budget.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Budgets')
@ApiBearerAuth('access-token')
@Controller('api/budgets')
@UseGuards(AuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Budget already exists for this category and period',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(req.user.id, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets with optional filters' })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of budgets with spent amounts',
  })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: BudgetQueryDto) {
    return this.budgetsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget details with spent amount' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.budgetsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({ status: 200, description: 'Budget updated successfully' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, req.user.id, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.budgetsService.remove(id, req.user.id);
  }
}
