import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
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

  const isSuperAdmin = ["SUPER_ADMIN", "DIRECTOR", "ADMIN"].includes(payload.role);

  if (isSuperAdmin) {
    reservations = await prisma.stockReservation.findMany({
      include: {
        product: true,
        customer: true,
        employee: true,
        items: true
      },
      orderBy: { createdAt: "desc" }
    });
  } else {
    reservations = await prisma.stockReservation.findMany({
      include: {
        product: true,
        customer: true,
        employee: true,
        items: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    select: { 
      id: true, 
      name: true, 
      customerCode: true,
      companyLegalName: true,
      tradeName: true,
      gstNumber: true,
      email: true, 
      phone: true,
      billingAddress: true,
      shippingAddress: true,
      assignedExecutive: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  products = await prisma.product.findMany({
    where: { status: "ACTIVE" }
  });

  inventory = await prisma.inventory.findMany();
  const branchesList = await prisma.branch.findMany();

  return (
    <ReservedStockClient
      reservations={serializeData(reservations)}
      currentUser={serializeData(payload)}
      customers={serializeData(customers)}
      products={serializeData(products)}
      inventory={serializeData(inventory)}
      branches={serializeData(branchesList)}
    />
  );
}
