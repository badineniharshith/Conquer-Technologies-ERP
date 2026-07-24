import { erpDb } from "@/lib/db";
import ReservedStockClient from "@/components/reservations/ReservedStockClient";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReservedStockPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    redirect("/login");
  }

  let reservations: any[] = [];
  let customers: any[] = [];
  let products: any[] = [];
  let inventory: any[] = [];

  const isCustomer = payload.role === "CUSTOMER";
  const isSuperAdmin = payload.role === "SUPER_ADMIN";
  const isDirectorOrManager = ["DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"].includes(payload.role);

  // Fetch reservations based on role
  if (isCustomer) {
    reservations = await erpDb.stockReservations.findMany({
      where: { customerId: payload.id },
      include: {
        product: true,
        user: true,
        employee: true
      }
    });
  } else if (isSuperAdmin || isDirectorOrManager) {
    reservations = await erpDb.stockReservations.findMany({
      include: {
        product: true,
        user: true,
        employee: true
      }
    });
  } else {
    // Executive / Assistant Manager
    const assigned = await erpDb.users.findMany({
      where: { roleId: "CUSTOMER", reportsToId: payload.id },
      select: { id: true }
    });
    const customerIds = assigned.map((c: any) => c.id);

    reservations = await erpDb.stockReservations.findMany({
      where: {
        OR: [
          { employeeId: payload.id },
          { customerId: { in: customerIds } }
        ]
      },
      include: {
        product: true,
        user: true,
        employee: true
      }
    });
  }

  // Employees, Admins, and Super Admins should be able to select ANY active Customer when creating a reservation
  if (!isCustomer) {
    customers = await erpDb.users.findMany({
      where: { roleId: "CUSTOMER", status: "ACTIVE" },
      include: {
        assignedEmployee: {
          select: { id: true, name: true, email: true, phone: true, branchName: true }
        }
      }
    });
  }

  // Load products and inventory details for ALL roles (including Customer) so they can choose items to lock
  products = await erpDb.products.findMany({
    where: { status: "ACTIVE" }
  });
  inventory = await erpDb.inventory.findMany();

  const branchesList = await erpDb.branches.findMany();

  return (
    <ReservedStockClient
      reservations={reservations}
      currentUser={payload}
      customers={customers}
      products={products}
      inventory={inventory}
      branches={branchesList}
    />
  );
}
