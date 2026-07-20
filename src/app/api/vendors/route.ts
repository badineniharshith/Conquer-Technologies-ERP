import { erpDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const vendor = await erpDb.vendors.findUnique({ where: { id } });
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }
      return NextResponse.json({ vendor });
    }

    const vendors = await erpDb.vendors.findMany({ where: { status: "ACTIVE" } });
    return NextResponse.json({ vendors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch vendors" }, { status: 500 });
  }
}
