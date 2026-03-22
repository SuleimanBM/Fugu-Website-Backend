import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';

export interface AddVariantInput {
  price: number;
  sizeLabel?: string;
  sizeRange?: string;
  sleeved?: boolean;
  length?: string;
  customLength?: number;
  width?: number;
  pricePerYard?: number;
  images?: string[];
}

export interface UpdateVariantInput {
  price?: number;
  sizeLabel?: string;
  sizeRange?: string;
  sleeved?: boolean;
  length?: string;
  images?: string[];
  isActive?: boolean;
}

@Injectable()
export class VariantService {
  constructor(private readonly em: EntityManager) {}

  async addVariant(productId: string, input: AddVariantInput) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const variant = this.em.create(ProductVariant, {
      product,
      price: input.price,
      sizeLabel: input.sizeLabel,
      sizeRange: input.sizeRange,
      sleeved: input.sleeved,
      length: input.length,
      customLength: input.customLength,
      width: input.width,
      pricePerYard: input.pricePerYard,
      images: input.images ?? [],
      variantLabel: ''
    });

    await this.em.flush();
    return variant.toDto();
  }

  async updateVariant(variantId: string, patch: UpdateVariantInput) {
    const variant = await this.em.findOne(ProductVariant, { id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');

    if (patch.price      !== undefined) variant.price      = patch.price;
    if (patch.sizeLabel  !== undefined) variant.sizeLabel  = patch.sizeLabel;
    if (patch.sizeRange  !== undefined) variant.sizeRange  = patch.sizeRange;
    if (patch.sleeved    !== undefined) variant.sleeved    = patch.sleeved;
    if (patch.length     !== undefined) variant.length     = patch.length;
    if (patch.images     !== undefined) variant.images     = patch.images;
    if (patch.isActive   !== undefined) variant.isActive   = patch.isActive;

    await this.em.flush();
    return variant.toDto();
  }

  async deleteVariant(variantId: string) {
    const variant = await this.em.findOne(ProductVariant, { id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.em.removeAndFlush(variant);
  }
}
