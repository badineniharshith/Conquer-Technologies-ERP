"use client";

import { useErpStore } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";
import {
  Search,
  Bell,
  User,
  Users,
  CheckCheck,
  LogOut,
  MapPin,
  Menu,
  ExternalLink,
  ChevronDown,
  Settings,
  ShieldCheck,
  Building
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { activeUser, setCommandPaletteOpen, logoutSession } = useErpStore();

  const [localNotis, setLocalNotis] = useState<any[]>([]);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN" || activeUser?.role === "MANAGING_DIRECTOR";

  useEffect(() => {
    if (activeUser) {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.notifications) setLocalNotis(data.notifications);
        })
        .catch((err) => console.error("Failed to load notifications:", err));
    }
  }, [activeUser]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setLocalNotis((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        setLocalNotis((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out successfully.");
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed.");
      setLoggingOut(false);
    }
  };

  const unreadCount = localNotis.filter((n) => !n.read).length;

  return (
    <>
    <header className="sticky top-0 z-40 h-16 w-full bg-white border-b border-stone-200/80 shadow-sm flex items-center justify-between px-4 sm:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-full text-stone-500 hover:bg-stone-100 transition-colors mr-2 cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search Input Pill */}
      <div className="flex-1 max-w-md">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-4 py-2 bg-stone-100/70 border border-stone-200/80 rounded-full text-stone-400 text-xs hover:border-[#8c3120]/40 hover:bg-white transition-all cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-stone-400" />
            <span className="font-medium">Search modules, products, customers...</span>
          </div>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold font-mono bg-stone-200 text-stone-600 rounded-full border border-stone-300/50">
            /
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
        {/* Visit CRM Pill Button — Direct to Login Page */}
        <a
          href="https://conquer-technologies-crm.vercel.app/login"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#8c3120] text-white text-xs font-bold rounded-full shadow-2xs hover:bg-[#a03828] transition-all cursor-pointer"
        >
          <span>Visit CRM</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Notifications Bell Pill */}
        <div className="relative" ref={notiRef}>
          <button
            onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
            className="p-2 rounded-full text-stone-500 hover:bg-stone-100 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notiDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl py-2 z-[9999] overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 bg-stone-50/50">
                  <span className="text-xs font-bold uppercase text-stone-700 font-outfit">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-[#8c3120] font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {localNotis.length === 0 ? (
                    <div className="px-4 py-6 text-center text-stone-400 text-xs italic">
                      No unread notifications
                    </div>
                  ) : (
                    localNotis.map((noti) => (
                      <div
                        key={noti.id}
                        onClick={() => handleMarkAsRead(noti.id)}
                        className={`px-4 py-2.5 border-b border-stone-50 cursor-pointer hover:bg-stone-50 transition-colors ${
                          !noti.read ? "bg-orange-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`text-xs font-bold ${!noti.read ? "text-[#8c3120]" : "text-stone-700"}`}>
                            {noti.title}
                          </span>
                          <span className="text-[9px] text-stone-400">
                            {new Date(noti.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {noti.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Dropdown Pill */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center space-x-2.5 p-1 px-3 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/80 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#8c3120] text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs">
              {activeUser?.name?.charAt(0) || "E"}
            </div>
            <div className="hidden lg:flex flex-col text-left pr-1 leading-tight max-w-[130px] truncate">
              <span className="text-xs font-bold text-stone-900 truncate">{activeUser?.name || "Staff User"}</span>
              <span className="text-[9px] font-extrabold uppercase text-[#8c3120] truncate">
                {(activeUser?.role || "GUEST").replace(/_/g, " ")}
              </span>
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
                className="absolute right-0 mt-2 w-72 bg-white border border-stone-200/80 rounded-2xl shadow-2xl py-2 z-[9999] overflow-hidden ring-1 ring-black/5"
              >
                {/* Header User Summary */}
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-stone-900 leading-tight">
                      {activeUser?.name || "Employee"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#8c3120]/10 text-[#8c3120] border border-[#8c3120]/20">
                      {(activeUser?.role || "STAFF").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 mt-1 truncate">
                    {activeUser?.email || "staff@conquererp.com"}
                  </div>
                  <div className="text-[10px] text-stone-400 flex items-center mt-1 font-medium">
                    <MapPin className="w-3 h-3 mr-1 text-stone-400" />
                    <span>Branch: <strong>{activeUser?.branch || "Hyderabad HQ"}</strong></span>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="p-1 space-y-0.5 text-xs font-semibold text-stone-700">
                  {/* 1. Profile */}
                  <Link
                    href="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <User className="w-4 h-4 text-stone-500" />
                    <div>
                      <span className="block font-bold text-stone-800">My Profile</span>
                      <span className="text-[10px] text-stone-400 font-normal">Personal details &amp; credentials</span>
                    </div>
                  </Link>

                  {/* 2. Team / Organization Details */}
                  <Link
                    href={isAdmin ? "/settings/users" : "/settings/hierarchy"}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <Users className="w-4 h-4 text-stone-500" />
                    <div>
                      <span className="block font-bold text-stone-800">
                        {isAdmin ? "All Employees Directory" : "My Team Details"}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        {isAdmin ? "View all registered employee details & roles" : "Details of team members registered under you"}
                      </span>
                    </div>
                  </Link>

                  {/* 3. System Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-stone-500" />
                    <div>
                      <span className="block font-bold text-stone-800">Settings</span>
                      <span className="text-[10px] text-stone-400 font-normal">System preferences &amp; permissions</span>
                    </div>
                  </Link>

                  {/* 4. Go to CRM Website — Direct Link */}
                  <a
                    href="https://conquer-technologies-crm.vercel.app/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50/80 hover:bg-orange-100/90 border border-orange-200/70 text-orange-900 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block font-bold text-stone-900 group-hover:text-orange-700">Go to CRM Website</span>
                        <span className="text-[10px] text-stone-500 font-normal">Access the CRM login portal</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-600 shrink-0 transition-colors" />
                  </a>
                </div>

                {/* Logout Button */}
                <div className="border-t border-stone-100 p-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer text-xs"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{loggingOut ? "Signing Out..." : "Logout"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
    </>
  );
}
