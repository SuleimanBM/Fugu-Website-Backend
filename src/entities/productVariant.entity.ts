import { Entity, OptionalProps, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Size } from '../enums/sizes.enum';

@Entity()
export class ProductVariant extends BaseEntity {
  
  @ManyToOne(() => Product)
  product!: Product;

  /** Display name, e.g. "Medium / White" */
  @Property()
  name!: string;

  @Enum(() => Size)
  size!: Size;

  /** Single colour value (hex or name) — e.g. "#FFFFFF" or "White" */
  @Property({ nullable: true })
  color?: string;

  @Property({ default: 0 })
  stock: number = 0;

  /**
   * Price difference from the product base price in GHS.
   * Can be negative (discount) or positive (premium).
   * e.g. +20 means this variant costs base + 20 GHS.
   */
  @Property({ columnType: 'decimal', precision: 10, scale: 2, default: 0 })
  priceDiff: number = 0;

  /** CDN URLs for variant-specific images (optional — falls back to product images) */
  @Property({ columnType: 'jsonb', nullable: true })
  images?: string[];

  @Property({ default: true })
  isActive?: boolean = true;

  /** Maps to frontend Variant type */
  toDto() {
    return {
      id: this.id,
      name: this.name,
      size: this.size,
      color: this.color,
      stock: this.stock,
      priceDiff: Number(this.priceDiff),
    };
  }
}
