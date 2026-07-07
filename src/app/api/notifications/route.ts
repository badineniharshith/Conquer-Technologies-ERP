import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { erpDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await erpDb.notifications.findMany({
      where: { userId: user.id }
    });
    return NextResponse.json({ notifications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      const list = await erpDb.notifications.findMany({ where: { userId: user.id, read: false } });
      for (const n of list) {
        await erpDb.notifications.update({
          where: { id: n.id },
          data: { read: true }
        });
      }
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      const updated = await erpDb.notifications.update({
        where: { id: notificationId },
        data: { read: true }
      });
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
