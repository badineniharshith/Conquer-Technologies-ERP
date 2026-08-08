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

    let assignedEmployee = null;
    if (dbUser.assignedEmployeeId) {
      const emp = await erpDb.users.findUnique({ where: { id: dbUser.assignedEmployeeId } });
      if (emp) {
        let managerName = null;
        if (emp.reportsToId) {
          const mgr = await erpDb.users.findUnique({ where: { id: emp.reportsToId } });
          if (mgr) {
            managerName = mgr.name;
          }
        }
        assignedEmployee = {
          id: emp.id,
          employeeId: emp.employeeId || null,
          name: emp.name,
          email: emp.email,
          phone: emp.phone || null,
          branch: emp.branchName || emp.branch || "Head Office",
          designation: emp.designation || "Operations Executive",
          officeLocation: emp.city || emp.branchName || "Hyderabad",
          reportsToName: managerName || null,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        customerId: dbUser.customerId || null,
        name: dbUser.name,
        companyName: dbUser.companyName || dbUser.name,
        email: dbUser.email,
        // IMPORTANT: Use role.name not roleId — ERP roles use UUID-based roleIds in the DB.
        // role.name is the human-readable string (e.g., "DIRECTOR_OPERATIONS").
        role: (dbUser as any).role?.name || (dbUser.roleId === "RSM" ? "REGIONAL_SALES_MANAGER" : dbUser.roleId),
        branch: dbUser.branch || "Head Office",
        status: dbUser.status,
        assignedEmployee
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Session verification failed" }, { status: 500 });
  }
}
