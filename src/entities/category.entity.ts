import { Entity, OptionalProps, Property } from '@mikro-orm/core';
import { SoftDeleteEntity } from './softDelete.entity';
import { CategoryRepository } from '../repositories/category.repository';

@Entity({ repository: () => CategoryRepository })
export class Category extends SoftDeleteEntity {
  @Property({ unique: true })
  name!: string;

  @Property({ unique: true })
  slug!: string;
}
