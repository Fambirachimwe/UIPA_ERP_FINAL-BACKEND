import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { listContacts, getContact, createContact, updateContact, deleteContact } from "../controllers/contactsController";

export const contactRouter = Router();

// All authenticated employees can list, view, create, and update contacts
contactRouter.get("/", requireAuth, listContacts);
contactRouter.get("/:id", requireAuth, getContact);
contactRouter.post("/", requireAuth, createContact);
contactRouter.put("/:id", requireAuth, updateContact);

// Only admins can delete contacts
contactRouter.delete("/:id", requireAuth, requireRole(["admin"]), deleteContact);
