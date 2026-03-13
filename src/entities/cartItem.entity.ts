import { Entity, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cart } from './cart.entity';
import { ProductVariant } from './productVariant.entity';

@Entity()
export class CartItem extends BaseEntity {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';
  @ManyToOne(() => Cart)
  cart!: Cart;

  /**
   * We keep the FK relation to ProductVariant for stock validation,
   * but also store product_id and variant_id as plain columns so we
   * can map directly to the frontend CartItem type without extra joins.
   */
  @ManyToOne(() => ProductVariant)
  variant!: ProductVariant;

  @Property()
  productId!: string;

  @Property()
  quantity!: number;

  /**
   * Price captured at the time the item was added — protects the customer
   * from price changes between add-to-cart and checkout.
   */
  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  priceAtAdd!: number;

  /** Maps to frontend CartItem type */
  toDto() {
    return {
      id: this.id,
      product_id: this.productId,
      variant_id: this.variant,
      quantity: this.quantity,
      priceAtAdd: Number(this.priceAtAdd),
    };
  }
}
