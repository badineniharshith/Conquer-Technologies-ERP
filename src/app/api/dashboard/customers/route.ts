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

    let customers: any[] = [];
    if (isAdmin) {
      customers = await erpDb.users.findMany({
        where: { roleId: "CUSTOMER" }
      });
    } else if (isEmployee) {
      customers = await erpDb.users.findMany({
        where: { roleId: "CUSTOMER", assignedEmployeeId: user.id }
      });
    }

    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
