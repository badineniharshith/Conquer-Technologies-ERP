import { NextRequest } from "next/server";
import { verifyJwt } from "./jwt";
import { erpDb } from "./db";

export async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("erp-session-token")?.value;
  if (!token) return null;

  const payload = await verifyJwt(token);
  if (!payload || !payload.id) return null;

  const user = await erpDb.users.findUnique({ where: { id: payload.id as string } });
  if (!user || user.status !== "ACTIVE") return null;

  return user;
}
