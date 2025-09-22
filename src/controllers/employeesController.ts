import { Request, Response } from "express";
import { z } from "zod";
import { Employee } from "../models/Employee";
import { User } from "../models/User";
import { LeaveType } from "../models/LeaveType";
import { LeaveBalance } from "../models/LeaveBalance";
import { AuthenticatedRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

const createSchema = z.object({
    userId: z.string().optional(),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    hireDate: z.string().datetime().optional(),
    contractType: z.string().optional(),
    manager: z.string().optional(),
    salary: z.number().optional(),
    documents: z
        .object({
            idCardUrl: z.string().url().optional(),
            resumeUrl: z.string().url().optional(),
            certificates: z.array(z.string().url()).optional(),
        })
        .optional(),
});

const createWithUserSchema = z.object({
    // User data
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["employee", "approver", "admin"]).default("employee"),
    approval_level: z.enum(["level1", "level2"]).optional(),

    // Employee data
    name: z.string().min(1),
    phone: z.string().optional(),
    department: z.string().min(1),
    position: z.string().optional(),
    hireDate: z.string().datetime().optional(),
    contractType: z.string().optional(),
    manager: z.string().optional(),
    salary: z.number().optional(),
    employee_id: z.string().optional(),
    documents: z
        .object({
            idCardUrl: z.string().url().optional(),
            resumeUrl: z.string().url().optional(),
            certificates: z.array(z.string().url()).optional(),
        })
        .optional(),
});

export async function listEmployees(_req: Request, res: Response) {
    const employees = await Employee.find().limit(100).sort({ createdAt: -1 });
    return res.json(employees);
}

export async function getEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ error: "Not found" });
    return res.json(employee);
}

export async function createEmployee(req: AuthenticatedRequest, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const employee = await Employee.create(parsed.data as any);
    return res.status(201).json(employee);
}

export async function updateEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const parsed = createSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await Employee.findByIdAndUpdate(id, parsed.data as any, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
}

export async function deleteEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
}

export async function createEmployeeWithUser(req: AuthenticatedRequest, res: Response) {
    const parsed = createWithUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const {
        email,
        password,
        role,
        approval_level,
        name,
        phone,
        department,
        position,
        hireDate,
        contractType,
        manager,
        salary,
        employee_id,
        documents,
    } = parsed.data;

    try {
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        // Check if employee_id already exists (if provided)
        if (employee_id) {
            const existingEmployee = await Employee.findOne({
                $or: [
                    { email },
                    { "userId": { $exists: true } }
                ]
            });

            if (existingEmployee) {
                return res.status(409).json({ error: "Employee with this email already exists" });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create User first
        const userAttributes: any = {
            department,
            employee_id,
        };

        if (approval_level) {
            userAttributes.approval_level = approval_level;
        }

        const user = await User.create({
            email,
            passwordHash,
            role,
            attributes: userAttributes,
        });

        // Create Employee linked to User
        const employeeData: any = {
            userId: user._id,
            name,
            email,
            phone,
            department,
            position,
            contractType,
            salary,
            documents,
        };

        if (hireDate) {
            employeeData.hireDate = new Date(hireDate);
        }

        if (manager) {
            employeeData.manager = manager;

        }

        const employee = await Employee.create(employeeData);

        // console.warn('employee', employee);

        // Initialize leave balances for all active leave types
        try {
            const activeLeaveTypes = await LeaveType.find({ isActive: true });
            const currentYear = new Date().getFullYear();

            const leaveBalances = activeLeaveTypes.map(leaveType => ({
                employeeId: employee._id,
                leaveTypeId: leaveType._id,
                year: currentYear,
                allocated: leaveType.defaultDays || 0,
                used: 0,
                pending: 0,
                carryOver: 0,
            }));

            // console.log('leaveBalances', leaveBalances);

            if (leaveBalances.length > 0) {
                await LeaveBalance.insertMany(leaveBalances);
                console.log(`Created ${leaveBalances.length} leave balance records for employee: ${employee.name}`);
            }

            // console.log('leaveBalances inserted');
        } catch (balanceError) {
            console.error('Error creating leave balances:', balanceError);
            // Don't fail the employee creation if leave balance creation fails
            // This is a non-critical operation that can be done manually later
        }

        // Get the created leave balances count for response
        const leaveBalancesCount = await LeaveBalance.countDocuments({
            employeeId: employee._id,
            year: new Date().getFullYear()
        });

        // Return created employee with user info
        const result = {
            id: employee._id,
            userId: user._id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
            role: user.role,
            approval_level: user.attributes.approval_level,
            createdAt: employee.createdAt,
            leaveBalancesInitialized: leaveBalancesCount,
            message: `Employee created successfully with ${leaveBalancesCount} leave balance(s) initialized for ${new Date().getFullYear()}`,
        };

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}

export async function initializeLeaveBalances(req: AuthenticatedRequest, res: Response) {
    try {
        const { employeeId } = req.params;
        const { year } = req.body;

        const targetYear = year || new Date().getFullYear();

        // Find the employee
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Check if leave balances already exist for this year
        const existingBalances = await LeaveBalance.find({
            employeeId,
            year: targetYear
        });

        if (existingBalances.length > 0) {
            return res.status(409).json({
                error: `Leave balances already exist for employee ${employee.name} for year ${targetYear}`,
                existingBalances: existingBalances.length
            });
        }

        // Get all active leave types
        const activeLeaveTypes = await LeaveType.find({ isActive: true });

        if (activeLeaveTypes.length === 0) {
            return res.status(400).json({ error: "No active leave types found" });
        }

        // Create leave balances
        const leaveBalances = activeLeaveTypes.map(leaveType => ({
            employeeId: employee._id,
            leaveTypeId: leaveType._id,
            year: targetYear,
            allocated: leaveType.defaultDays || 0,
            used: 0,
            pending: 0,
            carryOver: 0,
        }));

        const createdBalances = await LeaveBalance.insertMany(leaveBalances);

        return res.status(201).json({
            success: true,
            message: `Successfully initialized ${createdBalances.length} leave balances for ${employee.name} for year ${targetYear}`,
            employee: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                department: employee.department,
            },
            balancesCreated: createdBalances.length,
            year: targetYear,
        });

    } catch (error: any) {
        console.error('Error initializing leave balances:', error);
        return res.status(500).json({ error: error.message });
    }
}

export async function getEligibleSupervisors(req: AuthenticatedRequest, res: Response) {
    try {
        const currentUserId = req.user!.id;

        console.log(currentUserId);

        // Get current user's employee record
        const currentEmployee = await Employee.findOne({ userId: currentUserId });
        if (!currentEmployee) {
            return res.status(404).json({ error: "Employee profile not found" });
        }

        // Find eligible supervisors
        // 1. Users with approval_level: "level1" 
        // 2. Users with role: "admin"
        // 3. Same department supervisors
        // 4. Direct manager from Employee.manager field

        const eligibleSupervisors = await Employee.find().populate({
            path: 'userId',
            match: {
                $or: [
                    { role: 'admin' },
                    { role: 'approver' },
                    { 'attributes.approval_level': 'level1' },
                    { 'attributes.approval_level': 'level2' }
                ]
            },
            select: 'email role attributes'
        });

        // Filter out results where userId population failed (no approval rights)
        const validSupervisors = eligibleSupervisors.filter(emp => emp.userId);

        // Get pending request counts for each supervisor
        const { LeaveRequest } = await import("../models/LeaveRequest");
        const supervisorsWithWorkload = await Promise.all(
            validSupervisors.map(async (supervisor) => {
                const pendingCount = await LeaveRequest.countDocuments({
                    supervisorId: supervisor._id,
                    status: 'submitted'
                });

                return {
                    id: supervisor._id,
                    name: supervisor.name,
                    email: supervisor.email,
                    department: supervisor.department,
                    position: supervisor.position,
                    isDirectManager: (supervisor._id as any).equals(currentEmployee.manager),
                    pendingApprovals: pendingCount,
                    userRole: (supervisor.userId as any)?.role,
                    approvalLevel: (supervisor.userId as any)?.attributes?.approval_level
                };
            })
        );

        // Sort by direct manager first, then by pending workload
        supervisorsWithWorkload.sort((a, b) => {
            if (a.isDirectManager && !b.isDirectManager) return -1;
            if (!a.isDirectManager && b.isDirectManager) return 1;
            return a.pendingApprovals - b.pendingApprovals;
        });

        return res.json(supervisorsWithWorkload);
    } catch (error) {
        console.error('Error fetching eligible supervisors:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Employee Document Management

const uploadDocumentSchema = z.object({
    documentType: z.enum(["idCard", "resume", "contract", "certificate"]),
    documentName: z.string().optional(), // For contracts and certificates
});

export async function uploadEmployeeDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = uploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Check if file was uploaded
    if (!req.file) return res.status(400).json({ error: "Document file is required" });

    const { documentType, documentName } = parsed.data;

    try {
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        const documentUrl = `/api/uploads/documents/${req.file.filename}`;

        // Initialize documents object if it doesn't exist
        if (!employee.documents) {
            employee.documents = {};
        }

        // Handle different document types
        switch (documentType) {
            case "idCard":
                employee.documents.idCardUrl = documentUrl;
                break;
            case "resume":
                employee.documents.resumeUrl = documentUrl;
                break;
            case "contract":
                if (!employee.documents.contracts) employee.documents.contracts = [];
                employee.documents.contracts.push({
                    name: documentName || req.file.originalname,
                    url: documentUrl
                });
                break;
            case "certificate":
                if (!employee.documents.certificates) employee.documents.certificates = [];
                employee.documents.certificates.push({
                    name: documentName || req.file.originalname,
                    url: documentUrl
                });
                break;
            default:
                return res.status(400).json({ error: "Invalid document type" });
        }

        await employee.save();

        const updatedEmployee = await Employee.findById(id);
        return res.json({
            message: "Document uploaded successfully",
            employee: updatedEmployee,
            uploadedDocument: {
                type: documentType,
                name: documentName || req.file.originalname,
                url: documentUrl,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    } catch (error: any) {
        // Clean up uploaded file if document creation fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error uploading employee document:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function deleteEmployeeDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { documentType, documentIndex } = req.body;

    try {
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        if (!employee.documents) {
            return res.status(404).json({ error: "No documents found" });
        }

        let documentPath: string | undefined;

        // Handle different document types
        switch (documentType) {
            case "idCard":
                if (employee.documents.idCardUrl) {
                    documentPath = employee.documents.idCardUrl;
                    employee.documents.idCardUrl = undefined;
                }
                break;
            case "resume":
                if (employee.documents.resumeUrl) {
                    documentPath = employee.documents.resumeUrl;
                    employee.documents.resumeUrl = undefined;
                }
                break;
            case "contract":
                if (employee.documents.contracts && employee.documents.contracts[documentIndex]) {
                    documentPath = employee.documents.contracts[documentIndex].url;
                    employee.documents.contracts.splice(documentIndex, 1);
                }
                break;
            case "certificate":
                if (employee.documents.certificates && employee.documents.certificates[documentIndex]) {
                    documentPath = employee.documents.certificates[documentIndex].url;
                    employee.documents.certificates.splice(documentIndex, 1);
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid document type" });
        }

        if (!documentPath) {
            return res.status(404).json({ error: "Document not found" });
        }

        await employee.save();

        // Try to delete the physical file
        try {
            const fullPath = path.join(process.cwd(), documentPath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (fileError) {
            console.error('Error deleting file:', fileError);
            // Don't fail the request if file deletion fails
        }

        const updatedEmployee = await Employee.findById(id);
        return res.json({
            message: "Document deleted successfully",
            employee: updatedEmployee
        });
    } catch (error: any) {
        console.error('Error deleting employee document:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


