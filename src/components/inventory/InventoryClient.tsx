"use client";

import { useState, useEffect } from "react";
import { useErpStore } from "@/lib/store";
import { transferInventoryAction, updatePRStatusAction, addStockAction, reduceStockAction } from "@/app/actions";
import { productCatalog } from "@/lib/catalog";
import { toast } from "sonner";
import {
  Boxes,
  Search,
  Filter,
  ArrowRightLeft,
  Warehouse,
  AlertTriangle,
  Clock,
  X,
  CheckCircle,
  Truck,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileDown,
  ClipboardCheck,
  UserCheck,
  Plus,
  Minus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import SearchableDropdown from "@/components/ui/SearchableDropdown";

interface InventoryClientProps {
  inventory: any[];
  purchaseRequests: any[];
  grns: any[];
  salesOrders: any[];
  purchaseOrders: any[];
  slug?: string[];
}

const branchMap: Record<string, string> = {
  "Hyderabad Corporate Office": "HYD-HQ",
  "Hyderabad T-Hub Experience Center": "HYD-THUB",
  "Hyderabad Jubilee Hills": "HYD-JH",
  "Bengaluru HSR Layout": "BLR",
  "Chennai Anna Nagar": "CHN",
  "Mumbai Worli": "MUM",
  "Gurgaon Delhi NCR": "DEL",
  "Visakhapatnam": "VZG",
  "Vijayawada": "VJA",
  "Head Office": "HYD-HQ",
  "None": "HYD-HQ"
};

const BRANCH_NAMES: Record<string, string> = {
  "HYD-HQ": "Hyderabad Corporate Office",
  "HYD-THUB": "Hyderabad T-Hub Experience Center",
  "HYD-JH": "Hyderabad Jubilee Hills",
  "BLR": "Bengaluru HSR Layout",
  "CHN": "Chennai Anna Nagar",
  "MUM": "Mumbai Worli",
  "DEL": "Gurgaon Delhi NCR",
  "VZG": "Visakhapatnam",
  "VJA": "Vijayawada"
};

const getBranchRegion = (code: string) => {
  if (["HYD-HQ", "HYD-THUB", "HYD-JH"].includes(code)) return "Telangana";
  if (code === "BLR") return "Karnataka";
  if (code === "CHN") return "Tamil Nadu";
  if (code === "MUM") return "Maharashtra";
  if (code === "DEL") return "Delhi NCR";
  if (["VZG", "VJA"].includes(code)) return "Andhra Pradesh";
  return "Unknown Region";
};

const matchBranchFilter = (itemBranch: string, filter: string) => {
  if (filter === "ALL") return true;
  if (filter === "HYD") return ["HYD-HQ", "HYD-THUB", "HYD-JH"].includes(itemBranch);
  return itemBranch === filter;
};

// PR/GRN Unified Stepper Cycle
const PR_STAGES = [
  "DRAFT", "SUBMITTED", "APPROVED", "VENDOR_ORDERED", 
  "VENDOR_CONFIRMED", "IN_TRANSIT", "RECEIVED", 
  "QC_PASSED", "GRN_COMPLETED", "STOCK_UPDATED", "CLOSED"
];

export default function InventoryClient({
  inventory,
  purchaseRequests,
  grns,
  salesOrders,
  purchaseOrders,
  slug
}: InventoryClientProps) {
  const { activeRole, activeUser, adminRegionFilter } = useErpStore();
  const router = useRouter();

  const activeSubpage = slug && slug.length > 0 ? slug[0] : "dashboard";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");

  // Sorting & Pagination States
  const [sortBy, setSortBy] = useState<string>("sku");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Transfer stock state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferItem, setTransferItem] = useState("");
  const [targetWarehouse, setTargetWarehouse] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferLoading, setTransferLoading] = useState(false);

  // Stock Adjust State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReduceForm, setShowReduceForm] = useState(false);
  const [adjustSku, setAdjustSku] = useState("");
  const [adjustBranch, setAdjustBranch] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // GRN entry state
  const [selectedPrId, setSelectedPrId] = useState("");
  const [qcStatus, setQcStatus] = useState("PASSED");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [grnLoading, setGrnLoading] = useState(false);

  // Apply Branch Isolation
  const userBranch = activeUser ? branchMap[activeUser.branch] || "HYD-HQ" : "HYD-HQ";
  const userRegion = getBranchRegion(userBranch);

  const isRowVisible = (itemBranch: string) => {
    if (activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") {
      return matchBranchFilter(itemBranch, adminRegionFilter);
    }
    if (activeRole === "SALES_HEAD") {
      return true;
    }
    if (activeRole === "REGIONAL_SALES_MANAGER") {
      return getBranchRegion(itemBranch) === userRegion;
    }
    return itemBranch === userBranch;
  };

  const filteredInventory = inventory.filter(item => {
    if (!isRowVisible(item.branchCode)) return false;
    const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarehouse = selectedWarehouse === "All" || item.branchCode === selectedWarehouse;
    return matchesSearch && matchesWarehouse;
  });

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " 🔼" : " 🔽";
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aVal: any = a[sortBy];
    let bVal: any = b[sortBy];

    if (sortBy === "free") {
      aVal = a.quantity - a.reservedQty;
      bVal = b.quantity - b.reservedQty;
    }

    if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);
  const paginatedInventory = sortedInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredPRs = purchaseRequests.filter(pr => {
    // PRs are isolated based on branch allocation
    return isRowVisible(pr.allocatedToBranch || "HYD-HQ");
  });

  // Pre-build lookups
  const catalogMap = new Map();
  productCatalog.forEach(p => catalogMap.set(p.sku, p));

  const branchStockCounts: Record<string, number> = {};
  inventory.forEach(i => {
    let bKey = i.branchCode;
    if (bKey.startsWith("HYD")) bKey = "HYD";
    branchStockCounts[bKey] = (branchStockCounts[bKey] || 0) + i.quantity;
  });

  // KPI calculations
  const totalStockUnits = filteredInventory.reduce((s, i) => s + i.quantity, 0);
  const reservedStockUnits = filteredInventory.reduce((s, i) => s + i.reservedQty, 0);
  const availableStockUnits = totalStockUnits - reservedStockUnits;

  const totalStockValue = filteredInventory.reduce((sum, item) => {
    const matched = catalogMap.get(item.sku);
    const price = matched ? matched.price : 10000;
    return sum + (item.quantity * price);
  }, 0);

  const lowStockAlerts = filteredInventory.filter(i => i.quantity < i.minStock);

  // Recharts comparer
  const stockByBranch = [
    { name: "HYD", quantity: branchStockCounts["HYD"] || 0 },
    { name: "BLR", quantity: branchStockCounts["BLR"] || 0 },
    { name: "MUM", quantity: branchStockCounts["MUM"] || 0 },
    { name: "CHN", quantity: branchStockCounts["CHN"] || 0 },
    { name: "DEL", quantity: branchStockCounts["DEL"] || 0 },
  ].filter(b => activeRole === "ADMIN" || activeRole === "SUPER_ADMIN" ? (adminRegionFilter === "ALL" || b.name === adminRegionFilter) : b.name === userBranch);

  // Inter-warehouse transfer submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem || !targetWarehouse || transferQty <= 0) {
      toast.error("Please fill all transfer fields");
      return;
    }

    const selectedInv = inventory.find(i => i.id === transferItem);
    if (!selectedInv) return;

    if (selectedInv.branchCode === targetWarehouse) {
      toast.error("Source and destination branch warehouses cannot be the same");
      return;
    }

    setTransferLoading(true);
    try {
      await transferInventoryAction({
        inventoryId: transferItem,
        targetWarehouseId: targetWarehouse,
        quantityToTransfer: transferQty,
        userId: activeUser?.email || "admin@conquererp.com"
      });
      toast.success(`Transferred ${transferQty} units of SKU ${selectedInv.sku} successfully!`);
      setShowTransferForm(false);
      setTransferItem("");
      setTargetWarehouse("");
      setTransferQty(1);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute transfer");
    } finally {
      setTransferLoading(false);
    }
  };

  // Stock Addition Submit
  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustSku || !adjustBranch || adjustQty <= 0) {
      toast.error("Please fill all fields");
      return;
    }

    setAdjustLoading(true);
    try {
      await addStockAction({
        sku: adjustSku,
        branchCode: adjustBranch,
        quantity: adjustQty,
        userId: activeUser?.email || "admin@conquererp.com"
      });
      toast.success(`Successfully added ${adjustQty} units of SKU ${adjustSku} to branch ${adjustBranch}!`);
      setShowAddForm(false);
      setAdjustSku("");
      setAdjustBranch("");
      setAdjustQty(1);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add stock");
    } finally {
      setAdjustLoading(false);
    }
  };

  // Stock Reduction Submit
  const handleReduceStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustSku || !adjustBranch || adjustQty <= 0) {
      toast.error("Please fill all fields");
      return;
    }

    setAdjustLoading(true);
    try {
      await reduceStockAction({
        sku: adjustSku,
        branchCode: adjustBranch,
        quantity: adjustQty,
        userId: activeUser?.email || "admin@conquererp.com"
      });
      toast.success(`Successfully reduced stock by ${adjustQty} units for SKU ${adjustSku} from branch ${adjustBranch}!`);
      setShowReduceForm(false);
      setAdjustSku("");
      setAdjustBranch("");
      setAdjustQty(1);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reduce stock");
    } finally {
      setAdjustLoading(false);
    }
  };

  // Stepper advance action
  const handlePRStatusAdvance = async (prId: string, currentStatus: string) => {
    const currentIdx = PR_STAGES.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx >= PR_STAGES.length - 1) return;

    const nextStatus = PR_STAGES[currentIdx + 1];
    
    try {
      await updatePRStatusAction(prId, nextStatus, undefined, activeUser?.email || "admin@conquererp.com");
      toast.success(`PR advanced to state: ${nextStatus}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to advance PR cycle");
    }
  };

  // Receive GRN submit
  const handleGrnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrId) {
      toast.error("Please select a pending procurement PR");
      return;
    }

    const pr = purchaseRequests.find(p => p.id === selectedPrId);
    if (!pr) return;

    setGrnLoading(true);
    try {
      // Simulate GRN generation flow:
      // 1. Advance status to RECEIVED
      await updatePRStatusAction(selectedPrId, "RECEIVED", undefined, activeUser?.email || "admin@conquererp.com");
      
      // 2. Advance to QC_PASSED (or update dynamically based on form value)
      const qcState = qcStatus === "PASSED" ? "QC_PASSED" : "CLOSED"; // let's use QC_PASSED
      await updatePRStatusAction(selectedPrId, qcState, undefined, activeUser?.email || "admin@conquererp.com");

      // 3. Advance to GRN_COMPLETED
      await updatePRStatusAction(selectedPrId, "GRN_COMPLETED", undefined, activeUser?.email || "admin@conquererp.com");

      // 4. Advance to STOCK_UPDATED (triggers inventory count add in backend actions)
      // For mock database, let's update local count
      const localInv = inventory.find(i => i.sku === pr.productCode && i.branchCode === (pr.allocatedToBranch || userBranch));
      if (localInv) {
        localInv.quantity += pr.quantity;
      }
      
      await updatePRStatusAction(selectedPrId, "STOCK_UPDATED", undefined, activeUser?.email || "admin@conquererp.com");
      
      // 5. Close the PR
      await updatePRStatusAction(selectedPrId, "CLOSED", undefined, activeUser?.email || "admin@conquererp.com");

      toast.success("Shipment received! QC check logged, GRN processed, and branch inventory updated.");
      setSelectedPrId("");
      setSerialNumbers("");
      router.push("/inventory/pr-management");
    } catch (err: any) {
      toast.error(err.message || "Failed to process GRN intake");
    } finally {
      setGrnLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 capitalize font-outfit">
            Inventory - {activeSubpage.replace("-", " ")}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Conduct inter-warehouse transfers, analyze stock age distribution, and log supplier GRNs.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-[10px] bg-orange-50 border border-orange-200 text-orange-700 font-bold px-2 py-1 rounded">
            Role: {activeRole}
          </span>
        </div>
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeSubpage === "dashboard" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">Total Stock (Units)</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">{totalStockUnits.toLocaleString()}</h3>
                <span className="text-[10px] text-stone-400 mt-1 block">Units on hand in warehouse</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <Boxes className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">Reserved Stock</span>
                <h3 className="text-2xl font-bold mt-1 text-orange-550">{reservedStockUnits.toLocaleString()}</h3>
                <span className="text-[10px] text-stone-400 mt-1 block">Allocated to client Sales Orders</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-550">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">Available Free Stock</span>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600">{availableStockUnits.toLocaleString()}</h3>
                <span className="text-[10px] text-stone-400 mt-1 block">Unreserved, ready to dispatch</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">Stock Valuation</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">₹{totalStockValue.toLocaleString()}</h3>
                <span className="text-[10px] text-stone-400 mt-1 block">Value of hand inventory</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick links & low stock notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl space-y-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Inventory Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/inventory/stock-check")}
                  className="flex flex-col items-start p-4 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100/70 transition-all text-left cursor-pointer"
                >
                  <Search className="w-5 h-5 text-orange-500 mb-2" />
                  <span className="text-xs font-bold text-stone-800">Stock Check</span>
                  <span className="text-[9px] text-stone-400 mt-1">Cross-branch stock level checks</span>
                </button>

                <button
                  onClick={() => router.push("/inventory/stock-allocation")}
                  className="flex flex-col items-start p-4 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100/70 transition-all text-left cursor-pointer"
                >
                  <Layers className="w-5 h-5 text-orange-550 mb-2" />
                  <span className="text-xs font-bold text-stone-800">Stock Allocations</span>
                  <span className="text-[9px] text-stone-400 mt-1">Reservations & FIFO checks</span>
                </button>

                <button
                  onClick={() => router.push("/inventory/pr-management")}
                  className="flex flex-col items-start p-4 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100/70 transition-all text-left cursor-pointer"
                >
                  <FileDown className="w-5 h-5 text-rose-500 mb-2" />
                  <span className="text-xs font-bold text-stone-800">PR Pipeline</span>
                  <span className="text-[9px] text-stone-400 mt-1">Unified sourcing stepper status</span>
                </button>

                <button
                  onClick={() => router.push("/inventory/grn-entry")}
                  className="flex flex-col items-start p-4 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100/70 transition-all text-left cursor-pointer"
                >
                  <ClipboardCheck className="w-5 h-5 text-amber-500 mb-2" />
                  <span className="text-xs font-bold text-stone-800">GRN Entry</span>
                  <span className="text-[9px] text-stone-400 mt-1">Material QC & serial intake</span>
                </button>
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl space-y-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Low Stock Critical Alerts</span>
              </h4>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                {lowStockAlerts.length === 0 ? (
                  <div className="text-xs text-stone-400 italic py-4 text-center">
                    All warehouses maintain healthy stock margins.
                  </div>
                ) : (
                  lowStockAlerts.map(item => (
                    <div key={item.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-stone-900 block">{item.itemName}</span>
                        <span className="text-[9px] text-stone-450 uppercase font-bold tracking-wider">SKU: {item.sku} • BRANCH: {item.branchCode}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-rose-600 block">{item.quantity} units</span>
                        <span className="text-[8px] text-stone-400">Min limit: {item.minStock}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- STOCK CHECK & TRANSFERS SUBPAGE --- */}
      {activeSubpage === "stock-check" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
              <Warehouse className="w-5 h-5" />
              <span>Real-Time Warehouses Stock Check</span>
            </h3>
            
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {!showTransferForm && !showAddForm && !showReduceForm && activeRole !== "VIEWER" && (
                <>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Stock Entry</span>
                  </button>

                  <button
                    onClick={() => setShowReduceForm(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Reduce Stock</span>
                  </button>

                  <button
                    onClick={() => setShowTransferForm(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Stock Transfer</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {showTransferForm && (
            <div className="glass-panel p-5 border-indigo-500/20 max-w-md mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-slate-200">Inter-Branch Stock Transfer Form</span>
                <button onClick={() => setShowTransferForm(false)} className="p-1 text-slate-400 hover:bg-slate-900 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Item to Transfer</label>
                  <select
                    value={transferItem}
                    onChange={(e) => setTransferItem(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {inventory.filter(i => activeRole === "ADMIN" || i.branchCode === userBranch).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.sku}) - {item.branchCode} - Free: {item.quantity - item.reservedQty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Destination Branch</label>
                  <select
                    value={targetWarehouse}
                    onChange={(e) => setTargetWarehouse(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300 cursor-pointer"
                  >
                    <option value="">-- Select Destination Branch --</option>
                    {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transfer Volume Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={transferLoading}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all cursor-pointer disabled:opacity-55"
                >
                  {transferLoading ? "Processing Transfer..." : "Transfer Stock"}
                </button>
              </form>
            </div>
          )}

          {showAddForm && (
            <div className="glass-panel p-5 border-emerald-500/20 max-w-md mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-slate-200">Stock Entry (Addition)</span>
                <button onClick={() => setShowAddForm(false)} className="p-1 text-slate-400 hover:bg-slate-900 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddStockSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Product SKU</label>
                  <select
                    value={adjustSku}
                    onChange={(e) => setAdjustSku(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  >
                    <option value="">-- Choose Product --</option>
                    {productCatalog.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Branch</label>
                  <select
                    value={adjustBranch}
                    onChange={(e) => setAdjustBranch(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300 cursor-pointer"
                  >
                    <option value="">-- Select Branch --</option>
                    {activeRole === "ADMIN" || activeRole === "SUPER_ADMIN" ? (
                      <>
                        {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                          <option key={code} value={code}>{name} ({code})</option>
                        ))}
                      </>
                    ) : (
                      <option value={userBranch}>{BRANCH_NAMES[userBranch] || userBranch}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity to Add</label>
                  <input
                    type="number"
                    min={1}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all cursor-pointer disabled:opacity-55"
                >
                  {adjustLoading ? "Processing..." : "Add Stock"}
                </button>
              </form>
            </div>
          )}

          {showReduceForm && (
            <div className="glass-panel p-5 border-rose-500/20 max-w-md mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-slate-200">Stock Reduction Form</span>
                <button onClick={() => setShowReduceForm(false)} className="p-1 text-slate-400 hover:bg-slate-900 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReduceStockSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Product SKU</label>
                  <select
                    value={adjustSku}
                    onChange={(e) => setAdjustSku(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  >
                    <option value="">-- Choose Product --</option>
                    {inventory.filter(i => activeRole === "ADMIN" || i.branchCode === userBranch).map((i) => (
                      <option key={i.id} value={i.sku}>
                        {i.itemName} ({i.sku}) - {i.branchCode} (Qty: {i.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Branch</label>
                  <select
                    value={adjustBranch}
                    onChange={(e) => setAdjustBranch(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300 cursor-pointer"
                  >
                    <option value="">-- Select Branch --</option>
                    {activeRole === "ADMIN" || activeRole === "SUPER_ADMIN" ? (
                      <>
                        {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                          <option key={code} value={code}>{name} ({code})</option>
                        ))}
                      </>
                    ) : (
                      <option value={userBranch}>{BRANCH_NAMES[userBranch] || userBranch}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity to Deduct</label>
                  <input
                    type="number"
                    min={1}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all cursor-pointer disabled:opacity-55"
                >
                  {adjustLoading ? "Processing..." : "Deduct Stock"}
                </button>
              </form>
            </div>
          )}

          {!showTransferForm && !showAddForm && !showReduceForm && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex justify-between items-center bg-white p-4 border border-stone-200 rounded-xl shadow-sm gap-4">
                <div className="flex-1 max-w-md relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 text-stone-800"
                  />
                </div>

                {(activeRole === "ADMIN" || activeRole === "SUPER_ADMIN") && (
                  <div className="w-48">
                    <SearchableDropdown
                      options={[
                        { value: "All", label: "All Branches" },
                        ...Object.entries(BRANCH_NAMES).map(([code, name]) => ({ value: code, label: `${name} (${code})` }))
                      ]}
                      value={selectedWarehouse}
                      onChange={setSelectedWarehouse}
                    />
                  </div>
                )}
              </div>

              <div className="glass-panel overflow-x-auto bg-white border border-[#fed7aa] rounded-2xl shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th onClick={() => handleSort("sku")} className="px-6 py-3 cursor-pointer hover:bg-stone-100 select-none">SKU{renderSortIcon("sku")}</th>
                      <th onClick={() => handleSort("itemName")} className="px-6 py-3 cursor-pointer hover:bg-stone-100 select-none">Product Name{renderSortIcon("itemName")}</th>
                      <th onClick={() => handleSort("branchCode")} className="px-6 py-3 cursor-pointer hover:bg-stone-100 select-none">Branch Location{renderSortIcon("branchCode")}</th>
                      <th className="px-6 py-3 text-center">Zone</th>
                      <th onClick={() => handleSort("ageingDays")} className="px-6 py-3 text-right cursor-pointer hover:bg-stone-100 select-none">Ageing (FIFO){renderSortIcon("ageingDays")}</th>
                      <th className="px-6 py-3 text-right">Min/Max limits</th>
                      <th className="px-6 py-3 text-right">Reserved qty</th>
                      <th onClick={() => handleSort("free")} className="px-6 py-3 text-right cursor-pointer hover:bg-stone-100 select-none">Available Free{renderSortIcon("free")}</th>
                      <th onClick={() => handleSort("quantity")} className="px-6 py-3 text-right font-bold cursor-pointer hover:bg-stone-100 select-none">Gross Qty{renderSortIcon("quantity")}</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginatedInventory.map((item) => {
                      const free = item.quantity - item.reservedQty;
                      const lowStock = item.quantity < item.minStock;
                      
                      let statusBadge = (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                          HEALTHY
                        </span>
                      );
                      if (item.quantity === 0) {
                        statusBadge = (
                          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-rose-50 text-rose-700 border-rose-200">
                            OUT OF STOCK
                          </span>
                        );
                      } else if (lowStock) {
                        statusBadge = (
                          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-amber-50 text-amber-700 border-amber-250">
                            LOW STOCK
                          </span>
                        );
                      }

                      return (
                        <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-orange-600">{item.sku}</td>
                          <td className="px-6 py-4 font-semibold text-stone-850">{item.itemName}</td>
                          <td className="px-6 py-4 text-stone-600 font-bold">{item.branchCode}</td>
                          <td className="px-6 py-4 text-center font-mono text-stone-500">{item.warehouseZone}</td>
                          <td className="px-6 py-4 text-right text-stone-600 font-semibold">{item.ageingDays} days</td>
                          <td className="px-6 py-4 text-right text-stone-500 font-medium">{item.minStock} / {item.maxStock} units</td>
                          <td className="px-6 py-4 text-right font-medium text-stone-500">{item.reservedQty} units</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600">{free} units</td>
                          <td className="px-6 py-4 text-right font-bold text-stone-900">
                            <div className="flex items-center justify-end space-x-1.5">
                              {lowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                              <span className={lowStock ? "text-amber-500 font-extrabold" : ""}>{item.quantity} units</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border border-[#fed7aa] bg-white px-4 py-3 rounded-2xl shadow-sm sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-705 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-705 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-stone-600">
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedInventory.length)}</span> of{' '}
                        <span className="font-semibold">{sortedInventory.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-stone-405 ring-1 ring-inset ring-stone-250 hover:bg-stone-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isCurrent = pageNum === currentPage;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold focus:z-20 ${
                                isCurrent
                                  ? "z-10 bg-orange-500 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                                  : "text-stone-900 ring-1 ring-inset ring-stone-250 hover:bg-stone-50 focus:outline-offset-0"
                              } cursor-pointer`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-stone-450 ring-1 ring-inset ring-stone-250 hover:bg-stone-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- STOCK ALLOCATION SUBPAGE --- */}
      {activeSubpage === "stock-allocation" && (
        <div className="glass-panel p-6 animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Active Reservations & Stock Allocations</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/50 text-slate-450 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">SO Ref</th>
                  <th className="px-4 py-2.5">Customer Name</th>
                  <th className="px-4 py-2.5">SKU Code</th>
                  <th className="px-4 py-2.5 text-right">Quantity Reserved</th>
                  <th className="px-4 py-2.5 text-center">FIFO Status</th>
                  <th className="px-4 py-2.5 text-center">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {salesOrders.filter(so => so.status === "Approved" || so.status === "Verified").length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-semibold">
                      No active Sales Orders require stock allocation.
                    </td>
                  </tr>
                ) : (
                  salesOrders.filter(so => so.status === "Approved" || so.status === "Verified").map((so) => {
                    const items = so.items || [];
                    return items.map((item: any, idx: number) => {
                      const relatedPo = purchaseOrders.find(p => p.id === so.purchaseOrderId);
                      const isPoBranchMatch = isRowVisible(relatedPo?.branchCode || "HYD");
                      if (!isPoBranchMatch) return null;

                      return (
                        <tr key={`${so.id}-${idx}`} className="hover:bg-slate-900/40">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-500">{so.soNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-200">{so.customer?.name}</td>
                          <td className="px-4 py-3 font-mono text-indigo-400">{item.productCode}</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{item.quantity} units</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              FIFO ALLOCATED
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-400">Allocated automatically</span>
                          </td>
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PR PIPELINE STEPS SUBPAGE --- */}
      {activeSubpage === "pr-management" && (
        <div className="glass-panel p-6 animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-indigo-550" />
            <span>Unified Procurement PR & GRN Pipeline</span>
          </h3>

          <div className="space-y-4">
            {filteredPRs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-semibold italic">
                No active Sourcing PR requests registered.
              </div>
            ) : (
              filteredPRs.map((pr) => {
                const currentIdx = PR_STAGES.indexOf(pr.status);
                return (
                  <div key={pr.id} className="p-4 bg-slate-900 border border-slate-805 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-slate-800">
                      <div>
                        <span className="text-[9px] bg-slate-950 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-800 font-mono">
                          {pr.prNumber}
                        </span>
                        <div className="flex items-center space-x-2 mt-1 flex-wrap">
                          <h4 className="font-bold text-slate-200 text-sm">{pr.itemName}</h4>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono font-semibold">
                            {pr.productCode}
                          </span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0 text-xs">
                        <span className="text-slate-500 block">Sourcing Request Quantity:</span>
                        <span className="font-bold text-indigo-400 text-sm">{pr.quantity} units</span>
                      </div>
                    </div>

                    {/* Timeline stepper cycle */}
                    <div className="py-2 overflow-x-auto">
                      <div className="flex items-center justify-between min-w-[700px] relative px-4">
                        <div className="absolute left-4 right-4 h-0.5 bg-slate-800 top-1/2 -translate-y-1/2 -z-10"></div>
                        <div
                          className="absolute left-4 h-0.5 bg-indigo-500 top-1/2 -translate-y-1/2 -z-10 transition-all duration-300"
                          style={{ width: `${(currentIdx / (PR_STAGES.length - 1)) * 95}%` }}
                        ></div>

                        {PR_STAGES.map((stage, idx) => {
                          const active = idx <= currentIdx;
                          const current = idx === currentIdx;
                          return (
                            <div key={stage} className="flex flex-col items-center">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all ${current ? "bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-500/20 scale-110" : active ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                                {idx + 1}
                              </div>
                              <span className={`text-[8px] font-bold mt-1 block uppercase ${current ? "text-indigo-400" : active ? "text-slate-300" : "text-slate-600"}`}>
                                {stage.replace("_", " ")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metadata & operations buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-800/40 text-xs">
                      <div className="text-slate-500">
                        {pr.vendor ? (
                          <span>Assigned Vendor: <span className="font-bold text-indigo-400">{pr.vendor.name}</span></span>
                        ) : (
                          <span>Awaiting supplier confirmation</span>
                        )}
                        <span className="block text-[10px] text-slate-600">Created: {new Date(pr.createdAt).toLocaleString()}</span>
                      </div>

                      {/* RM / Purchase / Inventory manager pipeline progress triggers */}
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        {currentIdx < PR_STAGES.length - 1 && pr.status !== "IN_TRANSIT" && pr.status !== "RECEIVED" && pr.status !== "QC_PASSED" && pr.status !== "GRN_COMPLETED" && pr.status !== "STOCK_UPDATED" && (
                          <button
                            onClick={() => handlePRStatusAdvance(pr.id, pr.status)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-bold transition-all cursor-pointer"
                          >
                            <span>Advance Stage</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {pr.status === "IN_TRANSIT" && (
                          <button
                            onClick={() => handlePRStatusAdvance(pr.id, "IN_TRANSIT")}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-bold transition-all cursor-pointer"
                          >
                            <span>Mark Received</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {pr.status === "RECEIVED" && (
                          <button
                            onClick={() => handlePRStatusAdvance(pr.id, "RECEIVED")}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-bold transition-all cursor-pointer"
                          >
                            <span>Pass QC Check</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {pr.status === "QC_PASSED" && (
                          <button
                            onClick={() => router.push("/inventory/grn-entry")}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded font-bold transition-all cursor-pointer"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Log GRN Entry</span>
                          </button>
                        )}
                        {pr.status === "CLOSED" && (
                          <span className="flex items-center space-x-1 text-emerald-500 font-bold">
                            <CheckCircle className="w-4 h-4" />
                            <span>Closed & Stocked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- GRN ENTRY SUBPAGE --- */}
      {activeSubpage === "grn-entry" && (
        <div className="glass-panel p-6 animate-in fade-in-50 duration-200 max-w-md mx-auto space-y-4 border-indigo-500/20">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-200">Log Goods Receipt Note (GRN)</h3>
          </div>

          <form onSubmit={handleGrnSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Incoming Shipment (PR)</label>
              {purchaseRequests.filter(pr => pr.status === "QC_PASSED" || pr.status === "RECEIVED").length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 font-semibold">
                  No incoming shipments awaiting GRN entry. Ensure shipments are received and pass QC check first.
                </div>
              ) : (
                <select
                  value={selectedPrId}
                  onChange={(e) => setSelectedPrId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-350 focus:border-indigo-500"
                >
                  <option value="">-- Select Shipment --</option>
                  {purchaseRequests.filter(pr => pr.status === "QC_PASSED" || pr.status === "RECEIVED").map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.prNumber} - {pr.itemName} (Qty: {pr.quantity} units)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quality Inspection Status</label>
                <select
                  value={qcStatus}
                  onChange={(e) => setQcStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-350 focus:border-indigo-500"
                >
                  <option value="PASSED">Passed (Standard)</option>
                  <option value="FAILED">Failed (Auto-Reject)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receiving Officer</label>
                <input
                  type="text"
                  disabled
                  value={activeUser?.name || "Inventory Manager"}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-805 rounded-lg text-xs outline-none text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Received Serial Numbers (CSV)</label>
              <textarea
                rows={3}
                placeholder="e.g. SN-0982-892, SN-8923-903"
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-805 rounded-lg text-xs outline-none text-slate-300 focus:border-indigo-500 placeholder-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={grnLoading || !selectedPrId}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-55"
            >
              {grnLoading ? "Processing GRN Intake..." : "Process GRN Receipt & Add Stock"}
            </button>
          </form>
        </div>
      )}

      {/* --- WAREHOUSE ZONES SUBPAGE --- */}
      {activeSubpage === "warehouse" && (
        <div className="glass-panel p-6 animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
            <Warehouse className="w-5 h-5 text-indigo-400" />
            <span>Warehouse zones configuration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-805 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Zone A1 (Smartphones)</span>
                <span className="text-indigo-455 font-mono">Temp: 18°C</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Fulfillment items: iPhone 15 Pro Max, iPhone 15 Pro, Pixel 8 Pro</span>
              <span className="font-bold text-slate-400 block pt-1">Zone Occupancy: 82%</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-805 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Zone B1 (Laptops)</span>
                <span className="text-indigo-455 font-mono">Temp: 20°C</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Fulfillment items: MacBook Pro 16, MacBook Air 15, HP Spectre</span>
              <span className="font-bold text-slate-400 block pt-1">Zone Occupancy: 45%</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-805 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Zone C1 (Accessories)</span>
                <span className="text-indigo-455 font-mono">Temp: 22°C</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Fulfillment items: AirPods Pro 2, Pixel Buds Pro</span>
              <span className="font-bold text-slate-400 block pt-1">Zone Occupancy: 60%</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-805 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Zone D1 (Wearables)</span>
                <span className="text-indigo-455 font-mono">Temp: 20°C</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Fulfillment items: Apple Watch Ultra 2, Pixel Watch 2</span>
              <span className="font-bold text-slate-400 block pt-1">Zone Occupancy: 30%</span>
            </div>
          </div>
        </div>
      )}

      {/* --- STOCK AGEING REPORT SUBPAGE --- */}
      {activeSubpage === "stock-ageing" && (
        <div className="glass-panel p-6 animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-450" />
            <span>Stock Inventory Ageing (FIFO Audit)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/50 text-slate-450 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Product Name</th>
                  <th className="px-4 py-2.5">Branch Location</th>
                  <th className="px-4 py-2.5 text-center">Zone</th>
                  <th className="px-4 py-2.5 text-right font-bold text-indigo-400">Inventory Ageing (Days)</th>
                  <th className="px-4 py-2.5 text-center">FIFO Priority Status</th>
                  <th className="px-4 py-2.5 text-right">In Stock Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredInventory.sort((a, b) => b.ageingDays - a.ageingDays).map((item) => {
                  const criticalAgeing = item.ageingDays >= 30;
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-500">{item.sku}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{item.itemName}</td>
                      <td className="px-4 py-3 font-bold text-slate-400">{item.branchCode}</td>
                      <td className="px-4 py-3 text-center font-mono">{item.warehouseZone}</td>
                      <td className={`px-4 py-3 text-right font-bold ${criticalAgeing ? "text-rose-400 animate-pulse" : "text-amber-450"}`}>
                        {item.ageingDays} Days Old
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${criticalAgeing ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-450 border-amber-500/20"}`}>
                          {criticalAgeing ? "CRITICAL (DISPATCH FIRST)" : "MEDIUM EXPOSURE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-200">{item.quantity} units</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
