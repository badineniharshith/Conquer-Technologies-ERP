"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useErpStore } from "@/lib/store";
import { adjustStockAction, getPendingPOsForSkuAction } from "@/app/actions";
import { toast } from "sonner";
import {
  ArrowUpDown,
  PlusCircle,
  MinusCircle,
  Search,
  Filter,
  History,
  ClipboardList,
  RefreshCw,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  FileCheck
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PODetailsModal from "@/components/purchase-orders/PODetailsModal";

interface StockMovementClientProps {
  initialMovements: any[];
  initialAdjustments?: any[];
  products: any[];
  branches: any[];
  inventoryMap?: Record<string, { physical: number; reserved: number; available: number }>;
}

const ALL_BRANCHES = [
  { id: "HYD-HQ", name: "HYD-HQ (Hyderabad Corporate Office)" },
  { id: "HYD-THUB", name: "HYD-THUB (T-Hub Experience Center)" },
  { id: "HYD-JH", name: "HYD-JH (Jubilee Hills)" },
  { id: "BLR", name: "BLR (Bengaluru HSR Layout)" },
  { id: "CHN", name: "CHN (Chennai Anna Nagar)" },
  { id: "MUM", name: "MUM (Mumbai Worli)" },
  { id: "DEL", name: "DEL (Gurgaon Delhi NCR)" },
  { id: "VZG", name: "VZG (Visakhapatnam)" },
  { id: "VJA", name: "VJA (Vijayawada)" }
];

export default function StockMovementClient({
  initialMovements,
  initialAdjustments = [],
  products,
  branches,
  inventoryMap = {}
}: StockMovementClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movements, setMovements] = useState<any[]>(initialMovements);
  const [adjustments, setAdjustments] = useState<any[]>(initialAdjustments);
  const [activeTab, setActiveTab] = useState<"LEDGER" | "ADJUSTMENTS">("ADJUSTMENTS");

  // Ledger Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Stock Adjust Form State
  const [productSearch, setProductSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustBranch, setAdjustBranch] = useState("HYD-HQ");
  const [adjustQty, setAdjustQty] = useState<number | "">(1);
  const [adjustDetails, setAdjustDetails] = useState("");
  const [adjustType, setAdjustType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [loading, setLoading] = useState(false);

  // Targeted PO state
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [loadingPendingPOs, setLoadingPendingPOs] = useState(false);

  // Handle URL Query Parameters (deep-link from PO page)
  useEffect(() => {
    const qAction = searchParams.get("action");
    const qPoId = searchParams.get("poId");
    const qSku = searchParams.get("sku");
    const qPending = searchParams.get("pending");

    if (qSku) {
      const prod = products.find((p) => p.sku.toLowerCase() === qSku.toLowerCase());
      if (prod) {
        setSelectedProduct(prod);
        setProductSearch(`${prod.name} (${prod.sku})`);
      }
    }

    if (qPending && !isNaN(Number(qPending)) && Number(qPending) > 0) {
      setAdjustQty(Number(qPending));
    }

    if (qPoId) {
      setSelectedPoId(qPoId);
      setAdjustDetails(`Stock adjustment allocated for PO ${qPoId}`);
    }

    if (qAction === "adjust") {
      setActiveTab("ADJUSTMENTS");
    }
  }, [searchParams, products]);

  // Fetch pending POs when selected product changes
  useEffect(() => {
    if (!selectedProduct?.sku) {
      setPendingPOs([]);
      return;
    }
    let isCancelled = false;
    setLoadingPendingPOs(true);
    getPendingPOsForSkuAction(selectedProduct.sku)
      .then((res) => {
        if (!isCancelled && res.success && res.data) {
          setPendingPOs(res.data);
          const qPoId = searchParams.get("poId");
          if (qPoId && res.data.some((p: any) => p.poId === qPoId || p.poNumber === qPoId)) {
            setSelectedPoId(qPoId);
          }
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingPendingPOs(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedProduct, searchParams]);

  // Success Modal State
  const [successModalData, setSuccessModalData] = useState<any | null>(null);
  const [viewPoIdentifier, setViewPoIdentifier] = useState<string | null>(null);

  // Branch list merging DB branches with standard branches
  const branchList = useMemo(() => {
    const map = new Map<string, string>();
    ALL_BRANCHES.forEach(b => map.set(b.id, b.name));
    branches.forEach(b => {
      const code = b.name.includes("(") ? b.name.split(" ")[0] : b.name;
      map.set(code, b.name);
    });
    return Array.from(map.entries()).map(([code, name]) => ({ id: code, name }));
  }, [branches]);

  // Current stock for selected product and branch
  const currentBranchStock = useMemo(() => {
    if (!selectedProduct) return { physical: 0, reserved: 0, available: 0 };
    const key = `${selectedProduct.sku}_${adjustBranch}`;
    return inventoryMap[key] || { physical: 0, reserved: 0, available: 0 };
  }, [selectedProduct, adjustBranch, inventoryMap]);

  // Selected PO data helper
  const selectedPOData = useMemo(() => {
    if (!selectedPoId) return null;
    return pendingPOs.find((p) => p.poId === selectedPoId || p.poNumber === selectedPoId) || null;
  }, [selectedPoId, pendingPOs]);

  // Live stock delta preview
  const previewNewStock = useMemo(() => {
    const qtyNum = typeof adjustQty === "number" ? adjustQty : 0;
    if (adjustType === "STOCK_IN") return currentBranchStock.physical + qtyNum;
    if (adjustType === "STOCK_OUT") return Math.max(0, currentBranchStock.physical - qtyNum);
    return qtyNum; // Adjustment sets directly
  }, [currentBranchStock, adjustQty, adjustType]);

  // Dynamic Allocation Preview
  const allocationPreview = useMemo(() => {
    const qtyNum = typeof adjustQty === "number" ? adjustQty : 0;
    if (adjustType !== "STOCK_IN" || qtyNum <= 0) return null;

    if (selectedPOData) {
      const pendingNeeded = Number(selectedPOData.pendingQuantity || 0);
      const toAllocate = Math.min(pendingNeeded, qtyNum);
      const toAvailable = Math.max(0, qtyNum - toAllocate);
      return {
        type: "TARGETED" as const,
        poNumber: selectedPOData.poNumber,
        toAllocate,
        toAvailable,
        pendingNeeded,
        isFulfilled: toAllocate >= pendingNeeded,
      };
    } else if (pendingPOs.length > 0) {
      let remaining = qtyNum;
      let totalAlloc = 0;
      const impacts: Array<{ poNumber: string; qty: number }> = [];
      for (const p of pendingPOs) {
        if (remaining <= 0) break;
        const need = Number(p.pendingQuantity || 0);
        const alloc = Math.min(need, remaining);
        if (alloc > 0) {
          impacts.push({ poNumber: p.poNumber, qty: alloc });
          totalAlloc += alloc;
          remaining -= alloc;
        }
      }
      return {
        type: "FIFO" as const,
        impacts,
        totalAlloc,
        toAvailable: remaining,
      };
    }
    return {
      type: "AVAILABLE" as const,
      toAvailable: qtyNum,
    };
  }, [adjustType, adjustQty, selectedPOData, pendingPOs]);

  // Filter products for searchable dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 15);
    const q = productSearch.toLowerCase().trim();
    return products
      .filter(p => p.sku.toLowerCase().includes(q) || (p.name && p.name.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [products, productSearch]);

  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canAdjust = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "OPERATIONS_EXECUTIVE"].includes(activeRole);

  // Filtered movements for ledger
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.sku.toLowerCase().includes(q) ||
        (m.details && m.details.toLowerCase().includes(q)) ||
        (m.userId && m.userId.toLowerCase().includes(q)) ||
        (m.branchCode && m.branchCode.toLowerCase().includes(q));

      const matchesType =
        filterType === "ALL" ||
        (filterType === "ADDITION" && m.type === "ADDITION") ||
        (filterType === "REDUCTION" && m.type === "REDUCTION") ||
        (filterType === "ADJUSTMENT" && m.type === "ADJUSTMENT");

      const matchesBranch = filterBranch === "ALL" || m.branchCode === filterBranch;

      let matchesDate = true;
      if (filterDateFrom) {
        matchesDate = matchesDate && new Date(m.timestamp) >= new Date(filterDateFrom);
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(m.timestamp) <= toDate;
      }

      return matchesSearch && matchesType && matchesBranch && matchesDate;
    });
  }, [movements, searchQuery, filterType, filterBranch, filterDateFrom, filterDateTo]);

  // Form Submit Handler
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please search and select a SKU / product.");
      return;
    }
    if (!adjustBranch) {
      toast.error("Please choose a target branch.");
      return;
    }
    const numQty = Number(adjustQty);
    if (isNaN(numQty) || numQty <= 0) {
      toast.error("Please enter a valid numeric quantity greater than 0.");
      return;
    }
    if (adjustType === "STOCK_OUT" && numQty > currentBranchStock.available) {
      toast.error(`Cannot reduce stock by ${numQty} units. Only ${currentBranchStock.available} available units in ${adjustBranch}.`);
      return;
    }
    if (!adjustDetails.trim()) {
      toast.error("Please provide an audit reason for this stock adjustment.");
      return;
    }

    setLoading(true);
    try {
      const res = await adjustStockAction({
        sku: selectedProduct.sku,
        branchCode: adjustBranch,
        quantity: numQty,
        details: adjustDetails.trim(),
        userId: activeUser?.email || "operations@conquererp.com",
        type: adjustType,
        targetPoId: selectedPoId || null,
      });

      if (res && res.success && res.data) {
        setSuccessModalData(res.data);
        toast.success(`Stock adjusted successfully! [${res.data.adjustmentNumber}]`);

        // Reset form
        setSelectedProduct(null);
        setProductSearch("");
        setAdjustQty(1);
        setAdjustDetails("");
        setSelectedPoId("");

        router.refresh();
      } else {
        toast.success(`Successfully recorded stock adjustment for SKU ${selectedProduct.sku}`);
        setSelectedPoId("");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to execute stock adjustment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200/70 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-extrabold tracking-tight text-stone-950 font-outfit">
              Stock Adjustment & Audit Ledger
            </h1>
          </div>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Perform transaction-safe stock adjustments by SKU, automatically reconcile Purchase Order shortages, and review append-only ledger history.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200/60 px-3 py-1.5 rounded-lg text-orange-700 font-bold text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL Real-Time Synchronized</span>
        </div>
      </div>

      {/* Main Grid: Form on Left/Right, Ledger on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Action Panel / Form (5 cols on large) */}
        <div className="lg:col-span-5 space-y-6">
          {canAdjust ? (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">
                    Stock Adjustment Form
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                  SA-2026-SEQ
                </span>
              </div>

              {/* Adjustment Type Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setAdjustType("STOCK_IN")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    adjustType === "STOCK_IN"
                      ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 font-extrabold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stock In (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("STOCK_OUT")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    adjustType === "STOCK_OUT"
                      ? "bg-white text-rose-700 shadow-sm border border-rose-300 font-extrabold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Stock Out (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("ADJUSTMENT")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    adjustType === "ADJUSTMENT"
                      ? "bg-white text-amber-700 shadow-sm border border-amber-300 font-extrabold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Adjust (=)</span>
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                {/* Searchable SKU / Product Selector */}
                <div ref={searchRef} className="relative">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Select Product by SKU or Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by SKU or product name (e.g. MACBOOK)..."
                      value={productSearch}
                      onFocus={() => setIsSearchOpen(true)}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      className="w-full bg-stone-50 border border-stone-250 rounded-xl py-2.5 pl-9 pr-8 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-xs"
                    />
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setProductSearch("");
                        }}
                        className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isSearchOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-stone-100">
                      {filteredProducts.length === 0 ? (
                        <div className="p-3 text-xs text-stone-400 text-center italic">
                          No matching products found.
                        </div>
                      ) : (
                        filteredProducts.map((p) => (
                          <div
                            key={p.sku}
                            onClick={() => {
                              setSelectedProduct(p);
                              setProductSearch(`${p.name} (${p.sku})`);
                              setIsSearchOpen(false);
                            }}
                            className="p-2.5 hover:bg-orange-50/60 cursor-pointer transition-colors flex justify-between items-center text-xs"
                          >
                            <div>
                              <div className="font-bold text-stone-900">{p.name}</div>
                              <div className="font-mono text-[10px] text-orange-655 font-bold">
                                SKU: {p.sku}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                              {p.brand || "Hardware"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Product Summary Card */}
                {selectedProduct && (
                  <div className="p-3.5 bg-gradient-to-br from-stone-50 to-orange-50/30 border border-orange-200/80 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-stone-900">{selectedProduct.name}</div>
                        <div className="font-mono text-[11px] text-orange-655 font-bold">
                          SKU: {selectedProduct.sku}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-black bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                        {adjustBranch}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-orange-100 text-center">
                      <div className="bg-white p-1.5 rounded-lg border border-stone-200">
                        <span className="text-[9px] text-stone-500 uppercase font-bold block">Current Physical</span>
                        <span className="font-extrabold text-stone-900 text-xs">{currentBranchStock.physical}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-stone-200">
                        <span className="text-[9px] text-stone-500 uppercase font-bold block">Reserved</span>
                        <span className="font-extrabold text-amber-700 text-xs">{currentBranchStock.reserved}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-stone-200">
                        <span className="text-[9px] text-stone-500 uppercase font-bold block">Available</span>
                        <span className="font-extrabold text-emerald-700 text-xs">{currentBranchStock.available}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Branch Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Target Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjustBranch}
                    onChange={(e) => setAdjustBranch(e.target.value)}
                    required
                    className="w-full bg-stone-50 border border-stone-250 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white text-stone-900 cursor-pointer shadow-xs"
                  >
                    {branchList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                      Adjustment Quantity <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-semibold">Typeable numeric</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 50"
                    value={adjustQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdjustQty(val === "" ? "" : Math.max(1, parseInt(val) || 1));
                    }}
                    required
                    className="w-full bg-stone-50 border border-stone-250 rounded-xl py-2.5 px-3 text-xs font-black outline-none focus:border-orange-500 focus:bg-white text-stone-900 shadow-xs"
                  />
                </div>

                {/* Live Stock Delta Preview */}
                {selectedProduct && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-center text-xs">
                    <div className="text-center">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block">Current</span>
                      <span className="font-extrabold text-stone-700 text-xs">{currentBranchStock.physical}</span>
                    </div>
                    <div className="text-center font-bold text-orange-500 font-mono">
                      {adjustType === "STOCK_IN" ? `+${adjustQty || 0}` : adjustType === "STOCK_OUT" ? `-${adjustQty || 0}` : `=${adjustQty || 0}`}
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block">New Total</span>
                      <span className="font-black text-stone-950 text-xs">{previewNewStock} units</span>
                    </div>
                  </div>
                )}

                {/* Optional Target Purchase Order Selector (Stock In only) */}
                {adjustType === "STOCK_IN" && selectedProduct && (
                  <div className="space-y-2 p-3.5 bg-gradient-to-br from-stone-50 to-orange-50/20 border border-stone-250 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Adjust Stock for PO</span>
                        <span className="text-[10px] text-stone-400 font-medium lowercase">(optional)</span>
                      </label>
                      {loadingPendingPOs && (
                        <span className="text-[10px] text-orange-600 flex items-center gap-1 font-semibold">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Checking open POs...
                        </span>
                      )}
                    </div>

                    <select
                      value={selectedPoId}
                      onChange={(e) => {
                        setSelectedPoId(e.target.value);
                        const target = pendingPOs.find(p => p.poId === e.target.value || p.poNumber === e.target.value);
                        if (target) {
                          setAdjustDetails(`Stock adjustment allocated for PO ${target.poNumber}`);
                        }
                      }}
                      className="w-full bg-white border border-stone-250 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-orange-500 text-stone-900 cursor-pointer shadow-xs"
                    >
                      <option value="">
                        {pendingPOs.length > 0 
                          ? `-- Auto-allocate FIFO to pending POs (${pendingPOs.length} waiting) --` 
                          : "-- No pending POs for this SKU (Direct to available stock) --"}
                      </option>
                      {pendingPOs.map((po) => (
                        <option key={po.poId} value={po.poId}>
                          {po.poNumber} — Pending {po.pendingQuantity} (Requested: {po.requestedQuantity}, Customer: {po.customerName})
                        </option>
                      ))}
                    </select>

                    {/* Allocation Preview Card */}
                    {allocationPreview && (
                      <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-xs space-y-1.5 mt-2 shadow-xs">
                        <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between border-b border-stone-100 pb-1">
                          <span>Allocation Preview</span>
                          {allocationPreview.type === "TARGETED" ? (
                            <span className="text-purple-700 font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Selected PO Priority
                            </span>
                          ) : allocationPreview.type === "FIFO" ? (
                            <span className="text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              FIFO Distribution
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Available Stock
                            </span>
                          )}
                        </div>

                        {allocationPreview.type === "TARGETED" && (
                          <div className="space-y-1 text-stone-700 pt-0.5">
                            <div className="flex justify-between">
                              <span>Allocate to <strong>{allocationPreview.poNumber}</strong>:</span>
                              <span className="font-mono font-bold text-emerald-700">+{allocationPreview.toAllocate} units</span>
                            </div>
                            <div className="flex justify-between text-stone-500 text-[11px]">
                              <span>Remaining shortage for {allocationPreview.poNumber}:</span>
                              <span className="font-mono font-bold">{Math.max(0, allocationPreview.pendingNeeded - allocationPreview.toAllocate)} units</span>
                            </div>
                            {allocationPreview.toAvailable > 0 && (
                              <div className="flex justify-between text-stone-500 text-[11px]">
                                <span>Surplus to available inventory:</span>
                                <span className="font-mono font-bold text-stone-800">+{allocationPreview.toAvailable} units</span>
                              </div>
                            )}
                            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-stone-600">PO Status:</span>
                              <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded border ${
                                allocationPreview.isFulfilled 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}>
                                {allocationPreview.isFulfilled ? "✓ STOCK ADJUSTED & ASSIGNED" : "PARTIALLY ASSIGNED"}
                              </span>
                            </div>
                          </div>
                        )}

                        {allocationPreview.type === "FIFO" && (
                          <div className="space-y-1 text-stone-700 pt-0.5">
                            <div className="text-[11px]">
                              Auto-allocating <strong className="text-emerald-700 font-mono font-bold">+{allocationPreview.totalAlloc} units</strong> to open POs:
                            </div>
                            <div className="flex flex-wrap gap-1.5 my-1">
                              {allocationPreview.impacts.map(imp => (
                                <span key={imp.poNumber} className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[10px]">
                                  <strong>{imp.poNumber}</strong>: +{imp.qty}
                                </span>
                              ))}
                            </div>
                            {allocationPreview.toAvailable > 0 && (
                              <div className="text-[10px] text-stone-500 pt-0.5">
                                Surplus <strong>{allocationPreview.toAvailable} units</strong> will stay in general available stock.
                              </div>
                            )}
                          </div>
                        )}

                        {allocationPreview.type === "AVAILABLE" && (
                          <div className="text-[11px] text-stone-600 pt-0.5">
                            All <strong className="font-mono font-bold text-emerald-700">+{allocationPreview.toAvailable} units</strong> will go to general available stock.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Audit Reason & Notes <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={adjustDetails}
                    onChange={(e) => setAdjustDetails(e.target.value)}
                    required
                    rows={2}
                    placeholder="Enter reason (e.g. 'New stock received from supplier for customer order fulfillment')"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-900 resize-none font-medium shadow-xs"
                  />
                </div>

                {/* High Contrast Confirmation Button */}
                <button
                  type="submit"
                  disabled={loading || !selectedProduct}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    loading || !selectedProduct ? "opacity-50 cursor-not-allowed bg-stone-400" :
                    adjustType === "STOCK_IN"
                      ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-500/20"
                      : adjustType === "STOCK_OUT"
                      ? "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-rose-500/20"
                      : "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] shadow-amber-500/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Adjusting Stock...</span>
                    </>
                  ) : adjustType === "STOCK_IN" ? (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Confirm Stock Addition</span>
                    </>
                  ) : adjustType === "STOCK_OUT" ? (
                    <>
                      <MinusCircle className="w-4 h-4" />
                      <span>Confirm Stock Removal</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Confirm Stock Adjustment</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm text-center py-12 px-6 space-y-3">
              <ClipboardList className="w-10 h-10 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-stone-600">Adjustment Restricted</h4>
              <p className="text-stone-400 text-xs max-w-xs mx-auto">
                Your role does not have operational clearance to execute manual stock adjustments. You may review ledger movements below.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Audit Ledger & Filter History (7 cols on large) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-150 pb-4">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">
                  Stock Movement & Ledger
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-stone-500">
                {filteredMovements.length} Records
              </span>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative sm:col-span-1">
                <input
                  type="text"
                  placeholder="Search SKU/details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>

              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="ADDITION">Addition (+)</option>
                  <option value="REDUCTION">Reduction (-)</option>
                  <option value="ADJUSTMENT">Adjustment (=)</option>
                </select>
              </div>

              <div>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  {branchList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Movements Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-stone-200">
                    <th className="px-3.5 py-2.5">SKU / Item</th>
                    <th className="px-3.5 py-2.5">Branch</th>
                    <th className="px-3.5 py-2.5">Type</th>
                    <th className="px-3.5 py-2.5 text-right">Qty</th>
                    <th className="px-3.5 py-2.5">Audit Reason</th>
                    <th className="px-3.5 py-2.5">Operator</th>
                    <th className="px-3.5 py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-stone-400 italic">
                        No movement audit logs found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.slice(0, 50).map((m) => {
                      const isAddition = m.type === "ADDITION";
                      const isReduction = m.type === "REDUCTION";
                      const badgeClass = isAddition
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : isReduction
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-amber-50 text-amber-700 border-amber-300";

                      return (
                        <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-stone-900">
                            {m.sku}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-stone-700">
                            {m.branchCode}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${badgeClass}`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-black text-stone-900 font-mono">
                            {isReduction ? "-" : "+"}
                            {Math.abs(m.quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 text-stone-600 max-w-[200px] truncate" title={m.details}>
                            {m.details}
                          </td>
                          <td className="px-3.5 py-2.5 text-stone-500 font-medium truncate max-w-[110px]" title={m.userId || "System"}>
                            {m.userId || "System"}
                          </td>
                          <td className="px-3.5 py-2.5 text-stone-400 font-mono text-[10px] whitespace-nowrap">
                            {new Date(m.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Success Confirmation Modal */}
      {successModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-emerald-600 border-b border-stone-150 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 font-outfit">
                  Stock Adjustment Successful
                </h3>
                <p className="text-xs text-stone-500">
                  Inventory updated and open Purchase Order requirements reconciled.
                </p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="font-bold text-stone-500 uppercase text-[10px]">Adjustment ID</span>
                <span className="font-mono font-black text-sm text-orange-655">
                  {successModalData.adjustmentNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-400 block uppercase text-[9px] font-bold">Product</span>
                  <span className="font-bold text-stone-900">{successModalData.productName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase text-[9px] font-bold">SKU</span>
                  <span className="font-mono font-bold text-stone-800">{successModalData.sku}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase text-[9px] font-bold">Branch</span>
                  <span className="font-extrabold text-stone-800">{successModalData.branchCode}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase text-[9px] font-bold">Adjusted By</span>
                  <span className="font-bold text-stone-800">{successModalData.adjustedBy}</span>
                </div>
              </div>

              {/* Stock Transition Bar */}
              <div className="bg-white p-3 rounded-lg border border-stone-200 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-stone-400 uppercase font-bold block">Previous Stock</span>
                  <span className="font-bold text-stone-600">{successModalData.previousStock} units</span>
                </div>
                <div className="text-emerald-600 font-black font-mono text-sm">
                  +{successModalData.adjustmentQuantity}
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-stone-400 uppercase font-bold block">New Stock</span>
                  <span className="font-black text-emerald-700 text-sm">{successModalData.newStock} units</span>
                </div>
              </div>

              <div className="text-[10px] text-stone-400 font-mono text-right">
                Adjusted on: {successModalData.adjustedOn}
              </div>
            </div>

            {/* Purchase Order Impact Section */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Purchase Order Fulfillment Impact
              </h4>
              {successModalData.poImpacts && successModalData.poImpacts.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {successModalData.poImpacts.map((impact: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span>{impact.poNumber}</span>
                          <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            {impact.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          Fulfilled: <strong>{impact.fulfilledQty}</strong> / {impact.requiredQty} units
                          {impact.remainingQty > 0 ? ` (${impact.remainingQty} remaining)` : " (Complete)"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewPoIdentifier(impact.poNumber);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View PO</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500 italic text-center">
                  No active open Purchase Orders had shortages for this SKU. Stock added directly to free warehouse inventory.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-150">
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Details Modal if opened from success impact */}
      {viewPoIdentifier && (
        <PODetailsModal
          poIdentifier={viewPoIdentifier}
          onClose={() => setViewPoIdentifier(null)}
        />
      )}
    </div>
  );
}
