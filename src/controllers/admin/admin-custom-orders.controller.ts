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
import { CustomOrderService } from '../../services/customOrder.service';
import { CustomOrderStatus } from '../../enums/customOrderStatus.enum';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin')
export class AdminCustomOrdersController {
  constructor(private readonly customOrderService: CustomOrderService) {}

  /** GET /api/admin/custom-orders?status=pending */
  @Get('custom-orders')
  listCustomOrders(@Query('status') status?: CustomOrderStatus) {
    return this.customOrderService.adminList(status);
  }

  /** GET /api/admin/custom-orders/:id */
  @Get('custom-orders/:id')
  getCustomOrder(@Param('id') id: string) {
    return this.customOrderService.adminGet(id);
  }

  /**
   * PATCH /api/admin/custom-orders/:id
   * Setting quotedPrice automatically moves status to QUOTED and emails the customer.
   */
  @Patch('custom-orders/:id')
  updateCustomOrder(
    @Param('id') id: string,
    @Body()
    body: {
      status?:      CustomOrderStatus;
      quotedPrice?: number;
      adminNotes?:  string;
    },
  ) {
    return this.customOrderService.adminUpdate(id, body);
  }
}
