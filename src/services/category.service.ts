import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(private readonly em: EntityManager) {}

  async listCategories() {
    const cats = await this.em.find(Category, { deletedAt: null });
    return cats.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
  }

  async createCategory(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const existing = await this.em.findOne(Category, { slug });
    if (existing) throw new BadRequestException('Category already exists');
    const cat = this.em.create(Category, { name, slug });
    await this.em.flush();
    return { id: cat.id, name: cat.name, slug: cat.slug };
  }
}
