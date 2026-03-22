import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { RolesGuard } from '../../guards/roles-guard';
import { Role } from '../../decorators/roles.decorator';
import { AdminService } from '../../services/admin.service';
import { OrderService } from '../../services/order.service';
import { FulfillmentStatus } from '../../enums/fulfillmentStatus.enum';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin')
export class AdminOrdersController {
  constructor(
    private readonly adminService: AdminService,
    private readonly orderService: OrderService,
  ) {}

  /** GET /api/admin/orders?page=1&limit=20 */
  @Get('orders')
  listOrders(
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.adminListOrders(
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 20,
    );
  }

  /** GET /api/admin/orders/:id */
  @Get('orders/:id')
  getOrder(@Param('id') orderId: string) {
    return this.orderService.adminGetOrder(orderId);
  }

  /** PATCH /api/admin/orders/:orderId — update payment or fulfillment status */
  @Patch('orders/:orderId')
  updateOrder(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      fulfillment_status?: FulfillmentStatus;
      payment_status?:     string;
    },
  ) {
    return this.adminService.updateOrder(orderId, body);
  }

  /** PATCH /api/admin/orders/:orderId/fulfillment — convenience endpoint */
  @Patch('orders/:orderId/fulfillment')
  updateFulfillment(
    @Param('orderId') orderId: string,
    @Body() body: { status: FulfillmentStatus },
  ) {
    return this.adminService.updateOrder(orderId, {
      fulfillment_status: body.status,
    });
  }
}
