import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private getCredentials() {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
    const isConfigured = !!(cloudName && apiKey && apiSecret);
    return { cloudName, apiKey, apiSecret, isConfigured };
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Uses resource_type: 'raw' for PDFs to avoid image delivery restrictions.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder = 'lms/pdf-courses',
  ): Promise<string | null> {
    const { cloudName, apiKey, apiSecret, isConfigured } = this.getCredentials();

    if (!isConfigured) {
      this.logger.warn(
        `⚠️ Cloudinary credentials missing in process.env. Falling back to local disk.`,
      );
      return null;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return new Promise((resolve) => {
      // Strip existing .pdf extension to avoid duplicate extensions
      const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const isPdf = originalName.toLowerCase().endsWith('.pdf');
      const ext = isPdf ? '.pdf' : '';
      const publicId = `${Date.now()}-${baseName}${ext}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'raw',
          type: 'upload',
          access_mode: 'public',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`❌ Cloudinary upload error: ${error?.message || 'Unknown error'}`);
            resolve(null);
          } else {
            this.logger.log(`☁️ Successfully uploaded PDF to Cloudinary: ${result.secure_url}`);
            resolve(result.secure_url);
          }
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}


