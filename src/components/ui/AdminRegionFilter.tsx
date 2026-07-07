"use client";

import { useErpStore } from "@/lib/store";
import { Globe, MapPin } from "lucide-react";

const BRANCHES = [
  { code: "ALL", label: "Global - All Branches" },
  { code: "HYD", label: "Hyderabad HQ" },
  { code: "BLR", label: "Bengaluru" },
  { code: "MUM", label: "Mumbai" },
  { code: "CHN", label: "Chennai" },
  { code: "DEL", label: "Delhi NCR" },
  { code: "VZG", label: "Visakhapatnam" },
  { code: "VJA", label: "Vijayawada" },
];

export default function AdminRegionFilter() {
  const { activeRole, adminRegionFilter, setAdminRegionFilter } = useErpStore();

  if (activeRole !== "ADMIN" && activeRole !== "SUPER_ADMIN") return null;

  const getScopeLabel = (code: string) => {
    const matched = BRANCHES.find((b) => b.code === code);
    return matched ? matched.label : "Global - All Branches";
  };

  return (
    <div className="bg-white border border-[#fed7aa] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm animate-in fade-in-50 duration-200">
      <div className="flex items-center space-x-2 shrink-0">
        {adminRegionFilter === "ALL" ? (
          <Globe className="w-4 h-4 text-orange-500" />
        ) : (
          <MapPin className="w-4 h-4 text-orange-500" />
        )}
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
          Admin Scope:
        </span>
        <span className="text-xs font-bold text-stone-900">
          {getScopeLabel(adminRegionFilter)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
        {BRANCHES.map((b) => {
          const active = adminRegionFilter === b.code;
          return (
            <button
              key={b.code}
              onClick={() => setAdminRegionFilter(b.code)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                active
                  ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:border-orange-500/50 hover:text-orange-600"
              }`}
            >
              {b.code === "ALL" ? "🌐 Global" : b.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
