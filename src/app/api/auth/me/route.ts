import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { erpDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("erp-session-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // Fetch fresh user data from DB to ensure role/status is current
    const dbUser = await erpDb.users.findUnique({ where: { id: payload.id as string } });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (dbUser.status === "PENDING") {
      return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
    }

    if (dbUser.status === "REJECTED") {
      return NextResponse.json({ error: "Account rejected" }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.roleId === "RSM" ? "REGIONAL_SALES_MANAGER" : dbUser.roleId,
        branch: dbUser.branch || "Head Office",
        status: dbUser.status
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Session verification failed" }, { status: 500 });
  }
}
