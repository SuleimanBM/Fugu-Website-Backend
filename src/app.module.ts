import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JwtModule } from '@nestjs/jwt';
import { APP_PIPE } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import mikroOrmConfig from './mikro-orm.config';

// Entities
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Cart } from './entities/cart.entity';
import { Order } from './entities/order.entity'
import { CustomOrder } from './entities/customOrder.entity';


// Controllers
import { AuthController } from './controllers/auth.controller';
import { ProductsController } from './controllers/product.controller';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { AdminController } from './controllers/admin.controller';
import { UploadsController } from './controllers/uploads.controller';
import { CustomOrderController } from './controllers/customOrder.controller';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { PaymentService } from './services/payment.service';
import { AdminService } from './services/admin.service';
import { EmailService } from './services/email.service';
import { CustomOrderService } from './services/customOrder.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ProductRepository } from './repositories/product.repository';
import { CartRepository } from './repositories/cart.repository';
import { OrderRepository } from './repositories/order.repository';
import { CategoryRepository } from './repositories/category.repository';

// Auth
import { JwtStrategy } from './strategies/jwt-strategy';
import { JwtAuthGuard } from './guards/jwt-guard';
import { RolesGuard } from './guards/roles-guard';
import { PosthogService } from './services/posthog.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature([User, Product, Category, Order, Cart, CustomOrder]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),

    // Multer in-memory storage for image uploads
    MulterModule.register({ storage: undefined }), // defaults to memoryStorage
  ],

  controllers: [
    AuthController,
    ProductsController,
    CartController,
    OrderController,
    AdminController,
    UploadsController,
    CustomOrderController
  ],

  providers: [
    // Services
    AuthService,
    UserService,
    ProductService,
    CartService,
    OrderService,
    PaymentService,
    AdminService,
    EmailService,
    CustomOrderService,
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

    // Global validation
    { provide: APP_PIPE, useClass: ValidationPipe },
  ],
})
export class AppModule {}
