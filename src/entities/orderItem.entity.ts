import { Entity, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';

/**
 * Immutable snapshot of a cart item at the time of purchase.
 * Maps back to frontend CartItem shape so order history renders correctly.
 */
@Entity()
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order)
  order!: Order;

  @Property()
  productId!: string;

  @Property()
  variantId!: string;

  @Property()
  quantity!: number;

  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  priceAtAdd!: number;

  // Denormalized for display — so order history works even if products are deleted
  @Property()
  productTitle!: string;

  @Property({ nullable: true })
  variantName?: string;

  toDto() {
    return {
      id: this.id,
      product_id: this.productId,
      variant_id: this.variantId,
      quantity: this.quantity,
      priceAtAdd: Number(this.priceAtAdd),
    };
  }
}
