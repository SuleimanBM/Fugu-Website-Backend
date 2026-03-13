import { Cascade, Collection, Entity, ManyToOne, OneToMany, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CartItem } from './cartItem.entity';
import { CartRepository } from '../repositories/cart.repository';

@Entity({ repository: () => CartRepository })
export class Cart extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @OneToMany(() => CartItem, item => item.cart, { cascade: [Cascade.ALL], orphanRemoval: true })
  items = new Collection<CartItem>(this);

  @Property({ default: true })
  isActive?: boolean = true;
}
