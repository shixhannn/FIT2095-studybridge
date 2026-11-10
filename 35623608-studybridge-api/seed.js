import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/user.js";
import Subject from "./models/subject.js";

const SALT_ROUNDS = 10;

async function seedDatabase() {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
    console.log("Connected to MongoDB");

    const adminEmail = "admin@student.monash.edu";
    const adminPassword = "Admin#2026"

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
        await User.create({
            fullName: "System Admin", email: adminEmail,
            passwordHash: passwordHash, role: "admin"
        });
        console.log("Created Admin ", adminEmail);
    } else {
        console.log("Admin already exists.");
    }

    const existingSubjects = await Subject.countDocuments();
    if (existingSubjects === 0) {
        await Subject.insertMany([
            { name: "Linear Algebra", category: "Mathematics" },
            { name: "Data Structures", category: "Computer Science" },
            { name: "Organic Chemistry", category: "Science" },
            { name: "Spanish Conversation", category: "Languages" },
            { name: "Financial Accounting", category: "Business" },
        ]);
        console.log("Created Subjects");
    } else {
        console.log("Subject already exists.");
    }

    await mongoose.disconnect();
};

seedDatabase(); 