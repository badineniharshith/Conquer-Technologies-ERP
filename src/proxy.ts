import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { erpDb } from "@/lib/db";

// ============================================================
// Next.js Proxy — Server-Side Auth & Role-Based Route Guard
// ============================================================

// The ONLY 5 Roles allowed to access ERP Stock, Inventory & Procurement pages.
// These must match the `name` field in the `roles` table exactly.
const ERP_ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "DIRECTOR_OPERATIONS",
  "OPERATIONS_MANAGER",
  "ASSISTANT_MANAGER",
  "OPERATIONS_EXECUTIVE"
];

// ERP routes restricted strictly to the 5 ERP Roles
const ERP_ROUTES = [
  "/products",
  "/categories",
  "/pricing",
  "/price-history",
  "/stock-movement",
  "/analytics",
  "/reserved-stock",
  "/purchase-orders",
  "/settings"
];

// Public & system routes
const PUBLIC_PAGES = ["/login", "/register"];
const ALWAYS_ALLOWED = ["/logout", "/403"];

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. Skip static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("erp-session-token")?.value;

  // 2. Public pages
  if (PUBLIC_PAGES.includes(pathname)) {
    if (token) {
      const payload = await verifyJwt(token);
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Unauthenticated → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4. Verify JWT
  const payload = await verifyJwt(token);
  if (!payload || !payload.id) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("erp-session-token");
    return response;
  }

  // Fetch user from DB
  const user = await erpDb.users.findUnique({ where: { id: payload.id as string } });
  if (!user) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("erp-session-token");
    return response;
  }

  // 5. Root "/" → dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 6. Always-allowed pages
  if (ALWAYS_ALLOWED.includes(pathname)) {
    return NextResponse.next();
  }

  // Resolve the role name from DB include (user.role?.name) or fall back to JWT payload.role.
  // IMPORTANT: ERP roles use UUID roleIds in the DB, so we must use role.name not roleId.
  const roleName = (user as any).role?.name || (payload.role as string) || user.roleId;

  // Check if requested route is an ERP route
  const isErpRoute = ERP_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));

  if (isErpRoute) {
    const isErpRole = ERP_ALLOWED_ROLES.includes(roleName);
    if (!isErpRole) {
      // Redirect non-ERP roles and customers to CRM dashboard
      return NextResponse.redirect(new URL("/admin/customers", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export { proxy as middleware };
export default proxy;
