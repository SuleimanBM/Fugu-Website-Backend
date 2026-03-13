import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,

    @InjectRepository(User)
    private readonly userRepo: UserRepository,
  ) { }

  getByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }

  async getById(id: string) {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}