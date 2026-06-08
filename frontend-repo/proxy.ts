import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const userValue = request.cookies.get("user")?.value;
    const user = userValue ? JSON.parse(userValue) : null;
    const pathname = request.nextUrl.pathname;
    const authRoutes = ["/login", "/register"];
    const isAuthRoute = authRoutes.includes(pathname);
    if (!user && !isAuthRoute) {
        return NextResponse.redirect(
            new URL("/login", request.url)
        );
    }

    if (user && isAuthRoute) {
        return NextResponse.redirect(
            new URL("/dashboard", request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/login/:path*",
        "/dashboard/:path*",
        "/analysis/:path*",
        "/live-assistant/:path*",
        "/logs/:path*",
        "/schema/:path*",
        "/settings/:path*",
        "/tools/:path*",
        "/workflows/:path*",
    ]
}