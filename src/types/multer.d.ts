import { CloudinaryUploadResult } from '../services/cloudinaryService';

declare global {
    namespace Express {
        namespace Multer {
            interface File {
                cloudinary?: CloudinaryUploadResult;
            }
        }
    }
}

export { };
