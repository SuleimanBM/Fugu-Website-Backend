import { Entity, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cart } from './cart.entity';
import { ProductVariant } from './productVariant.entity';

@Entity()
export class CartItem extends BaseEntity {

  @ManyToOne(() => Cart)
  cart!: Cart;

  @ManyToOne(() => ProductVariant)
  variant!: ProductVariant;

  /** Stored as plain column for direct mapping to frontend without joins */
  @Property()
  productId!: string;

  @Property()
  quantity!: number;

  /** Price captured at time of adding — protects against price changes */
  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  priceAtAdd!: number;

  /** Hat add-on was included — fugu only */
  @Property({ default: false })
  withHat: boolean = false;

  /** Female fugu custom length in cm */
  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customLength?: number;

  /** Female fugu custom width in cm */
  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customWidth?: number;

  toDto() {
    return {
      id:           this.id,
      product_id:   this.productId,
      variant_id:   this.variant,
      quantity:     this.quantity,
      priceAtAdd:   Number(this.priceAtAdd),
      withHat:      this.withHat,
      customLength: this.customLength != null ? Number(this.customLength) : null,
      customWidth:  this.customWidth != null ? Number(this.customWidth) : null,
    };
  }
}
