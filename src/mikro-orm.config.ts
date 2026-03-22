import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Utils } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';
import { SeedManager } from '@mikro-orm/seeder';
import * as dotenv from 'dotenv';
import entities from './entities/index';
dotenv.config();

const config = new ConfigService();

export default defineConfig({
  entities,
  clientUrl: config.getOrThrow<string>('DB_URL'),
  schema: 'public',
  driver: PostgreSqlDriver,
  extensions: [Migrator, SeedManager],
  seeder: {
    path: Utils.detectTsNode() ? 'src/seeders' : 'dist/seeders',
    defaultSeeder: 'DatabaseSeeder',
  },
  migrations: {
    path:   'src/migrations',
    pathTs: 'src/migrations',
  },
  // driverOptions: {
  //   connection: {
  //     ssl: {
  //       rejectUnauthorized: false,
  //     },
  //   },
  // },
  debug: false
});
