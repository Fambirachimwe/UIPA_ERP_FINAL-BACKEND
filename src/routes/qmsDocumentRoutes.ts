import express from "express";
import { requireAuth } from "../middleware/auth";
import { documentUpload, uploadDocumentToCloudinary } from "../middleware/upload";
import {
    getAllDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    submitForReview,
    approveDocument,
    obsoleteDocument,
    deleteDocument,
    getDocumentsDueForReview,
} from "../controllers/qmsDocumentController";

const router = express.Router();

// All document routes require authentication
router.use(requireAuth);

// Document CRUD operations
router.get("/", getAllDocuments);
router.get("/due-for-review", getDocumentsDueForReview);
router.get("/:id", getDocumentById);
router.post("/", documentUpload.single("file"), uploadDocumentToCloudinary, createDocument);
router.put("/:id", documentUpload.single("file"), uploadDocumentToCloudinary, updateDocument);

// Document workflow operations
router.post("/:id/submit-for-review", submitForReview);
router.post("/:id/approve", approveDocument);
router.post("/:id/obsolete", obsoleteDocument);

// Delete document (admin only)
router.delete("/:id", deleteDocument);

export default router;
