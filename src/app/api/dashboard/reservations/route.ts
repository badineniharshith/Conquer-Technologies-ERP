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

    let reservations: any[] = [];
    if (isAdmin) {
      reservations = await erpDb.stockReservations.findMany({
        orderBy: { createdAt: "desc" }
      });
    } else if (isEmployee) {
      reservations = await erpDb.stockReservations.findMany({
        where: { employeeId: user.id },
        orderBy: { createdAt: "desc" }
      });
    } else if (isCustomer) {
      reservations = await erpDb.stockReservations.findMany({
        where: { customerId: user.id },
        orderBy: { createdAt: "desc" }
      });
    }

    const pendingCount = reservations.filter((r: any) => r.status === "PENDING" || r.status === "ACTIVE").length;
    const acceptedCount = reservations.filter((r: any) => r.status === "ACCEPTED").length;
    const rejectedCount = reservations.filter((r: any) => r.status === "REJECTED").length;
    const expiredCount = reservations.filter((r: any) => r.status === "EXPIRED").length;
    const completedCount = reservations.filter((r: any) => r.status === "COMPLETED").length;

    return NextResponse.json({
      reservations,
      stats: {
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        expired: expiredCount,
        completed: completedCount,
        total: reservations.length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
