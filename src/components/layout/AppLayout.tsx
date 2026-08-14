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

import VConquerHeader from "../vconquer/Header";

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

    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/403" || pathname === "/404";

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

  const isStandalonePage = pathname === "/login" || pathname === "/register";
  const isCustomerPortal = activeRole === "CUSTOMER" || pathname === "/allocated-stock" || pathname.startsWith("/allocated-stock/") || pathname === "/assets-warranties" || pathname === "/assign-users";

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-[#fff7ed]">
        {children}
        <Toaster richColors position="top-right" theme="light" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-stone-50 text-stone-900">
      {/* Sidebar (desktop fixed + mobile drawer) */}
      <Sidebar
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {!mounted || !sessionChecked ? (
            <PageSkeleton />
          ) : (
            children
          )}
        </main>
      </div>

      {/* Phase 13/14 Scroll To Top with Circular Progress Ring */}
      <ScrollToTopButton />

      <CommandPalette />
      <Toaster richColors position="top-right" theme="light" />
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalHeight > 0) {
        setScrollProgress((currentScroll / totalHeight) * 100);
      }
      setVisible(currentScroll > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-5 right-5 z-40 p-2.5 bg-stone-900/90 hover:bg-[#8c3120] text-white rounded-full shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center border border-stone-700 hover:scale-110 active:scale-95 backdrop-blur-xs"
      title="Scroll to top"
    >
      <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-stone-700"
          strokeWidth="3"
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="text-[#e06246]"
          strokeDasharray={`${scrollProgress}, 100`}
          strokeWidth="3"
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="absolute text-[10px] font-black">↑</span>
    </button>
  );
}
