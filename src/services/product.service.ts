import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProductRepository } from '../repositories/product.repository';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { Category } from '../entities/category.entity';
import { InjectRepository } from '@mikro-orm/nestjs';

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Product)
    private readonly productRepo: ProductRepository,
  ) {}

  /** GET /api/products — paginated list with optional filters */
  async list(filters: ProductFilters = {}) {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      size,
      page = 1,
      limit = 12,
      featured,
    } = filters;

    const offset = (page - 1) * limit;
    const where: any = { isActive: true, deletedAt: null };

    if (featured !== undefined) where.featured = featured;

    if (category) {
      // categories is a jsonb array — use $like for simplicity
      where.categories = { $contains: [category] };
    }

    if (minPrice !== undefined) where.price = { ...(where.price ?? {}), $gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...(where.price ?? {}), $lte: maxPrice };

    if (size) {
      // Find product IDs that have a variant of the given size with stock > 0
      const variantMatches = await this.em.find(ProductVariant, {
        size: size as any,
        stock: { $gt: 0 },
      });
      const productIds = [...new Set(variantMatches.map(v => (v.product as any).id ?? v.product))];
      if (productIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      where.id = { $in: productIds };
    }

    if (q) {
      where.$or = [
        { title: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ];
    }

    const [products, total] = await this.em.findAndCount(Product, where, {
      populate: ['variants'],
      limit,
      offset,
      orderBy: { createdAt: QueryOrder.DESC },
    });

    return {
      items: products.map(p => p.toDto()),
      total,
      page,
      limit,
    };
  }

  /** GET /api/products/featured */
  async featured() {
    const products = await this.productRepo.findFeatured();
    return products.map(p => p.toDto());
  }

  /** GET /api/products/categories — distinct category strings */
  async categories(): Promise<string[]> {
    const cats = await this.em.find(Category, { deletedAt: null });
    return cats.map(c => c.name);
  }

  /** GET /api/products/:slug */
  async getBySlug(slug: string) {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return product.toDto(product.variants.getItems());
  }

  /** Internal: get by id (used by admin and cart) */
  async getById(id: string) {
    const product = await this.em.findOne(
      Product,
      { id, deletedAt: null },
      { populate: ['variants'] },
    );
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
