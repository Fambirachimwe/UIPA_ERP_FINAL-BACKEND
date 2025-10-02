import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { cloudinaryService } from "../services/cloudinaryService";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer to use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allowed file types for documents
    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "image/jpeg",
        "image/png",
        "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};

// Configure multer
export const documentUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Middleware for single document upload
export const uploadDocument = documentUpload.single("document");

// Middleware to upload single document to Cloudinary
export const uploadDocumentToCloudinary = async (req: any, res: any, next: any) => {
    try {
        if (!req.file) {
            return next();
        }

        const result = await cloudinaryService.uploadBuffer(req.file.buffer, {
            folder: 'uip-erp/documents',
            public_id: `${randomUUID()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
        });

        // Add Cloudinary info to the file object
        req.file.cloudinary = {
            public_id: result.public_id,
            secure_url: result.secure_url,
            original_filename: result.original_filename,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
        };

        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ error: 'Failed to upload file to cloud storage' });
    }
};

// ---------------- Transfers Upload (separate config) ----------------

// Use memory storage for transfers as well
const transferStorage = multer.memoryStorage();

export const transferUpload = multer({
    storage: transferStorage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB per file initial limit
    },
});

// Middleware to upload transfer files to Cloudinary
export const uploadTransfersToCloudinary = async (req: any, res: any, next: any) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        const files = Array.isArray(req.files) ? req.files : [req.files];
        const cloudinaryResults = [];

        for (const file of files) {
            const result = await cloudinaryService.uploadBuffer(file.buffer, {
                folder: 'uip-erp/transfers',
                public_id: `${randomUUID()}_${file.originalname.replace(/\.[^/.]+$/, '')}`,
            });

            // Add Cloudinary info to the file object
            file.cloudinary = {
                public_id: result.public_id,
                secure_url: result.secure_url,
                original_filename: result.original_filename,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
            };

            cloudinaryResults.push(file);
        }

        // Replace req.files with the updated files
        req.files = cloudinaryResults;

        next();
    } catch (error) {
        console.error('Cloudinary upload error for transfers:', error);
        return res.status(500).json({ error: 'Failed to upload files to cloud storage' });
    }
};
