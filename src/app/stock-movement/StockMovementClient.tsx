"use client";

import { useState } from "react";
import { useErpStore } from "@/lib/store";
import { adjustStockAction } from "@/app/actions";
import { toast } from "sonner";
import { ArrowUpDown, PlusCircle, MinusCircle, Search, Filter, History, ClipboardList, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface StockMovementClientProps {
  initialMovements: any[];
  products: any[];
  branches: any[];
}

export default function StockMovementClient({
  initialMovements,
  products,
  branches
}: StockMovementClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();
  
  const [movements, setMovements] = useState<any[]>(initialMovements);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  
  // Stock Adjust forms state
  const [adjustSku, setAdjustSku] = useState("");
  const [adjustBranch, setAdjustBranch] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustDetails, setAdjustDetails] = useState("");
  const [adjustType, setAdjustType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [loading, setLoading] = useState(false);

  const canAdjust = activeRole === "SUPER_ADMIN" || activeRole === "ADMIN" || activeRole === "EMPLOYEE";

  // Filter movements list
  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.details && m.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.userId && m.userId.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = 
      filterType === "ALL" || 
      (filterType === "ADDITION" && m.type === "ADDITION") ||
      (filterType === "REDUCTION" && m.type === "REDUCTION") ||
      (filterType === "ADJUSTMENT" && m.type === "ADJUSTMENT");
    return matchesSearch && matchesType;
  });

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustSku || !adjustBranch || adjustQty <= 0 || !adjustDetails.trim()) {
      toast.error("Please fill all fields, enter details, and a valid quantity");
      return;
    }

    setLoading(true);
    try {
      await adjustStockAction({
        sku: adjustSku,
        branchCode: adjustBranch,
        quantity: Number(adjustQty),
        details: adjustDetails,
        userId: activeUser?.email || "anonymous@conquererp.com",
        type: adjustType
      });

      toast.success(`Successfully recorded stock adjustment for SKU ${adjustSku} (${adjustType})`);
      
      // Reset form
      setAdjustSku("");
      setAdjustBranch("");
      setAdjustQty(1);
      setAdjustDetails("");
      
      // Refresh router and data
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute stock adjustment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Stock Movement & Ledger</h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Track stock audits, additions, reductions, and branch transfers. Adjust stock quantities directly below.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <ArrowUpDown className="w-4 h-4" />
          <span>Real-time Ledger</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Movements Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-orange-500" />
                <span>Audit Logs Ledger</span>
              </h2>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    placeholder="Search SKU/details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 hover:border-stone-300 focus:border-orange-500 focus:bg-white rounded-lg py-1.5 pl-8 pr-3 text-xs text-stone-850 placeholder-stone-400 focus:outline-none transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="ADDITION">Addition</option>
                  <option value="REDUCTION">Reduction</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMovements.map((m) => {
                    const badgeStyles =
                      m.type === "ADDITION"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                        : m.type === "REDUCTION"
                        ? "bg-rose-50 text-rose-700 border-rose-250"
                        : m.type === "ADJUSTMENT"
                        ? "bg-amber-50 text-amber-700 border-amber-250"
                        : "bg-indigo-50 text-indigo-700 border-indigo-250";

                    return (
                      <tr key={m.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-stone-900">{m.sku}</td>
                        <td className="px-4 py-3 font-semibold text-stone-600">{m.branchCode}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeStyles}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-stone-850">
                          {m.type === "REDUCTION" ? "-" : "+"}
                          {Math.abs(m.quantity)}
                        </td>
                        <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate" title={m.details}>
                          {m.details}
                        </td>
                        <td className="px-4 py-3 text-stone-500 truncate max-w-[100px]" title={m.userId || "System Seeding"}>
                          {m.userId || "System"}
                        </td>
                        <td className="px-4 py-3 text-stone-400">
                          {new Date(m.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-stone-400 italic">
                        No stock movement logs found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Action Panel */}
        <div className="space-y-6">
          {canAdjust ? (
            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
                <ClipboardList className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Stock Adjustment</h3>
              </div>

              {/* Add vs Reduce vs Adjust tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-50 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setAdjustType("STOCK_IN")}
                  className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer text-center ${
                    adjustType === "STOCK_IN" ? "bg-white text-emerald-600 shadow-sm border border-emerald-200" : "text-stone-450 hover:text-stone-750"
                  }`}
                >
                  <span>Stock In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("STOCK_OUT")}
                  className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer text-center ${
                    adjustType === "STOCK_OUT" ? "bg-white text-rose-600 shadow-sm border border-rose-200" : "text-stone-450 hover:text-stone-750"
                  }`}
                >
                  <span>Stock Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("ADJUSTMENT")}
                  className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer text-center ${
                    adjustType === "ADJUSTMENT" ? "bg-white text-amber-600 shadow-sm border border-amber-250" : "text-stone-450 hover:text-stone-750"
                  }`}
                >
                  <span>Adjust</span>
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Select SKU</label>
                  <select
                    value={adjustSku}
                    onChange={(e) => setAdjustSku(e.target.value)}
                    required
                    className="w-full bg-stone-50 border border-stone-250 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 cursor-pointer"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Select Target Branch</label>
                  <select
                    value={adjustBranch}
                    onChange={(e) => setAdjustBranch(e.target.value)}
                    required
                    className="w-full bg-stone-50 border border-stone-250 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 cursor-pointer"
                  >
                    <option value="">-- Choose Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Adjustment Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full bg-stone-50 border border-stone-250 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Audit Reason / Notes</label>
                  <textarea
                    value={adjustDetails}
                    onChange={(e) => setAdjustDetails(e.target.value)}
                    required
                    rows={2}
                    placeholder="Describe reason for stock audit adjustment"
                    className="w-full bg-stone-50 border border-stone-250 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 resize-none font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer pt-3 ${
                    adjustType === "STOCK_IN"
                      ? "bg-emerald-650 hover:bg-emerald-700 shadow-emerald-500/10"
                      : adjustType === "STOCK_OUT"
                      ? "bg-rose-650 hover:bg-rose-700 shadow-rose-500/10"
                      : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/10"
                  }`}
                >
                  {loading ? "Processing..." : adjustType === "STOCK_IN" ? "Confirm Stock Addition (In)" : adjustType === "STOCK_OUT" ? "Confirm Stock Reduction (Out)" : "Confirm Stock Level Reset (Adjust)"}
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm text-center py-8 space-y-2">
              <ClipboardList className="w-8 h-8 text-stone-300 mx-auto" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Action Restricted</h4>
              <p className="text-stone-400 text-[10px] leading-relaxed">
                As a premium Customer, you can inspect historical movements but are blocked from executing adjustments.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
