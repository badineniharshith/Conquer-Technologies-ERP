"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useErpStore, UserRole } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  FolderOpen,
  BarChart3,
  TrendingUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  Target,
  ShieldCheck,
  Building
} from "lucide-react";

interface MenuItem {
  title: string;
  href: string;
  icon: any;
}

export const getMenuItems = (role: UserRole): MenuItem[] => {
  const fullAdminMenu: MenuItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Customers Master", href: "/customers", icon: Users },
    { title: "Products Catalog", href: "/products", icon: PlusCircle },
    { title: "Categories", href: "/categories", icon: FolderOpen },
    { title: "Price History", href: "/price-history", icon: TrendingUp },
    { title: "Stock Availability", href: "/stock-availability", icon: Boxes },
    { title: "Stock Movement", href: "/stock-movement", icon: ArrowUpDown },
    { title: "Analytics", href: "/analytics", icon: BarChart3 },
    { title: "Stock Reservations", href: "/reserved-stock", icon: Boxes },
    { title: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
    { title: "User Management", href: "/settings/users", icon: Users },
    { title: "Org Hierarchy", href: "/settings/hierarchy", icon: Target },
    { title: "System Settings", href: "/settings", icon: Settings },
    { title: "Logout", href: "/logout", icon: LogOut },
  ];

  const salesMenu: MenuItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Customers Master", href: "/customers", icon: Users },
    { title: "Stock Availability", href: "/stock-availability", icon: Boxes },
    { title: "Org Hierarchy", href: "/settings/hierarchy", icon: Target },
    { title: "Logout", href: "/logout", icon: LogOut },
  ];

  const opsMenu: MenuItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Customers Master", href: "/customers", icon: Users },
    { title: "Products Catalog", href: "/products", icon: PlusCircle },
    { title: "Categories", href: "/categories", icon: FolderOpen },
    { title: "Price History", href: "/price-history", icon: TrendingUp },
    { title: "Stock Availability", href: "/stock-availability", icon: Boxes },
    { title: "Stock Movement", href: "/stock-movement", icon: ArrowUpDown },
    { title: "Analytics", href: "/analytics", icon: BarChart3 },
    { title: "Stock Reservations", href: "/reserved-stock", icon: Boxes },
    { title: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
    { title: "User Management", href: "/settings/users", icon: Users },
    { title: "Org Hierarchy", href: "/settings/hierarchy", icon: Target },
    { title: "System Settings", href: "/settings", icon: Settings },
    { title: "Logout", href: "/logout", icon: LogOut },
  ];

  const customerMenu: MenuItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Allocated Stock", href: "/allocated-stock", icon: Boxes },
    { title: "Orders", href: "/orders", icon: ClipboardList },
    { title: "Assets & Warranties", href: "/assets-warranties", icon: ShieldCheck },
    { title: "Assign Users", href: "/assign-users", icon: Users },
    { title: "Products Catalog", href: "/products", icon: PlusCircle },
    { title: "My Reservations", href: "/reserved-stock", icon: Boxes },
    { title: "My Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
    { title: "My Profile", href: "/profile", icon: Users },
    { title: "Settings", href: "/settings", icon: Settings },
    { title: "Logout", href: "/logout", icon: LogOut },
  ];

  const items: Partial<Record<string, MenuItem[]>> = {
    SUPER_ADMIN: fullAdminMenu,
    ADMIN: fullAdminMenu,
    MANAGING_DIRECTOR: fullAdminMenu,
    MD: fullAdminMenu,

    DIRECTOR_OPERATIONS: opsMenu,
    OPERATIONS_MANAGER: opsMenu,
    ASSISTANT_MANAGER: opsMenu,
    OPERATIONS_EXECUTIVE: opsMenu,

    SALES_DIRECTOR: salesMenu,
    DIRECTOR_OF_TECHNOLOGY: salesMenu,
    MARKETING_MANAGER: salesMenu,
    POST_SALES_MANAGER: salesMenu,
    BUSINESS_MANAGER: salesMenu,
    PRESALES_MANAGER: salesMenu,
    ASST_MARKETING_MANAGER: salesMenu,
    TEAM_LEAD: salesMenu,
    REGIONAL_SALES_MANAGER: salesMenu,
    SENIOR_PRESALES_LEAD: salesMenu,
    TELECALLER: salesMenu,
    FRONT_END_OPERATOR: salesMenu,
    KEY_ACCOUNT_MANAGER: salesMenu,
    PRESALES_CONSULTANT: salesMenu,
    INSIDE_SALES_MANAGER: salesMenu,

    CUSTOMER: customerMenu
  };

  return items[role] || fullAdminMenu;
};

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { activeUser, logoutSession, sidebarCollapsed, toggleSidebar } = useErpStore();

  const userRole = (activeUser?.role as UserRole) || "SUPER_ADMIN";
  const menuItems = getMenuItems(userRole);

  const handleLogout = async () => {
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out successfully.");
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed.");
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-stone-200/80 shadow-2xs">
      {/* Brand Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Conquer Logo" className="h-9 w-auto object-contain drop-shadow-xs" />
          {!sidebarCollapsed && (
            <span className="text-xs font-bold text-stone-500 font-outfit border-l border-stone-200 pl-2">
              ERP Portal
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role / User Badge Banner */}
      {!sidebarCollapsed && (
        <div className="p-3 mx-3 mt-3 bg-stone-50 border border-stone-200/70 rounded-2xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8c3120] to-[#b33e28] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
            {activeUser?.name?.charAt(0) || "E"}
          </div>
          <div className="truncate">
            <span className="font-bold text-xs text-stone-900 block truncate">{activeUser?.name || "Employee"}</span>
            <span className="text-[10px] text-[#8c3120] font-extrabold uppercase tracking-wider block">
              {(activeUser?.role || "STAFF").replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      {/* Nav Menu Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.href === "/logout") return null;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-200 font-bold ${
                isActive
                  ? "bg-[#8c3120]/10 text-[#8c3120] border border-[#8c3120]/20 shadow-2xs"
                  : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#8c3120]" : "text-stone-400"}`} />
              {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Logout Button */}
      <div className="p-3 border-t border-stone-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-0 h-screen z-40 transition-all duration-300 ${
        sidebarCollapsed ? "w-20" : "w-64"
      }`}>
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-64 max-w-full h-full bg-white shadow-2xl z-50"
            >
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {navContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
