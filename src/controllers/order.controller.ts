import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-guard';
import { OrderService } from '../services/order.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * GET /api/orders/me
   * Returns all orders for the authenticated user.
   */
  @Get('orders/me')
  listMyOrders(@Req() req: any) {
    return this.orderService.listUserOrders(req.user.id);
  }

  /**
   * GET /api/orders/:id
   */
  @Get('orders/:id')
  getOrder(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getOrder(id, req.user.id);
  }

  /**
   * POST /api/checkout/transaction
   * Body: { shipping_address: ShippingAddress }
   *
   * Creates the order record and decrements stock.
   * Returns the Order. Frontend then calls /checkout/initiate with the order id.
   */
  @Post('checkout/transaction')
  createOrder(
    @Req() req: any,
    @Body()
    body: {
      shipping_address: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        region: string;
        country: string;
      };
    },
  ) {
    console.log(body)
    return this.orderService.createFromCart(req.user.id, body.shipping_address);
  }

  /**
   * POST /api/checkout/initiate
   * Body: { order_id }
   *
   * Calls Paystack to initialise the transaction.
   * Returns: { authorization_url }
   */
  @Post('checkout/initiate')
  initiatePayment(
    @Req() req: any,
    @Body() body: { order_id: string },
  ) {
    return this.orderService.initiatePayment(body.order_id, req.user.id);
  }

  /**
   * POST /api/paystack/verify
   * Body: { reference }
   *
   * Called by the frontend callback page after Paystack redirect.
   * Marks the order as paid, fires confirmation email.
   * Returns the updated Order.
   */
  @Post('paystack/verify')
  verifyPayment(
    @Req() req: any,
    @Body() body: { reference: string },
  ) {
    return this.orderService.verifyPayment(body.reference, req.user.id);
  }
}
