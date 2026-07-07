"use client";

import { useState } from "react";
import { useErpStore } from "@/lib/store";
import { resolveStockAlertAction } from "@/app/actions";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  DollarSign,
  TrendingDown,
  Building,
  Activity,
  Package,
  Check,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertsClientProps {
  alerts: any[];
  inventory: any[];
}

const BRANCH_NAMES: Record<string, string> = {
  HYD: "Hyderabad",
  BLR: "Bangalore",
  CHN: "Chennai",
  MUM: "Mumbai",
  DEL: "Delhi"
};

const USER_BRANCH_TO_CODE: Record<string, string> = {
  "Hyderabad": "HYD",
  "Bangalore": "BLR",
  "Chennai": "CHN",
  "Mumbai": "MUM",
  "Delhi": "DEL",
  "Head Office": "HYD"
};

export default function AlertsClient({
  alerts,
  inventory
}: AlertsClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState("");

  const userBranchCode = activeUser ? USER_BRANCH_TO_CODE[activeUser.branch] || "HYD" : "HYD";
  
  const getBranchRegion = (code: string) => {
    if (["HYD", "BLR", "CHN"].includes(code)) return "South Region";
    if (code === "MUM") return "West Region";
    if (code === "DEL") return "North Region";
    return "Unknown Region";
  };
  const userRegion = getBranchRegion(userBranchCode);

  const isAlertVisible = (alert: any) => {
    if (activeRole === "SUPER_ADMIN" || activeRole === "ADMIN" || activeRole === "SALES_HEAD") return true;
    if (activeRole === "REGIONAL_SALES_MANAGER") {
      return getBranchRegion(alert.branchCode) === userRegion;
    }
    return alert.branchCode === userBranchCode;
  };

  // Filter alerts by scope and resolved state
  const visibleAlerts = alerts.filter(a => {
    if (!isAlertVisible(a)) return false;
    
    // Status Filter
    if (activeFilter === "RESOLVED") return a.resolved;
    if (activeFilter === "ALL") return !a.resolved;
    return !a.resolved && a.type === activeFilter;
  });

  const handleResolveAlert = async (id: string) => {
    if (activeRole === "CUSTOMER") {
      toast.error("Customers cannot resolve stock alerts");
      return;
    }

    setLoadingId(id);
    try {
      await resolveStockAlertAction(id, activeUser?.email || "admin@conquererp.com");
      toast.success("Alert resolved successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve alert");
    } finally {
      setLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2 font-outfit">
            <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Alerts & Anomalies Engine</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time notifications on low stock items, critical margins, dead stocks, and transfer workflows.
          </p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold overflow-x-auto pb-2">
        {[
          { key: "ALL", label: "Active Alerts" },
          { key: "LOW_STOCK", label: "Low Stock" },
          { key: "CRITICAL_STOCK", label: "Critical Stock" },
          { key: "PRICE_CHANGE", label: "Low Margin Alerts" },
          { key: "TRANSFER_DELAY", label: "Pending Transfers" },
          { key: "RESOLVED", label: "Resolved Logs" }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveFilter(t.key)}
            className={`pb-2 px-1 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeFilter === t.key ? "border-indigo-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {visibleAlerts.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500 text-xs italic">
            No active alerts profiles found matching this criteria. System operational state: HEALTHY.
          </div>
        ) : (
          visibleAlerts.map(a => {
            const icon =
              a.type === "LOW_STOCK" ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
              a.type === "CRITICAL_STOCK" ? <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce" /> :
              a.type === "PRICE_CHANGE" ? <DollarSign className="w-5 h-5 text-indigo-400" /> :
              a.type === "TRANSFER_DELAY" ? <ArrowRightLeft className="w-5 h-5 text-blue-400" /> :
              <Activity className="w-5 h-5 text-slate-400" />;

            return (
              <div
                key={a.id}
                className={`glass-panel p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-200 text-xs ${
                  a.resolved ? "opacity-60 border-slate-900 bg-slate-950/20" :
                  a.type === "CRITICAL_STOCK" ? "border-rose-500/25 bg-rose-500/5 hover:border-rose-500/40" :
                  a.type === "LOW_STOCK" ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30" :
                  "hover:border-indigo-500/30"
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    a.resolved ? "bg-slate-900 text-slate-500" :
                    a.type === "CRITICAL_STOCK" ? "bg-rose-500/10" :
                    a.type === "LOW_STOCK" ? "bg-amber-500/10" :
                    "bg-indigo-500/10"
                  }`}>
                    {icon}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        a.resolved ? "bg-slate-900 text-slate-500 border-slate-800" :
                        a.type === "CRITICAL_STOCK" ? "bg-rose-500/10 text-rose-455 border-rose-500/20" :
                        a.type === "LOW_STOCK" ? "bg-amber-500/10 text-amber-450 border-amber-500/20" :
                        "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}>
                        {a.type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center">
                        <Building className="w-3 h-3 mr-1 text-slate-655" />
                        {BRANCH_NAMES[a.branchCode]} Branch
                      </span>
                    </div>

                    <p className="text-slate-200 font-semibold leading-relaxed max-w-2xl">{a.message}</p>
                    <span className="text-[9px] text-slate-500 block pt-0.5">Created: {new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto text-right">
                  {!a.resolved ? (
                    <button
                      onClick={() => handleResolveAlert(a.id)}
                      disabled={loadingId === a.id || activeRole === "CUSTOMER"}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{loadingId === a.id ? "Resolving..." : "Mark Resolved"}</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-end text-emerald-500 font-bold space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolved</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
