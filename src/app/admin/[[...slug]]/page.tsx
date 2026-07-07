import { erpDb } from "@/lib/db";
import AdminClient from "@/components/admin/AdminClient";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function AdminCatchAllPage({ params }: PageProps) {
  // 1. Authenticate user and verify role is SUPER_ADMIN or ADMIN
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwt(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN"].includes(payload.role)) {
    redirect("/403");
  }

  // 2. Resolve parameters promise
  const resolvedParams = await params;
  const slug = resolvedParams.slug || ["dashboard"];

  // 3. Fetch data in parallel
  const [users, inventory] = await Promise.all([
    erpDb.users.findMany(),
    erpDb.inventory.findMany(),
  ]);

  return (
    <AdminClient
      users={users}
      auditLogs={[]}
      purchaseOrders={[]}
      invoices={[]}
      inventory={inventory}
      slug={slug}
    />
  );
}
