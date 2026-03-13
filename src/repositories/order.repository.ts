import { EntityRepository } from '@mikro-orm/postgresql';
import { Order } from '../entities/order.entity';

export class OrderRepository extends EntityRepository<Order> {
  findByUser(userId: string) {
    return this.find(
      { user: userId },
      { populate: ['items'], orderBy: { createdAt: 'DESC' } },
    );
  }

  findById(id: string) {
    return this.findOne({ id }, { populate: ['items', 'user'] });
  }
}
