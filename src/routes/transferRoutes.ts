import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { transferUpload } from "../middleware/upload";
import { createTransfer, resolveMeta, requestAccess, downloadFile, listMyTransfers, downloadAll, getTransferDetail, addFiles, deleteTransfer } from "../controllers/transfersController";
// import rateLimit from "express-rate-limit";

export const transferRouter = Router();

// Basic rate limit for access attempts
// const accessLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Create a new transfer with one or more files
transferRouter.post("/", requireAuth, transferUpload.array("files", 20), createTransfer);

// List my transfers
transferRouter.get("/", requireAuth, listMyTransfers);

// Transfer detail
transferRouter.get("/:id", requireAuth, getTransferDetail);

// Delete transfer
transferRouter.delete("/:id", requireAuth, deleteTransfer);

// Add files (supports folder upload and versioning)
transferRouter.post("/:id/files", requireAuth, transferUpload.array("files", 200), addFiles);

// Public metadata resolve
transferRouter.get("/:shortCode/resolve", resolveMeta);

// Request access (password check) and get signed URLs
transferRouter.post("/:shortCode/access", requestAccess);

// Download a single file with short-lived token
transferRouter.get("/:shortCode/download/:fileId", downloadFile);

// Download all files as zip
transferRouter.get("/:shortCode/download-all", downloadAll);


