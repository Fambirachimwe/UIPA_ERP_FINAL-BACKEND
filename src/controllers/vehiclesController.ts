import { Request, Response } from "express";
import { Vehicle, VehicleDocument } from "../models/Vehicle";
import { Employee } from "../models/Employee";
import { cloudinaryService } from "../services/cloudinaryService";
import { randomUUID } from "crypto";

import { AuthenticatedRequest } from "../middleware/auth";

// Get all vehicles with search and filtering
export const getVehicles = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { search, status, assignedTo, project } = req.query;
        const user = req.user;

        let query: any = {};

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { registrationNumber: { $regex: search, $options: "i" } },
                { make: { $regex: search, $options: "i" } },
                { vehicleModel: { $regex: search, $options: "i" } },
                { project: { $regex: search, $options: "i" } },
            ];
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by assigned employee
        if (assignedTo) {
            query.assignedTo = assignedTo;
        }

        // Filter by project
        if (project) {
            query.project = project;
        }

        // Non-admin users can only see vehicles in their department or assigned to them
        if (user?.role !== "admin") {
            const employee = await Employee.findOne({ userId: user?.id });
            if (employee) {
                query.$or = [
                    { assignedTo: employee._id },
                    { project: employee.department },
                ];
            } else {
                // If no employee record, return empty results
                return res.json({ vehicles: [] });
            }
        }

        const vehicles = await Vehicle.find(query)
            .populate("assignedTo", "name email department position")
            .sort({ createdAt: -1 });

        res.json({ vehicles });
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        res.status(500).json({ error: "Failed to fetch vehicles" });
    }
};

// Get a single vehicle by ID
export const getVehicle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const vehicle = await Vehicle.findById(id).populate(
            "assignedTo",
            "name email department position"
        );

        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Check permissions for non-admin users
        if (user?.role !== "admin") {
            const employee = await Employee.findOne({ userId: user?.id });
            if (employee) {
                const hasAccess =
                    vehicle.assignedTo?.toString() === employee._id.toString() ||
                    vehicle.project === employee.department;

                if (!hasAccess) {
                    return res.status(403).json({ error: "Access denied" });
                }
            } else {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        res.json({ vehicle });
    } catch (error) {
        console.error("Error fetching vehicle:", error);
        res.status(500).json({ error: "Failed to fetch vehicle" });
    }
};

// Create a new vehicle
export const createVehicle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;

        // Only admins and approvers can create vehicles
        if (user?.role !== "admin" && user?.role !== "approver") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        const vehicleData = req.body;

        // Validate required fields
        if (!vehicleData.name || !vehicleData.registrationNumber) {
            return res.status(400).json({
                error: "Name and registration number are required",
            });
        }

        // Check if registration number already exists
        const existingVehicle = await Vehicle.findOne({
            registrationNumber: vehicleData.registrationNumber,
        });

        if (existingVehicle) {
            return res.status(409).json({
                error: "Vehicle with this registration number already exists",
            });
        }

        // Validate assignedTo if provided
        if (vehicleData.assignedTo) {
            const employee = await Employee.findById(vehicleData.assignedTo);
            if (!employee) {
                return res.status(400).json({
                    error: "Assigned employee not found",
                });
            }
        }

        const vehicle = new Vehicle(vehicleData);
        await vehicle.save();

        await vehicle.populate("assignedTo", "name email department position");

        res.status(201).json({ vehicle });
    } catch (error) {
        console.error("Error creating vehicle:", error);
        res.status(500).json({ error: "Failed to create vehicle" });
    }
};

// Update a vehicle
export const updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const updateData = req.body;

        const vehicle = await Vehicle.findById(id);

        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Check permissions
        if (user?.role !== "admin" && user?.role !== "approver") {
            // Regular employees can only update vehicles assigned to them
            const employee = await Employee.findOne({ userId: user?.id });
            if (!employee || vehicle.assignedTo?.toString() !== employee._id.toString()) {
                return res.status(403).json({ error: "Insufficient permissions" });
            }
        }

        // Check if registration number is being changed and if it already exists
        if (updateData.registrationNumber && updateData.registrationNumber !== vehicle.registrationNumber) {
            const existingVehicle = await Vehicle.findOne({
                registrationNumber: updateData.registrationNumber,
                _id: { $ne: id },
            });

            if (existingVehicle) {
                return res.status(409).json({
                    error: "Vehicle with this registration number already exists",
                });
            }
        }

        // Validate assignedTo if being updated
        if (updateData.assignedTo && updateData.assignedTo !== vehicle.assignedTo?.toString()) {
            const employee = await Employee.findById(updateData.assignedTo);
            if (!employee) {
                return res.status(400).json({
                    error: "Assigned employee not found",
                });
            }
        }

        Object.assign(vehicle, updateData);
        await vehicle.save();

        await vehicle.populate("assignedTo", "name email department position");

        res.json({ vehicle });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        res.status(500).json({ error: "Failed to update vehicle" });
    }
};

// Delete a vehicle
export const deleteVehicle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Only admins can delete vehicles
        if (user?.role !== "admin") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        const vehicle = await Vehicle.findById(id);

        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        await Vehicle.findByIdAndDelete(id);

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        res.status(500).json({ error: "Failed to delete vehicle" });
    }
};

// Upload vehicle documents
export const uploadVehicleDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Only admins and approvers can upload documents
        if (user?.role !== "admin" && user?.role !== "approver") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Upload to Cloudinary
        const result = await cloudinaryService.uploadBuffer(req.file.buffer, {
            folder: 'uip-erp/vehicles',
            public_id: `${randomUUID()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
        });

        // Create document record
        const document = {
            type: req.body.documentType || 'general',
            name: req.body.documentName || req.file.originalname,
            url: result.secure_url,
            publicId: result.public_id,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: user?.id as any,
            uploadedAt: new Date(),
        };

        // Add document to vehicle
        if (!vehicle.documents) {
            vehicle.documents = [];
        }
        vehicle.documents.push(document);

        await vehicle.save();

        res.status(201).json({
            message: "Document uploaded successfully",
            document,
            vehicle,
        });
    } catch (error) {
        console.error("Error uploading vehicle document:", error);
        res.status(500).json({ error: "Failed to upload document" });
    }
};

// Delete vehicle document
export const deleteVehicleDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id, documentId } = req.params;
        const user = req.user;

        // Only admins and approvers can delete documents
        if (user?.role !== "admin" && user?.role !== "approver") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        const documentIndex = vehicle.documents?.findIndex(
            (doc: any) => doc._id?.toString() === documentId
        );

        if (documentIndex === -1 || !vehicle.documents) {
            return res.status(404).json({ error: "Document not found" });
        }

        const document = vehicle.documents[documentIndex];

        // Delete from Cloudinary
        if (document.publicId) {
            await cloudinaryService.deleteFile(document.publicId);
        }

        // Remove from vehicle
        vehicle.documents.splice(documentIndex, 1);
        await vehicle.save();

        res.json({ message: "Document deleted successfully", vehicle });
    } catch (error) {
        console.error("Error deleting vehicle document:", error);
        res.status(500).json({ error: "Failed to delete document" });
    }
};

// Add service record
export const addServiceRecord = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { serviceDate, notes } = req.body;

        // Only admins and approvers can add service records
        if (user?.role !== "admin" && user?.role !== "approver") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        if (!serviceDate) {
            return res.status(400).json({ error: "Service date is required" });
        }

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        const serviceRecord = {
            serviceDate: new Date(serviceDate),
            notes: notes || "",
        };

        if (!vehicle.serviceSchedule) {
            vehicle.serviceSchedule = [];
        }

        vehicle.serviceSchedule.push(serviceRecord);
        await vehicle.save();

        res.status(201).json({
            message: "Service record added successfully",
            serviceRecord,
            vehicle,
        });
    } catch (error) {
        console.error("Error adding service record:", error);
        res.status(500).json({ error: "Failed to add service record" });
    }
};

// Update vehicle status
export const updateVehicleStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user;

        // Only admins and approvers can update status
        if (user?.role !== "admin" && user?.role !== "approver") {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        const validStatuses = ["active", "in maintenance", "retired"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid status. Must be one of: active, in maintenance, retired",
            });
        }

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        vehicle.status = status;
        await vehicle.save();

        await vehicle.populate("assignedTo", "name email department position");

        res.json({ vehicle });
    } catch (error) {
        console.error("Error updating vehicle status:", error);
        res.status(500).json({ error: "Failed to update vehicle status" });
    }
};

// Get vehicles by assignment status
export const getVehicleAssignmentStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;

        const assignedVehicles = await Vehicle.find({ assignedTo: { $exists: true, $ne: null } })
            .populate("assignedTo", "name email department position")
            .sort({ createdAt: -1 });

        const unassignedVehicles = await Vehicle.find({ assignedTo: null })
            .sort({ createdAt: -1 });

        const statusCounts = {
            active: await Vehicle.countDocuments({ status: "active" }),
            inMaintenance: await Vehicle.countDocuments({ status: "in maintenance" }),
            retired: await Vehicle.countDocuments({ status: "retired" }),
        };

        res.json({
            assignedVehicles,
            unassignedVehicles,
            statusCounts,
        });
    } catch (error) {
        console.error("Error fetching vehicle assignment status:", error);
        res.status(500).json({ error: "Failed to fetch vehicle assignment status" });
    }
};
