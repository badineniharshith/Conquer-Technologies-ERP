import { prisma } from "@/lib/db";

/**
 * Gets all user IDs in the reporting hierarchy below a given user (direct + indirect subordinates).
 * Returns an array containing the user's own ID plus all subordinate IDs.
 */
export async function getDownlineUserIds(userId: string): Promise<string[]> {
  try {
    const allUsers = await prisma.user.findMany({
      select: { id: true, reportsToId: true }
    });

    const subordinateIds: string[] = [userId];
    const queue: string[] = [userId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const directSubs = allUsers.filter(u => u.reportsToId === currentId);
      for (const sub of directSubs) {
        if (!subordinateIds.includes(sub.id)) {
          subordinateIds.push(sub.id);
          queue.push(sub.id);
        }
      }
    }

    return subordinateIds;
  } catch (error) {
    console.error("Error computing downline user IDs:", error);
    return [userId];
  }
}

/**
 * Checks if a user has full organization-wide visibility (Super Admin, Admin, MD).
 */
export function isFullAccessRole(role: string): boolean {
  const fullAccessRoles = ["SUPER_ADMIN", "ADMIN", "MANAGING_DIRECTOR", "MD"];
  return fullAccessRoles.includes(role);
}
