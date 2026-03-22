import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cartItem.entity';
import { ProductVariant } from '../entities/productVariant.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { CartRepository } from '../repositories/cart.repository';
import { InjectRepository } from '@mikro-orm/nestjs';

export interface AddItemInput {
  productId:     string;
  variantId:     string;
  quantity:      number;
  withHat?:      boolean;
  customLength?: number;
  customWidth?:  number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Cart)
    private readonly cartRepo: CartRepository,
  ) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  private async getOrCreate(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findActiveByUser(userId);
    if (!cart) {
      this.em.create(Cart, { user: this.em.getReference(User, userId) });
      await this.em.flush();
      cart = (await this.cartRepo.findActiveByUser(userId)) as any;
    }
    return cart as unknown as Cart;
  }

  private serialise(cart: Cart) {
    return {
      items: cart.items.isInitialized()
        ? cart.items.getItems().map(i => i.toDto())
        : [],
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async getCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    return this.serialise(cart);
  }

  async addItem(userId: string, input: AddItemInput) {
    if (!input.variantId?.trim()) {
      throw new BadRequestException('A size must be selected before adding to cart');
    }
    if (input.quantity <= 0) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    return this.em.transactional(async em => {
      const cart = await this.getOrCreate(userId);

      const cartInTx = await em.findOne(
        Cart,
        { id: cart.id },
        { populate: ['items', 'items.variant', 'items.variant.product'] },
      );
      if (!cartInTx) throw new BadRequestException('Cart not found');

      const variant = await em.findOne(
        ProductVariant,
        { id: input.variantId },
        { populate: ['product'] },
      );
      if (!variant || !variant.isActive) {
        throw new BadRequestException('Selected variant is not available');
      }

      const product = variant.product as Product;

      // Price = variant price + hat add-on if requested
      const hatPrice =
        input.withHat && product.hatAddonPrice ? Number(product.hatAddonPrice) : 0;
      const priceAtAdd = Number(variant.price) + hatPrice;

      // If identical item already in cart, increment quantity
      const existing = cartInTx.items.getItems().find(
        i =>
          i.id === input.variantId &&
          i.withHat === (input.withHat ?? false),
      );

      if (existing) {
        existing.quantity += input.quantity;
      } else {
        em.create(CartItem, {
          cart:         cartInTx,
          variant,
          productId:    product.id,
          quantity:     input.quantity,
          priceAtAdd,
          withHat:      input.withHat      ?? false,
          customLength: input.customLength,
          customWidth:  input.customWidth,
        });
      }

      await em.flush();

      const fresh = await em.findOne(
        Cart,
        { id: cartInTx.id },
        { populate: ['items', 'items.variant'] },
      );
      return {
        items: (fresh?.items.getItems() ?? []).map(i => i.toDto()),
      };
    });
  }

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
      item.quantity = quantity;
    }

    await this.em.flush();
    const fresh = await this.cartRepo.findActiveByUser(userId);
    return this.serialise(fresh!);
  }

  async removeItem(userId: string, itemId: string) {
    return this.updateItem(userId, itemId, 0);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    for (const item of cart.items.getItems()) {
      this.em.remove(item);
    }
    await this.em.flush();
    return { items: [] };
  }

  async validateForCheckout(userId: string): Promise<Cart> {
    const cart = await this.cartRepo.findActiveByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    return cart;
  }

  async deactivate(cart: Cart) {
    cart.isActive = false;
    await this.em.flush();
  }
}
