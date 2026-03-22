import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtModule } from '@nestjs/jwt';
import { APP_PIPE } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import mikroOrmConfig from './mikro-orm.config';

// ── Entities ─────────────────────────────────────────────────────────────────
import { User }        from './entities/user.entity';
import { Product }     from './entities/product.entity';
import { Category }    from './entities/category.entity';
import { Cart }        from './entities/cart.entity';
import { Order }       from './entities/order.entity';
import { CustomOrder } from './entities/customOrder.entity';

// ── Controllers ───────────────────────────────────────────────────────────────
import { AuthController }     from './controllers/auth.controller';
import { ProductsController } from './controllers/product.controller';
import { CartController }     from './controllers/cart.controller';
import { OrderController }    from './controllers/order.controller';
import { UploadsController }  from './controllers/uploads.controller';
import { CustomOrderController } from './controllers/customOrder.controller';

// Split admin controllers
import { AdminAnalyticsController }    from './controllers/admin/admin-analytics.controller';
import { AdminProductsController }     from './controllers/admin/admin-products.controller';
import { AdminOrdersController }       from './controllers/admin/admin-orders.controller';
import { AdminCategoriesController }   from './controllers/admin/admin-categories.controller';
import { AdminCustomOrdersController } from './controllers/admin/admin-custom-orders.controller';

// ── Services ──────────────────────────────────────────────────────────────────
import { AuthService }         from './services/auth.service';
import { UserService }         from './services/user.service';
import { ProductService }      from './services/product.service';
import { CartService }         from './services/cart.service';
import { OrderService }        from './services/order.service';
import { PaymentService }      from './services/payment.service';
import { AdminService }        from './services/admin.service';
import { ProductAdminService } from './services/product-admin.service';
import { VariantService }      from './services/variant.service';
import { CategoryService }     from './services/category.service';
import { AnalyticsService }    from './services/analytics.service';
import { UploadService }       from './services/upload.service';
import { EmailService }        from './services/email.service';
import { CustomOrderService }  from './services/customOrder.service';
import { PosthogService }      from './services/posthog.service';

// ── Repositories ──────────────────────────────────────────────────────────────
import { UserRepository }     from './repositories/user.repository';
import { ProductRepository }  from './repositories/product.repository';
import { CartRepository }     from './repositories/cart.repository';
import { OrderRepository }    from './repositories/order.repository';
import { CategoryRepository } from './repositories/category.repository';

// ── Auth ──────────────────────────────────────────────────────────────────────
import { JwtStrategy }   from './strategies/jwt-strategy';
import { JwtAuthGuard }  from './guards/jwt-guard';
import { RolesGuard }    from './guards/roles-guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature([User, Product, Category, Order, Cart, CustomOrder]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:       config.getOrThrow('JWT_SECRET'),
        signOptions:  { expiresIn: '15m' },
      }),
    }),

    MulterModule.register({ storage: undefined }),
  ],

  controllers: [
    // Public / customer-facing
    AuthController,
    ProductsController,
    CartController,
    OrderController,
    UploadsController,
    CustomOrderController,

    // Admin — split by domain
    AdminAnalyticsController,
    AdminProductsController,
    AdminOrdersController,
    AdminCategoriesController,
    AdminCustomOrdersController,
  ],

  providers: [
    // Core services
    AuthService,
    UserService,
    ProductService,
    CartService,
    OrderService,
    PaymentService,
    EmailService,
    CustomOrderService,

    // Admin domain services
    AdminService,
    ProductAdminService,
    VariantService,
    CategoryService,
    AnalyticsService,
    UploadService,
    PosthogService,

    // Repositories
    UserRepository,
    ProductRepository,
    CartRepository,
    OrderRepository,
    CategoryRepository,

    // Auth
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,

    // Global validation pipe
    { provide: APP_PIPE, useClass: ValidationPipe },
  ],
})
export class AppModule {}
