import {
  Cascade,
  Collection,
  Entity,
  Enum,
  OneToMany,
  OptionalProps,
  Property,
} from '@mikro-orm/core';
import { SoftDeleteEntity } from './softDelete.entity';
import { ProductVariant } from './productVariant.entity';
import { ProductRepository } from '../repositories/product.repository';
import { ProductType } from '../enums/productType.enum';
import { Pattern } from '../enums/pattern.enum';

export enum FuguGender {
  MALE   = 'male',
  FEMALE = 'female',
}

@Entity({ repository: () => ProductRepository })
export class Product extends SoftDeleteEntity {

  @Enum({items: () => ProductType, nullable: true})
  productType!: ProductType;

  @Enum({ items: () => Pattern, nullable: true })
  pattern?: Pattern;

  @Property({ nullable: true })
  patternOther?: string;

  @Enum({ items: () => FuguGender, nullable: true })
  gender?: FuguGender;

  @Property({ columnType: 'decimal', precision: 10, scale: 2, nullable: true })
  hatAddonPrice?: number;

  @Property({ unique: true })
  slug!: string;

  @Property({ columnType: 'jsonb', nullable: true })
  images: string[] = [];

  @Property({ default: false })
  featured: boolean = false;

  @Property({ default: true })
  isActive?: boolean = true;

  @OneToMany(() => ProductVariant, v => v.product, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  variants = new Collection<ProductVariant>(this);

  get displayTitle(): string {
    const patternLabel =
      this.pattern === Pattern.OTHER
        ? (this.patternOther ?? 'Custom')
        : this.pattern === Pattern.CHECK_CHECK
        ? 'Check-Check'
        : this.pattern === Pattern.STRIPE
        ? 'Stripe'
        : '';

    switch (this.productType) {
      case ProductType.FUGU:
        return this.gender === FuguGender.FEMALE
          ? `${patternLabel} Fugu — Women's`.trim()
          : `${patternLabel} Fugu — Men's`.trim();
      case ProductType.CLOTH:
        return patternLabel ? `${patternLabel} Fugu Cloth` : 'Fugu Cloth';
      case ProductType.ACCESSORY:
        return 'Fugu Hat';
      default:
        return 'Fugu Product';
    }
  }

  toDto() {
    return {
      id:            this.id,
      slug:          this.slug,
      productType:   this.productType,
      pattern:       this.pattern,
      patternOther:  this.patternOther,
      gender:        this.gender,
      hatAddonPrice: this.hatAddonPrice != null ? Number(this.hatAddonPrice) : null,
      displayTitle:  this.displayTitle,
      images:        this.images ?? [],
      featured:      this.featured,
      isActive:      this.isActive,
      variants:      this.variants.isInitialized()
        ? this.variants.getItems().filter(v => v.isActive).map(v => v.toDto())
        : [],
      createdAt: this.createdAt.toISOString(),
    };
  }
}
