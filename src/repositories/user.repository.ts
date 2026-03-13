import { EntityRepository } from '@mikro-orm/postgresql';
import { User } from '../entities/user.entity';

export class UserRepository extends EntityRepository<User> {
  findByEmail(email: string) {
    console.log(email)
    return this.findOne({ email: email, deletedAt: null });
  }

  findById(id: string) {
    return this.findOne({ id, deletedAt: null });
  }
}
