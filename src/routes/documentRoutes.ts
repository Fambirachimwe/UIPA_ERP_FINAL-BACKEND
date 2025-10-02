import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadDocument, uploadDocumentToCloudinary } from "../middleware/upload";
import {
    listDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    uploadNewVersion,
    previewReference,
    getDocumentStats,
} from "../controllers/documentsController";

export const documentRouter = Router();

// Document CRUD operations
documentRouter.get("/", requireAuth, listDocuments);
documentRouter.get("/stats", requireAuth, getDocumentStats);
documentRouter.get("/preview-reference", requireAuth, previewReference);
documentRouter.get("/:id", requireAuth, getDocument);
documentRouter.post("/", requireAuth, uploadDocument, uploadDocumentToCloudinary, createDocument);
documentRouter.put("/:id", requireAuth, updateDocument);
documentRouter.delete("/:id", requireAuth, deleteDocument);

// File operations
documentRouter.get("/:id/download", requireAuth, downloadDocument);
documentRouter.post("/:id/versions", requireAuth, uploadDocument, uploadDocumentToCloudinary, uploadNewVersion);
