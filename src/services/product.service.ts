import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProductRepository } from '../repositories/product.repository';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { InjectRepository } from '@mikro-orm/nestjs';

export interface ProductFilters {
  q?:           string;
  productType?: string;
  page?:        number;
  limit?:       number;
  featured?:    boolean;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Product)
    private readonly productRepo: ProductRepository,
  ) {}

  async list(filters: ProductFilters = {}) {
    const { q, productType, page = 1, limit = 12, featured } = filters;
    const offset = (page - 1) * limit;
    const where: any = { isActive: true, deletedAt: null };

    if (featured !== undefined) where.featured     = featured;
    if (productType)            where.productType  = productType;

    if (q) {
      // Search against the slug since we no longer have title/description columns
      where.slug = { $ilike: `%${q.toLowerCase().replace(/\s+/g, '-')}%` };
    }

    const [products, total] = await this.em.findAndCount(Product, where, {
      populate:  ['variants'],
      limit,
      offset,
      orderBy:   { createdAt: QueryOrder.DESC },
    });

    return {
      items: products.map(p => p.toDto()),
      total,
      page,
      limit,
    };
  }

  async featured() {
    const products = await this.productRepo.findFeatured();
    return products.map(p => p.toDto());
  }

  /** Returns category names from the Category table (still used for admin labelling) */
  async categories(): Promise<string[]> {
    const cats = await this.em.find(Category, { deletedAt: null });
    return cats.map(c => c.name);
  }

  async getBySlug(slug: string) {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return product.toDto();
  }

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
