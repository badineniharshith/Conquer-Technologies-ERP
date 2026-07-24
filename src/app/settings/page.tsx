import { erpDb } from "@/lib/db";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const users = await erpDb.users.findMany({
    include: {
      assignedEmployee: {
        include: {
          assistantManager: true
        }
      },
      assistantManager: true
    }
  });
  const roles = await erpDb.roles.findMany();
  const branches = await erpDb.branches.findMany();
  const auditLogs: any[] = [];

  return (
    <SettingsClient
      users={users}
      roles={roles}
      branches={branches}
      auditLogs={auditLogs}
    />
  );
}
