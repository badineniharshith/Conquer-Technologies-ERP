"use client";

import { useErpStore } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";
import {
  Search,
  Bell,
  User,
  Check,
  CheckCheck,
  LogOut,
  MapPin,
  Menu
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const {
    activeUser,
    setCommandPaletteOpen,
    logoutSession
  } = useErpStore();

  const [localNotis, setLocalNotis] = useState<any[]>([]);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);

  // Fetch real notifications from database
  useEffect(() => {
    if (activeUser) {
      fetch("/api/notifications")
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            setLocalNotis(data.notifications);
          }
        })
        .catch(err => console.error("Failed to load notifications:", err));
    }
  }, [activeUser]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiDropdownOpen(false);
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
        setLocalNotis(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
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
        setLocalNotis(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // 1. Clear the server-side JWT cookie first
      await logoutUserAction();
      // 2. Clear the client-side Zustand store
      logoutSession();
      toast.success("Logged out successfully.");
      // 3. Hard redirect to login (not router.push — this ensures full page reload + cookie cleared)
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  const unreadCount = localNotis.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 h-16 w-full glass-navbar flex items-center justify-between px-4 sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-stone-500 hover:bg-stone-100/80 transition-all duration-200 mr-2 cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Brand Logo */}
      <div className="lg:hidden flex items-center mr-2">
        <img src="/logo.png" alt="Conquer Logo" className="h-6 object-contain" />
      </div>

      {/* Search Bar / Trigger Command Palette */}
      <div className="flex-1 max-w-md">
        <motion.button
          onClick={() => setCommandPaletteOpen(true)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-stone-50/80 border border-stone-200/60 rounded-xl text-stone-400 text-xs hover:border-orange-400/40 hover:bg-white/60 hover:shadow-sm transition-all duration-250 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-stone-400" />
            <span>Search anything...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-stone-200/70 text-stone-500 rounded-md border border-stone-300/50">
            /
          </kbd>
        </motion.button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
        {/* Notifications Center */}
        <div className="relative" ref={notiRef}>
          <motion.button
            onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
            whileTap={{ scale: 0.92 }}
            className="p-2.5 rounded-xl text-stone-500 hover:bg-stone-100/80 transition-all duration-200 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-badge-pulse"
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {notiDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -2 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-lg border border-stone-200/70 rounded-xl shadow-xl py-1 z-50 origin-top-right"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-orange-600 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {localNotis.length === 0 ? (
                    <div className="px-4 py-6 text-center text-stone-400 text-xs italic">
                      No new notifications
                    </div>
                  ) : (
                    localNotis.map((noti, idx) => (
                      <motion.div
                        key={noti.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        onClick={() => handleMarkAsRead(noti.id)}
                        className={`px-4 py-2.5 border-b border-stone-50 cursor-pointer hover:bg-stone-50/70 transition-colors ${
                          !noti.read ? "bg-orange-50/20" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`text-xs font-semibold ${!noti.read ? "text-orange-600" : "text-stone-700"}`}>
                            {noti.title}
                          </span>
                          <span className="text-[9px] text-stone-400">
                            {new Date(noti.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {noti.message}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Summary */}
        <div className="flex items-center space-x-3 pl-3 sm:pl-4 border-l border-stone-200/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold border border-orange-200/60 shadow-sm">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-stone-750">{activeUser?.name || "Guest User"}</span>
            <span className="text-[9px] text-stone-400 flex items-center mt-0.5 font-medium">
              <MapPin className="w-3 h-3 mr-0.5 text-stone-450" />
              {activeUser?.branch || "Head Office"}
            </span>
          </div>
        </div>

        {/* Logout */}
        <motion.button
          onClick={handleLogout}
          disabled={loggingOut}
          whileTap={{ scale: 0.92 }}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          title="Sign Out"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </motion.button>
      </div>
    </header>
  );
}
