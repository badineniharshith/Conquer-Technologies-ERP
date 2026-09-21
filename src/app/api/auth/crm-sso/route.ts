import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ERP → CRM Direct Redirect Endpoint
 */
export async function GET(req: NextRequest) {
  const crmUrl = process.env.CRM_URL ? `${process.env.CRM_URL}/login` : "https://conquer-technologies-crm.vercel.app/login";
  return NextResponse.redirect(crmUrl);
}

