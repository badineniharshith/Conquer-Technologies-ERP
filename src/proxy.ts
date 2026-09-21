import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { erpDb } from "@/lib/db";

// ============================================================
// Next.js Proxy — Server-Side Auth & Role-Based Route Guard
// ============================================================

// Only Operations Team and Admin roles can access ERP.
// All other roles (Sales, Presales, Marketing, etc.) are restricted to CRM.
const ERP_ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGING_DIRECTOR",
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

// Customer Portal routes — accessible to CUSTOMER role
const CUSTOMER_ALLOWED_ROUTES = [
  "/dashboard",
  "/allocated-stock",
  "/orders",
  "/products",
  "/categories",
  "/assets-warranties",
  "/assign-users",
  "/profile"
];

// Public & system routes
const PUBLIC_PAGES = ["/login", "/register", "/sso-callback"];
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
    if (token && pathname !== "/sso-callback") {
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

  // 5. Always-allowed pages (e.g. /403, /logout)
  if (ALWAYS_ALLOWED.includes(pathname)) {
    return NextResponse.next();
  }

  // Resolve the role name from DB include (user.role?.name) or fall back to JWT payload.role.
  // IMPORTANT: ERP roles use UUID roleIds in the DB, so we must use role.name not roleId.
  const roleName = (user as any).role?.name || (payload.role as string) || user.roleId;

  const isErpRole = ERP_ALLOWED_ROLES.includes(roleName);
  const isCustomer = roleName === "CUSTOMER";

  // 6. Route access enforcement
  if (isErpRole) {
    // ERP roles can access everything
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isCustomer) {
    // Customer role: allow customer portal routes, /dashboard, and root
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const isAllowed = CUSTOMER_ALLOWED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isAllowed) {
      return NextResponse.next();
    }
    // Customer trying to access ERP-only routes → 403
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // 7. Non-ERP, non-customer roles → 403
  return NextResponse.redirect(new URL("/403", req.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
