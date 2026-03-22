import { Entity, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';

/**
 * Immutable snapshot of a cart item at the time of purchase.
 * Denormalized so order history works even if products are later deleted.
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

  /** Snapshot of product display title at time of purchase */
  @Property()
  productTitle!: string;

  /** Snapshot of variant label e.g. "M (39-41) · Sleeved" */
  @Property({ nullable: true })
  variantName?: string;

  @Property({ default: false })
  withHat: boolean = false;

  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customLength?: number;

  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customWidth?: number;

  toDto() {
    return {
      id:           this.id,
      product_id:   this.productId,
      variant_id:   this.variantId,
      quantity:     this.quantity,
      priceAtAdd:   Number(this.priceAtAdd),
      productTitle: this.productTitle,
      variantName:  this.variantName,
      withHat:      this.withHat,
      customLength: this.customLength != null ? Number(this.customLength) : null,
      customWidth:  this.customWidth != null ? Number(this.customWidth) : null,
    };
  }
}
