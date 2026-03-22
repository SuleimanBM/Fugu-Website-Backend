import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Product, FuguGender } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { ProductType } from '../enums/productType.enum';
import { Pattern } from '../enums/pattern.enum';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Clear existing products for clean seed
    await em.nativeDelete(ProductVariant, {});
    await em.nativeDelete(Product, {});

    const products: {
      productType: ProductType;
      pattern: Pattern;
      patternOther?: string;
      gender?: FuguGender;
      hatAddonPrice?: number;
      images: string[];
      featured: boolean;
      slug: string;
      variants: {
        price: number;
        sizeLabel?: string;
        sizeRange?: string;
        sleeved?: boolean;
        length?: string;
        customLength?: number;
        pricePerYard?: number;
      }[];
    }[] = [
      // ── Male Fugus ────────────────────────────────────────────────────
      {
        productType:   ProductType.FUGU,
        pattern:       Pattern.STRIPE,
        gender:        FuguGender.MALE,
        hatAddonPrice: 50,
        featured:      true,
        slug:          'stripe-fugu-mens-seed',
        images:        ['https://placehold.co/800x800/2d2d2d/ffffff?text=Stripe+Fugu'],
        variants: [
          { price: 220, sizeLabel: 'S',  sizeRange: '34-36', sleeved: true  },
          { price: 190, sizeLabel: 'S',  sizeRange: '34-36', sleeved: false },
          { price: 240, sizeLabel: 'M',  sizeRange: '37-39', sleeved: true  },
          { price: 210, sizeLabel: 'M',  sizeRange: '37-39', sleeved: false },
          { price: 260, sizeLabel: 'L',  sizeRange: '40-42', sleeved: true  },
          { price: 230, sizeLabel: 'L',  sizeRange: '40-42', sleeved: false },
          { price: 280, sizeLabel: 'XL', sizeRange: '43-45', sleeved: true  },
          { price: 250, sizeLabel: 'XL', sizeRange: '43-45', sleeved: false },
          { price: 265, sizeLabel: '38', sizeRange: '38',    sleeved: true  },
          { price: 235, sizeLabel: '38', sizeRange: '38',    sleeved: false },
          { price: 275, sizeLabel: '40', sizeRange: '40',    sleeved: true  },
          { price: 245, sizeLabel: '40', sizeRange: '40',    sleeved: false },
        ],
      },
      {
        productType:   ProductType.FUGU,
        pattern:       Pattern.CHECK_CHECK,
        gender:        FuguGender.MALE,
        hatAddonPrice: 50,
        featured:      true,
        slug:          'check-check-fugu-mens-seed',
        images:        ['https://placehold.co/800x800/1a1a2e/ffffff?text=Check-Check+Fugu'],
        variants: [
          { price: 250, sizeLabel: 'S',  sizeRange: '34-36', sleeved: true  },
          { price: 220, sizeLabel: 'S',  sizeRange: '34-36', sleeved: false },
          { price: 270, sizeLabel: 'M',  sizeRange: '37-39', sleeved: true  },
          { price: 240, sizeLabel: 'M',  sizeRange: '37-39', sleeved: false },
          { price: 290, sizeLabel: 'L',  sizeRange: '40-42', sleeved: true  },
          { price: 260, sizeLabel: 'L',  sizeRange: '40-42', sleeved: false },
          { price: 310, sizeLabel: 'XL', sizeRange: '43-45', sleeved: true  },
          { price: 280, sizeLabel: 'XL', sizeRange: '43-45', sleeved: false },
        ],
      },

      // ── Female Fugus ──────────────────────────────────────────────────
      {
        productType:   ProductType.FUGU,
        pattern:       Pattern.STRIPE,
        gender:        FuguGender.FEMALE,
        hatAddonPrice: 50,
        featured:      false,
        slug:          'stripe-fugu-womens-seed',
        images:        ['https://placehold.co/800x800/8b4513/ffffff?text=Stripe+Women'],
        variants: [
          { price: 200, length: 'short'  },
          { price: 230, length: 'medium' },
          { price: 260, length: 'long'   },
          { price: 280, length: 'custom' },
        ],
      },
      {
        productType:   ProductType.FUGU,
        pattern:       Pattern.CHECK_CHECK,
        gender:        FuguGender.FEMALE,
        featured:      false,
        slug:          'check-check-fugu-womens-seed',
        images:        ['https://placehold.co/800x800/2f4f4f/ffffff?text=Check+Women'],
        variants: [
          { price: 220, length: 'short'  },
          { price: 250, length: 'medium' },
          { price: 280, length: 'long'   },
          { price: 300, length: 'custom' },
        ],
      },

      // ── Cloth ─────────────────────────────────────────────────────────
      {
        productType: ProductType.CLOTH,
        pattern:     Pattern.STRIPE,
        featured:    false,
        slug:        'stripe-cloth-seed',
        images:      ['https://placehold.co/800x800/d2691e/ffffff?text=Stripe+Cloth'],
        variants: [
          { price: 45, pricePerYard: 45 },
        ],
      },
      {
        productType: ProductType.CLOTH,
        pattern:     Pattern.CHECK_CHECK,
        featured:    false,
        slug:        'check-check-cloth-seed',
        images:      ['https://placehold.co/800x800/556b2f/ffffff?text=Check+Cloth'],
        variants: [
          { price: 55, pricePerYard: 55 },
        ],
      },

      // ── Accessory ─────────────────────────────────────────────────────
      {
        productType: ProductType.ACCESSORY,
        pattern:     Pattern.STRIPE,
        featured:    false,
        slug:        'fugu-hat-seed',
        images:      ['https://placehold.co/800x800/4a4a4a/ffffff?text=Fugu+Hat'],
        variants: [
          { price: 80 },
        ],
      },
    ];

    for (const p of products) {
      const product = em.create(Product, {
        productType:   p.productType,
        pattern:       p.pattern,
        patternOther:  p.patternOther,
        gender:        p.gender,
        hatAddonPrice: p.hatAddonPrice,
        images:        p.images,
        featured:      p.featured,
        slug:          p.slug,
      });

      for (const v of p.variants) {
        em.create(ProductVariant, {
          product,
          price:        v.price,
          sizeLabel:    v.sizeLabel,
          sizeRange:    v.sizeRange,
          sleeved:      v.sleeved,
          length:       v.length,
          customLength: v.customLength,
          pricePerYard: v.pricePerYard,
        });
      }
    }

    await em.flush();
    console.log('✅ Seeded products with new schema');
  }
}
