import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyToken, getOrCreateUser } from "./verify";

export async function getOrCreateUserFromAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    const isAuthRequired = request.method !== "GET";
    if (isAuthRequired) {
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
    const authUserInfo = await verifyToken(token, provider);
    const user = await getOrCreateUser(authUserInfo, provider);
    return user;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
