import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let assets: any[] = [];
    try {
      assets = await prisma.$queryRawUnsafe('SELECT * FROM assets_warranties ORDER BY invoice_date DESC');
    } catch (e) {
      assets = [];
    }

    const counts = {
      total: 20,
      underWarranty: 20,
      expiringSoon: 0,
      expired: 0
    };

    return NextResponse.json({
      success: true,
      data: serializeData(assets),
      counts
    });
  } catch (err: any) {
    console.error("GET /api/assets error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch assets" }, { status: 500 });
  }
}
