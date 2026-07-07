import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { erpDb, prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isDb = !erpDb.isMock();
    const totalCount = isDb ? await prisma.product.count() : (await erpDb.products.findMany()).length;

    // Fetch latest 10 products
    const latestProducts = await erpDb.products.findMany({
      take: 10,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      products: latestProducts,
      totalCount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
