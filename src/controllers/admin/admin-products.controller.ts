import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { RolesGuard } from '../../guards/roles-guard';
import { Role } from '../../decorators/roles.decorator';
import { ProductAdminService } from '../../services/product-admin.service';
import { VariantService } from '../../services/variant.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin')
export class AdminProductsController {
  constructor(
    private readonly productAdminService: ProductAdminService,
    private readonly variantService: VariantService,
  ) {}

  /**
   * POST /api/admin/products
   * Creates a product with all variants in one request.
   */
  @Post('products')
  createProduct(
    @Body()
    body: {
      productType:   string;
      pattern?:      string;
      patternOther?: string;
      gender?:       string;
      hatAddonPrice?: number;
      images?:       string[];
      featured?:     boolean;
      variants: {
        price:        number;
        sizeLabel?:   string;
        sizeRange?:   string;
        sleeved?:     boolean;
        length?:      string;
        customLength?: number;
        width?:       number;
        pricePerYard?: number;
      }[];
    },
  ) {
    return this.productAdminService.createProduct(body);
  }

  /** PATCH /api/admin/products/:id */
  @Patch('products/:id')
  updateProduct(
    @Param('id') productId: string,
    @Body()
    body: {
      pattern?:      string;
      patternOther?: string;
      hatAddonPrice?: number;
      images?:       string[];
      featured?:     boolean;
      isActive?:     boolean;
    },
  ) {
    return this.productAdminService.updateProduct(productId, body);
  }

  /** DELETE /api/admin/products/:id */
  @Delete('products/:id')
  deleteProduct(@Param('id') productId: string) {
    return this.productAdminService.deleteProduct(productId);
  }

  /** POST /api/admin/products/:id/variants — add a single variant after product creation */
  @Post('products/:id/variants')
  addVariant(
    @Param('id') productId: string,
    @Body()
    body: {
      price:        number;
      sizeLabel?:   string;
      sizeRange?:   string;
      sleeved?:     boolean;
      length?:      string;
      customLength?: number;
      width?:       number;
      pricePerYard?: number;
      images?:      string[];
    },
  ) {
    return this.variantService.addVariant(productId, body);
  }

  /** PATCH /api/admin/variants/:id */
  @Patch('variants/:id')
  updateVariant(
    @Param('id') variantId: string,
    @Body()
    body: {
      price?:      number;
      sizeLabel?:  string;
      sizeRange?:  string;
      sleeved?:    boolean;
      length?:     string;
      images?:     string[];
      isActive?:   boolean;
    },
  ) {
    return this.variantService.updateVariant(variantId, body);
  }

  /** DELETE /api/admin/variants/:id */
  @Delete('variants/:id')
  deleteVariant(@Param('id') variantId: string) {
    return this.variantService.deleteVariant(variantId);
  }
}
