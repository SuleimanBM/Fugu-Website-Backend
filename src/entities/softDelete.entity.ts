import { Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';

export abstract class SoftDeleteEntity extends BaseEntity {
  @Property({ nullable: true })
  deletedAt?: Date;
}
