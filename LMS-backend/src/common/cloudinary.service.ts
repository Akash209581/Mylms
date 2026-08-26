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
   * Returns the secure Cloudinary URL or null if Cloudinary is not configured / upload fails.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder = 'lms/pdf-courses',
  ): Promise<string | null> {
    const { cloudName, apiKey, apiSecret, isConfigured } = this.getCredentials();

    if (!isConfigured) {
      this.logger.warn(
        `⚠️ Cloudinary credentials missing in process.env (cloudName=${!!cloudName}, apiKey=${!!apiKey}, apiSecret=${!!apiSecret}). Falling back to local disk.`,
      );
      return null;
    }

    // Configure Cloudinary dynamically on each upload call
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return new Promise((resolve) => {
      const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const publicId = `${Date.now()}-${safeName}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto', // Handles both PDF and presentation files
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
