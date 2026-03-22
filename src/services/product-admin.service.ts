import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product, FuguGender } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { ProductType } from '../enums/productType.enum';
import { Pattern } from '../enums/pattern.enum';

export interface CreateProductInput {
  productType: string;
  pattern?: string;
  patternOther?: string;
  gender?: string;
  hatAddonPrice?: number;
  images?: string[];
  featured?: boolean;
  variants: VariantInput[];
}

export interface VariantInput {
  price: number;
  sizeLabel?: string;
  sizeRange?: string;
  sleeved?: boolean;
  length?: string;
  customLength?: number;
  width?: number;
  pricePerYard?: number;
  images?: []
}

export interface UpdateProductInput {
  pattern?: string;
  patternOther?: string;
  hatAddonPrice?: number;
  images?: string[];
  featured?: boolean;
  isActive?: boolean;
}

@Injectable()
export class ProductAdminService {
  constructor(private readonly em: EntityManager) {}

  async createProduct(input: CreateProductInput) {
    const product = this.em.create(Product, {
      productType: input.productType as ProductType,
      pattern: input.pattern as Pattern | undefined,
      patternOther: input.patternOther,
      gender: input.gender as FuguGender | undefined,
      hatAddonPrice: input.hatAddonPrice,
      images: input.images ?? [],
      featured: input.featured ?? false,
      slug: '__tmp__',
      isActive: true,
    });

    // Slug derived from auto-computed displayTitle
    product.slug =
      product.displayTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now();

    await this.em.flush();

    for (const v of input.variants) {
      this.em.create(ProductVariant, {
        product,
        price: v.price,
        sizeLabel: v.sizeLabel,
        sizeRange: v.sizeRange,
        sleeved: v.sleeved,
        length: v.length,
        customLength: v.customLength,
        width: v.width,
        pricePerYard: v.pricePerYard,
        images: v.images ?? []
      });
    }

    await this.em.flush();
    await this.em.populate(product, ['variants']);
    return product.toDto();
  }

  async updateProduct(productId: string, patch: UpdateProductInput) {
    const product = await this.em.findOne(
      Product,
      { id: productId },
      { populate: ['variants'] },
    );
    if (!product) throw new NotFoundException('Product not found');

    if (patch.pattern    !== undefined) product.pattern    = patch.pattern as Pattern;
    if (patch.patternOther !== undefined) product.patternOther = patch.patternOther;
    if (patch.hatAddonPrice !== undefined) product.hatAddonPrice = patch.hatAddonPrice;
    if (patch.images     !== undefined) product.images     = patch.images;
    if (patch.featured   !== undefined) product.featured   = patch.featured;
    if (patch.isActive   !== undefined) product.isActive   = patch.isActive;

    await this.em.flush();
    return product.toDto();
  }

  async deleteProduct(productId: string) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');
    product.deletedAt = new Date();
    await this.em.flush();
  }
}
