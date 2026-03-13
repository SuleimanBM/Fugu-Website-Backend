import { Entity, Enum, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CustomOrderStatus } from '../enums/customOrderStatus.enum';

export enum CustomOrderSize {
    S = 's',
    M = 'm',
    L = 'l',
    XL = 'xl',
}

export enum CustomOrderAgeGroup {
    ADULT = 'adult',
    KID = 'kid',
}

export enum CustomOrderGender {
    MEN = 'men',
    WOMEN = 'women',
}

@Entity()
export class CustomOrder extends BaseEntity {

    @ManyToOne(() => User)
    user!: User;

    // ── Customer-provided fields ───────────────────────────────────────────────

    @Property({ columnType: 'text', nullable: true })
    description?: string;

    @Property({ nullable: true })
    colorPreference?: string;

    /**
     * Size — either a standard size or null if the customer only specifies
     * age group / gender without a specific size.
     */
    @Enum({ items: () => CustomOrderSize, nullable: true })
    size?: CustomOrderSize;

    @Enum({ items: () => CustomOrderAgeGroup, nullable: true })
    ageGroup?: CustomOrderAgeGroup;

    @Enum({ items: () => CustomOrderGender, nullable: true })
    gender?: CustomOrderGender;

    /**
     * Cloudinary URLs for reference photos — up to 3.
     */
    @Property({ columnType: 'jsonb', nullable: true })
    referenceImageUrls: string[] = [];

    // ── Admin-managed fields ───────────────────────────────────────────────────

    @Enum(() => CustomOrderStatus)
    status?: CustomOrderStatus = CustomOrderStatus.PENDING;

    /** Price set by admin after reviewing the request — in GHS */
    @Property({ columnType: 'decimal', precision: 10, scale: 2, nullable: true })
    quotedPrice?: number;

    @Property({ columnType: 'text', nullable: true })
    adminNotes?: string;

    @Property({ nullable: true })
    paymentReference?: string;

    // ── DTO ────────────────────────────────────────────────────────────────────

    toDto() {
        return {
            id: this.id,
            user_id: this.user.id,
            description: this.description,
            color_preference: this.colorPreference,
            size: this.size,
            age_group: this.ageGroup,
            gender: this.gender,
            reference_image_urls: this.referenceImageUrls,
            status: this.status,
            quoted_price: this.quotedPrice ? Number(this.quotedPrice) : null,
            admin_notes: this.adminNotes,
            payment_reference: this.paymentReference,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString(),
        };
    }
}