import { Injectable, BadRequestException } from '@nestjs/common';
import * as ImageKit from 'imagekit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private imagekit: ImageKit;

  constructor(private configService: ConfigService) {
    this.imagekit = new ImageKit.default({
      publicKey: this.configService.get<string>('IMAGEKIT_PUBLIC_KEY') || '',
      privateKey: this.configService.get<string>('IMAGEKIT_PRIVATE_KEY') || '',
      urlEndpoint: this.configService.get<string>('IMAGEKIT_URL_ENDPOINT') || '',
    });
  }

  async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    try {
      const result = await this.imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: '/roomrental',
        useUniqueFileName: true,
        overwriteFile: false,
        transformation: {
          pre: 'w-1200,h-800,c-limit,q-auto,f-auto', // width: 1200, height: 800, crop: limit, quality: auto, format: auto
        },
      });

      return result.url;
    } catch (error) {
      throw new BadRequestException('Failed to upload image: ' + error.message);
    }
  }

  async uploadMultipleImages(files: any[]): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }
}
