import { Cascade, Collection, Entity, Enum, ManyToOne, OneToMany, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { OrderItem } from './orderItem.entity';
import { OrderRepository } from '../repositories/order.repository';
import { FulfillmentStatus } from '../enums/fulfillmentStatus.enum';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity({ repository: () => OrderRepository })
export class Order extends BaseEntity {
 
  @ManyToOne(() => User)
  user!: User;

  /** Items snapshot — stored denormalized so order history is immutable */
  @OneToMany(() => OrderItem, item => item.order, { cascade: [Cascade.ALL], orphanRemoval: true })
  items = new Collection<OrderItem>(this);

  /**
   * Shipping address captured at checkout. Stored as JSON so it is
   * immutable even if the user updates their profile later.
   */
  @Property({ columnType: 'jsonb' })
  shippingAddress!: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    country: string;
  };

  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  tax!: number;

  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  shipping!: number;

  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Enum(() => PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.PENDING;

  @Enum(() => FulfillmentStatus)
  fulfillmentStatus?: FulfillmentStatus = FulfillmentStatus.PROCESSING;

  @Property({ nullable: true })
  paymentReference?: string;

  /** Maps to frontend Order type */
  toDto() {
    return {
      id: this.id,
      user_id: this.user.id,
      items: this.items.isInitialized()
        ? this.items.getItems().map(i => i.toDto())
        : [],
      shipping_address: this.shippingAddress,
      subtotal: Number(this.subtotal),
      tax: Number(this.tax),
      shipping: Number(this.shipping),
      total: Number(this.total),
      payment_status: this.paymentStatus,
      fulfillment_status: this.fulfillmentStatus,
      payment_reference: this.paymentReference,
      created_at: this.createdAt.toISOString(),
    };
  }
}
