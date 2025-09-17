import { Request, Response } from "express";
import { z } from "zod";
import { Employee } from "../models/Employee";
import { AuthenticatedRequest } from "../middleware/auth";

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


