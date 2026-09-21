import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt, verifySsoToken } from "@/lib/jwt";
import { signJwt } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, code } = await req.json();
    const incomingToken = token || code;

    if (!incomingToken) {
      return NextResponse.json({ error: "Missing SSO authorization token" }, { status: 400 });
    }

    // Try SSO token verification first (with JTI single-use enforcement)
    const ssoPayload = await verifySsoToken(incomingToken);
    
    // If not a valid SSO token, try regular JWT verification
    const payload = ssoPayload 
      ? { id: ssoPayload.sub, name: ssoPayload.name, email: ssoPayload.email, role: ssoPayload.role, branch: ssoPayload.branch }
      : await verifyJwt(incomingToken);

    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired SSO token" }, { status: 401 });
    }

    // Create a fresh long-lived session token for the authenticated user
    const sessionToken = await signJwt({
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      branch: payload.branch,
    });

    const cookieStore = await cookies();
    cookieStore.set("erp-session-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        branch: payload.branch,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SSO Callback processing failed" }, { status: 500 });
  }
}

