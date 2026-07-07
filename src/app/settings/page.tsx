import { erpDb } from "@/lib/db";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const users = await erpDb.users.findMany();
  const roles = await erpDb.roles.findMany();
  const branches = await erpDb.branches.findMany();
  const rawAiLogs = await erpDb.aiAuditLogs.findMany();
  const auditLogs = rawAiLogs.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    user: users.find((u: any) => u.id === log.userId) || { name: log.userId },
    action: "AI_AUDIT",
    details: `${log.actionChecked} (Allowed: ${log.permissionPassed})`
  }));

  return (
    <SettingsClient
      users={users}
      roles={roles}
      branches={branches}
      auditLogs={auditLogs}
    />
  );
}
