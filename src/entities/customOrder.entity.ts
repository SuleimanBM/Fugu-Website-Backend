import { Entity, Enum, ManyToOne, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CustomOrderStatus } from '../enums/customOrderStatus.enum';

@Entity()
export class CustomOrder extends BaseEntity {

  @ManyToOne(() => User)
  user!: User;

  // ── Customer-provided fields ─────────────────────────────────────────────

  @Property({ columnType: 'text', nullable: true })
  description?: string;

  @Property({ nullable: true })
  colorPreference?: string;

  /** 'male' | 'female' */
  @Property({ nullable: true })
  gender?: string;

  /** 'stripe' | 'check-check' | 'no-preference' */
  @Property({ nullable: true })
  patternPreference?: string;

  // Male fugu fields
  @Property({ nullable: true })
  sizeLabel?: string;

  /** true = sleeved, false = sleeveless */
  @Property({ nullable: true })
  sleeved?: boolean;

  // Female fugu fields
  @Property({ nullable: true })
  length?: string;

  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  customLength?: number;

  @Property({ columnType: 'decimal', precision: 6, scale: 1, nullable: true })
  width?: number;

  @Property({ columnType: 'jsonb', nullable: true })
  referenceImageUrls: string[] = [];

  // ── Admin-managed fields ─────────────────────────────────────────────────

  @Enum(() => CustomOrderStatus)
  status: CustomOrderStatus = CustomOrderStatus.PENDING;

  @Property({ columnType: 'decimal', precision: 10, scale: 2, nullable: true })
  quotedPrice?: number;

  @Property({ columnType: 'text', nullable: true })
  adminNotes?: string;

  @Property({ nullable: true })
  paymentReference?: string;

  toDto() {
    return {
      id:                   this.id,
      user_id:              this.user.id,
      description:          this.description,
      color_preference:     this.colorPreference,
      gender:               this.gender,
      pattern_preference:   this.patternPreference,
      size_label:           this.sizeLabel,
      sleeved:              this.sleeved,
      length:               this.length,
      custom_length:        this.customLength != null ? Number(this.customLength) : null,
      width:                this.width != null ? Number(this.width) : null,
      reference_image_urls: this.referenceImageUrls ?? [],
      status:               this.status,
      quoted_price:         this.quotedPrice ? Number(this.quotedPrice) : null,
      admin_notes:          this.adminNotes,
      payment_reference:    this.paymentReference,
      created_at:           this.createdAt.toISOString(),
      updated_at:           this.updatedAt.toISOString(),
    };
  }
}
