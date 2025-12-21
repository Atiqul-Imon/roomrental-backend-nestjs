import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// ImageKit is a CommonJS module, use TypeScript's import syntax for compatibility
import ImageKit = require('imagekit');

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface ImageKitUploadResult {
  url: string;
  fileId: string;
  name: string;
  size: number;
  filePath: string;
  thumbnailUrl: string;
  height: number;
  width: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly imagekit: any; // ImageKit instance (CommonJS module, no proper types)

  constructor(private configService: ConfigService) {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');

    if (!publicKey || !privateKey || !urlEndpoint) {
      this.logger.warn('ImageKit credentials not fully configured');
    }

    this.imagekit = new ImageKit({
      publicKey: publicKey || '',
      privateKey: privateKey || '',
      urlEndpoint: urlEndpoint || '',
    });
  }

  async uploadImage(file: UploadedFile): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 10MB');
    }

    try {
      const result = (await this.imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: '/roomrental',
        useUniqueFileName: true,
        overwriteFile: false,
        transformation: {
          pre: 'w-1200,h-800,c-limit,q-auto,f-auto', // width: 1200, height: 800, crop: limit, quality: auto, format: auto
        },
      })) as ImageKitUploadResult;

      this.logger.log(`Image uploaded successfully: ${result.fileId}`);
      return result.url;
    } catch (error: any) {
      this.logger.error(`ImageKit upload failed: ${error.message}`, error.stack);
      
      // Provide more specific error messages
      if (error.message?.includes('authentication')) {
        throw new BadRequestException('ImageKit authentication failed. Please check your credentials.');
      }
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        throw new BadRequestException('Network error while uploading image. Please try again.');
      }
      
      throw new BadRequestException(
        `Failed to upload image: ${error.message || 'Unknown error'}`
      );
    }
  }

  async uploadMultipleImages(files: UploadedFile[]): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Limit concurrent uploads to avoid overwhelming the service
    const maxConcurrent = 5;
    const results: string[] = [];
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((file) => this.uploadImage(file))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
