import { Entity, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity, BaseOptionalProps } from './base.entity';
import { Product } from './product.entity';

@Entity()
export class ProductVariant extends BaseEntity {

  [OptionalProps]?: BaseOptionalProps;

  @ManyToOne(() => Product)
  product!: Product;

  /** Direct price in GHS — no base price + priceDiff arithmetic */
  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  price!: number;

  // ── Male fugu ────────────────────────────────────────────────────────────

  /** S, M, L, XL, or numeric: 38, 40, 42 etc. */
  @Property({ nullable: true })
  sizeLabel?: string;

  /** Chest/body range e.g. "36-38", "39-41" — shown alongside label */
  @Property({ nullable: true })
  sizeRange?: string;

  /** true = sleeved, false = sleeveless, null = not applicable */
  @Property({ nullable: true })
  sleeved?: boolean;

  // ── Female fugu ──────────────────────────────────────────────────────────

  /** short | medium | long | custom */
  @Property({ nullable: true })
  length?: string;

  /** cm — only when length = 'custom' */
  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customLength?: number;

  /** cm — optional width for female fugu */
  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  width?: number;

  // ── Cloth ────────────────────────────────────────────────────────────────

  /** Cloth only — price per yard (also stored in price for uniformity) */
  @Property({ columnType: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerYard?: number;

  // ── Common ───────────────────────────────────────────────────────────────

  /** Pre-order — always 9999 */
  @Property({ default: 9999 })
  stock?: number = 9999;

  @Property({ columnType: 'jsonb', nullable: true })
  images?: string[] = [];

  @Property({ default: true })
  isActive?: boolean = true;

  get variantLabel(): string {
    if (this.sizeLabel) {
      const range  = this.sizeRange ? ` (${this.sizeRange})` : '';
      const sleeve =
        this.sleeved === true  ? ' · Sleeved' :
        this.sleeved === false ? ' · Sleeveless' : '';
      return `${this.sizeLabel}${range}${sleeve}`;
    }
    if (this.length) {
      if (this.length === 'custom') {
        const parts = ['Custom'];
        if (this.customLength) parts.push(`${this.customLength}cm`);
        if (this.width)        parts.push(`× ${this.width}cm`);
        return parts.join(' ');
      }
      return this.length.charAt(0).toUpperCase() + this.length.slice(1);
    }
    if (this.pricePerYard) return 'Per Yard';
    return 'Standard';
  }

  toDto() {
    return {
      id:           this.id,
      price:        Number(this.price),
      sizeLabel:    this.sizeLabel,
      sizeRange:    this.sizeRange,
      sleeved:      this.sleeved,
      length:       this.length,
      customLength: this.customLength != null ? Number(this.customLength) : null,
      width:        this.width != null ? Number(this.width) : null,
      pricePerYard: this.pricePerYard != null ? Number(this.pricePerYard) : null,
      stock:        this.stock,
      images:       this.images ?? [],
      isActive:     this.isActive,
      variantLabel: this.variantLabel,
    };
  }
}
