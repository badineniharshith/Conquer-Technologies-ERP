"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useErpStore } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ShieldCheck,
  Users,
  ShoppingBag,
  FolderOpen,
  HelpCircle,
  Bell,
  ShoppingCart,
  ChevronDown,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeUser, logoutSession } = useErpStore();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out of VConquer Corporate Portal.");
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Allocated Stock", href: "/allocated-stock", icon: Boxes },
    { label: "Orders", href: "/orders", icon: ClipboardList },
    { label: "Products Catalog", href: "/products", icon: ShoppingBag },
    { label: "Categories", href: "/categories", icon: FolderOpen },
    { label: "Assets and Warranties", href: "/assets-warranties", icon: ShieldCheck },
    { label: "Assign Users", href: "/assign-users", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200/80 shadow-2xs w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <img src="/logo.png" alt="Conquer Logo" className="h-9 w-auto object-contain drop-shadow-xs" />
            <span className="text-stone-300 font-light text-lg">|</span>
            <span className="text-xs sm:text-sm font-bold text-stone-900 tracking-tight font-outfit whitespace-nowrap">
              VConquer <span className="text-stone-500 font-normal">Corporate Portal</span>
            </span>
          </Link>
        </div>

        {/* Center Nav Pills (Clean, no line wrap) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-stone-100/70 p-1.5 rounded-full border border-stone-200/60 overflow-x-auto shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                  isActive
                    ? "bg-orange-100 text-orange-600 shadow-2xs font-extrabold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-orange-600" : "text-stone-400"}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Menu Icons & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Help Icon */}
          <button 
            title="Support & Help Center"
            className="p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button 
              title="Notifications"
              className="p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                1
              </span>
            </button>
          </div>

          {/* Shopping Cart */}
          <div className="relative">
            <button 
              title="Order Cart"
              onClick={() => router.push("/orders")}
              className="p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors relative cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-orange-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                1
              </span>
            </button>
          </div>

          {/* Account Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
            >
              <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-xs shrink-0">
                A
              </div>
              <div className="hidden sm:block text-left pr-1 leading-tight max-w-[180px] truncate">
                <div className="text-xs font-bold text-stone-900 truncate">
                  Acceldata Technology Private Limited
                </div>
                <div className="text-[10px] text-stone-400 font-mono">C000028</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                    <div className="font-bold text-xs text-stone-900">
                      Acceldata Technology Private Limited
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                      Account ID: C000028
                    </div>
                    <div className="text-[11px] text-stone-600 mt-1 font-medium font-mono">
                      {activeUser?.email || "Prudhvi@acceldata.io"}
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5 text-xs font-semibold text-stone-700">
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-stone-400" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/assign-users"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <Users className="w-4 h-4 text-stone-400" />
                      <span>Assign Users</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-stone-400" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="border-t border-stone-100 p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors cursor-pointer text-xs"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Mobile Nav Pills (Shows on screens < lg) */}
      <div className="lg:hidden bg-stone-50 border-t border-stone-200 px-4 py-2 flex items-center space-x-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isActive ? "bg-orange-500 text-white shadow-2xs font-extrabold" : "text-stone-600 hover:bg-stone-200/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
