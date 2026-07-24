import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { erpDb } from "@/lib/db";

// ============================================================
// Next.js 16 Proxy — Server-Side Auth & Role-Based Route Guard
// ============================================================
// This replaces client-side useEffect guards. Users never see
// pages they cannot access. No "Access Denied" screens.
// ============================================================

// Three access levels. Every other role key maps to one of these.
const LEVEL_1_ROLES = ["SUPER_ADMIN", "ADMIN", "DIRECTOR_OPERATIONS", "DIRECTOR"];
const LEVEL_2_ROLES = [
  "OPERATIONS_MANAGER",
  "ASSISTANT_MANAGER",
  "OPERATIONS_EXECUTIVE",
  "MANAGER",
  "ASST_MGR",
  "EXECUTIVE",
  "EMPLOYEE",
  "SALES_HEAD",
  "REGIONAL_SALES_MANAGER",
  "BRANCH_MANAGER",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "REGIONAL_OFFICER",
  "BRANCH_USER",
  "VIEWER",
  "REGIONAL_MANAGER",
  "INVENTORY_MANAGER",
  "PURCHASE_MANAGER",
  "LOGISTICS_MANAGER",
  "ACCOUNTS_MANAGER"
];
const LEVEL_3_ROLES = ["CUSTOMER"];

function getLevel(role: string): 1 | 2 | 3 {
  if (LEVEL_1_ROLES.includes(role)) return 1;
  if (LEVEL_2_ROLES.includes(role)) return 2;
  return 3; // CUSTOMER and any unknown role
}

// Routes each level can access (prefix match)
const LEVEL_ROUTES: Record<1 | 2 | 3, string[]> = {
  1: [
    "/dashboard",
    "/products",
    "/categories",
    "/pricing",
    "/price-history",
    "/stock-movement",
    "/analytics",
    "/admin",
    "/settings",
    "/reserved-stock",
    "/purchase-orders",
    "/opportunities",
    "/employees",
    "/recommendations",
    "/profile",
  ],
  2: [
    "/dashboard",
    "/products",
    "/categories",
    "/pricing",
    "/price-history",
    "/stock-movement",
    "/analytics",
    "/admin",
    "/settings",
    "/reserved-stock",
    "/purchase-orders",
    "/opportunities",
    "/employees",
    "/recommendations",
    "/profile",
  ],
  3: [
    "/dashboard",
    "/products",
    "/price-history",
    "/recommendations",
    "/reserved-stock",
    "/purchase-orders",
    "/opportunities",
    "/profile",
    "/settings",
  ],
};

// Pages that any visitor (even unauthenticated) can access
const PUBLIC_PAGES = ["/login", "/register"];

// Pages that any authenticated user can access (system pages)
const ALWAYS_ALLOWED = ["/logout", "/403"];

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;


  // 1. Skip static assets and API routes — they handle their own auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("erp-session-token")?.value;

  // 2. Public pages — allow if not logged in, redirect to dashboard if logged in
  if (PUBLIC_PAGES.includes(pathname)) {
    if (token) {
      const payload = await verifyJwt(token);
      if (payload) {
        // Already authenticated — send to dashboard instead of login page
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Not authenticated → redirect to login (never show a "403" page)
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4. Verify the JWT
  const payload = await verifyJwt(token);
  if (!payload || !payload.id) {
    // Corrupted/expired session
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("erp-session-token");
    return response;
  }

  // Fetch user from DB to evaluate granular permissions
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

  // 7. Dynamic route guard based on role-defaults or custom granular page permissions
  const roleId = user.roleId || payload.role as string;
  const level = getLevel(roleId);
  let allowedRoutes = [...LEVEL_ROUTES[level]];

  if (user.inheritBranchPermissions) {
    if (user.branchId) {
      const branches = await erpDb.branches.findMany();
      const userBranch = branches.find((b: any) => b.id === user.branchId);
      if (userBranch?.pagePermissions) {
        try {
          allowedRoutes = JSON.parse(userBranch.pagePermissions);
        } catch (e) {
          console.error("Failed to parse branch pagePermissions:", e);
        }
      }
    }
  } else if (user.pagePermissions) {
    try {
      allowedRoutes = JSON.parse(user.pagePermissions);
    } catch (e) {
      console.error("Failed to parse user pagePermissions:", e);
    }
  }

  // Always make sure /dashboard and ALWAYS_ALLOWED is reachable for any authenticated user
  const isAllowed = allowedRoutes.some((prefix) => {
    if (prefix === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });

  if (!isAllowed) {
    // Redirect to dashboard, NOT to a 403 page.
    // The user should never see a page they can't access.
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export { proxy as middleware };
export default proxy;

