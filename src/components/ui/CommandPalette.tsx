"use client";

import { useErpStore, UserRole } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Search,
  FileText,
  Boxes,
  ShoppingCart,
  Truck,
  Plus,
  ArrowRight,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandItem {
  name: string;
  category: string;
  action: () => void;
  icon: any;
  roles: UserRole[];
}

export default function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, activeRole } = useErpStore();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Command items matching routes & quick actions
  const commands: CommandItem[] = [
    { name: "Go to Dashboard", category: "Navigation", icon: ArrowRight, roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE", "CUSTOMER"], action: () => { router.push("/dashboard"); setCommandPaletteOpen(false); } },
    { name: "Go to Product Master", category: "Navigation", icon: ArrowRight, roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"], action: () => { router.push("/products"); setCommandPaletteOpen(false); } },
    { name: "Go to Price Master", category: "Navigation", icon: ArrowRight, roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE", "CUSTOMER"], action: () => { router.push("/pricing"); setCommandPaletteOpen(false); } },
    { name: "Go to Alerts Engine", category: "Navigation", icon: ArrowRight, roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"], action: () => { router.push("/alerts"); setCommandPaletteOpen(false); } },
    { name: "Go to System Config", category: "Navigation", icon: ArrowRight, roles: ["SUPER_ADMIN", "ADMIN"], action: () => { router.push("/settings"); setCommandPaletteOpen(false); } },
    
    // Quick Actions
    { name: "Upload Pricing spreadsheet", category: "Actions", icon: Plus, roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"], action: () => { router.push("/pricing"); setCommandPaletteOpen(false); } },
  ];

  // Hotkey handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!useErpStore.getState().commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch("");
    }
  }, [commandPaletteOpen]);

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.roles.includes(activeRole) &&
      cmd.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-stone-200/70 shadow-2xl rounded-2xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-stone-200/50">
              <Search className="w-5 h-5 text-stone-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or page name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-stone-800 text-sm placeholder-stone-400"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Command list */}
            <div className="max-h-72 overflow-y-auto py-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-stone-400 text-sm flex flex-col items-center justify-center space-y-2">
                  <Sparkles className="w-6 h-6 text-orange-500 animate-spin" />
                  <span>No results found matching your role ({activeRole})</span>
                </div>
              ) : (
                <>
                  {/* Category headers */}
                  {["Navigation", "Actions"].map((cat) => {
                    const catCmds = filteredCommands.filter((cmd) => cmd.category === cat);
                    if (catCmds.length === 0) return null;
                    return (
                      <div key={cat} className="mb-2">
                        <div className="px-4 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          {cat}
                        </div>
                        {catCmds.map((cmd, idx) => (
                          <motion.button
                            key={cmd.name}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={cmd.action}
                            className="w-full flex items-center px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-orange-500 hover:text-white transition-colors duration-150 group"
                          >
                            <cmd.icon className="w-4 h-4 text-stone-400 group-hover:text-white mr-3 transition-colors" />
                            <span className="flex-1 font-medium">{cmd.name}</span>
                            <kbd className="hidden group-hover:inline-block px-1.5 py-0.5 text-[9px] bg-orange-600 text-orange-100 rounded border border-orange-400/50">
                              Enter
                            </kbd>
                          </motion.button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer shortcuts */}
            <div className="px-4 py-2.5 bg-stone-50/80 border-t border-stone-200/50 text-[10px] text-stone-400 flex items-center justify-between">
              <div>
                Search matching your active profile: <span className="text-orange-600 font-bold">{activeRole}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Esc to close</span>
                <span>•</span>
                <span>↑↓ to navigate</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
