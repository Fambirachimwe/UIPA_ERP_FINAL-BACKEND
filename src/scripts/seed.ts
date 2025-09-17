import bcrypt from "bcryptjs";
import { connectToDatabase } from "../utils/db";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import { env } from "../utils/env";

async function seedUsers() {
    await connectToDatabase();

    const defaultPassword = process.env.SEED_PASSWORD || "secret123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const users = [
        {
            email: "admin@uip.test",
            role: "admin" as const,
            attributes: { department: "HQ", approval_level: "final" },
        },
        {
            email: "approver@uip.test",
            role: "approver" as const,
            attributes: { department: "Operations", approval_level: "level1" },
        },
        {
            email: "employee@uip.test",
            role: "employee" as const,
            attributes: { department: "Operations" },
        },
    ];

    for (const u of users) {
        const existing = await User.findOne({ email: u.email });
        if (existing) {
            // eslint-disable-next-line no-console
            console.log(`User exists: ${u.email}`);
            continue;
        }
        const created = await User.create({
            email: u.email,
            passwordHash,
            role: u.role,
            attributes: u.attributes,
        });

        await Employee.create({
            userId: created._id,
            name: u.email.split("@")[0],
            email: u.email,
            department: (u.attributes as any)?.department,
            position: u.role,
            hireDate: new Date(),
            contractType: "full_time",
        });

        // eslint-disable-next-line no-console
        console.log(`Seeded user: ${u.email} (role: ${u.role}) password: ${defaultPassword}`);
    }

    // eslint-disable-next-line no-console
    console.log(`Seed complete. Backend running port: ${env.port}`);
}

seedUsers()
    .then(() => process.exit(0))
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Seed failed", err);
        process.exit(1);
    });


