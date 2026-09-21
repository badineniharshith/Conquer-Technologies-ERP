"use client";

import { useState, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import {
  PackageCheck,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  FolderOpen,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StockAvailabilityItem {
  id: string;
  sku: string;
  productName: string;
  brand?: string;
  categoryName: string;
  branchCode: string;
  physicalStock: number;
  allocatedStock: number;
  reservedStock: number;
  availableStock: number;
  pendingPoQty: number;
  reorderLevel: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: string;
}

interface StockAvailabilityClientProps {
  initialInventory: StockAvailabilityItem[];
  categories: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
}

export default function StockAvailabilityClient({
  initialInventory,
  categories,
  branches
}: StockAvailabilityClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortField, setSortField] = useState<"sku" | "productName" | "physicalStock" | "availableStock" | "updatedAt">("availableStock");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filtered list
  const filteredItems = useMemo(() => {
    return initialInventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q));

      const matchesBranch = selectedBranch === "ALL" || item.branchCode === selectedBranch;
      const matchesCategory = selectedCategory === "ALL" || item.categoryName.toLowerCase() === selectedCategory.toLowerCase();

      let matchesStatus = true;
      if (selectedStatus === "IN_STOCK") matchesStatus = item.stockStatus === "IN_STOCK";
      else if (selectedStatus === "LOW_STOCK") matchesStatus = item.stockStatus === "LOW_STOCK";
      else if (selectedStatus === "OUT_OF_STOCK") matchesStatus = item.stockStatus === "OUT_OF_STOCK";

      return matchesSearch && matchesBranch && matchesCategory && matchesStatus;
    });
  }, [initialInventory, searchQuery, selectedBranch, selectedCategory, selectedStatus]);

  // Sorted list
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "updatedAt") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, currentPage]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_STOCK":
        return {
          label: "In Stock",
          icon: CheckCircle2,
          className: "bg-emerald-50 text-emerald-800 border-emerald-300"
        };
      case "LOW_STOCK":
        return {
          label: "Low Stock",
          icon: AlertTriangle,
          className: "bg-amber-50 text-amber-800 border-amber-300"
        };
      case "OUT_OF_STOCK":
      default:
        return {
          label: "Out of Stock",
          icon: XCircle,
          className: "bg-rose-50 text-rose-800 border-rose-300"
        };
    }
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200/70 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-black tracking-tight text-stone-950 font-outfit">
              Stock Availability
            </h1>
          </div>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            View current inventory, reservations, and availability across branches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/stock-movement"
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/15 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Stock Adjustment</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards: Total, Allocated, Available, Pending PO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Stock (Physical)</div>
            <div className="text-2xl font-black text-stone-900 font-mono mt-1">
              {initialInventory.reduce((sum, item) => sum + (item.physicalStock || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Physical items in warehouse</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Allocated Stock</div>
            <div className="text-2xl font-black text-purple-900 font-mono mt-1">
              {initialInventory.reduce((sum, item) => sum + (item.allocatedStock || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-purple-600 mt-0.5">Reserved / assigned to POs</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Available Stock</div>
            <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
              {initialInventory.reduce((sum, item) => sum + (item.availableStock || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Total Stock − Active Allocations</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending PO Demand</div>
            <div className="text-2xl font-black text-amber-900 font-mono mt-1">
              {initialInventory.reduce((sum, item) => sum + (item.pendingPoQty || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Quantity needed by pending POs</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-250 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white shadow-xs"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          </div>

          {/* Branch Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 bg-stone-50 border border-stone-250 rounded-xl text-xs font-bold text-stone-700 outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 bg-stone-50 border border-stone-250 rounded-xl text-xs font-bold text-stone-700 outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2.5 px-3 bg-stone-50 border border-stone-250 rounded-xl text-xs font-bold text-stone-700 outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-150 text-xs text-stone-500 font-medium">
          <div>Products Displayed: <strong className="text-stone-900 font-bold">{sortedItems.length}</strong></div>
          <div>In Stock: <strong className="text-emerald-700 font-bold">{sortedItems.filter(i => i.stockStatus === "IN_STOCK").length}</strong></div>
          <div>Low Stock: <strong className="text-amber-700 font-bold">{sortedItems.filter(i => i.stockStatus === "LOW_STOCK").length}</strong></div>
          <div>Out of Stock: <strong className="text-rose-700 font-bold">{sortedItems.filter(i => i.stockStatus === "OUT_OF_STOCK").length}</strong></div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-stone-200">
                <th className="px-4 py-3 cursor-pointer select-none hover:text-orange-600" onClick={() => toggleSort("sku")}>
                  <div className="flex items-center gap-1">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-orange-600" onClick={() => toggleSort("productName")}>
                  <div className="flex items-center gap-1">
                    <span>Product</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3 text-right cursor-pointer select-none hover:text-orange-600" onClick={() => toggleSort("physicalStock")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Stock</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right cursor-pointer select-none hover:text-orange-600" onClick={() => toggleSort("availableStock")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Available</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Pending PO</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right cursor-pointer select-none hover:text-orange-600" onClick={() => toggleSort("updatedAt")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Updated</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-stone-400 italic">
                    <div className="flex flex-col items-center space-y-2">
                      <PackageCheck className="w-8 h-8 text-stone-300" />
                      <span>No inventory stock records found matching criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const badge = getStatusBadge(item.stockStatus);
                  const BadgeIcon = badge.icon;

                  return (
                    <tr key={`${item.sku}_${item.branchCode}`} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-orange-650 text-xs">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-stone-900">{item.productName}</div>
                        {item.brand && <div className="text-[10px] text-stone-400 font-medium">{item.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-medium">
                        {item.categoryName}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-stone-800">
                        {item.branchCode}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-stone-900 font-mono">
                        {item.physicalStock}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200">
                          {item.allocatedStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-xs border ${
                          item.availableStock > 0 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {item.availableStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {item.pendingPoQty > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200" title={`${item.pendingPoQty} units required by open POs`}>
                            {item.pendingPoQty}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border ${badge.className}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[10px] text-stone-400 whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/stock-movement?action=adjust&sku=${encodeURIComponent(item.sku)}&pending=${item.pendingPoQty || ""}`}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-orange-500 hover:text-white text-stone-700 font-bold text-[10px] rounded-lg transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <span>Adjust</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 flex justify-between items-center bg-stone-50 text-xs">
            <span className="text-stone-500 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedItems.length)} of {sortedItems.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-250 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-stone-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-250 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
