import { NextRequest, NextResponse } from "next/server";
import { authenticateUserAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password fields" }, { status: 400 });
    }

    const result = await authenticateUserAction(email, password);
    if (result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: any) {
    console.error("AI LOGIN ENDPOINT ERROR:", err);
    return NextResponse.json({ error: err.message || "Authentication failed" }, { status: 500 });
  }
}
