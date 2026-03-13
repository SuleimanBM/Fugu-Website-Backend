import { Entity, OptionalProps, Property, OneToMany, Collection, Index } from '@mikro-orm/core';
import { SoftDeleteEntity } from './softDelete.entity';
import { ProductVariant } from './productVariant.entity';
import { ProductRepository } from '../repositories/product.repository';

@Index({ name: 'product_fulltext_idx', properties: ['title', 'description'], type: 'fulltext' })
@Entity({ repository: () => ProductRepository })
export class Product extends SoftDeleteEntity {
 
  @Property()
  title!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ columnType: 'text' })
  description!: string;

  /** Base price in GHS — the price shown on the product card */
  @Property({ columnType: 'decimal', precision: 10, scale: 2 })
  price!: number;

  /** Currency is always GHS for this store */
  @Property({ default: 'GHS' })
  currency?: string = 'GHS';

  /**
   * Product-level images (CDN URLs). Each variant may also have its own images.
   * The first image is used as the card thumbnail.
   */
  @Property({ columnType: 'jsonb', nullable: true })
  images: string[] = [];

  /**
   * Category names as a string array. Stored denormalized for fast filtering.
   * Example: ['Smock', 'Traditional', 'Men']
   */
  @Property({ columnType: 'jsonb', nullable: true })
  categories: string[] = [];

  @Property({ default: false })
  featured: boolean = false;

  @Property({ default: true })
  isActive?: boolean = true;

  @OneToMany(() => ProductVariant, v => v.product, { orphanRemoval: true })
  variants = new Collection<ProductVariant>(this);

  /** Maps to frontend Product type */
  toDto(variants?: ProductVariant[]) {
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      price: Number(this.price),
      currency: 'GHS' as const,
      images: this.images ?? [],
      categories: this.categories ?? [],
      featured: this.featured,
      variants: (variants ?? this.variants.getItems()).map(v => v.toDto()),
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt?.toISOString(),
    };
  }
}
