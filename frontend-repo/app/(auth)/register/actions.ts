"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

export async function registerUser(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (existingUser) {
        return {
            success: false,
            error: "Email already exists",
        };
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            passwordHash: hashedPassword,
            role: "ADMIN",
        },
    });

    return {
        success: true,
        userId: user.id,
    };
}