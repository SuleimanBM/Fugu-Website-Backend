import {
  Controller,
  Post,
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
import { Express } from 'express';

type MulterFile = Express.Multer.File;

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * POST /api/uploads/product-images
   * multipart/form-data, field name: "images" (up to 10 files)
   * Returns: { urls: string[] }
   *
   * This is the endpoint consumed by src/lib/image-upload.ts in the frontend.
   */
  @Post('product-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  uploadProductImages(@UploadedFiles() files: MulterFile[]) {
    return this.adminService.uploadProductImages(files ?? []);
  }
}
