import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { env } from '../utils/env';

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
});

export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    original_filename: string;
    format: string;
    resource_type: string;
    bytes: number;
    width?: number;
    height?: number;
}

export interface CloudinaryUploadOptions {
    folder?: string;
    resource_type?: 'auto' | 'image' | 'video' | 'raw';
    transformation?: any;
    public_id?: string;
    overwrite?: boolean;
    invalidate?: boolean;
}

class CloudinaryService {
    /**
     * Upload a file buffer to Cloudinary
     */
    async uploadBuffer(
        buffer: Buffer,
        options: CloudinaryUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'uip-erp',
                    resource_type: options.resource_type || 'auto',
                    public_id: options.public_id,
                    overwrite: options.overwrite || false,
                    invalidate: options.invalidate || true,
                    ...options.transformation,
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else if (result) {
                        resolve({
                            public_id: result.public_id,
                            secure_url: result.secure_url,
                            original_filename: result.original_filename || '',
                            format: result.format,
                            resource_type: result.resource_type,
                            bytes: result.bytes,
                            width: result.width,
                            height: result.height,
                        });
                    } else {
                        reject(new Error('Upload failed: No result returned'));
                    }
                }
            );

            // Convert buffer to stream
            const bufferStream = new Readable();
            bufferStream.push(buffer);
            bufferStream.push(null);
            bufferStream.pipe(uploadStream);
        });
    }

    /**
     * Upload a file from a stream to Cloudinary
     */
    async uploadStream(
        stream: Readable,
        options: CloudinaryUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'uip-erp',
                    resource_type: options.resource_type || 'auto',
                    public_id: options.public_id,
                    overwrite: options.overwrite || false,
                    invalidate: options.invalidate || true,
                    ...options.transformation,
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else if (result) {
                        resolve({
                            public_id: result.public_id,
                            secure_url: result.secure_url,
                            original_filename: result.original_filename || '',
                            format: result.format,
                            resource_type: result.resource_type,
                            bytes: result.bytes,
                            width: result.width,
                            height: result.height,
                        });
                    } else {
                        reject(new Error('Upload failed: No result returned'));
                    }
                }
            );

            stream.pipe(uploadStream);
        });
    }

    /**
     * Delete a file from Cloudinary
     */
    async deleteFile(publicId: string, resourceType: string = 'auto'): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });
            return result.result === 'ok';
        } catch (error) {
            console.error('Error deleting file from Cloudinary:', error);
            return false;
        }
    }

    /**
     * Get file info from Cloudinary
     */
    async getFileInfo(publicId: string, resourceType: string = 'auto') {
        try {
            return await cloudinary.api.resource(publicId, {
                resource_type: resourceType,
            });
        } catch (error) {
            console.error('Error getting file info from Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Generate a signed URL for private files
     */
    generateSignedUrl(publicId: string, options: any = {}) {
        return cloudinary.url(publicId, {
            sign_url: true,
            ...options,
        });
    }

    /**
     * Generate a transformation URL
     */
    generateTransformationUrl(publicId: string, transformations: any = {}) {
        return cloudinary.url(publicId, {
            transformation: transformations,
        });
    }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
