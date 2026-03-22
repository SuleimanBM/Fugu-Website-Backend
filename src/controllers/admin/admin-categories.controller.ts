import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { RolesGuard } from '../../guards/roles-guard';
import { Role } from '../../decorators/roles.decorator';
import { CategoryService } from '../../services/category.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin')
export class AdminCategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  /** GET /api/admin/categories */
  @Get('categories')
  listCategories() {
    return this.categoryService.listCategories();
  }

  /** POST /api/admin/categories */
  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.categoryService.createCategory(body.name);
  }
}
