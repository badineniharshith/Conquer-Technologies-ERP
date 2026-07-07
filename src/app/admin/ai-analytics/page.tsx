import { erpDb } from "@/lib/db";
import AiAnalyticsClient from "@/components/admin/AiAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AiAnalyticsPage() {
  const auditLogs = await erpDb.aiAuditLogs.findMany();
  const queryLogs = await erpDb.aiQueryLogs.findMany();
  const chatSessions = await erpDb.chatSessions.findMany();
  const users = await erpDb.users.findMany();
  const products = await erpDb.products.findMany();

  return (
    <AiAnalyticsClient
      auditLogs={auditLogs}
      queryLogs={queryLogs}
      chatSessions={chatSessions}
      users={users}
      products={products}
    />
  );
}
