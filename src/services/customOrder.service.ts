import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CustomOrder } from '../entities/customOrder.entity';
import { User } from '../entities/user.entity';
import { CustomOrderStatus } from '../enums/customOrderStatus.enum';
import { EmailService } from './email.service';
import { PaymentService } from './payment.service';
import { cloudinary } from '../msic/cloudinary';
import { Express } from 'express';

type MulterFile = Express.Multer.File;


@Injectable()
export class CustomOrderService {
    constructor(
        private readonly em: EntityManager,
        private readonly emailService: EmailService,
        private readonly paymentService: PaymentService,
    ) { }

    // ── CUSTOMER ───────────────────────────────────────────────────────────────

    /**
     * POST /api/custom-orders
     * Creates the request. Reference images are uploaded here via Cloudinary.
     */
    async create(
        userId: string,
        input: {
            description?: string;
            colorPreference?: string;
            patternPreference?: string;
            size?: string;
            sleeved?: boolean;
            length?: string;
            customLength?: number;
            customWidth?: number;
            ageGroup?: string;
            gender?: string;
        },
        imageFiles: MulterFile[],
    ) {
        const referenceImageUrls = imageFiles.length
            ? await this.uploadReferenceImages(imageFiles)
            : [];

        const user = await this.em.findOne(User, { id: userId });
        if (!user) throw new BadRequestException('User not found');

        const order = this.em.create(CustomOrder, {
            user,
            description: input.description,
            colorPreference: input.colorPreference,
            sizeLabel: input.size as any,
            patternPreference: input.patternPreference,
            // ageGroup: input.ageGroup as any,
            gender: input.gender as any,
            referenceImageUrls,
            status: CustomOrderStatus.PENDING
        });

        await this.em.flush();

        this.notifyAdminNewRequest(order, user).catch(() => { });

        return order.toDto();
    }

    /** GET /api/custom-orders/me — customer's own requests */
    async listForUser(userId: string) {
        const orders = await this.em.find(
            CustomOrder,
            { user: userId },
            { orderBy: { createdAt: 'DESC' } },
        );
        return orders.map(o => o.toDto());
    }

    /** GET /api/custom-orders/:id — customer can only see their own */
    async getForUser(id: string, userId: string) {
        const order = await this.em.findOne(CustomOrder, { id }, { populate: ['user'] });
        if (!order) throw new NotFoundException('Custom order not found');
        if (order.user.id !== userId) throw new NotFoundException('Custom order not found');
        return order.toDto();
    }

    /**
     * POST /api/custom-orders/:id/initiate-payment
     * Customer pays after admin sets a quoted price.
     */
    async initiatePayment(id: string, userId: string) {
        const order = await this.em.findOne(CustomOrder, { id }, { populate: ['user'] });
        if (!order) throw new NotFoundException('Custom order not found');
        if (order.user.id !== userId) throw new NotFoundException('Custom order not found');

        if (order.status !== CustomOrderStatus.QUOTED) {
            throw new BadRequestException(
                'This order has not been quoted yet. Please wait for admin review.',
            );
        }
        if (!order.quotedPrice) throw new BadRequestException('No price has been set for this order');

        const data = await this.paymentService.initialize({
            orderId: order.id,
            email: order.user.email,
            amount: Number(order.quotedPrice),
        });

        return { authorization_url: data.authorization_url };
    }

    /**
     * POST /api/custom-orders/:id/verify-payment
     * Verify Paystack payment and mark the order as paid.
     */
    async verifyPayment(id: string, userId: string, reference: string) {
        const order = await this.em.findOne(CustomOrder, { id }, { populate: ['user'] });
        if (!order) throw new NotFoundException('Custom order not found');
        if (order.user.id !== userId) throw new NotFoundException('Custom order not found');

        const data = await this.paymentService.verify(reference);
        if (data.status !== 'success') throw new BadRequestException('Payment was not successful');

        order.status = CustomOrderStatus.PAID;
        order.paymentReference = reference;
        await this.em.flush();

        // Notify customer
        this.emailService
            .sendMail({
                to: order.user.email,
                subject: `Payment confirmed — Custom order #${order.id.slice(0, 8).toUpperCase()}`,
                html: `<p>Hi ${order.user.name},</p>
               <p>We have received your payment of <strong>GHS ${Number(order.quotedPrice).toFixed(2)}</strong> for your custom smock order. 
               We will begin production shortly and keep you updated.</p>`,
            })
            .catch(() => { });

        return order.toDto();
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────────

    /** GET /api/admin/custom-orders */
    async adminList(status?: CustomOrderStatus) {
        const where = status ? { status } : {};
        const orders = await this.em.find(
            CustomOrder,
            where,
            { populate: ['user'], orderBy: { createdAt: 'DESC' } },
        );
        return orders.map(o => ({
            ...o.toDto(),
            user_name: o.user.name,
            user_email: o.user.email,
        }));
    }

    /** GET /api/admin/custom-orders/:id */
    async adminGet(id: string) {
        const order = await this.em.findOne(
            CustomOrder,
            { id },
            { populate: ['user'] },
        );
        if (!order) throw new NotFoundException('Custom order not found');
        return {
            ...order.toDto(),
            user_name: order.user.name,
            user_email: order.user.email,
        };
    }

    /**
     * PATCH /api/admin/custom-orders/:id
     * Admin can: set quoted price, update status, add notes.
     * Sending a quoted price automatically sets status to QUOTED and emails the customer.
     */
    async adminUpdate(
        id: string,
        patch: {
            status?: CustomOrderStatus;
            quotedPrice?: number;
            adminNotes?: string;
        },
    ) {
        const order = await this.em.findOne(
            CustomOrder,
            { id },
            { populate: ['user'] },
        );
        if (!order) throw new NotFoundException('Custom order not found');

        const wasQuoted = order.status === CustomOrderStatus.QUOTED;

        if (patch.adminNotes !== undefined) order.adminNotes = patch.adminNotes;
        if (patch.status) order.status = patch.status;

        if (patch.quotedPrice !== undefined) {
            order.quotedPrice = patch.quotedPrice;
            // Automatically move to QUOTED when a price is set
            if (order.status === CustomOrderStatus.PENDING) {
                order.status = CustomOrderStatus.QUOTED;
            }
        }

        await this.em.flush();

        // Email customer when quoted for the first time
        const nowQuoted = order.status === CustomOrderStatus.QUOTED && !wasQuoted;
        if (nowQuoted && order.quotedPrice) {
            this.emailService
                .sendMail({
                    to: order.user.email,
                    subject: `Your custom smock order has been quoted — #${order.id.slice(0, 8).toUpperCase()}`,
                    html: `<p>Hi ${order.user.name},</p>
                 <p>We have reviewed your custom smock request and the price has been set at 
                 <strong>GHS ${Number(order.quotedPrice).toFixed(2)}</strong>.</p>
                 <p>Please log in to your account to review and complete payment.</p>
                 ${order.adminNotes ? `<p>Note from us: ${order.adminNotes}</p>` : ''}
                 <p><a href="${process.env.APP_URL}/account/custom-orders">View your order</a></p>`,
                })
                .catch(() => { });
        }

        // Email customer on status changes other than QUOTED (handled above)
        const STATUS_MESSAGES: Partial<Record<CustomOrderStatus, string>> = {
            [CustomOrderStatus.IN_PRODUCTION]: 'Great news — your custom smock is now being made!',
            [CustomOrderStatus.READY]: 'Your custom smock is ready for pickup or dispatch.',
            [CustomOrderStatus.DELIVERED]: 'Your custom smock has been delivered. We hope you love it!',
            [CustomOrderStatus.CANCELLED]: 'Unfortunately your custom order has been cancelled. Please contact us if you have questions.',
        };

        const msg = patch.status && STATUS_MESSAGES[patch.status];
        if (msg && patch.status !== CustomOrderStatus.QUOTED) {
            this.emailService
                .sendMail({
                    to: order.user.email,
                    subject: `Custom order update — #${order.id.slice(0, 8).toUpperCase()}`,
                    html: `<p>Hi ${order.user.name},</p><p>${msg}</p>
                 <p><a href="${process.env.APP_URL}/account/custom-orders">View your order</a></p>`,
                })
                .catch(() => { });
        }

        return {
            ...order.toDto(),
            user_name: order.user.name,
            user_email: order.user.email,
        };
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

    private async uploadReferenceImages(files: MulterFile[]): Promise<string[]> {
        return Promise.all(
            files.slice(0, 3).map(
                file =>
                    new Promise<string>((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'fugu-threads/custom-orders',
                                resource_type: 'image',
                                transformation: [
                                    { width: 1600, height: 1600, crop: 'limit' },
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
    }

    private async notifyAdminNewRequest(order: CustomOrder, user: User) {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (!adminEmail) return;

        const sizeLabel = [
            order.gender,
           // order.ageGroup,
            order.sizeLabel?.toUpperCase(),
        ]
            .filter(Boolean)
            .join(' / ') || 'Not specified';

        await this.emailService.sendMail({
            to: adminEmail,
            subject: `New custom order — #${order.id.slice(0, 8).toUpperCase()}`,
            html: `
      <p>A new custom smock order has been submitted.</p>
      <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
      <p><strong>Description:</strong> ${order.description ?? 'None'}</p>
      <p><strong>Colour preference:</strong> ${order.colorPreference ?? 'None'}</p>
      <p><strong>Size / For:</strong> ${sizeLabel}</p>
      <p><a href="${process.env.APP_URL}/admin/custom-orders/${order.id}">Review in admin panel</a></p>
    `,
        });
    }
}