import { erpDb } from "@/lib/db";
import AdminReservationsClient from "@/components/admin/AdminReservationsClient";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwt(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN"].includes(payload.role)) {
    redirect("/403");
  }

  // Fetch all customer reservations from database
  const reservations = await erpDb.stockReservations.findMany({
    include: {
      product: true,
      user: true,
      employee: true
    }
  });

  return (
    <AdminReservationsClient
      reservations={reservations}
    />
  );
}
