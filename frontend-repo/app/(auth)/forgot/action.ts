"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

interface VerifyUserEmailInput {
    email: string;
}
interface ResetUserPasswordInput {
    email: string;
    password?: string;
}

export async function VerifyUserEmail(data: VerifyUserEmailInput) {
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
    return {
        success: true,
    }
}
export async function ResetUserPassword(data: ResetUserPasswordInput) {
    const p = data.password;
    if (!p || p.length < 8) {
        return {
            success: false,
            error: "Something went wrong try again!"
        }
    }
    const hashedPassword = await bcrypt.hash(p, 12);
    const user = await prisma.user.update({
        where: { email: data.email },
        data: {
            passwordHash: hashedPassword,
        },
    });
    if (!user) {
        return {
            success: false,
            error: "Something went wrong try again!"
        }
    }

    return {
        success: true,
    };
}
