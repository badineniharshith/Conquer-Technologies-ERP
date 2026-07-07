"use client";

import Sidebar, { getMenuItems } from "./Sidebar";
import Navbar from "./Navbar";
import CommandPalette from "../ui/CommandPalette";
import { useErpStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PageSkeleton } from "../ui/motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, isAuthenticated, activeRole, loginSession, logoutSession } = useErpStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Session restore: on mount, if not authenticated, try /api/auth/me to restore session from cookie
  useEffect(() => {
    if (!mounted) return;

    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/ai-login" || pathname === "/403" || pathname === "/404";

    if (isAuthenticated) {
      setSessionChecked(true);
      return;
    }

    if (isAuthPage) {
      setSessionChecked(true);
      return;
    }

    // Not authenticated — try to restore from cookie
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          loginSession(data.user);
        } else {
          // No valid session — redirect to login
          logoutSession();
          router.push("/login");
        }
      })
      .catch(() => {
        logoutSession();
        router.push("/login");
      })
      .finally(() => {
        setSessionChecked(true);
      });
  }, [mounted, pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Client-side access control is fully handled by server-side proxy.ts middleware.

  const isStandalonePage = pathname === "/login" || pathname === "/register" || pathname === "/ai-login" || pathname === "/ai-agent";

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-[#fff7ed]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <Toaster richColors position="top-right" theme="light" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-stone-50 text-stone-900">
      {/* Sidebar (desktop fixed + mobile drawer) */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {!mounted || !sessionChecked ? (
            <PageSkeleton />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <CommandPalette />
      <Toaster richColors position="top-right" theme="light" />
    </div>
  );
}
