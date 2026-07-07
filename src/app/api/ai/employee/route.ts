import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { runAiAgentQuery } from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Session Verification
    const tokenCookie = req.cookies.get("erp-session-token");
    const token = tokenCookie?.value;
    if (!token) {
      return NextResponse.json({ error: "Access Denied: Unauthenticated" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !["SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(payload.role)) {
      return NextResponse.json({ error: "Access Denied: Requires Employee/Staff Privileges" }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;
    if (!message) {
      return NextResponse.json({ error: "Missing message payload" }, { status: 400 });
    }

    // Force role to employee for query evaluation to apply correct rules
    const targetRole = payload.role === "EMPLOYEE" ? "EMPLOYEE" : payload.role;

    const response = await runAiAgentQuery(message, targetRole, payload.id);
    return NextResponse.json({ response });
  } catch (err: any) {
    console.error("AI EMPLOYEE ENDPOINT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
