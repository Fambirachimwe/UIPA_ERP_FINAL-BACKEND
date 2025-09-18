import bcrypt from "bcryptjs";
import { connectToDatabase } from "../utils/db";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import { env } from "../utils/env";

async function seedUsers() {
    await connectToDatabase();

    // Clear existing data
    // eslint-disable-next-line no-console
    console.log("🗑️  Clearing existing users and employees...");
    await Employee.deleteMany({});
    await User.deleteMany({});
    // eslint-disable-next-line no-console
    console.log("✅ Database cleared");

    const defaultPassword = process.env.SEED_PASSWORD || "secret123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const users = [
        {
            email: "ceo@uip.test",
            role: "admin" as const,
            attributes: {
                department: "Executive",
                approval_level: "level2",
                employee_id: "EMP001"
            },
            name: "CEO User",
            position: "Chief Executive Officer"
        },
        {
            email: "admin@uip.test",
            role: "admin" as const,
            attributes: {
                department: "HQ",
                approval_level: "level2",
                employee_id: "EMP002"
            },
            name: "Admin User",
            position: "System Administrator"
        },
        {
            email: "supervisor@uip.test",
            role: "approver" as const,
            attributes: {
                department: "Operations",
                approval_level: "level1",
                employee_id: "EMP003"
            },
            name: "Supervisor User",
            position: "Operations Supervisor"
        },
        {
            email: "manager@uip.test",
            role: "approver" as const,
            attributes: {
                department: "IT",
                approval_level: "level1",
                employee_id: "EMP004"
            },
            name: "IT Manager",
            position: "IT Department Manager"
        },
        {
            email: "employee@uip.test",
            role: "employee" as const,
            attributes: {
                department: "Operations",
                employee_id: "EMP005"
            },
            name: "Regular Employee",
            position: "Operations Staff"
        },
        {
            email: "itstaff@uip.test",
            role: "employee" as const,
            attributes: {
                department: "IT",
                employee_id: "EMP006"
            },
            name: "IT Staff",
            position: "Developer"
        },
    ];

    const createdEmployees: any[] = [];

    for (const u of users) {
        const created = await User.create({
            email: u.email,
            passwordHash,
            role: u.role,
            attributes: u.attributes,
        });

        const employee = await Employee.create({
            userId: created._id,
            name: u.name,
            email: u.email,
            department: u.attributes?.department,
            position: u.position,
            hireDate: new Date(),
            contractType: "full_time",
        });

        createdEmployees.push({ user: created, employee, userData: u });

        // eslint-disable-next-line no-console
        console.log(`✅ Seeded: ${u.email} (${u.role}, ${u.attributes?.approval_level || 'no level'}) - ${defaultPassword}`);
    }

    // Set up manager relationships
    const itManager = createdEmployees.find(e => e.userData.email === "manager@uip.test");
    const supervisor = createdEmployees.find(e => e.userData.email === "supervisor@uip.test");
    const itStaff = createdEmployees.find(e => e.userData.email === "itstaff@uip.test");
    const employee = createdEmployees.find(e => e.userData.email === "employee@uip.test");

    if (itManager && itStaff) {
        await Employee.findByIdAndUpdate(itStaff.employee._id, { manager: itManager.employee._id });
        // eslint-disable-next-line no-console
        console.log("🔗 Set IT Staff manager → IT Manager");
    }

    if (supervisor && employee) {
        await Employee.findByIdAndUpdate(employee.employee._id, { manager: supervisor.employee._id });
        // eslint-disable-next-line no-console
        console.log("🔗 Set Employee manager → Supervisor");
    }

    // eslint-disable-next-line no-console
    console.log(`\n🎉 Seed complete! Backend running on port: ${env.port}`);
    // eslint-disable-next-line no-console
    console.log("\n📋 Test Users:");
    // eslint-disable-next-line no-console
    console.log("CEO (level2):        ceo@uip.test / secret123");
    // eslint-disable-next-line no-console
    console.log("Admin (level2):      admin@uip.test / secret123");
    // eslint-disable-next-line no-console
    console.log("Supervisor (level1): supervisor@uip.test / secret123");
    // eslint-disable-next-line no-console
    console.log("IT Manager (level1): manager@uip.test / secret123");
    // eslint-disable-next-line no-console
    console.log("Employee:            employee@uip.test / secret123");
    // eslint-disable-next-line no-console
    console.log("IT Staff:            itstaff@uip.test / secret123");
}

seedUsers()
    .then(() => process.exit(0))
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Seed failed", err);
        process.exit(1);
    });


