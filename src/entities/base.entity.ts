import { OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { uuidv7 } from 'uuidv7';

export abstract class BaseEntity {
  /** Mark auto-generated fields as optional so em.create() doesn't require them */
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid', onCreate: () => uuidv7() })
  id: string = uuidv7();

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
