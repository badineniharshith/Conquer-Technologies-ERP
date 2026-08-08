import { NextRequest, NextResponse } from "next/server";
import { authenticateUserAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const CUSTOMER_ROLES = ["CUSTOMER"];
const EMPLOYEE_ROLES = [
  "SUPER_ADMIN", "ADMIN", "MANAGING_DIRECTOR",
  "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE",
  "DIRECTOR_OF_TECHNOLOGY", "SALES_DIRECTOR", "BUSINESS_MANAGER",
  "REGIONAL_SALES_MANAGER", "KEY_ACCOUNT_MANAGER", "INSIDE_SALES_MANAGER",
  "MARKETING_MANAGER", "POST_SALES_MANAGER", "PRESALES_MANAGER"
];

export async function POST(req: NextRequest) {
  try {
    const { email, password, portalType } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password fields" }, { status: 400 });
    }

    const result = await authenticateUserAction(email, password);
    if (result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userRole: string = result.user?.role || "";

    // Portal-type enforcement
    if (portalType === "customer") {
      if (!CUSTOMER_ROLES.includes(userRole)) {
        return NextResponse.json(
          { error: "This account is not a customer account. Please use the Employee Portal to login." },
          { status: 403 }
        );
      }
    } else if (portalType === "employee") {
      if (CUSTOMER_ROLES.includes(userRole)) {
        return NextResponse.json(
          { error: "Customer accounts cannot access the Employee Portal. Please use the Customer Portal instead." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: any) {
    console.error("LOGIN ENDPOINT ERROR:", err);
    return NextResponse.json({ error: err.message || "Authentication failed" }, { status: 500 });
  }
}
