import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-guard';
import { CartService } from '../services/cart.service';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** GET /api/cart */
  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  /**
   * POST /api/cart/items
   * Body: { product_id, variant_id, quantity, with_hat?, custom_length?, custom_width? }
   */
  @Post('items')
  addItem(
    @Req() req: any,
    @Body()
    body: {
      product_id:     string;
      variant_id:     string;
      quantity?:      number;
      with_hat?:      boolean;
      custom_length?: number;
      custom_width?:  number;
    },
  ) {
    return this.cartService.addItem(req.user.id, {
      productId:    body.product_id,
      variantId:    body.variant_id,
      quantity:     body.quantity ?? 1,
      withHat:      body.with_hat,
      customLength: body.custom_length,
      customWidth:  body.custom_width,
    });
  }

  /** PATCH /api/cart/items/:itemId  { quantity } */
  @Patch('items/:itemId')
  updateItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItem(req.user.id, itemId, body.quantity);
  }

  /** DELETE /api/cart/items/:itemId */
  @Delete('items/:itemId')
  removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.id, itemId);
  }

  /** DELETE /api/cart */
  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
