import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Utils } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';
import { SeedManager } from '@mikro-orm/seeder';
import * as dotenv from 'dotenv';
import entities from './entities/index';
dotenv.config({ path: '.env.example' });

const config = new ConfigService();


export default defineConfig({
  entities,
  clientUrl: config.getOrThrow<string>('DB_URL'),
  driver: PostgreSqlDriver,
  extensions: [SeedManager],
  seeder: {
    path: Utils.detectTsNode() ? 'src/seeders' : 'dist/seeders',
    defaultSeeder: 'DatabaseSeeder',
  },
  // Log SQL queries in development
  debug: process.env.NODE_ENV === 'development',
});
