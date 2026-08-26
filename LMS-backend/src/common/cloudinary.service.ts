import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    this.isConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.logger.log('☁️  Cloudinary configured successfully');
    } else {
      this.logger.warn('⚠️  Cloudinary env vars not set — uploads will fall back to local disk');
    }
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Returns the secure Cloudinary URL or null if Cloudinary is not configured.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder = 'lms/pdf-courses',
  ): Promise<string | null> {
    if (!this.isConfigured) return null;

    return new Promise((resolve, reject) => {
      const publicId = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'raw',   // 'raw' is required for PDFs / non-image files
          use_filename: false,
          unique_filename: false,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload failed:', error?.message);
            reject(error || new Error('No result returned from Cloudinary'));
          } else {
            this.logger.log(`☁️  Uploaded to Cloudinary: ${result.secure_url}`);
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
