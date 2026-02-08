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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('api/categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(req.user.id, createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories for the user' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.categoriesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.categoriesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, req.user.id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.categoriesService.remove(id, req.user.id);
  }
}
