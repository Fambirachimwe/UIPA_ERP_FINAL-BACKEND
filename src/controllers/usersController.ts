import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import { AuthenticatedRequest } from "../middleware/auth";

const updateUserSchema = z.object({
    email: z.string().email().optional(),
    role: z.enum(["employee", "approver", "admin"]).optional(),
    attributes: z.object({
        department: z.string().optional(),
        employee_id: z.string().optional(),
        approval_level: z.string().optional(),
    }).partial().optional(),
});

const resetPasswordSchema = z.object({
    newPassword: z.string().min(6),
});

export async function getUserById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    try {
        const user = await User.findById(id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getUserByEmployeeId(req: AuthenticatedRequest, res: Response) {
    const { employeeId } = req.params;

    try {
        // Find employee first
        const employee = await Employee.findById(employeeId);
        if (!employee || !employee.userId) {
            return res.status(404).json({ error: "Employee or associated user not found" });
        }

        // Get user data
        const user = await User.findById(employee.userId).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json(user);
    } catch (error) {
        console.error('Error fetching user by employee ID:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const parsed = updateUserSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { email, role, attributes } = parsed.data;

        // Check if email is already taken by another user
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(409).json({ error: "Email already in use" });
            }
        }

        const updateData: any = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (attributes) {
            updateData.attributes = attributes;
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // If email was updated, also update the employee record
        if (email) {
            await Employee.findOneAndUpdate(
                { userId: id },
                { email },
                { new: true }
            );
        }

        return res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateUserByEmployeeId(req: AuthenticatedRequest, res: Response) {
    const { employeeId } = req.params;
    const parsed = updateUserSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        // Find employee first
        const employee = await Employee.findById(employeeId);
        if (!employee || !employee.userId) {
            return res.status(404).json({ error: "Employee or associated user not found" });
        }

        const { email, role, attributes } = parsed.data;

        // Check if email is already taken by another user
        if (email) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: employee.userId }
            });
            if (existingUser) {
                return res.status(409).json({ error: "Email already in use" });
            }
        }

        const updateData: any = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (attributes) {
            updateData.attributes = attributes;
        }

        const updatedUser = await User.findByIdAndUpdate(
            employee.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // If email was updated, also update the employee record
        if (email) {
            await Employee.findByIdAndUpdate(
                employeeId,
                { email },
                { new: true }
            );
        }

        return res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user by employee ID:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { newPassword } = parsed.data;

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { passwordHash },
            { new: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function resetUserPasswordByEmployeeId(req: AuthenticatedRequest, res: Response) {
    const { employeeId } = req.params;
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        // Find employee first
        const employee = await Employee.findById(employeeId);
        if (!employee || !employee.userId) {
            return res.status(404).json({ error: "Employee or associated user not found" });
        }

        const { newPassword } = parsed.data;

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const updatedUser = await User.findByIdAndUpdate(
            employee.userId,
            { passwordHash },
            { new: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error('Error resetting password by employee ID:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
