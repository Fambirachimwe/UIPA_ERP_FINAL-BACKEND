import { Request, Response } from "express";
import { z } from "zod";
import { Employee } from "../models/Employee";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";
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
        };

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}


