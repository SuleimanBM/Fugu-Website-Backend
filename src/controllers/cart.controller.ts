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

  /**
   * GET /api/cart
   * Returns: { items: CartItem[] }
   */
  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  /**
   * POST /api/cart/items
   * Body: { product_id, variant_id, quantity }
   * Returns: { items: CartItem[] }
   */
  @Post('items')
  addItem(
    @Req() req: any,
    @Body() body: { product_id: string; variant_id: string; quantity?: number },
  ) {
    return this.cartService.addItem(
      req.user.id,
      body.product_id,
      body.variant_id,
      body.quantity ?? 1,
    );
  }

  /**
   * PATCH /api/cart/items/:itemId
   * Body: { quantity }
   * Returns: { items: CartItem[] }
   */
  @Patch('items/:itemId')
  updateItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItem(req.user.id, itemId, body.quantity);
  }

  /**
   * DELETE /api/cart/items/:itemId
   * Returns: { items: CartItem[] }
   */
  @Delete('items/:itemId')
  removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.id, itemId);
  }

  /**
   * DELETE /api/cart
   * Returns: { items: [] }
   */
  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
