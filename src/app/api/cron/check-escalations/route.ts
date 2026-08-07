import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/cron/check-escalations - Run escalation checks for Phase 7 (Reservations) & Phase 8 (Purchase Orders)
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    let reservationsNotified = 0;
    let poNotified = 0;

    // ─── 1. PHASE 7: RESERVATION ESCALATION ────────────────────────────────────
    const pendingReservations = await (prisma as any).stockReservation.findMany({
      where: { status: { in: ["PENDING", "Pending Verification", "Modified by Customer (Pending Verification)"] } },
      include: { customer: true, employee: true }
    });

    for (const res of pendingReservations) {
      const hoursPending = (now.getTime() - new Date(res.createdAt).getTime()) / (1000 * 60 * 60);

      const execId = res.employeeId;
      let execUser = null;
      let asstMgrUser = null;
      let scmMgrUser = null;
      let directorUser = null;
      let superAdminUser = null;

      if (execId) {
        execUser = await (prisma as any).employee.findUnique({
          where: { id: execId },
          include: { manager: { include: { manager: { include: { manager: true } } } } }
        });
        asstMgrUser = execUser?.manager;
        scmMgrUser = asstMgrUser?.manager;
        directorUser = scmMgrUser?.manager;
      }

      const superAdmins = await (prisma as any).employee.findMany({ where: { adminAccess: true } });
      superAdminUser = superAdmins[0] || null;

      // 8 Hours Pending (8h+) -> Notify Super Admin, Director, SCM Manager, Assistant Manager, Executive
      if (hoursPending >= 8) {
        const recipients = [superAdminUser?.id, directorUser?.id, scmMgrUser?.id, asstMgrUser?.id, execUser?.id].filter(Boolean) as number[];
        for (const rId of recipients) {
          const title = "⚠️ CRITICAL (8h Escalation): Reservation Pending Verification";
          const message = `Reservation ${res.reservationNumber} for ${res.customer?.name} has been pending verification for over 8 hours!`;

          const existing = await (prisma as any).notification.findFirst({
            where: {
              userId: String(rId),
              title: { contains: "8h Escalation" },
              message: { contains: res.reservationNumber }
            }
          });
          if (!existing) {
            await (prisma as any).notification.create({
              data: { userId: String(rId), title, message }
            });
          }
        }
        reservationsNotified++;
      }
      // 6 Hours Pending (6h+) -> Notify Director, SCM Manager, Assistant Manager, Executive
      else if (hoursPending >= 6) {
        const recipients = [directorUser?.id, scmMgrUser?.id, asstMgrUser?.id, execUser?.id].filter(Boolean) as number[];
        for (const rId of recipients) {
          const title = "⚠️ HIGH (6h Escalation): Reservation Pending Verification";
          const message = `Reservation ${res.reservationNumber} for ${res.customer?.name} has been pending verification for over 6 hours.`;

          const existing = await (prisma as any).notification.findFirst({
            where: {
              userId: String(rId),
              title: { contains: "6h Escalation" },
              message: { contains: res.reservationNumber }
            }
          });
          if (!existing) {
            await (prisma as any).notification.create({
              data: { userId: String(rId), title, message }
            });
          }
        }
        reservationsNotified++;
      }
      // 4 Hours Pending (4h+) -> Notify SCM Manager, Assistant Manager, Executive
      else if (hoursPending >= 4) {
        const recipients = [scmMgrUser?.id, asstMgrUser?.id, execUser?.id].filter(Boolean) as number[];
        for (const rId of recipients) {
          const title = "⚠️ MEDIUM (4h Escalation): Reservation Pending Verification";
          const message = `Reservation ${res.reservationNumber} for ${res.customer?.name} has been pending verification for over 4 hours.`;

          const existing = await (prisma as any).notification.findFirst({
            where: {
              userId: String(rId),
              title: { contains: "4h Escalation" },
              message: { contains: res.reservationNumber }
            }
          });
          if (!existing) {
            await (prisma as any).notification.create({
              data: { userId: String(rId), title, message }
            });
          }
        }
        reservationsNotified++;
      }
      // 2 Hours Pending (2h+) -> Notify Assistant Manager, Executive
      else if (hoursPending >= 2) {
        const recipients = [asstMgrUser?.id, execUser?.id].filter(Boolean) as number[];
        for (const rId of recipients) {
          const title = "⚡ Escalation (2h): Reservation Pending Verification";
          const message = `Reservation ${res.reservationNumber} for ${res.customer?.name} has been pending verification for over 2 hours.`;

          const existing = await (prisma as any).notification.findFirst({
            where: {
              userId: String(rId),
              title: { contains: "2h" },
              message: { contains: res.reservationNumber }
            }
          });
          if (!existing) {
            await (prisma as any).notification.create({
              data: { userId: String(rId), title, message }
            });
          }
        }
        reservationsNotified++;
      }
    }

    // ─── 2. PHASE 8: PURCHASE ORDER VERIFICATION ESCALATION ─────────────────
    const pendingPOs = await (prisma as any).purchaseOrder.findMany({
      where: { verificationStatus: { in: ["Pending", "Checking"] } },
      include: { customer: true, assignedOps: true }
    });

    for (const po of pendingPOs) {
      const hoursUnverified = (now.getTime() - new Date(po.dateReceived).getTime()) / (1000 * 60 * 60);

      const execId = po.assignedOperationsEmployeeId;
      let execUser = null;
      let asstMgrUser = null;
      let scmMgrUser = null;
      let directorUser = null;

      if (execId) {
        execUser = await (prisma as any).employee.findUnique({
          where: { id: execId },
          include: { manager: { include: { manager: { include: { manager: true } } } } }
        });
        asstMgrUser = execUser?.manager;
        scmMgrUser = asstMgrUser?.manager;
        directorUser = scmMgrUser?.manager;
      }

      // 6 Hours Unverified -> Notify All Operations Managers & Super Admin
      if (hoursUnverified >= 6) {
        const allManagers = await (prisma as any).employee.findMany({
          where: { erpAccess: true }
        });
        for (const mgr of allManagers) {
          await (prisma as any).notification.create({
            data: {
              userId: String(mgr.id),
              title: "🚨 CRITICAL PO ESCALATION (6h+ Unverified)",
              message: `Purchase Order ${po.poNumber} (${po.customerName || po.customer?.name}) has been unverified for over 6 hours!`
            }
          });
        }
        poNotified++;
      }
      // 4 Hours Unverified -> Notify SCM Manager & Director
      else if (hoursUnverified >= 4) {
        const recipients = [scmMgrUser?.id, directorUser?.id].filter(Boolean) as number[];
        for (const rId of recipients) {
          await (prisma as any).notification.create({
            data: {
              userId: String(rId),
              title: "⚠️ HIGH PO ESCALATION (4h Unverified)",
              message: `Purchase Order ${po.poNumber} (${po.customerName || po.customer?.name}) has been unverified for over 4 hours.`
            }
          });
        }
        poNotified++;
      }
      // 2 Hours Unverified -> Notify Assistant Manager
      else if (hoursUnverified >= 2) {
        if (asstMgrUser?.id) {
          await (prisma as any).notification.create({
            data: {
              userId: String(asstMgrUser.id),
              title: "⚡ MEDIUM PO ESCALATION (2h Unverified)",
              message: `Purchase Order ${po.poNumber} (${po.customerName || po.customer?.name}) requires verification (unverified > 2 hours).`
            }
          });
        }
        poNotified++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      reservationsNotified,
      poNotified
    });
  } catch (err: any) {
    console.error("GET /api/cron/check-escalations error:", err);
    return NextResponse.json({ error: err.message || "Failed to check escalations" }, { status: 500 });
  }
}
