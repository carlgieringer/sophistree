import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, getOrCreateUser } from "./auth/verify";

export async function middleware(request: NextRequest) {
  const requiresAuth = request.method !== "GET";
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    if (requiresAuth) {
      return NextResponse.json(
        {
          error:
            "Authorization required but no authorization header was provided.",
        },
        { status: 401 }
      );
    } else {
      return NextResponse.next();
    }
  }

  const [authType, token] = authHeader.split(" ");
  if (authType !== "Bearer" || !token) {
    return NextResponse.json(
      { error: "Invalid authorization header" },
      { status: 401 }
    );
  }

  // Get the auth provider from header
  const provider = request.headers.get("x-auth-provider");
  if (!provider) {
    return NextResponse.json(
      { error: "No auth provider specified" },
      { status: 401 }
    );
  }

  try {
    const tokenInfo = await verifyToken(token, provider);
    const user = await getOrCreateUser(tokenInfo, provider);

    // Add user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    // Protect all routes under /api/maps
    "/api/maps/:path*",
  ],
};
