import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cartItem.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { User } from '../entities/user.entity';
import { CartRepository } from '../repositories/cart.repository';
import { InjectRepository } from '@mikro-orm/nestjs';

@Injectable()
export class CartService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Cart)
    private readonly cartRepo: CartRepository,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async getOrCreate(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findActiveByUser(userId);
    if (!cart) {
      this.em.create(Cart, {
        user: this.em.getReference(User, userId),
      });
      await this.em.flush();
      // Reload with relations
      cart = (await this.cartRepo.findActiveByUser(userId)) as any;
    }
    return cart as unknown as Cart;
  }

  /** Serialise cart into the shape the frontend expects: { items: CartItem[] } */
  private serialise(cart: Cart) {
    return {
      items: cart.items.isInitialized()
        ? cart.items.getItems().map(i => i.toDto())
        : [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /** GET /api/cart → { items: CartItem[] } */
  async getCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    return this.serialise(cart);
  }

  /** POST /api/cart/items  { product_id, variant_id, quantity } */
  async addItem(
    userId: string,
    productId: string,
    variantId: string,
    quantity: number,
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be ≥ 1');

    return this.em.transactional(async em => {
      const cart = await this.getOrCreate(userId);

      const variant = await em.findOne(
        ProductVariant,
        { id: variantId },
        { populate: ['product'] },
      );
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.stock < quantity)
        throw new BadRequestException('Insufficient stock');

      // Check if this variant is already in the cart
      const existing = cart.items.isInitialized()
        ? cart.items.getItems().find(i => i.variant.id === variantId)
        : null;

      if (existing) {
        existing.quantity += quantity;
      } else {
        const price =
          Number((variant.product as any).price ?? 0) +
          Number(variant.priceDiff ?? 0);

        em.create(CartItem, {
          cart,
          variant,
          productId,
          quantity,
          priceAtAdd: price,
        });
      }

      await em.flush();

      // Reload and return fresh cart
      const fresh = await this.cartRepo.findActiveByUser(userId);
      return this.serialise(fresh!);
    });
  }

  /** PATCH /api/cart/items/:itemId  { quantity } */
  async updateItem(userId: string, itemId: string, quantity: number) {
    if (quantity < 0) throw new BadRequestException('Invalid quantity');

    const cart = await this.getOrCreate(userId);
    const item = cart.items.isInitialized()
      ? cart.items.getItems().find(i => i.id === itemId)
      : null;

    if (!item) throw new NotFoundException('Item not found in cart');

    if (quantity === 0) {
      this.em.remove(item);
    } else {
      if (item.variant.stock < quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      item.quantity = quantity;
    }

    await this.em.flush();
    const fresh = await this.cartRepo.findActiveByUser(userId);
    return this.serialise(fresh!);
  }

  /** DELETE /api/cart/items/:itemId */
  async removeItem(userId: string, itemId: string) {
    return this.updateItem(userId, itemId, 0);
  }

  /** DELETE /api/cart */
  async clearCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    for (const item of cart.items.getItems()) {
      this.em.remove(item);
    }
    await this.em.flush();
    return { items: [] };
  }

  /** Used by checkout — validates stock and returns cart entity */
  async validateForCheckout(userId: string): Promise<Cart> {
    const cart = await this.cartRepo.findActiveByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items.getItems()) {
      if (item.variant.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for variant ${item.variant.id}`,
        );
      }
    }

    return cart;
  }

  async deactivate(cart: Cart) {
    cart.isActive = false;
    await this.em.flush();
  }
}
