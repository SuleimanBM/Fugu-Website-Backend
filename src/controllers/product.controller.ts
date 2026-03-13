import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductService) {}

  /**
   * GET /api/products/featured
   * Must be defined BEFORE /:slug to avoid route collision.
   */
  @Get('featured')
  featured() {
    return this.productService.featured();
  }

  /**
   * GET /api/products/categories
   * Returns string[] — list of all category names.
   */
  @Get('categories')
  categories() {
    return this.productService.categories();
  }

  /**
   * GET /api/products
   * Query: q, category, minPrice, maxPrice, size, page, limit
   * Returns { items, total, page, limit }
   */
  @Get()
  list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('size') size?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.list({
      q,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      size,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });
  }

  /**
   * GET /api/products/:slug
   * Returns a single Product with full variants array.
   */
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.productService.getBySlug(slug);
  }
}
