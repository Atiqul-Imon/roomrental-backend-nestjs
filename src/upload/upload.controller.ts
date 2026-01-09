import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (file && !file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('File must be an image'), false);
      }
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single image' })
  async uploadImage(@UploadedFile() file: any, @Req() req: Request) {
    this.logger.log(`Upload request received. Content-Type: ${req.headers['content-type']}`);
    this.logger.log(`File received: ${file ? 'Yes' : 'No'}`);
    
    if (file) {
      this.logger.log(`File details: name=${file.originalname}, size=${file.size}, mimetype=${file.mimetype}`);
    } else {
      this.logger.warn('No file received in request');
      this.logger.warn(`Request headers: ${JSON.stringify(req.headers)}`);
      this.logger.warn(`Request body keys: ${Object.keys(req.body || {})}`);
    }
    
    if (!file) {
      throw new BadRequestException('No file received. Please ensure the file field is named "image" and the file is a valid image.');
    }
    
    const url = await this.uploadService.uploadImage(file);
    return {
      success: true,
      data: { url },
    };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple images' })
  async uploadImages(@UploadedFiles() files: any[]) {
    const urls = await this.uploadService.uploadMultipleImages(files);
    return {
      success: true,
      data: { urls },
    };
  }
}

