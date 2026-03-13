import { EntityRepository } from '@mikro-orm/postgresql';
import { Cart } from '../entities/cart.entity';

export class CartRepository extends EntityRepository<Cart> {
  findActiveByUser(userId: string) {
    return this.findOne(
      { user: userId, isActive: true },
      { populate: ['items', 'items.variant', 'items.variant.product'] },
    );
  }
}
