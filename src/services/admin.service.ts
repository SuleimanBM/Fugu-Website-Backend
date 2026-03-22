import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../entities/order.entity';
import { FulfillmentStatus } from '../enums/fulfillmentStatus.enum';
import { EmailService } from './email.service';
import { User } from '../entities/user.entity';

/**
 * AdminService — thin orchestration layer.
 * Handles only order status updates (which need email side-effects).
 * All other admin logic lives in dedicated services:
 *   - ProductAdminService  → product CRUD
 *   - VariantService       → variant CRUD
 *   - CategoryService      → category CRUD
 *   - AnalyticsService     → dashboard + sales analytics
 *   - UploadService        → image uploads
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  async updateOrder(
    orderId: string,
    patch: {
      fulfillment_status?: FulfillmentStatus;
      payment_status?: string;
    },
  ) {
    const order = await this.em.findOne(Order, { id: orderId }, { populate: ['user'] });
    if (!order) throw new NotFoundException('Order not found');

    const previousFulfillment = order.fulfillmentStatus;

    if (patch.fulfillment_status) order.fulfillmentStatus = patch.fulfillment_status;
    if (patch.payment_status)     order.paymentStatus     = patch.payment_status as any;

    await this.em.flush();

    // Send fulfillment update email only when status actually changes
    if (
      patch.fulfillment_status &&
      patch.fulfillment_status !== previousFulfillment
    ) {
      const user = await this.em.findOne(User, { id: (order.user as any).id ?? order.user });
      if (user) {
        const STATUS_COPY: Record<FulfillmentStatus, { label: string; message: string; color: string }> = {
          [FulfillmentStatus.PROCESSING]: {
            label:   'Processing',
            message: 'We have received your order and are getting it ready.',
            color:   '#6366f1',
          },
          [FulfillmentStatus.READY_FOR_PICKUP]: {
            label:   'Ready for Pickup',
            message: 'Your order is ready. You can collect it at our location.',
            color:   '#f59e0b',
          },
          [FulfillmentStatus.ON_ROUTE]: {
            label:   'On the Way',
            message: 'Your order has been dispatched and is on its way to you.',
            color:   '#3b82f6',
          },
          [FulfillmentStatus.DELIVERED]: {
            label:   'Delivered',
            message: 'Your order has been delivered. Enjoy your purchase!',
            color:   '#10b981',
          },
          [FulfillmentStatus.CANCELLED]: {
            label:   'Cancelled',
            message: 'Your order has been cancelled. Contact us if this was unexpected.',
            color:   '#ef4444',
          },
        };

        const copy = STATUS_COPY[patch.fulfillment_status];
        this.emailService
          .sendFulfillmentUpdate(user.email, {
            name:          user.name,
            orderId:       order.id,
            orderTotal:    Number(order.total).toFixed(2),
            statusLabel:   copy.label,
            statusMessage: copy.message,
            statusColor:   copy.color,
            orderLink:     `${process.env.APP_URL}/account`,
          })
          .catch(() => {});
      }
    }

    return order.toDto();
  }
}
