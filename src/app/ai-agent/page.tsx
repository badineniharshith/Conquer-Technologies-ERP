import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { redirect } from "next/navigation";
import AiAgentClient from "./AiAgentClient";

export const dynamic = "force-dynamic";

export default async function AiAgentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    redirect("/login");
  }

  return (
    <AiAgentClient
      userEmail={payload.email}
      userRole={payload.role}
    />
  );
}
