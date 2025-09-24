import bcrypt from "bcryptjs";
import { connectToDatabase } from "../utils/db";
import { User } from "../models/User";
import { Employee } from "../models/Employee";

async function ensureAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || "admin.@uipafrica.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "test123";

    await connectToDatabase();

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
        // eslint-disable-next-line no-console
        console.log(`👤 Admin user already exists: ${adminEmail}`);
        return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const user = await User.create({
        email: adminEmail,
        passwordHash,
        role: "admin",
        attributes: {
            department: "Executive",
            approval_level: "level2",
            employee_id: "ADMIN001",
        },
    });

    await Employee.create({
        userId: user._id,
        name: "System Administrator",
        email: adminEmail,
        department: "Executive",
        position: "Administrator",
        hireDate: new Date(),
        contractType: "full_time",
    });

    // eslint-disable-next-line no-console
    console.log(`✅ Created admin user: ${adminEmail}`);
}

ensureAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("❌ Failed to ensure admin user:", err);
        process.exit(1);
    });


