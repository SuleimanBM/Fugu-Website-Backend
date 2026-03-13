import { EntityRepository } from '@mikro-orm/postgresql';
import { Product } from '../entities/product.entity';

export class ProductRepository extends EntityRepository<Product> {
  findBySlug(slug: string) {
    return this.findOne(
      { slug, isActive: true, deletedAt: null },
      { populate: ['variants'] },
    );
  }

  findAllActive(limit = 12, offset = 0) {
    return this.findAndCount(
      { isActive: true, deletedAt: null },
      { populate: ['variants'], limit, offset },
    );
  }

  findFeatured() {
    return this.find(
      { featured: true, isActive: true, deletedAt: null },
      { populate: ['variants'] },
    );
  }
}
