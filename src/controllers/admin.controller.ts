import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-guard';
import { RolesGuard } from '../guards/roles-guard';
import { Role } from '../decorators/roles.decorator';
import { AdminService } from '../services/admin.service';
import { OrderService } from '../services/order.service';
import { CustomOrderService } from '../services/customOrder.service';
import { FulfillmentStatus } from '../enums/fulfillmentStatus.enum';
import { CustomOrderStatus } from '../enums/customOrderStatus.enum';
import { Size } from '../enums/sizes.enum';
import { Express } from 'express';

type MulterFile = Express.Multer.File;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly orderService: OrderService,
    private readonly customOrderService: CustomOrderService,
  ) { }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────

  @Get('analytics')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── IMAGE UPLOADS ─────────────────────────────────────────────────────────

  @Post('/../../uploads/product-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  uploadProductImages(@UploadedFiles() files: MulterFile[]) {
    return this.adminService.uploadProductImages(files ?? []);
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────

  @Post('products')
  createProduct(
    @Body()
    body: {
      title: string;
      description: string;
      price: number;
      images?: string[];
      categories?: string[];
      featured?: boolean;
    },
  ) {
    return this.adminService.createProduct(body);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') productId: string,
    @Body()
    body: Partial<{
      title: string;
      description: string;
      price: number;
      images: string[];
      categories: string[];
      featured: boolean;
      isActive: boolean;
    }>,
  ) {
    return this.adminService.updateProduct(productId, body);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') productId: string) {
    return this.adminService.deleteProduct(productId);
  }

  @Post('products/:id/variants')
  addVariant(
    @Param('id') productId: string,
    @Body()
    body: {
      name: string;
      size: Size;
      color?: string;
      stock: number;
      priceDiff?: number;
      images?: string[];
    },
  ) {
    return this.adminService.addVariant(productId, body);
  }

  @Patch('variants/:id')
  updateVariant(
    @Param('id') variantId: string,
    @Body()
    body: Partial<{
      name: string;
      stock: number;
      priceDiff: number;
      images: string[];
      isActive: boolean;
    }>,
  ) {
    return this.adminService.updateVariant(variantId, body);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id') variantId: string) {
    return this.adminService.deleteVariant(variantId);
  }

  @Patch('variants/:id/stock')
  adjustStock(
    @Param('id') variantId: string,
    @Body() body: { delta: number },
  ) {
    return this.adminService.adjustStock(variantId, body.delta);
  }

  // ── CATEGORIES ────────────────────────────────────────────────────────────

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.adminService.createCategory(body.name);
  }

  // ── ORDERS ────────────────────────────────────────────────────────────────

  @Get('orders')
  listOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.adminListOrders(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('orders/:id')
  getOrder(@Param('id') orderId: string) {
    return this.orderService.adminGetOrder(orderId);
  }

  @Patch('orders/:orderId')
  updateOrder(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      fulfillment_status?: FulfillmentStatus;
      payment_status?: string;
    },
  ) {
    return this.adminService.updateOrder(orderId, body);
  }

  @Patch('orders/:orderId/fulfillment')
  updateFulfillment(
    @Param('orderId') orderId: string,
    @Body() body: { status: FulfillmentStatus },
  ) {
    return this.adminService.updateOrder(orderId, {
      fulfillment_status: body.status,
    });
  }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  @Get('analytics/sales-over-time')
  salesOverTime(@Query('days') days?: string) {
    return this.adminService.salesOverTime(days ? Number(days) : 30);
  }

  @Get('analytics/top-products')
  topProducts(@Query('limit') limit?: string) {
    return this.adminService.topSellingProducts(limit ? Number(limit) : 5);
  }

  @Get('analytics/low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    return this.adminService.lowStockVariants(threshold ? Number(threshold) : 5);
  }

  // ── CUSTOM ORDERS ─────────────────────────────────────────────────────────

  /**
   * GET /api/admin/custom-orders?status=pending
   * Returns all custom orders, optionally filtered by status.
   */
  @Get('custom-orders')
  listCustomOrders(@Query('status') status?: CustomOrderStatus) {
    return this.customOrderService.adminList(status);
  }

  /**
   * GET /api/admin/custom-orders/:id
   */
  @Get('custom-orders/:id')
  getCustomOrder(@Param('id') id: string) {
    return this.customOrderService.adminGet(id);
  }

  /**
   * PATCH /api/admin/custom-orders/:id
   * Body: { status?, quotedPrice?, adminNotes? }
   * Setting quotedPrice automatically moves status to QUOTED and emails the customer.
   */
  @Patch('custom-orders/:id')
  updateCustomOrder(
    @Param('id') id: string,
    @Body()
    body: {
      status?: CustomOrderStatus;
      quotedPrice?: number;
      adminNotes?: string;
    },
  ) {
    return this.customOrderService.adminUpdate(id, body);
  }
}