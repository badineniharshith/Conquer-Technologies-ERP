"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useErpStore, UserRole } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  DollarSign,
  ArrowUpDown,
  FolderOpen,
  BarChart3,
  TrendingUp,
  Sparkles,
  Database,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Settings,
  LogOut,
  ClipboardList
} from "lucide-react";

interface MenuItem {
  title: string;
  href: string;
  icon: any;
}

export const getMenuItems = (role: UserRole): MenuItem[] => {
  const items: Partial<Record<UserRole, MenuItem[]>> = {
    SUPER_ADMIN: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Products", href: "/products", icon: PlusCircle },
      { title: "Categories", href: "/categories", icon: FolderOpen },
      { title: "Pricing", href: "/pricing", icon: DollarSign },
      { title: "Pricing History", href: "/pricing/history", icon: TrendingUp },
      { title: "Stock Movement", href: "/stock-movement", icon: ArrowUpDown },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "AI Analytics", href: "/admin/ai-analytics", icon: Sparkles },
      { title: "Customers", href: "/admin/customers", icon: Users },
      { title: "Stock Reservations", href: "/reserved-stock", icon: Boxes },
      { title: "PO Received & Stock Checker", href: "/purchase-orders", icon: ClipboardList },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Database Explorer", href: "/admin/database", icon: Database },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
    ADMIN: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Products", href: "/products", icon: PlusCircle },
      { title: "Categories", href: "/categories", icon: FolderOpen },
      { title: "Pricing", href: "/pricing", icon: DollarSign },
      { title: "Pricing History", href: "/pricing/history", icon: TrendingUp },
      { title: "Stock Movement", href: "/stock-movement", icon: ArrowUpDown },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "Customers", href: "/admin/customers", icon: Users },
      { title: "Stock Reservations", href: "/reserved-stock", icon: Boxes },
      { title: "PO Received & Stock Checker", href: "/purchase-orders", icon: ClipboardList },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Database Explorer", href: "/admin/database", icon: Database },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
    EMPLOYEE: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Products", href: "/products", icon: PlusCircle },
      { title: "Pricing", href: "/pricing", icon: DollarSign },
      { title: "Pricing History", href: "/pricing/history", icon: TrendingUp },
      { title: "Stock Movement", href: "/stock-movement", icon: ArrowUpDown },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "Stock Reservations", href: "/reserved-stock", icon: Boxes },
      { title: "PO Received & Stock Checker", href: "/purchase-orders", icon: ClipboardList },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
    CUSTOMER: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Products", href: "/products", icon: PlusCircle },
      { title: "Price History", href: "/price-history", icon: TrendingUp },
      { title: "Recommendations", href: "/recommendations", icon: Sparkles },
      { title: "Reserved Stock", href: "/reserved-stock", icon: Boxes },
      { title: "PO Received & Stock Checker", href: "/purchase-orders", icon: ClipboardList },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  };

  return (items[role] || items.CUSTOMER || []) as MenuItem[];
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { activeRole, activeUser, logoutSession, sidebarCollapsed, setSidebarCollapsed } = useErpStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const items = getMenuItems(activeRole);

  const getActiveItem = (path: string, menuItems: MenuItem[]) => {
    const sorted = [...menuItems].sort((a, b) => b.href.length - a.href.length);
    for (const item of sorted) {
      if (item.href === "/logout" || item.href === "/logout") continue;
      if (path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href + "/"))) {
        return item.title;
      }
    }
    if (path.startsWith("/dashboard")) {
      return "Dashboard";
    }
    return null;
  };

  const activeItemTitle = getActiveItem(pathname, items);

  const handleLogoutClick = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out successfully.");
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  const NavContent = () => (
    <>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
        {!sidebarCollapsed ? (
          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src="/logo.png" alt="Conquer Logo" className="h-8 object-contain" />
          </motion.div>
        ) : (
          <div className="flex justify-center w-full">
            <img src="/logo.png" alt="Conquer Logo" className="h-7 w-7 rounded-full object-cover" />
          </div>
        )}

        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="text-stone-400 hover:text-stone-700 p-1.5 hover:bg-stone-100 rounded-lg transition-all duration-200 cursor-pointer hidden lg:block"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="text-stone-400 hover:text-stone-700 p-1 hover:bg-stone-100 rounded-md transition-colors cursor-pointer lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 mt-3 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item, index) => {
          const isLogout = item.title === "Logout";
          const active = item.title === activeItemTitle;

          if (sidebarCollapsed) {
            return (
              <motion.div
                key={item.title}
                custom={index}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                className="relative group flex justify-center py-0.5"
              >
                {isLogout ? (
                  <button
                    onClick={handleLogoutClick}
                    className="p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-rose-50 text-rose-500 w-10 h-10 cursor-pointer"
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className="relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 w-10 h-10"
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNavCollapsed"
                        className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md shadow-orange-500/20"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${active ? "text-white" : "text-stone-500 hover:text-stone-900"}`}>
                      <item.icon className="w-[18px] h-[18px]" />
                    </span>
                  </Link>
                )}
                {/* Tooltip */}
                <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg translate-x-1 group-hover:translate-x-0">
                  {item.title}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-stone-900" />
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={item.title}
              custom={index}
              variants={navItemVariants}
              initial="hidden"
              animate="visible"
            >
              {isLogout ? (
                <button
                  onClick={handleLogoutClick}
                  className="flex w-full items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 hover:bg-rose-50 text-rose-500 cursor-pointer"
                >
                  <item.icon className="w-[18px] h-[18px] mr-3 flex-shrink-0 text-rose-500" />
                  <span className="truncate">Logout</span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className="relative flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                >
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm shadow-orange-500/20"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center ${active ? "text-white font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
                    <item.icon className={`w-[18px] h-[18px] mr-3 flex-shrink-0 ${active ? "text-white" : "text-stone-400"}`} />
                    <span className="truncate">{item.title}</span>
                  </span>
                </Link>
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-stone-200/60 bg-white/60 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Signed in as</span>
                <span className="text-xs font-bold text-orange-600 truncate">{activeUser?.name || "User"}</span>
                <span className="text-[10px] text-stone-500 truncate">{activeRole.replace(/_/g, " ")}</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="text-stone-400 hover:text-stone-700 p-1.5 hover:bg-stone-100 rounded-lg transition-all duration-200 cursor-pointer hidden lg:block flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full text-stone-400 hover:text-stone-700 p-2 hover:bg-stone-100 rounded-lg transition-all duration-200 flex justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — always fixed */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 z-40 h-screen glass-sidebar text-[#57534e] flex-col hidden lg:flex"
      >
        <NavContent />
      </motion.aside>

      {/* Mobile Sidebar — slide-in drawer */}
      <>
        {/* Backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        {/* Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 z-50 h-screen w-64 glass-sidebar text-[#57534e] flex flex-col lg:hidden"
            >
              <NavContent />
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    </>
  );
}
