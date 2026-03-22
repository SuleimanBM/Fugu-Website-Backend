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
import { UploadService } from '../services/upload.service';
import { Express } from 'express';

type MulterFile = Express.Multer.File;

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/uploads/product-images
   * multipart/form-data, field name: "images"
   * Returns { urls: string[] }
   */
  @Post('product-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  uploadProductImages(@UploadedFiles() files: MulterFile[]) {
    return this.uploadService.uploadProductImages(files ?? []);
  }
}
