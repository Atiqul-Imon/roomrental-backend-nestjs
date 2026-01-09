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

    // Log file details for debugging
    this.logger.log(`Received file: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`);

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 10MB');
    }

    // Check if ImageKit is configured
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');

    this.logger.log(`ImageKit config check - PublicKey: ${publicKey ? 'Set' : 'Missing'}, PrivateKey: ${privateKey ? 'Set' : 'Missing'}, UrlEndpoint: ${urlEndpoint ? 'Set' : 'Missing'}`);

    if (!publicKey || !privateKey || !urlEndpoint) {
      this.logger.error('ImageKit credentials not configured');
      this.logger.error(`Missing: ${!publicKey ? 'IMAGEKIT_PUBLIC_KEY ' : ''}${!privateKey ? 'IMAGEKIT_PRIVATE_KEY ' : ''}${!urlEndpoint ? 'IMAGEKIT_URL_ENDPOINT' : ''}`);
      throw new BadRequestException('Image upload service is not configured. Please contact support.');
    }

    // Validate file buffer exists
    if (!file.buffer || file.buffer.length === 0) {
      this.logger.error('File buffer is empty or missing');
      throw new BadRequestException('File data is corrupted or missing');
    }

    try {
      this.logger.log(`Uploading to ImageKit: ${file.originalname}`);
      
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

      this.logger.log(`Image uploaded successfully: ${result.fileId}, URL: ${result.url}`);
      return result.url;
    } catch (error: any) {
      // Extract error message properly
      let errorMessage = 'Unknown error';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      } else if (error?.response?.data) {
        const responseData = error.response.data;
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.help) {
          // ImageKit returns errors with a "help" field
          errorMessage = typeof responseData.help === 'string' ? responseData.help : JSON.stringify(responseData.help);
        } else if (responseData?.error) {
          errorMessage = typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else {
          errorMessage = JSON.stringify(responseData);
        }
      } else if (error?.help) {
        // Handle ImageKit error with "help" field directly
        errorMessage = typeof error.help === 'string' ? error.help : JSON.stringify(error.help);
      } else {
        // Try to stringify the error object safely
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = error?.toString() || 'Unknown error';
        }
      }
      
      this.logger.error(`ImageKit upload failed: ${errorMessage}`, error.stack);
      this.logger.error(`Error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      this.logger.error(`Full error details:`, {
        message: error?.message,
        response: error?.response?.data,
        help: error?.help,
        error: error?.error,
        status: error?.status,
        statusCode: error?.statusCode,
      });
      
      // Provide more specific error messages
      const lowerMessage = errorMessage.toLowerCase();
      
      // Check for ImageKit Internal Server Error
      if (lowerMessage.includes('internal server error') || lowerMessage.includes('"help":"internal server error"')) {
        // Log the actual error for debugging
        this.logger.error(`ImageKit Internal Server Error. Full error: ${JSON.stringify(error)}`);
        throw new BadRequestException(
          `Image upload service error: ${errorMessage}. Please check ImageKit configuration and credentials.`
        );
      }
      
      if (lowerMessage.includes('authentication') || lowerMessage.includes('invalid') || lowerMessage.includes('credential') || lowerMessage.includes('unauthorized')) {
        throw new BadRequestException('Image upload service authentication failed. Please contact support.');
      }
      if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('econnrefused') || lowerMessage.includes('econnreset')) {
        throw new BadRequestException('Network error while uploading image. Please check your connection and try again.');
      }
      if (lowerMessage.includes('enotfound') || lowerMessage.includes('getaddrinfo') || lowerMessage.includes('dns')) {
        throw new BadRequestException('Cannot reach image upload service. Please try again later.');
      }
      if (lowerMessage.includes('size') || lowerMessage.includes('too large') || lowerMessage.includes('exceed')) {
        throw new BadRequestException('File size exceeds the maximum limit. Please use a smaller image.');
      }
      
      // Return a user-friendly error message
      throw new BadRequestException(
        `Failed to upload image: ${errorMessage}`
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
