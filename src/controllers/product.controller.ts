import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductService) {}

  /** GET /api/products/featured — must come before /:slug */
  @Get('featured')
  getFeatured() {
    return this.productService.featured();
  }

  /** GET /api/products/categories */
  @Get('categories')
  getCategories() {
    return this.productService.categories();
  }

  /**
   * GET /api/products?productType=fugu&q=&page=1&limit=12&featured=
   */
  @Get()
  list(
    @Query('q')           q?:           string,
    @Query('productType') productType?: string,
    @Query('page')        page?:        string,
    @Query('limit')       limit?:       string,
    @Query('featured')    featured?:    string,
  ) {
    return this.productService.list({
      q,
      productType,
      page:     page    ? Number(page)    : undefined,
      limit:    limit   ? Number(limit)   : undefined,
      featured: featured !== undefined ? featured === 'true' : undefined,
    });
  }

  /** GET /api/products/:slug */
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.productService.getBySlug(slug);
  }
}
