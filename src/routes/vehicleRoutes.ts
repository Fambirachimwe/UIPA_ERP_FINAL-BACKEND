import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadDocument, uploadVehicleDocumentToCloudinary } from "../middleware/upload";
import {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    uploadVehicleDocument,
    deleteVehicleDocument,
    addServiceRecord,
    updateVehicleStatus,
    getVehicleAssignmentStatus,
} from "../controllers/vehiclesController";

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/vehicles - List vehicles with search and filtering
router.get("/", getVehicles);

// GET /api/vehicles/assignment-status - Get assignment status overview
router.get("/assignment-status", getVehicleAssignmentStatus);

// GET /api/vehicles/:id - Get single vehicle
router.get("/:id", getVehicle);

// POST /api/vehicles - Create new vehicle (Admin/Approver only)
router.post("/", createVehicle);

// PUT /api/vehicles/:id - Update vehicle
router.put("/:id", updateVehicle);

// DELETE /api/vehicles/:id - Delete vehicle (Admin only)
router.delete("/:id", deleteVehicle);

// POST /api/vehicles/:id/documents - Upload vehicle document (Admin/Approver only)
router.post(
    "/:id/documents",
    uploadDocument,
    uploadVehicleDocumentToCloudinary,
    uploadVehicleDocument
);

// DELETE /api/vehicles/:id/documents/:documentId - Delete vehicle document (Admin/Approver only)
router.delete("/:id/documents/:documentId", deleteVehicleDocument);

// POST /api/vehicles/:id/service - Add service record (Admin/Approver only)
router.post("/:id/service", addServiceRecord);

// PUT /api/vehicles/:id/status - Update vehicle status (Admin/Approver only)
router.put("/:id/status", updateVehicleStatus);

export { router as vehicleRouter };
