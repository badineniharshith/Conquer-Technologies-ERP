"use client";

import { useState, useEffect, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { createProductAction, updateProductAction, createReservationAction } from "@/app/actions";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Filter,
  X,
  Barcode,
  CheckCircle,
  XCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertOctagon,
  Boxes,
  Clock
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchableDropdown from "@/components/ui/SearchableDropdown";

const BRANCH_NAMES: Record<string, string> = {
  "HYD-HQ": "Hyderabad (HQ)",
  "HYD-THUB": "Hyderabad (T-Hub)",
  "HYD-JH": "Hyderabad (Jubilee Hills)",
  "BLR": "Bengaluru",
  "CHN": "Chennai",
  "MUM": "Mumbai",
  "DEL": "Gurgaon Delhi NCR",
  "VZG": "Visakhapatnam",
  "VJA": "Vijayawada"
};

interface ProductMasterClientProps {
  products: any[];
  categories: any[];
  inventory: any[];
  prices: any[];
  predictions?: any[];
  searchQueryString?: string;
  correctedQueryString?: string;
  totalFilteredCount: number;
  currentPage: number;
}

export default function ProductMasterClient({
  products,
  categories,
  inventory,
  prices,
  predictions,
  searchQueryString,
  correctedQueryString,
  totalFilteredCount,
  currentPage
}: ProductMasterClientProps) {
  const { activeUser } = useErpStore();
  const activeRole = activeUser?.role || "CUSTOMER";
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedBrand = searchParams.get("brand") || "All";
  const selectedCategory = searchParams.get("category") || "All";
  const selectedAvailability = searchParams.get("availability") || "All";
  const selectedStatus = searchParams.get("status") || "All";
  const selectedPriceRange = searchParams.get("priceRange") || "All";

  const [searchQuery, setSearchQuery] = useState(searchQueryString || "");

  useEffect(() => {
    setSearchQuery(searchQueryString || "");
  }, [searchQueryString]);

  const updateFilters = (newFilters: {
    q?: string;
    brand?: string;
    category?: string;
    availability?: string;
    status?: string;
    priceRange?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams(window.location.search);
    
    if (newFilters.q !== undefined) {
      if (newFilters.q) params.set("q", newFilters.q);
      else params.delete("q");
    }
    if (newFilters.brand !== undefined) {
      if (newFilters.brand !== "All") params.set("brand", newFilters.brand);
      else params.delete("brand");
    }
    if (newFilters.category !== undefined) {
      if (newFilters.category !== "All") params.set("category", newFilters.category);
      else params.delete("category");
    }
    if (newFilters.availability !== undefined) {
      if (newFilters.availability !== "All") params.set("availability", newFilters.availability);
      else params.delete("availability");
    }
    if (newFilters.status !== undefined) {
      if (newFilters.status !== "All") params.set("status", newFilters.status);
      else params.delete("status");
    }
    if (newFilters.priceRange !== undefined) {
      if (newFilters.priceRange !== "All") params.set("priceRange", newFilters.priceRange);
      else params.delete("priceRange");
    }
    
    if (newFilters.page !== undefined) {
      params.set("page", String(newFilters.page));
    } else {
      params.set("page", "1");
    }
    
    router.push(`/products?${params.toString()}`);
  };

  // Debounce search query parameter update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (searchQueryString || "")) {
        updateFilters({ q: searchQuery });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchQueryString]);

  const queryToHighlight = searchQuery || correctedQueryString || searchQueryString || "";

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${escapeRegExp(highlight)})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-stone-900 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  
  // Create product form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("Apple");
  const [categoryId, setCategoryId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reorderLevel, setReorderLevel] = useState(10);
  const [safetyStock, setSafetyStock] = useState(5);
  const [serialTracking, setSerialTracking] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reserve Modal State
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveProduct, setReserveProduct] = useState<any | null>(null);
  const [reserveBranch, setReserveBranch] = useState("");
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [reserveLoading, setReserveLoading] = useState(false);

  // Pre-build Maps for O(1) performance during search filtering
  const skuStockMap = new Map();
  inventory.forEach(inv => {
    skuStockMap.set(inv.sku, (skuStockMap.get(inv.sku) || 0) + inv.quantity);
  });

  const userBranchCode = activeUser?.branch || "HYD-HQ";

  const getProductPrice = (sku: string) => {
    const branchMatch = prices.find((pr: any) => pr.sku === sku && pr.branchCode === userBranchCode);
    if (branchMatch) return branchMatch.sellingPrice || branchMatch.costPrice;
    const defaultMatch = prices.find((pr: any) => pr.sku === sku && pr.branchCode === "HYD-HQ") || prices.find((pr: any) => pr.sku === sku);
    return defaultMatch ? (defaultMatch.sellingPrice || defaultMatch.costPrice) : 0;
  };

  const predictionsList = predictions || [];
  const trendingSkus = useMemo(() => predictionsList.slice(0, 5).map(p => p.sku), [predictionsList]);
  const trendingSkuSet = useMemo(() => new Set(trendingSkus), [trendingSkus]);

  const sortedProducts = products;
  const totalPages = Math.ceil(totalFilteredCount / 10);
  const paginatedProducts = sortedProducts;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId) {
      toast.error("Please enter a product name and select a category");
      return;
    }

    setLoading(true);
    try {
      // Automatic SKU Generation if empty
      let generatedSku = sku.trim().toUpperCase();
      if (!generatedSku) {
        const prefix = brand === "Apple" ? "APP" : brand === "Google" ? "PXL" : "HP";
        const shortName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 5).toUpperCase();
        const rand = Math.floor(100 + Math.random() * 900);
        generatedSku = `${prefix}-${shortName}-${rand}`;
      }

      // Default category id mapping fallback
      const catId = categoryId || categories[0]?.id || "cat-apple";

      await createProductAction({
        sku: generatedSku,
        name,
        brand,
        categoryId: catId,
        barcode: barcode || `890${Math.floor(1000000 + Math.random() * 9000000)}`,
        reorderLevel: Number(reorderLevel),
        safetyStock: Number(safetyStock),
        serialTracking,
        userId: activeUser?.email || "admin@conquererp.com"
      });

      toast.success(`Successfully created product ${name} with SKU ${generatedSku}!`);
      setShowCreateForm(false);
      setSku("");
      setName("");
      setBrand("Apple");
      setCategoryId("");
      setBarcode("");
      setReorderLevel(10);
      setSafetyStock(5);
      setSerialTracking(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    if (activeRole !== "ADMIN" && activeRole !== "SUPER_ADMIN" && activeRole !== "EMPLOYEE") {
      toast.error("Only administrators or employees can activate/deactivate products");
      return;
    }

    const nextStatus = currentStatus === "ACTIVE" ? "DEACTIVE" : "ACTIVE";
    try {
      await updateProductAction(productId, { status: nextStatus }, activeUser?.email || "admin@conquererp.com");
      toast.success(`Product status updated to ${nextStatus}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleToggleSerialTracking = async (productId: string, currentSerialTracking: boolean) => {
    if (activeRole !== "ADMIN" && activeRole !== "SUPER_ADMIN" && activeRole !== "EMPLOYEE") {
      toast.error("Only administrators or employees can toggle serial tracking");
      return;
    }

    const nextSerialTracking = !currentSerialTracking;
    try {
      await updateProductAction(productId, { serialTracking: nextSerialTracking }, activeUser?.email || "admin@conquererp.com");
      toast.success(`Product serial tracking ${nextSerialTracking ? "enabled" : "disabled"}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle serial tracking");
    }
  };

  const isStaff = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(activeRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
            <Package className="w-6 h-6 text-orange-500" />
            <span>Product Master Catalog</span>
          </h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Centralized ecosystem repository of supported Apple, Google Pixel, and HP products.
          </p>
        </div>

        {isStaff && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-orange-550/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </button>
        )}
      </div>

      {showCreateForm ? (
        <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl max-w-xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <h3 className="font-bold text-sm text-stone-950 flex items-center space-x-2">
              <Package className="w-5 h-5 text-orange-500" />
              <span>Add New Catalog Product</span>
            </h3>
            <button onClick={() => setShowCreateForm(false)} className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 16 Pro 256GB"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white placeholder-stone-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Product SKU (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white placeholder-stone-400 transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Ecosystem Brand</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-700 focus:border-orange-500 focus:bg-white cursor-pointer"
                >
                  <option value="Apple">Apple</option>
                  <option value="Google">Google Pixel</option>
                  <option value="HP">HP</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Category Type</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-750 focus:border-orange-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Safety Stock limit</label>
                <input
                  type="number"
                  min={1}
                  value={safetyStock}
                  onChange={(e) => setSafetyStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Reorder Level threshold</label>
                <input
                  type="number"
                  min={1}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Barcode / EAN (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-assigned if blank"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-mono placeholder-stone-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2.5 text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serialTracking}
                  onChange={(e) => setSerialTracking(e.target.checked)}
                  className="rounded border-stone-300 text-orange-500 focus:ring-0 w-4 h-4 bg-stone-50"
                />
                <span className="font-semibold text-xs">Enable Individual Serial Number Tracking</span>
              </label>
              <p className="text-[10px] text-stone-400 mt-1 pl-6">
                Requires specifying serial numbers upon receiving goods receipt notes (GRN).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-550/10 cursor-pointer disabled:opacity-55 pt-3"
            >
              {loading ? "Registering Product..." : "Register Product to Master"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trending Products Section */}
          {predictionsList.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 font-outfit">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                <span>Trending Products This Month (July Peak Forecast)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {predictionsList.slice(0, 5).map((pred) => {
                  const catalogProduct = products.find(p => p.sku === pred.sku);
                  return (
                    <div key={pred.sku} className="bg-gradient-to-br from-amber-50/50 to-white border border-[#fed7aa]/50 hover:border-orange-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all relative group">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
                            {pred.brand}
                          </span>
                          <span className="flex items-center space-x-0.5 text-[8px] font-extrabold text-orange-600 animate-pulse">
                            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                            <span>TRENDING</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-stone-850 text-xs truncate" title={pred.name}>
                            {pred.name}
                          </h4>
                          <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{pred.sku}</span>
                        </div>

                        <div className="space-y-1.5 border-t border-stone-100 pt-2 text-[10px] text-stone-600">
                          <div className="flex justify-between">
                            <span>Popularity Score:</span>
                            <span className="font-bold text-stone-900">{pred.popularityScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>June Sales MoM:</span>
                            <span className="font-medium text-stone-500">{pred.previousMonthSales} units</span>
                          </div>
                          <div className="flex justify-between font-bold text-orange-600">
                            <span>Forecasted:</span>
                            <span>{pred.predictedSales} units</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-stone-200/50 pt-2.5">
                        {activeRole === "CUSTOMER" ? (
                          <button
                            onClick={() => {
                              setReserveProduct(catalogProduct || pred);
                              setReserveBranch("");
                              setReserveQuantity(1);
                              setShowReserveModal(true);
                            }}
                            className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-all active:scale-95 shadow-sm shadow-orange-500/10"
                          >
                            Reserve Stock
                          </button>
                        ) : (
                          <span className="block text-center text-[9px] text-stone-400 font-bold uppercase py-1">
                            Demand: {pred.predictedSales > 50 ? 'High' : 'Moderate'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spelling Correction Banner */}
          {correctedQueryString && (
            <div className="bg-orange-50 border border-orange-200 text-orange-850 p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4 text-orange-500 shrink-0" />
                <span>
                  No exact matches found for <strong>"{searchQueryString}"</strong>. Showing spelling-corrected results for <strong>"{correctedQueryString}"</strong> instead.
                </span>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  router.push("/products");
                }}
                className="text-stone-400 hover:text-orange-655 font-bold underline text-[10px] cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          )}

          {/* Search/Filters Panel */}
          <div className="bg-white p-4 border border-stone-200 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search catalog SKU or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white placeholder-stone-400 transition-all text-stone-800 font-medium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Brand</label>
                <SearchableDropdown
                  options={[
                    { value: "All", label: "All Brands" },
                    { value: "Apple", label: "Apple" },
                    { value: "Google", label: "Google Pixel" },
                    { value: "HP", label: "HP" }
                  ]}
                  value={selectedBrand}
                  onChange={(val) => updateFilters({ brand: val })}
                />
              </div>
              
              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Category</label>
                <SearchableDropdown
                  options={[
                    { value: "All", label: "All Categories" },
                    ...categories.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  value={selectedCategory}
                  onChange={(val) => updateFilters({ category: val })}
                />
              </div>

              {activeRole !== "CUSTOMER" ? (
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Availability</label>
                  <SearchableDropdown
                    options={[
                      { value: "All", label: "All Availability" },
                      { value: "In Stock", label: "In Stock" },
                      { value: "Out of Stock", label: "Out of Stock" }
                    ]}
                    value={selectedAvailability}
                    onChange={(val) => updateFilters({ availability: val })}
                  />
                </div>
              ) : (
                <div className="hidden sm:block"></div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Status</label>
                <SearchableDropdown
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "DEACTIVE", label: "Deactive" }
                  ]}
                  value={selectedStatus}
                  onChange={(val) => updateFilters({ status: val })}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Price Range</label>
                <SearchableDropdown
                  options={[
                    { value: "All", label: "All Price Ranges" },
                    { value: "under60", label: "Under ₹60,000" },
                    { value: "60to100", label: "₹60,000 to ₹100,000" },
                    { value: "over100", label: "Over ₹100,000" }
                  ]}
                  value={selectedPriceRange}
                  onChange={(val) => updateFilters({ priceRange: val })}
                />
              </div>
            </div>
          </div>
 
           <div className="glass-panel overflow-x-auto bg-white border border-[#fed7aa] rounded-2xl shadow-sm">
             <table className="w-full text-xs text-left border-collapse">
               <thead>
                 <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                   <th className="px-6 py-3">SKU</th>
                   <th className="px-6 py-3">Product Name</th>
                   <th className="px-6 py-3">Brand</th>
                   <th className="px-6 py-3">Category</th>
                   <th className="px-6 py-3">Barcode</th>
                   {activeRole !== "CUSTOMER" && <th className="px-6 py-3 text-right">Safety Stock</th>}
                   {activeRole !== "CUSTOMER" && <th className="px-6 py-3 text-right">Reorder Level</th>}
                   {activeRole !== "CUSTOMER" && <th className="px-6 py-3 text-center">Serial Tracking</th>}
                   <th className="px-6 py-3 text-center">Status</th>
                   {activeRole === "CUSTOMER" && <th className="px-6 py-3 text-center">Action</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-stone-100">
                 {paginatedProducts.map((p) => (
                   <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                     <td className="px-6 py-4 font-mono font-bold text-orange-600">
                      {highlightText(p.sku, queryToHighlight)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-stone-850">
                      {highlightText(p.name, queryToHighlight)}
                    </td>
                    <td className="px-6 py-4 text-stone-600 font-medium">
                      {highlightText(p.brand, queryToHighlight)}
                    </td>
                    <td className="px-6 py-4 text-stone-655 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Tag className="w-3.5 h-3.5 text-orange-400" />
                        <span>{highlightText(p.category?.name || "Smartphones", queryToHighlight)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-stone-500 text-[10px]">
                      <div className="flex items-center space-x-1">
                        <Barcode className="w-4 h-4 text-stone-400" />
                        <span>{p.barcode || "N/A"}</span>
                      </div>
                    </td>
                    {activeRole !== "CUSTOMER" && <td className="px-6 py-4 text-right font-semibold text-stone-500">{p.safetyStock} units</td>}
                    {activeRole !== "CUSTOMER" && <td className="px-6 py-4 text-right font-bold text-stone-700">{p.reorderLevel} units</td>}
                    {activeRole !== "CUSTOMER" && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleSerialTracking(p.id, p.serialTracking)}
                          disabled={!isStaff}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all duration-200 ease-in-out ${
                            p.serialTracking
                              ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:scale-95"
                              : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 active:scale-95"
                          } disabled:opacity-80 cursor-pointer`}
                        >
                          {p.serialTracking ? "ENABLED" : "DISABLED"}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(p.id, p.status)}
                        disabled={!isStaff}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all duration-200 ease-in-out ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 active:scale-95"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 active:scale-95"
                        } disabled:opacity-80 cursor-pointer`}
                      >
                        {p.status === "ACTIVE" ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-650" />
                            <span>DEACTIVE</span>
                          </>
                        )}
                      </button>
                    </td>
                    {activeRole === "CUSTOMER" && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            const catalogProduct = products.find(prod => prod.sku === p.sku);
                            setReserveProduct(catalogProduct || p);
                            setReserveBranch("");
                            setReserveQuantity(1);
                            setShowReserveModal(true);
                          }}
                          className="px-2.5 py-1 bg-orange-500 hover:bg-orange-655 text-white font-bold rounded text-[10px] cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          Reserve
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sortedProducts.length === 0 && (
                  <tr>
                    <td colSpan={activeRole === "CUSTOMER" ? 9 : 9} className="px-6 py-8 text-center text-stone-400 italic">
                      No matching catalog products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-stone-250 rounded-2xl px-4 py-3 shadow-sm gap-3 mt-3">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                Showing {Math.min(totalFilteredCount, (currentPage - 1) * 10 + 1)}-{Math.min(totalFilteredCount, currentPage * 10)} of {totalFilteredCount} items
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => updateFilters({ page: currentPage - 1 })}
                  className="p-1.5 border border-stone-250 rounded-xl text-stone-500 hover:text-orange-600 hover:bg-orange-50/50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-stone-750 font-bold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => updateFilters({ page: currentPage + 1 })}
                  className="p-1.5 border border-stone-250 rounded-xl text-stone-500 hover:text-orange-600 hover:bg-orange-50/50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reserve Stock Modal */}
      {showReserveModal && reserveProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-orange-200 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-stone-950 flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-orange-500" />
                <span>Reserve Product Stock</span>
              </h3>
              <button 
                onClick={() => {
                  setShowReserveModal(false);
                  setReserveProduct(null);
                }} 
                className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-4">
              <div className="bg-stone-50 p-3.5 border border-stone-200 rounded-xl space-y-1">
                <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase w-max block">
                  {reserveProduct.brand}
                </span>
                <h4 className="font-extrabold text-stone-900 mt-1">{reserveProduct.name}</h4>
                <span className="font-mono text-stone-455 text-[10px] block">SKU: {reserveProduct.sku}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Select Branch Warehouse</label>
                <select
                  value={reserveBranch}
                  onChange={(e) => {
                    setReserveBranch(e.target.value);
                    setReserveQuantity(1);
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-700 focus:border-orange-500 focus:bg-white cursor-pointer font-medium"
                >
                  <option value="">-- Select Branch --</option>
                  {inventory
                    .filter((inv) => inv.sku === reserveProduct.sku)
                    .map((inv) => {
                      const freeStock = inv.quantity - inv.reservedQty;
                      const branchText = BRANCH_NAMES[inv.branchCode] || inv.branchCode;
                      return (
                        <option 
                          key={inv.branchCode} 
                          value={inv.branchCode}
                          disabled={activeRole === "CUSTOMER" ? false : freeStock <= 0}
                        >
                          {branchText} {activeRole === "CUSTOMER" ? "" : `(${freeStock > 0 ? `${freeStock} available` : 'Out of Stock'})`}
                        </option>
                      );
                    })}
                </select>
              </div>

              {reserveBranch && (() => {
                const matchedInv = inventory.find(
                  (inv) => inv.sku === reserveProduct.sku && inv.branchCode === reserveBranch
                );
                const freeStock = matchedInv ? matchedInv.quantity - matchedInv.reservedQty : 0;

                return (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                      {activeRole === "CUSTOMER" ? "Quantity" : `Quantity to Lock (Max: ${freeStock})`}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={activeRole === "CUSTOMER" ? undefined : freeStock}
                      value={reserveQuantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (activeRole === "CUSTOMER") {
                          setReserveQuantity(Math.max(1, val));
                        } else {
                          setReserveQuantity(Math.max(1, Math.min(freeStock, val)));
                        }
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white font-semibold"
                    />
                    <span className="text-[10px] text-stone-400 block mt-1">
                      A reservation deadline will be calculated automatically based on stock availability (3 days for full stock, 7 days for partial stock, 14 days if procurement is needed).
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowReserveModal(false);
                  setReserveProduct(null);
                }}
                className="flex-1 py-2 border border-stone-250 hover:bg-stone-50 text-stone-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reserveLoading || !reserveBranch || reserveQuantity <= 0}
                onClick={async () => {
                  setReserveLoading(true);
                  try {
                    const result = await createReservationAction({
                      productId: reserveProduct.id,
                      sku: reserveProduct.sku,
                      quantity: reserveQuantity,
                      customerId: activeUser?.id || "",
                      branchCode: reserveBranch
                    });

                    if (result.error) {
                      toast.error(result.error);
                    } else {
                      toast.success(`Successfully reserved ${reserveQuantity} units of ${reserveProduct.name}!`);
                      setShowReserveModal(false);
                      setReserveProduct(null);
                      router.refresh();
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to create reservation");
                  } finally {
                    setReserveLoading(false);
                  }
                }}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-orange-500/10"
              >
                {reserveLoading ? "Locking..." : "Confirm Reserve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
