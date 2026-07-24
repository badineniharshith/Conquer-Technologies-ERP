import { UserRole } from "./store";

export interface PermissionRule {
  allowedRoles: UserRole[];
  label: string;
}

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "CUSTOMER", "ADMIN", "EMPLOYEE"],
  "/products": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "CUSTOMER", "ADMIN", "EMPLOYEE"],
  "/categories": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"],
  "/pricing": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"],
  "/pricing/history": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"],
  "/stock-movement": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "ADMIN"],
  "/analytics": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"],
  "/admin/customers": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "ADMIN"],
  "/reserved-stock": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "CUSTOMER", "ADMIN", "EMPLOYEE"],
  "/purchase-orders": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "CUSTOMER", "ADMIN", "EMPLOYEE"],
  "/opportunities": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "ADMIN"],
  "/settings": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "ADMIN"],
  "/settings/users": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "ADMIN"],
  "/settings/hierarchy": ["SUPER_ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "ADMIN"],
  "/admin/database": ["SUPER_ADMIN"],
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  // Exact or prefix match
  for (const route in ROUTE_PERMISSIONS) {
    if (path === route || path.startsWith(route + "/")) {
      const allowed = ROUTE_PERMISSIONS[route];
      return allowed.includes(role);
    }
  }
  return true; // Default fallback to allow public or non-restricted routes
}
