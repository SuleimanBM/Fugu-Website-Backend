import { Entity, Enum, OptionalProps, Property } from '@mikro-orm/core';
import { Role } from '../enums/roles.enum';
import { SoftDeleteEntity } from './softDelete.entity';
import { UserRepository } from '../repositories/user.repository';

@Entity({ repository: () => UserRepository })
export class User extends SoftDeleteEntity {

  @Property({ nullable: false })
  name!: string;

  @Property({ unique: true, nullable: false })
  email!: string;

  @Property({ nullable: true })
  phone?: string;

  @Property({ hidden: true, nullable: true })
  passwordHash?: string;

  @Property({ nullable: true })
  googleId?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @Enum(() => Role)
  role?: Role = Role.CUSTOMER;

  @Property({ nullable: true })
  passwordResetToken?: string | null;

  @Property({ nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Property({ nullable: true })
  refreshTokenHash?: string | null;

  /** Shape the frontend expects: { id, name, email, is_admin } */
  toDto() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      is_admin: this.role === Role.ADMIN,
    };
  }
}
