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

    const role = user.roleId;
    let reservations: any[] = [];

    if (role === "SUPER_ADMIN" || role === "DIRECTOR_OPERATIONS" || role === "ADMIN") {
      // Super Admin & Director: Full visibility across all operations
      reservations = await erpDb.stockReservations.findMany({
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "OPERATIONS_MANAGER") {
      // Manager: All Assistant Managers, Executives, and Customers under them
      const mySubordinates = await erpDb.users.findMany({
        where: { reportsToId: user.id },
        select: { id: true }
      });
      const subIds = mySubordinates.map((s: any) => s.id);

      const execSubordinates = await erpDb.users.findMany({
        where: { reportsToId: { in: subIds } },
        select: { id: true }
      });
      const execIds = execSubordinates.map((e: any) => e.id);

      const allDownlineUserIds = [user.id, ...subIds, ...execIds];

      reservations = await erpDb.stockReservations.findMany({
        where: {
          OR: [
            { employeeId: { in: allDownlineUserIds } },
            { customerId: { in: allDownlineUserIds } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "ASSISTANT_MANAGER") {
      // Assistant Manager: All Executives under them & customers of those executives
      const myExecutives = await erpDb.users.findMany({
        where: { reportsToId: user.id },
        select: { id: true }
      });
      const execIds = myExecutives.map((e: any) => e.id);

      reservations = await erpDb.stockReservations.findMany({
        where: {
          OR: [
            { employeeId: { in: [user.id, ...execIds] } },
            { user: { reportsToId: { in: [user.id, ...execIds] } } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "OPERATIONS_EXECUTIVE") {
      // Operations Executive: Only their customers and reservations assigned to them
      reservations = await erpDb.stockReservations.findMany({
        where: {
          OR: [
            { employeeId: user.id },
            { user: { reportsToId: user.id } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "CUSTOMER") {
      // Customer: Only own reservations
      reservations = await erpDb.stockReservations.findMany({
        where: { customerId: user.id },
        orderBy: { createdAt: "desc" }
      });
    } else {
      reservations = await erpDb.stockReservations.findMany({
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
