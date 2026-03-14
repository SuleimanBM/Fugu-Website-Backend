import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order, PaymentStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/orderItem.entity';
import { Cart } from '../entities/cart.entity';
import { User } from '../entities/user.entity';
import { OrderRepository } from '../repositories/order.repository';
import { CartService } from './cart.service';
import { PaymentService } from './payment.service';
import { EmailService } from './email.service';
import { FulfillmentStatus } from '../enums/fulfillmentStatus.enum';
import { InjectRepository } from '@mikro-orm/nestjs';

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Order)
    private readonly orderRepo: OrderRepository,
    private readonly cartService: CartService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService,
  ) { }

  /** GET /api/orders/me */
  async listUserOrders(userId: string) {
    const orders = await this.orderRepo.findByUser(userId);
    return orders.map(o => o.toDto());
  }

  /** GET /api/orders/:id — user can only see their own orders */
  async getOrder(orderId: string, userId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.id !== userId) throw new NotFoundException('Order not found');
    return order.toDto();
  }

  /**
   * POST /api/checkout/transaction
   *
   * 1. Validate cart
   * 2. Create Order record (status = pending)
   * 3. Decrement stock
   * 4. Deactivate cart
   * 5. Return order (frontend then initiates payment separately)
   */
  async createFromCart(userId: string, shippingAddress: ShippingAddressInput) {
    const cart = await this.cartService.validateForCheckout(userId);

    return this.em.transactional(async em => {
      const user = await em.findOne(User, { id: userId });
      if (!user) throw new BadRequestException('User not found');

      // Reload the cart inside the transaction's forked EM so the items
      // collection is fully populated in this EM's identity map.
      // Using the cart loaded by the outer this.em won't work here because
      // em.transactional() forks a new EntityManager context.
      const cartInTx = await em.findOne(
        Cart,
        { user: userId, isActive: true },
        { populate: ['items', 'items.variant', 'items.variant.product'] },
      );
      if (!cartInTx || cartInTx.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const items = cartInTx.items.getItems();
      let subtotal = 0;

      const order = em.create(Order, {
        user,
        shippingAddress,
        subtotal: 0, // will update after items
        tax: 0,
        shipping: 0,
        total: 0,
      });

      // Flush to get order.id before creating items
      await em.flush();

      for (const ci of items) {
        const lineTotal = ci.priceAtAdd * ci.quantity;
        subtotal += lineTotal;

        em.create(OrderItem, {
          order,
          productId: ci.productId,
          variantId: ci.variant.id,
          quantity: ci.quantity,
          priceAtAdd: ci.priceAtAdd,
          productTitle: (ci.variant.product as any)?.title ?? '',
          variantName: ci.variant.name,
        });

        // Decrement stock
        ci.variant.stock -= ci.quantity;
      }

      const tax = 0;
      const shipping = 0;
      const total = subtotal + tax + shipping;

      order.subtotal = subtotal;
      order.tax = tax;
      order.shipping = shipping;
      order.total = total;

      await em.flush();
      await this.cartService.deactivate(cart);
      console.log(order.toDto())
      return order.toDto();
    });
  }

  /**
   * POST /api/checkout/initiate
   *
   * Hits Paystack to get an authorization_url. Called after order creation.
   */
  async initiatePayment(orderId: string, userId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.id !== userId) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const user = await this.em.findOne(User, { id: userId });

    const data = await this.paymentService.initialize({
      orderId: order.id,
      email: user!.email,
      amount: order.total,
    });

    return { authorization_url: data.authorization_url };
  }

  /**
   * POST /api/paystack/verify
   *
   * Frontend calls this after the Paystack redirect with the reference.
   * Marks the order as paid and fires the confirmation email.
   */
  async verifyPayment(reference: string, userId: string) {
    const data = await this.paymentService.verify(reference);

    if (data.status !== 'success') {
      throw new BadRequestException('Payment was not successful');
    }

    const orderId = data.metadata?.orderId;
    if (!orderId) throw new BadRequestException('Missing orderId in payment metadata');

    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.id !== userId) throw new NotFoundException('Order not found');

    order.paymentStatus = PaymentStatus.PAID;
    order.paymentReference = reference;
    await this.em.flush();

    // Send confirmation email (fire and forget)
    const user = await this.em.findOne(User, { id: userId });
    if (user) {
      this.emailService
        .sendOrderConfirmation(user.email, {
          name: user.name,
          orderId: order.id,
          orderTotal: `GHS ${order.total.toFixed(2)}`,
          items: order.items.isInitialized()
            ? order.items.getItems().map(i => ({
              title: i.productTitle,
              qty: i.quantity,
              price: Number(i.priceAtAdd),
            }))
            : [],
          orderLink: `${process.env.APP_URL}/account/orders`,
        })
        .catch(() => { });
    }

    return order.toDto();
  }

  // ── ADMIN HELPERS ──────────────────────────────────────────────────────────

  async adminListOrders(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [orders, total] = await this.em.findAndCount(
      Order,
      {},
      {
        populate: ['items', 'user'],
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );
    return { orders: orders.map(o => o.toDto()), total, page, limit };
  }

  async adminGetOrder(orderId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order.toDto();
  }

  async adminUpdateStatus(
    orderId: string,
    fulfillmentStatus?: FulfillmentStatus,
    paymentStatus?: PaymentStatus,
  ) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const previousFulfillment = order.fulfillmentStatus;

    if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await this.em.flush();

    // Send email only when fulfillment status actually changes
    if (fulfillmentStatus && fulfillmentStatus !== previousFulfillment) {
      const user = await this.em.findOne(User, { id: order.user.id });

      if (user) {
        const STATUS_COPY = {
          [FulfillmentStatus.PROCESSING]: {
            label: 'Processing',
            message: 'We have received your order and are getting it ready.',
            color: '#6366f1',
          },
          [FulfillmentStatus.READY_FOR_PICKUP]: {
            label: 'Ready for Pickup',
            message: 'Your order is ready. You can collect it at our location.',
            color: '#f59e0b',
          },
          [FulfillmentStatus.ON_ROUTE]: {
            label: 'On the Way',
            message: 'Your order has been dispatched and is on its way to you.',
            color: '#3b82f6',
          },
          [FulfillmentStatus.DELIVERED]: {
            label: 'Delivered',
            message: 'Your order has been delivered. Enjoy your purchase!',
            color: '#10b981',
          },
          [FulfillmentStatus.CANCELLED]: {
            label: 'Cancelled',
            message: 'Your order has been cancelled. Contact us if this was unexpected.',
            color: '#ef4444',
          },
        };

        const copy = STATUS_COPY[fulfillmentStatus];

        // Fire and forget — don't let an email failure break the API response
        this.emailService
          .sendFulfillmentUpdate(user.email, {
            name: user.name,
            orderId: order.id,
            orderTotal: Number(order.total).toFixed(2),
            statusLabel: copy.label,
            statusMessage: copy.message,
            statusColor: copy.color,
            orderLink: `${process.env.APP_URL}/account/orders`,
          })
          .catch(() => { });
      }
    }

    return order.toDto();
  }
}
