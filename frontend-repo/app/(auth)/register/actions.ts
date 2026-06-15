"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

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

    const cookieStore = await cookies();
    cookieStore.set(
        "user",
        JSON.stringify({
            name: user.name,
            email: user.email,
            role: user.role,
            id: user.id,
        }),
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        }
    );

    return {
        success: true,
        user: {
            id: user.id,
            name: user.name ?? "",
            email: user.email,
            role: user.role,
        },
    };
}