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
import { CustomOrder } from 'src/entities';
import { CustomOrderStatus } from 'src/enums/customOrderStatus.enum';

export interface ShippingAddressInput {
  fullName: string;
  phone:    string;
  address:  string;
  city:     string;
  region:   string;
  country:  string;
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
  ) {}

  async listUserOrders(userId: string) {
    const orders = await this.orderRepo.findByUser(userId);
    return orders.map(o => o.toDto());
  }

  async getOrder(orderId: string, userId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.id !== userId) throw new NotFoundException('Order not found');
    return order.toDto();
  }

  async createFromCart(userId: string, shippingAddress: ShippingAddressInput) {
    const cart = await this.cartService.validateForCheckout(userId);

    return this.em.transactional(async em => {
      const user = await em.findOne(User, { id: userId });
      if (!user) throw new BadRequestException('User not found');

      // Reload inside the forked transaction EM
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
        subtotal: 0,
        tax:      0,
        shipping: 0,
        total:    0,
      });

      await em.flush();

      for (const ci of items) {
        subtotal += ci.priceAtAdd * ci.quantity;

        em.create(OrderItem, {
          order,
          productId:    ci.productId,
          variantId:    ci.id,
          quantity:     ci.quantity,
          priceAtAdd:   ci.priceAtAdd,
          // Snapshot display fields from the variant
          productTitle: (ci.variant.product as any)?.displayTitle ?? '',
          variantName:  ci.variant.variantLabel,
          withHat:      ci.withHat,
          customLength: ci.customLength,
          customWidth:  ci.customWidth,
        });
      }

      order.subtotal = subtotal;
      order.total    = subtotal;

      await em.flush();
      await this.cartService.deactivate(cart);

      // Verify it actually saved
      const check = await em.findOne(Order, { id: order.id });

      return order.toDto();
    });
  }

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
      email:   user!.email,
      amount:  order.total,
    });

    return { authorization_url: data.authorization_url };
  }

  async verifyPayment(reference: string) {
    const data = await this.paymentService.verify(reference);

    if (data.status !== 'success') {
      throw new BadRequestException('Payment was not successful');
    }

    const orderId = data.metadata?.orderId;
    if (!orderId) throw new BadRequestException('Missing orderId in payment metadata');

    // ── Try regular order first ────────────────────────────────────────────
    const order = await this.orderRepo.findById(orderId);
    if (order) {
      if (order.paymentStatus === PaymentStatus.PAID) {
        return { type: 'order', ...order.toDto() };
      }

      order.paymentStatus = PaymentStatus.PAID;
      order.paymentReference = reference;
      await this.em.flush();

      const user = await this.em.findOne(User, { id: (order.user as any).id });
      if (user) {
        this.emailService.sendOrderConfirmation(user.email, {
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
          orderLink: `${process.env.APP_URL}/account`,
        }).catch(() => { });
      }

      return { type: 'order', ...order.toDto() };
    }

    // ── Try custom order ───────────────────────────────────────────────────
    const customOrder = await this.em.findOne(
      CustomOrder,
      { id: orderId },
      { populate: ['user'] },
    );

    if (customOrder) {
      if (customOrder.status === CustomOrderStatus.PAID) {
        return { type: 'custom_order', ...customOrder.toDto() };
      }

      customOrder.status = CustomOrderStatus.PAID;
      customOrder.paymentReference = reference;
      await this.em.flush();

      this.emailService.sendMail({
        to: customOrder.user.email,
        subject: `Payment confirmed — Custom order #${customOrder.id.slice(0, 8).toUpperCase()}`,
        html: `<p>Hi ${customOrder.user.name},</p>
                <p>We have received your payment of <strong>GHS ${Number(customOrder.quotedPrice).toFixed(2)}</strong> 
                for your custom smock order. We will begin production shortly.</p>`,
      }).catch(() => { });

      return { type: 'custom_order', ...customOrder.toDto() };
    }

    // ── Neither found ──────────────────────────────────────────────────────
    throw new NotFoundException('Order not found');
  }

  async adminListOrders(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [orders, total] = await this.em.findAndCount(
      Order,
      {},
      {
        populate: ['items', 'user'],
        limit,
        offset,
        orderBy:  { createdAt: 'DESC' },
      },
    );
    return { orders: orders.map(o => o.toDto()), total, page, limit };
  }

  async adminGetOrder(orderId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order.toDto();
  }
}
