import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single image' })
  async uploadImage(@UploadedFile() file: any) {
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

