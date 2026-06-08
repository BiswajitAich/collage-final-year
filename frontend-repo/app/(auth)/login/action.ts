"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

interface LoginInput {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export async function loginUser(data: LoginInput) {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (!existingUser) {
        return {
            success: false,
            error: "Invalid email or password",
        };
    }

    const isValid = await bcrypt.compare(
        data.password,
        existingUser.passwordHash
    );

    if (!isValid) {
        return {
            success: false,
            error: "Invalid email or password",
        };
    }
    const cookieStore = await cookies();

    cookieStore.set(
        "user",
        JSON.stringify({
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            id: existingUser.id,
        }),
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",

            ...(data.rememberMe
                ? { maxAge: 60 * 60 * 24 * 7 } // 7 days
                : {}),
        }
    );
    return {
        success: true,
    };
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete("user");
}

export async function getUser(): Promise<{
    name: string,
    email: string,
    role: string,
    id: string,
} | null> {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie?.value) {
        return null;
    }

    return JSON.parse(userCookie.value);
}