import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-guard';
import { RolesGuard } from '../guards/roles-guard';
import { Role } from '../decorators/roles.decorator';
import { CustomOrderService } from '../services/customOrder.service';
import { CustomOrderStatus } from '../enums/customOrderStatus.enum';
import { Express } from 'express';

type MulterFile = Express.Multer.File;


@ApiTags('custom-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CustomOrderController {
    constructor(private readonly customOrderService: CustomOrderService) { }

    // ── CUSTOMER ROUTES ────────────────────────────────────────────────────────

    /**
     * POST /api/custom-orders
     * multipart/form-data fields:
     *   - description (text, optional)
     *   - fabricPreference (text, optional)
     *   - measurements (JSON string, optional)
     *   - images (file, up to 3)
     */
    @Post('custom-orders')
    @UseInterceptors(FilesInterceptor('images', 3))
    create(
        @Req() req: any,
        @UploadedFiles() files: MulterFile[],
        @Body()
        body: {
            description?: string;
            colorPreference?: string;
            size?: string;
            ageGroup?: string;
            gender?: string;
        },
    ) {
        return this.customOrderService.create(
            req.user.id,
            {
                description: body.description,
                colorPreference: body.colorPreference,
                size: body.size,
                ageGroup: body.ageGroup,
                gender: body.gender,
            },
            files ?? [],
        );
    }

    /** GET /api/custom-orders/me */
    @Get('custom-orders/me')
    listMine(@Req() req: any) {
        return this.customOrderService.listForUser(req.user.id);
    }

    /** GET /api/custom-orders/:id */
    @Get('custom-orders/:id')
    getOne(@Req() req: any, @Param('id') id: string) {
        return this.customOrderService.getForUser(id, req.user.id);
    }

    /**
     * POST /api/custom-orders/:id/initiate-payment
     * Hits Paystack, returns { authorization_url }
     */
    @Post('custom-orders/:id/initiate-payment')
    initiatePayment(@Req() req: any, @Param('id') id: string) {
        return this.customOrderService.initiatePayment(id, req.user.id);
    }

    /**
     * POST /api/custom-orders/:id/verify-payment
     * Body: { reference }
     */
    @Post('custom-orders/:id/verify-payment')
    verifyPayment(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: { reference: string },
    ) {
        return this.customOrderService.verifyPayment(id, req.user.id, body.reference);
    }

    // ── ADMIN ROUTES ───────────────────────────────────────────────────────────

    /** GET /api/admin/custom-orders?status=pending */
    @Get('admin/custom-orders')
    @UseGuards(RolesGuard)
    @Role('admin')
    adminList(@Query('status') status?: CustomOrderStatus) {
        return this.customOrderService.adminList(status);
    }

    /** GET /api/admin/custom-orders/:id */
    @Get('admin/custom-orders/:id')
    @UseGuards(RolesGuard)
    @Role('admin')
    adminGet(@Param('id') id: string) {
        return this.customOrderService.adminGet(id);
    }

    /**
     * PATCH /api/admin/custom-orders/:id
     * Body: { status?, quotedPrice?, adminNotes? }
     * Setting quotedPrice automatically moves status to QUOTED and emails the customer.
     */
    @Patch('admin/custom-orders/:id')
    @UseGuards(RolesGuard)
    @Role('admin')
    adminUpdate(
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