import { Injectable } from '@nestjs/common';
import { QueryOrder, raw } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/orderItem.entity';

@Injectable()
export class AnalyticsService {
  constructor(private readonly em: EntityManager) {}

  async getDashboardStats() {
    const [totalOrders, totalSalesResult] = await Promise.all([
      this.em.count(Order),
      this.em
        .createQueryBuilder(Order, 'o')
        .select(raw('COALESCE(SUM(o.total), 0) as total'))
        .execute('get'),
    ]);

    const totalRevenue = Number((totalSalesResult as any)?.total ?? 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const recentOrders = await this.em.find(
      Order,
      {},
      {
        populate: ['user', 'items'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: 5,
      },
    );

    return {
      totalRevenue:      Number(totalRevenue.toFixed(2)),
      totalOrders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      recentOrders:      recentOrders.map(o => o.toDto()),
    };
  }

  async salesOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.em
      .createQueryBuilder(Order, 'o')
      .select([
        raw('DATE(o.created_at) as date'),
        raw('SUM(o.total) as revenue'),
        raw('COUNT(*) as orders'),
      ])
      .where({ createdAt: { $gte: since } })
      .groupBy(raw('DATE(o.created_at)'))
      .orderBy({ [raw('DATE(o.created_at)')]: 'ASC' })
      .execute();
  }

  async topSellingProducts(limit = 5) {
    return this.em
      .createQueryBuilder(OrderItem, 'oi')
      .select([
        'oi.product_title',
        raw('SUM(oi.quantity) as units_sold'),
        raw('SUM(oi.quantity * oi.price_at_add) as revenue'),
      ])
      .groupBy('oi.product_title')
      .orderBy({ [raw('revenue')]: 'DESC' })
      .limit(limit)
      .execute();
  }
}
