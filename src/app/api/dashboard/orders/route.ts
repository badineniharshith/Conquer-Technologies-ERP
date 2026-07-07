import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { erpDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isEmployee = user.roleId === "EMPLOYEE";
    const isAdmin = user.roleId === "ADMIN" || user.roleId === "SUPER_ADMIN";
    const isCustomer = user.roleId === "CUSTOMER";

    let orders: any[] = [];
    if (isAdmin) {
      orders = await erpDb.stockReservations.findMany({
        where: { status: "COMPLETED" },
        take: 15,
        orderBy: { updatedAt: "desc" }
      });
    } else if (isEmployee) {
      orders = await erpDb.stockReservations.findMany({
        where: { status: "COMPLETED", employeeId: user.id },
        take: 15,
        orderBy: { updatedAt: "desc" }
      });
    } else if (isCustomer) {
      orders = await erpDb.stockReservations.findMany({
        where: { status: "COMPLETED", customerId: user.id },
        take: 15,
        orderBy: { updatedAt: "desc" }
      });
    }

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
