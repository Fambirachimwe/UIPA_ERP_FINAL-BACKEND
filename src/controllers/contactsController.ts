import { Request, Response } from "express";
import { z } from "zod";
import { Contact } from "../models/Contact";
import { AuthenticatedRequest } from "../middleware/auth";

const createSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    category: z.enum(["supplier", "service provider", "customer", "other"]),
    companyName: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    preferredContactMethod: z.string().optional(),
    linkedEmployee: z.string().optional(),
});

export async function listContacts(req: Request, res: Response) {
    const { search, category } = req.query;
    let query: any = {};

    if (search) {
        query.$text = { $search: search as string };
    }
    if (category) {
        query.category = category;
    }

    const contacts = await Contact.find(query).limit(100).sort({ createdAt: -1 });
    return res.json(contacts);
}

export async function getContact(req: Request, res: Response) {
    const { id } = req.params;
    const contact = await Contact.findById(id).populate("linkedEmployee");
    if (!contact) return res.status(404).json({ error: "Not found" });
    return res.json(contact);
}

export async function createContact(req: AuthenticatedRequest, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Validate email and phone format if provided
    const { email, phone } = parsed.data;
    if (email && !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""))) {
        return res.status(400).json({ error: "Invalid phone format" });
    }

    const contact = await Contact.create(parsed.data);
    return res.status(201).json(contact);
}

export async function updateContact(req: Request, res: Response) {
    const { id } = req.params;
    const parsed = createSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await Contact.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
}

export async function deleteContact(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await Contact.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
}
