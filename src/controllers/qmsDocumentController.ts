import { Request, Response } from "express";
import { QMSDocument } from "../models/QMSDocument";
import { User } from "../models/User";
import { cloudinaryService } from "../services/cloudinaryService";
import { randomUUID } from "crypto";
import { AuthenticatedRequest } from "../middleware/auth";
import mongoose from "mongoose";

// Get all documents with filtering and pagination
export const getAllDocuments = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            documentType,
            department,
            search,
            sortBy = "updatedAt",
            sortOrder = "desc",
        } = req.query;

        const query: any = {};

        // Apply filters
        if (status) query.status = status;
        if (documentType) query.documentType = documentType;
        if (department) query.department = department;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { documentNumber: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search as string, "i")] } },
            ];
        }

        const sort: any = {};
        sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [documents, total] = await Promise.all([
            QMSDocument.find(query)
                .populate("createdBy", "name email")
                .populate("reviewedBy", "name email")
                .populate("approvedBy", "name email")
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit as string)),
            QMSDocument.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                documents,
                pagination: {
                    current: parseInt(page as string),
                    pages: Math.ceil(total / parseInt(limit as string)),
                    total,
                },
            },
        });
    } catch (error: any) {
        console.error("Error fetching documents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: error.message,
        });
    }
};

// Get document by ID
export const getDocumentById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const document = await QMSDocument.findById(id)
            .populate("createdBy", "name email")
            .populate("reviewedBy", "name email")
            .populate("approvedBy", "name email")
            .populate("accessRights.view", "name email")
            .populate("accessRights.edit", "name email")
            .populate("accessRights.approve", "name email")
            .populate("changeHistory.changedBy", "name email");

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        res.json({
            success: true,
            data: document,
        });
    } catch (error: any) {
        console.error("Error fetching document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch document",
            error: error.message,
        });
    }
};

// Create new document
export const createDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const {
            title,
            documentType,
            content,
            department,
            effectiveDate,
            nextReviewDate,
            accessRights,
            tags,
            file,
        } = req.body;

        // Generate document number
        const documentNumber = await generateDocumentNumber();

        // Handle file upload if provided
        let fileUrl, fileName, fileSize;
        if (file) {
            const uploadResult = await cloudinaryService.uploadBuffer(file.buffer, {
                folder: 'qms/documents',
                public_id: `${randomUUID()}_${file.originalname.replace(/\.[^/.]+$/, '')}`,
            });
            fileUrl = uploadResult.secure_url;
            fileName = file.name;
            fileSize = file.size;
        }

        const documentData = {
            title,
            documentType,
            documentNumber,
            content,
            department,
            effectiveDate: new Date(effectiveDate),
            nextReviewDate: new Date(nextReviewDate),
            accessRights: accessRights || {
                view: [],
                edit: [],
                approve: [],
            },
            tags: tags || [],
            fileUrl,
            fileName,
            fileSize,
            createdBy: user?.id,
            changeHistory: [
                {
                    version: "1.0",
                    changedBy: user?.id,
                    changeDate: new Date(),
                    changeDescription: "Document created",
                    changeType: "created",
                },
            ],
        };

        const document = new QMSDocument(documentData);
        await document.save();

        const populatedDocument = await QMSDocument.findById(document._id)
            .populate("createdBy", "name email");

        res.status(201).json({
            success: true,
            message: "Document created successfully",
            data: populatedDocument,
        });
    } catch (error: any) {
        console.error("Error creating document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create document",
            error: error.message,
        });
    }
};

// Update document
export const updateDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const updateData = req.body;

        const document = await QMSDocument.findById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        // Check if user has edit access
        const hasEditAccess = user?.role === "admin" ||
            document.accessRights.edit.includes(user?.id as unknown as mongoose.Types.ObjectId) ||
            document.createdBy.toString() === (user?.id as unknown as mongoose.Types.ObjectId).toString();

        if (!hasEditAccess) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to edit this document",
            });
        }

        // Handle file upload if provided
        if (updateData.file) {
            const uploadResult = await cloudinaryService.uploadBuffer(updateData.file.buffer, {
                folder: 'qms/documents',
                public_id: `${randomUUID()}_${updateData.file.originalname.replace(/\.[^/.]+$/, '')}`,
            });
            updateData.fileUrl = uploadResult.secure_url;
            updateData.fileName = updateData.file.name;
            updateData.fileSize = updateData.file.size;
        }

        // Update version if content changed
        if (updateData.content && updateData.content !== document.content) {
            const currentVersion = document.version;
            const [major, minor] = currentVersion.split(".").map(Number);
            const newVersion = minor < 9 ? `${major}.${minor + 1}` : `${major + 1}.0`;

            updateData.version = newVersion;

            // Add to change history
            updateData.$push = {
                changeHistory: {
                    version: newVersion,
                    changedBy: user?.id,
                    changeDate: new Date(),
                    changeDescription: updateData.changeDescription || "Document updated",
                    changeType: "updated",
                },
            };
        }

        const updatedDocument = await QMSDocument.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("createdBy", "name email")
            .populate("reviewedBy", "name email")
            .populate("approvedBy", "name email");

        res.json({
            success: true,
            message: "Document updated successfully",
            data: updatedDocument,
        });
    } catch (error: any) {
        console.error("Error updating document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update document",
            error: error.message,
        });
    }
};

// Submit document for review
export const submitForReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const document = await QMSDocument.findById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        // Check permissions
        const canSubmit = user?.role === "admin" ||
            document.accessRights.edit.includes(user?.id as unknown as mongoose.Types.ObjectId) ||
            document.createdBy.toString() === (user?.id as unknown as mongoose.Types.ObjectId).toString();

        console.log("this is the user", user);
        console.log("this is the document", document);
        console.log("this is the canSubmit", canSubmit);

        if (!canSubmit) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to submit this document for review",
            });
        }

        if (document.status !== "draft") {
            return res.status(400).json({
                success: false,
                message: "Only draft documents can be submitted for review",
            });
        }

        const updatedDocument = await QMSDocument.findByIdAndUpdate(
            id,
            {
                status: "under_review",
                reviewedBy: user?.id,
                reviewDate: new Date(),
                $push: {
                    changeHistory: {
                        version: document.version,
                        changedBy: user?.id,
                        changeDate: new Date(),
                        changeDescription: "Document submitted for review",
                        changeType: "updated",
                    },
                },
            },
            { new: true }
        )
            .populate("createdBy", "name email")
            .populate("reviewedBy", "name email");

        res.json({
            success: true,
            message: "Document submitted for review successfully",
            data: updatedDocument,
        });
    } catch (error: any) {
        console.error("Error submitting document for review:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit document for review",
            error: error.message,
        });
    }
};

// Approve document
export const approveDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { approvalComments } = req.body;

        const document = await QMSDocument.findById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        // Check approval permissions
        const canApprove = user?.role === "admin" ||
            document.accessRights.approve.includes(user?.id as unknown as mongoose.Types.ObjectId);

        if (!canApprove) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to approve this document",
            });
        }

        if (document.status !== "under_review") {
            return res.status(400).json({
                success: false,
                message: "Only documents under review can be approved",
            });
        }

        const updatedDocument = await QMSDocument.findByIdAndUpdate(
            id,
            {
                status: "approved",
                approvedBy: user?.id,
                $push: {
                    changeHistory: {
                        version: document.version,
                        changedBy: user?.id,
                        changeDate: new Date(),
                        changeDescription: approvalComments || "Document approved",
                        changeType: "approved",
                    },
                },
            },
            { new: true }
        )
            .populate("createdBy", "name email")
            .populate("reviewedBy", "name email")
            .populate("approvedBy", "name email");

        res.json({
            success: true,
            message: "Document approved successfully",
            data: updatedDocument,
        });
    } catch (error: any) {
        console.error("Error approving document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve document",
            error: error.message,
        });
    }
};

// Obsolete document
export const obsoleteDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { obsoleteReason } = req.body;

        const document = await QMSDocument.findById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        // Check permissions
        const canObsolete = user?.role === "admin" ||
            document.accessRights.approve.includes(user?.id as unknown as mongoose.Types.ObjectId);

        if (!canObsolete) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to obsolete this document",
            });
        }

        const updatedDocument = await QMSDocument.findByIdAndUpdate(
            id,
            {
                status: "obsolete",
                $push: {
                    changeHistory: {
                        version: document.version,
                        changedBy: user?.id,
                        changeDate: new Date(),
                        changeDescription: obsoleteReason || "Document obsoleted",
                        changeType: "obsoleted",
                    },
                },
            },
            { new: true }
        )
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email");

        res.json({
            success: true,
            message: "Document obsoleted successfully",
            data: updatedDocument,
        });
    } catch (error: any) {
        console.error("Error obsoleting document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to obsolete document",
            error: error.message,
        });
    }
};

// Delete document
export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user: AuthenticatedRequest["user"] = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const document = await QMSDocument.findById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        // Only admin can delete documents
        if (user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only administrators can delete documents",
            });
        }

        await QMSDocument.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Document deleted successfully",
        });
    } catch (error: any) {
        console.error("Error deleting document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete document",
            error: error.message,
        });
    }
};

// Get documents due for review
export const getDocumentsDueForReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { days = 30 } = req.query;
        const daysAhead = new Date();
        daysAhead.setDate(daysAhead.getDate() + parseInt(days as string));

        const documents = await QMSDocument.find({
            status: "approved",
            nextReviewDate: { $lte: daysAhead },
        })
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email")
            .select("title documentNumber version nextReviewDate department")
            .sort({ nextReviewDate: 1 });

        res.json({
            success: true,
            data: documents,
        });
    } catch (error: any) {
        console.error("Error fetching documents due for review:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch documents due for review",
            error: error.message,
        });
    }
};

// Helper function to generate document number
const generateDocumentNumber = async (): Promise<string> => {
    const counter = await require("../models/ReferenceCounter").findOneAndUpdate(
        { prefix: "DOC" },
        { $inc: { lastNumber: 1 } },
        { upsert: true, new: true }
    );
    const sequence = counter?.lastNumber?.toString().padStart(4, "0") || "0001";
    return `DOC-${new Date().getFullYear()}-${sequence}`;
};
