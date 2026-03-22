import { Injectable } from '@nestjs/common';
import { cloudinary } from '../msic/cloudinary';
import { Express } from 'express';

type MulterFile = Express.Multer.File;

@Injectable()
export class UploadService {
  async uploadProductImages(files: MulterFile[]): Promise<{ urls: string[] }> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return {
        urls: files.map(
          (_, i) =>
            `https://placehold.co/800x800/2d2d2d/ffffff?text=Product+Image+${i + 1}`,
        ),
      };
    }

    const urls = await Promise.all(
      files.map(
        file =>
          new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'fugu-threads/products',
                resource_type: 'image',
                transformation: [
                  { width: 1200, height: 1200, crop: 'limit' },
                  { quality: 'auto', fetch_format: 'auto' },
                ],
              },
              (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
              },
            );
            stream.end(file.buffer);
          }),
      ),
    );

    return { urls };
  }
}
