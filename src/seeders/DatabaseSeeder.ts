import type { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { Size } from '../enums/sizes.enum';

const CATEGORIES = [
  { name: 'Men', slug: 'men' },
  { name: 'Women', slug: 'women' },
  { name: 'Kids', slug: 'kids' },
  { name: 'Traditional', slug: 'traditional' },
  { name: 'Modern', slug: 'modern' },
];

const PRODUCTS = [
  {
    title: 'Classic Fugu Smock',
    description:
      'A timeless hand-woven Ghanaian smock in the traditional northern style. Made from 100% strip-woven cotton with geometric embroidery at the collar.',
    price: 250,
    categories: ['Men', 'Traditional'],
    featured: true,
    images: [
      'https://placehold.co/800x800/2d2d2d/ffffff?text=Classic+Fugu',
      'https://placehold.co/800x800/3d3d3d/ffffff?text=Classic+Fugu+2',
    ],
    variants: [
      { name: 'Small / White', size: Size.SMALL, color: '#FFFFFF', stock: 10 },
      { name: 'Medium / White', size: Size.MEDIUM, color: '#FFFFFF', stock: 15 },
      { name: 'Large / White', size: Size.LARGE, color: '#FFFFFF', stock: 12 },
      { name: 'Medium / Black', size: Size.MEDIUM, color: '#1a1a1a', stock: 8 },
      { name: 'Large / Black', size: Size.LARGE, color: '#1a1a1a', stock: 6 },
    ],
  },
  {
    title: 'Embroidered Ceremonial Smock',
    description:
      'An elaborate smock featuring intricate hand-embroidery, traditionally worn at festivals, funerals, and chieftaincy ceremonies.',
    price: 420,
    categories: ['Men', 'Traditional'],
    featured: true,
    images: [
      'https://placehold.co/800x800/4a3728/ffffff?text=Ceremonial+Smock',
    ],
    variants: [
      { name: 'Medium / Brown', size: Size.MEDIUM, color: '#8B6347', stock: 5 },
      { name: 'Large / Brown', size: Size.LARGE, color: '#8B6347', stock: 4 },
      { name: 'XL / Brown', size: Size.XTRA_LARGE, color: '#8B6347', stock: 3 },
    ],
  },
  {
    title: "Women's Peplum Fugu Top",
    description:
      'A contemporary peplum silhouette crafted from authentic strip-woven smock fabric. Pairs beautifully with trousers or a skirt.',
    price: 180,
    categories: ['Women', 'Modern'],
    featured: false,
    images: [
      'https://placehold.co/800x800/c9a96e/ffffff?text=Peplum+Top',
    ],
    variants: [
      { name: 'Small / Multicolour', size: Size.SMALL, color: '#c9a96e', stock: 7 },
      { name: 'Medium / Multicolour', size: Size.MEDIUM, color: '#c9a96e', stock: 9 },
    ],
  },
  {
    title: 'Short-Sleeve Casual Smock',
    description:
      'A lighter, hip-length smock perfect for everyday wear. Short sleeves and a relaxed cut make it easy to style.',
    price: 160,
    categories: ['Men', 'Modern'],
    featured: true,
    images: [
      'https://placehold.co/800x800/556b2f/ffffff?text=Casual+Smock',
    ],
    variants: [
      { name: 'Small / Green', size: Size.SMALL, color: '#556b2f', stock: 12 },
      { name: 'Medium / Green', size: Size.MEDIUM, color: '#556b2f', stock: 14 },
      { name: 'Large / Green', size: Size.LARGE, color: '#556b2f', stock: 10 },
    ],
  },
];

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Seed categories
    const categoryMap = new Map<string, Category>();
    for (const c of CATEGORIES) {
      const existing = await em.findOne(Category, { slug: c.slug });
      if (!existing) {
        const cat = em.create(Category, c);
        categoryMap.set(c.name, cat);
      } else {
        categoryMap.set(c.name, existing);
      }
    }
    await em.flush();

    // Seed products
    for (const p of PRODUCTS) {
      const existing = await em.findOne(Product, {
        slug: p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      });
      if (existing) continue;

      const slug = p.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      const product = em.create(Product, {
        title: p.title,
        description: p.description,
        price: p.price,
        slug,
        images: p.images,
        categories: p.categories,
        featured: p.featured,
      });

      for (const v of p.variants) {
        em.create(ProductVariant, {
          product,
          ...v,
          priceDiff: 0,
        });
      }
    }

    await em.flush();
    console.log('✓ Database seeded successfully');
  }
}
