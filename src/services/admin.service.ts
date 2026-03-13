import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryOrder, raw } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
// import {
//   PutObjectCommand,
//   GetObjectCommand,
// } from '@aws-sdk/client-s3';
//import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { uuidv7 } from 'uuidv7';
//import { s3Client } from '../msic/s3Client';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { Category } from '../entities/category.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/orderItem.entity';
import { FulfillmentStatus } from '../enums/fulfillmentStatus.enum';
import { Size } from '../enums/sizes.enum';
import { cloudinary } from '../msic/cloudinary';

import { Express } from 'express';

type MulterFile = Express.Multer.File;

@Injectable()
export class AdminService {
  constructor(private readonly em: EntityManager) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [totalOrders, totalSalesResult, totalCustomers] = await Promise.all([
      this.em.count(Order),
      this.em
        .createQueryBuilder(Order, 'o')
        .select(raw('COALESCE(SUM(o.total), 0) as total'))
        .execute('get'),
      this.em.count(Order, {}, { groupBy: ['user'] }),
    ]);

    const totalRevenue = Number((totalSalesResult as any)?.total ?? 0);
    const averageOrderValue =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const recentOrders = await this.em.find(
      Order,
      {},
      {
        populate: ['user', 'items'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: 5,
      },
    );

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      recentOrders: recentOrders.map(o => o.toDto()),
    };
  }

  // ── IMAGE UPLOADS ─────────────────────────────────────────────────────────

  /**
   * POST /api/uploads/product-images (multipart/form-data, field: "images")
   * Returns { urls: string[] } of permanent CDN / public S3 URLs.
   *
   * If S3 is not configured, returns empty array gracefully.
   */
  // async uploadProductImages(files: MulterFile[]): Promise<{ urls: string[] }> {
  //   if (!process.env.AWS_S3_BUCKET) {
  //     // Dev mode — return placeholder URLs so the frontend still works
  //     return {
  //       urls: files.map(
  //         (_, i) =>
  //           `https://placehold.co/800x800/2d2d2d/ffffff?text=Product+Image+${i + 1}`,
  //       ),
  //     };
  //   }

  //   const urls = await Promise.all(
  //     files.map(async file => {
  //       const ext = file.mimetype.split('/')[1] ?? 'jpg';
  //       const key = `products/${uuidv7()}.${ext}`;

  //       await s3Client.send(
  //         new PutObjectCommand({
  //           Bucket: process.env.AWS_S3_BUCKET!,
  //           Key: key,
  //           Body: file.buffer,
  //           ContentType: file.mimetype,
  //         }),
  //       );

  //       // Return a public URL (assumes bucket has public read or CloudFront in front)
  //       return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
  //     }),
  //   );

  //   return { urls };
  // }

  async uploadProductImages(files: MulterFile[]): Promise<{ urls: string[] }> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Dev fallback — no Cloudinary configured
      return {
        urls: files.map(
          (_, i) =>
            `https://placehold.co/800x800/2d2d2d/ffffff?text=Product+Image+${i + 1}`,
        ),
      };
    }

    const urls = await Promise.all(
      files.map(
        file =>
          new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'fugu-threads/products',
                resource_type: 'image',
                transformation: [
                  { width: 1200, height: 1200, crop: 'limit' },
                  { quality: 'auto', fetch_format: 'auto' },
                ],
              },
              (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
              },
            );
            stream.end(file.buffer);
          }),
      ),
    );

    return { urls };
  }

  /** Generate presigned upload URLs for direct browser → S3 uploads */
  // async generatePresignedUrls(fileTypes: string[], folder: string) {
  //   return Promise.all(
  //     fileTypes.map(async fileType => {
  //       const ext = fileType.split('/')[1];
  //       const fileKey = `${folder}/${uuidv7()}.${ext}`;
  //       const uploadUrl = await getSignedUrl(
  //         s3Client,
  //         new PutObjectCommand({
  //           Bucket: process.env.AWS_S3_BUCKET!,
  //           Key: fileKey,
  //           ContentType: fileType,
  //         }),
  //         { expiresIn: 300 },
  //       );
  //       return { uploadUrl, fileKey, fileType };
  //     }),
  //   );
  // }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────

  async createProduct(input: {
    title: string;
    description: string;
    price: number;
    images?: string[];
    categories?: string[];
    featured?: boolean;
    categoryId?: string;
  }) {
    const slug = input.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Resolve categories
    let categoryNames = input.categories ?? [];
    if (input.categoryId) {
      const cat = await this.em.findOne(Category, { id: input.categoryId });
      if (cat && !categoryNames.includes(cat.name)) {
        categoryNames = [cat.name, ...categoryNames];
      }
    }

    const product = this.em.create(Product, {
      title: input.title,
      description: input.description,
      price: input.price,
      slug,
      images: input.images ?? [],
      categories: categoryNames,
      featured: input.featured ?? false,
    });

    await this.em.flush();
    return product.toDto();
  }

  async updateProduct(
    productId: string,
    patch: Partial<{
      title: string;
      description: string;
      price: number;
      images: string[];
      categories: string[];
      featured: boolean;
      isActive: boolean;
    }>,
  ) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');
    this.em.assign(product, patch);
    await this.em.flush();
    return product.toDto(product.variants.isInitialized() ? product.variants.getItems() : []);
  }

  async deleteProduct(productId: string) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');
    product.deletedAt = new Date();
    await this.em.flush();
  }

  // ── VARIANTS ──────────────────────────────────────────────────────────────

  async addVariant(
    productId: string,
    input: {
      name: string;
      size: Size;
      color?: string;
      stock: number;
      priceDiff?: number;
      images?: string[];
    },
  ) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.em.findOne(ProductVariant, {
      product: productId,
      size: input.size,
      color: input.color ?? null,
    });
    if (existing) {
      throw new BadRequestException(
        'A variant with this size and colour already exists',
      );
    }

    const variant = this.em.create(ProductVariant, {
      product,
      name: input.name,
      size: input.size,
      color: input.color,
      stock: input.stock,
      priceDiff: input.priceDiff ?? 0,
      images: input.images,
    });

    await this.em.flush();
    return variant.toDto();
  }

  async updateVariant(
    variantId: string,
    patch: Partial<{
      name: string;
      stock: number;
      priceDiff: number;
      images: string[];
      isActive: boolean;
    }>,
  ) {
    const variant = await this.em.findOne(ProductVariant, { id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    this.em.assign(variant, patch);
    await this.em.flush();
    return variant.toDto();
  }

  async deleteVariant(variantId: string) {
    const variant = await this.em.findOne(ProductVariant, { id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.em.removeAndFlush(variant);
  }

  async adjustStock(variantId: string, delta: number) {
    const variant = await this.em.findOne(ProductVariant, { id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    const next = variant.stock + delta;
    if (next < 0) throw new BadRequestException('Insufficient stock');
    variant.stock = next;
    await this.em.flush();
    return variant.toDto();
  }

  // ── CATEGORIES ────────────────────────────────────────────────────────────

  async listCategories() {
    const cats = await this.em.find(Category, { deletedAt: null });
    return cats.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
  }

  async createCategory(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const existing = await this.em.findOne(Category, { slug });
    if (existing) throw new BadRequestException('Category already exists');
    const cat = this.em.create(Category, { name, slug });
    await this.em.flush();
    return cat;
  }

  // ── ORDER MANAGEMENT ──────────────────────────────────────────────────────

  /**
   * PATCH /api/admin/orders/:orderId
   * Updates fulfillment_status and/or payment_status.
   */
  async updateOrder(
    orderId: string,
    patch: {
      fulfillment_status?: FulfillmentStatus;
      payment_status?: string;
    },
  ) {
    const order = await this.em.findOne(Order, { id: orderId });
    if (!order) throw new NotFoundException('Order not found');

    if (patch.fulfillment_status)
      order.fulfillmentStatus = patch.fulfillment_status;
    if (patch.payment_status)
      order.paymentStatus = patch.payment_status as any;

    await this.em.flush();
    return order.toDto();
  }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  async salesOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.em
      .createQueryBuilder(Order, 'o')
      .select([
        raw('DATE(o.created_at) as date'),
        raw('SUM(o.total) as revenue'),
        raw('COUNT(*) as orders'),
      ])
      .where({ createdAt: { $gte: since } })
      .groupBy(raw('DATE(o.created_at)'))
      .orderBy({ [raw('DATE(o.created_at)')]: 'ASC' })
      .execute();
  }

  async topSellingProducts(limit = 5) {
    return this.em
      .createQueryBuilder(OrderItem, 'oi')
      .select([
        'oi.product_title',
        raw('SUM(oi.quantity) as units_sold'),
        raw('SUM(oi.quantity * oi.price_at_add) as revenue'),
      ])
      .groupBy('oi.product_title')
      .orderBy({ [raw('revenue')]: 'DESC' })
      .limit(limit)
      .execute();
  }

  async lowStockVariants(threshold = 5) {
    const variants = await this.em.find(
      ProductVariant,
      { stock: { $lte: threshold }, isActive: true },
      { populate: ['product'], orderBy: { stock: QueryOrder.ASC } },
    );
    return variants.map(v => ({
      ...v.toDto(),
      productTitle: (v.product as any)?.title,
    }));
  }
}
