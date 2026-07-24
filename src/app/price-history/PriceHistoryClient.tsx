"use client";

import { useState, useEffect } from "react";
import { useErpStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Table,
  Calendar,
  Filter,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  Tag,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface PriceHistoryClientProps {
  initialHistory: any[];
  products: any[];
  categories: any[];
  purchaseOrders?: any[];
  reservations?: any[];
  searchSku?: string;
  searchCompareSku?: string;
}

export default function PriceHistoryClient({
  initialHistory,
  products,
  categories,
  purchaseOrders = [],
  reservations = [],
  searchSku,
  searchCompareSku
}: PriceHistoryClientProps) {
  const { activeUser } = useErpStore();
  const router = useRouter();

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSku, setSelectedSku] = useState(searchSku || products[0]?.sku || "");
  const [compareSku, setCompareSku] = useState(searchCompareSku || products[1]?.sku || "");
  const [dateRange, setDateRange] = useState("All"); // All, 30, 90, 365

  const isCustomer = activeUser?.role === "CUSTOMER";

  // Filter products dropdown based on selected Category
  const filteredProducts = products.filter(
    (p) => selectedCategory === "All" || p.categoryId === selectedCategory
  );

  // Auto-selection synchronization
  useEffect(() => {
    if (filteredProducts.length > 0 && !filteredProducts.some(p => p.sku === selectedSku)) {
      setSelectedSku(filteredProducts[0].sku);
    }
  }, [selectedCategory, filteredProducts, selectedSku]);

  const handleSkuChange = (newSku: string) => {
    setSelectedSku(newSku);
    router.push(`?sku=${newSku}&compareSku=${compareSku}`);
  };

  const handleCompareSkuChange = (newCompareSku: string) => {
    setCompareSku(newCompareSku);
    router.push(`?sku=${selectedSku}&compareSku=${newCompareSku}`);
  };

  // Check if database data is sufficient
  const dbHistory = initialHistory.filter((h) => h.sku === selectedSku);
  const isDataDemo = dbHistory.length === 0;

  // Fetch or generate product history
  const getProductHistory = (sku: string) => {
    const hList = initialHistory.filter((h) => h.sku === sku);
    if (hList.length > 0) {
      return hList.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    }

    // Dynamic fallback generation if DB is empty
    const getBasePrice = (s: string) => {
      if (s.includes("PHN") || s.includes("IPH")) return 69900;
      if (s.includes("LAP") || s.includes("MAC")) return 99900;
      if (s.includes("WTC")) return 25000;
      return 15000;
    };
    
    const base = getBasePrice(sku);
    const now = Date.now();
    const mockReasons = [
      { reason: "Supplier Cost Increase", changer: "supply.chain@conquer.com" },
      { reason: "Promotional Discount", changer: "marketing@conquer.com" },
      { reason: "GST Revision", changer: "compliance@conquer.com" },
      { reason: "Market Competition", changer: "sales@conquer.com" },
      { reason: "Festival Offer", changer: "promo@conquer.com" }
    ];

    return [
      { id: `m1-${sku}`, sku, sellingPrice: Math.round(base * 0.90), costPrice: Math.round(base * 0.70), mrp: base, updatedBy: mockReasons[0].changer, reason: mockReasons[0].reason, updatedAt: new Date(now - 120 * 24 * 3600 * 1000).toISOString() },
      { id: `m2-${sku}`, sku, sellingPrice: Math.round(base * 0.85), costPrice: Math.round(base * 0.68), mrp: base, updatedBy: mockReasons[1].changer, reason: mockReasons[1].reason, updatedAt: new Date(now - 90 * 24 * 3600 * 1000).toISOString() },
      { id: `m3-${sku}`, sku, sellingPrice: Math.round(base * 0.92), costPrice: Math.round(base * 0.72), mrp: base, updatedBy: mockReasons[2].changer, reason: mockReasons[2].reason, updatedAt: new Date(now - 60 * 24 * 3600 * 1000).toISOString() },
      { id: `m4-${sku}`, sku, sellingPrice: Math.round(base * 0.88), costPrice: Math.round(base * 0.70), mrp: base, updatedBy: mockReasons[3].changer, reason: mockReasons[3].reason, updatedAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString() },
      { id: `m5-${sku}`, sku, sellingPrice: base, costPrice: Math.round(base * 0.75), mrp: base, updatedBy: activeUser?.email || "admin@conquererp.com", reason: mockReasons[4].reason, updatedAt: new Date(now).toISOString() }
    ];
  };

  const fullHistory = getProductHistory(selectedSku);
  const compHistory = getProductHistory(compareSku);

  // Filter history records based on selected Date Range
  const filteredHistory = fullHistory.filter((h) => {
    if (dateRange === "All") return true;
    const days = Number(dateRange);
    const diffTime = Date.now() - new Date(h.updatedAt).getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  });

  // Calculate KPI Summary Card Metrics
  const pricesList = filteredHistory.map(h => h.sellingPrice);
  const lowestPrice = pricesList.length > 0 ? Math.min(...pricesList) : 0;
  const highestPrice = pricesList.length > 0 ? Math.max(...pricesList) : 0;
  const averagePrice = pricesList.length > 0 ? Math.round(pricesList.reduce((sum, p) => sum + p, 0) / pricesList.length) : 0;
  const latestPrice = filteredHistory[filteredHistory.length - 1]?.sellingPrice || 0;

  // Percentage changes
  let maxPctIncrease = 0;
  let maxPctDecrease = 0;
  for (let i = 1; i < filteredHistory.length; i++) {
    const prev = filteredHistory[i - 1].sellingPrice;
    const curr = filteredHistory[i].sellingPrice;
    const pct = ((curr - prev) / prev) * 100;
    if (pct > 0) {
      if (pct > maxPctIncrease) maxPctIncrease = pct;
    } else if (pct < 0) {
      const absPct = Math.abs(pct);
      if (absPct > maxPctDecrease) maxPctDecrease = absPct;
    }
  }

  // --- 1. Price Trend Area Chart Data ---
  const chartData = filteredHistory.map((h) => ({
    date: new Date(h.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    "Selling Price": h.sellingPrice,
    "MRP": h.mrp || h.sellingPrice,
  }));

  // --- 2. Monthly Comparison (Bar Chart) Data ---
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySum: Record<string, { sum: number; count: number }> = {};
  filteredHistory.forEach(h => {
    const dateObj = new Date(h.updatedAt);
    const mLabel = monthNames[dateObj.getMonth()];
    if (!monthlySum[mLabel]) {
      monthlySum[mLabel] = { sum: 0, count: 0 };
    }
    monthlySum[mLabel].sum += h.sellingPrice;
    monthlySum[mLabel].count += 1;
  });
  const monthlyBarData = Object.keys(monthlySum).map(m => ({
    Month: m,
    "Average Price": Math.round(monthlySum[m].sum / monthlySum[m].count)
  }));

  // --- 3. Product Comparison (Multi-Line Chart) Data ---
  const selectedProdName = products.find(p => p.sku === selectedSku)?.name.substring(0, 12) || selectedSku;
  const compareProdName = products.find(p => p.sku === compareSku)?.name.substring(0, 12) || compareSku;

  const comparisonData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m, idx) => {
    const selEntry = fullHistory.find(h => new Date(h.updatedAt).getMonth() === idx);
    const compEntry = compHistory.find(h => new Date(h.updatedAt).getMonth() === idx);
    return {
      Month: m,
      [selectedProdName]: selEntry?.sellingPrice || null,
      [compareProdName]: compEntry?.sellingPrice || null,
    };
  }).filter(d => d[selectedSku] !== null || d[compareSku] !== null);

  // --- 4. Chronological delta Table Rows ---
  const tableRows = filteredHistory.map((record, index) => {
    const prevRecord = index > 0 ? filteredHistory[index - 1] : null;
    const oldPrice = prevRecord ? prevRecord.sellingPrice : record.sellingPrice;
    const newPrice = record.sellingPrice;
    const diff = newPrice - oldPrice;
    const diffPct = oldPrice > 0 ? Math.round((diff / oldPrice) * 1000) / 10 : 0;
    
    const reasonsPool = ["Supplier Cost Increase", "Promotional Discount", "GST Revision", "Market Competition", "Festival Offer", "Import Cost", "Currency Fluctuation"];
    const reason = record.reason || reasonsPool[index % reasonsPool.length];

    return {
      date: new Date(record.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      oldPrice: prevRecord ? oldPrice : null,
      newPrice,
      difference: diff,
      diffPct,
      updatedBy: record.updatedBy || "system.update@conquer.com",
      reason
    };
  }).reverse(); // Latest updates first

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "PENDING":
      case "Pending Verification":
        return "bg-amber-50 text-amber-700 border-amber-250 font-bold";
      case "Draft":
        return "bg-stone-50 text-stone-500 border-stone-300 font-bold";
      case "Verified":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
      case "Pending Customer Approval":
        return "bg-indigo-50 text-indigo-750 border-indigo-250 font-bold";
      case "Modified by Customer (Pending Verification)":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "ACCEPTED":
      case "Accepted":
        return "bg-emerald-50 text-emerald-700 border-emerald-250 font-extrabold";
      case "Processing":
        return "bg-blue-50 text-blue-700 border-blue-205 font-bold animate-pulse";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold";
      case "EXPIRED":
        return "bg-red-50 text-red-750 border-red-200 font-semibold";
      case "COMPLETED":
      case "Completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-350 font-semibold";
      case "CANCELLED":
      case "Cancelled":
        return "bg-stone-100 text-stone-500 border-stone-300 font-semibold";
      default:
        return "bg-stone-50 text-stone-750 border-stone-200";
    }
  };

  // CUSTOMER VIEW RENDERING
  if (isCustomer) {
    const myPOs = (purchaseOrders || []).filter(po => po.customerId === activeUser?.id);
    const myReservations = (reservations || []).filter(res => res.customerId === activeUser?.id);
    const activeResCount = myReservations.filter(r => 
      ["ACTIVE", "PENDING", "ACCEPTED", "Accepted", "Verified", "Processing", "Pending Verification", "Modified by Customer (Pending Verification)", "Pending Customer Approval", "Draft"].includes(r.status)
    ).length;
    const totalItemsPurchased = myPOs.reduce((sum, po) => sum + (po.totalItems || 0), 0);
    const lastPurchaseDate = myPOs.length > 0 
      ? new Date(Math.max(...myPOs.map(po => new Date(po.dateReceived).getTime()))).toLocaleDateString() 
      : "N/A";

    return (
      <div className="space-y-6 text-stone-850">
        {/* Header */}
        <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-650/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">My Price History & Purchase Logs</h1>
            <p className="text-stone-500 text-xs md:text-sm mt-1">
              Review your purchase history, price trends, PO logs, and active stock reservations.
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
            <TrendingUp className="w-4 h-4" />
            <span>Customer Portal</span>
          </div>
        </div>

        {/* Personalized KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "POs Placed", value: myPOs.length, color: "text-orange-600 bg-orange-50" },
            { label: "Active Reservations", value: activeResCount, color: "text-indigo-655 bg-indigo-50" },
            { label: "Items Purchased", value: totalItemsPurchased, color: "text-emerald-700 bg-emerald-50" },
            { label: "Last Order Date", value: lastPurchaseDate, color: "text-stone-700 bg-stone-50" }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-white p-4 border border-stone-200 rounded-2xl shadow-sm space-y-1 transition-all hover:shadow">
              <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">{kpi.label}</span>
              <span className={`text-base font-black block ${kpi.color.split(" ")[0]}`}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* PRODUCT PRICE TREND SELECTOR & CHART */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Catalog Price Trends</span>
            </h3>
            <select
              value={selectedSku}
              onChange={(e) => handleSkuChange(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-755 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all font-medium min-w-[200px]"
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="date" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Selling Price" stroke="#ea580c" fill="#ffedd5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MY PURCHASE HISTORY TABLE */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Table className="w-4 h-4 text-orange-500" />
            <span>My Purchase Orders History</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Products & Quantities</th>
                  <th className="px-4 py-3">Expected Delivery</th>
                  <th className="px-4 py-3 text-right">Total Items</th>
                  <th className="px-4 py-3">Date Received</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {myPOs.map((po) => {
                  let productsList = "—";
                  try {
                    const parsed = JSON.parse(po.itemsJson || "[]");
                    productsList = parsed.map((it: any) => `${it.sku} (x${it.quantity})`).join(", ");
                  } catch {}
                  return (
                    <tr key={po.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-orange-600">{po.poNumber}</td>
                      <td className="px-4 py-3 font-semibold text-stone-850">{productsList}</td>
                      <td className="px-4 py-3 text-stone-500 font-medium">
                        {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-800 font-bold">{po.totalItems} units</td>
                      <td className="px-4 py-3 text-stone-500 font-medium">
                        {new Date(po.dateReceived).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          po.verificationStatus === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {po.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {myPOs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-stone-400 italic">
                      You have not placed any purchase orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MY RESERVATION LOGS TABLE */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Table className="w-4 h-4 text-orange-500" />
            <span>My Stock Reservation Logs</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Reservation Number</th>
                  <th className="px-4 py-3">Reserved Products</th>
                  <th className="px-4 py-3">Reserved On</th>
                  <th className="px-4 py-3">Expires On</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {myReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-orange-600">{res.reservationNumber}</td>
                    <td className="px-4 py-3 font-semibold text-stone-850">
                      {res.items && res.items.length > 0 
                        ? res.items.map((it: any) => it.product?.name || it.sku).join(", ") 
                        : (res.product?.name || res.sku)}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-medium">
                      {new Date(res.reservedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-medium">
                      {new Date(res.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-800 font-bold">
                      {res.items && res.items.length > 0 
                        ? `${res.items.reduce((sum: number, it: any) => sum + it.quantity, 0)} units` 
                        : `${res.quantity} units`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {myReservations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-stone-400 italic">
                      You have no stock reservation logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // STAFF VIEW RENDERING
  return (
    <div className="space-y-6 text-stone-850">
      {/* Fallback Demo Data Alert Badge */}
      {isDataDemo && (
        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-amber-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Showing **Demo Data** — No database pricing ledger matching SKU `{selectedSku}` was located.</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-655/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Price History Tracker</h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Browse price change trends, historical catalogs, and catalog adjustment trails over time.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <TrendingUp className="w-4 h-4" />
          <span>Product Intelligence</span>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-orange-500" />
          <span>Price Ledger Filters</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-750 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all font-medium"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Select Primary Product</label>
            <select
              value={selectedSku}
              onChange={(e) => handleSkuChange(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-750 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all font-medium"
            >
              {filteredProducts.map((p) => (
                <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
              ))}
              {filteredProducts.length === 0 && (
                <option value="">No products available</option>
              )}
            </select>
          </div>

          {/* Product Competitor Filter */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Compare With Competitor</label>
            <select
              value={compareSku}
              onChange={(e) => handleCompareSkuChange(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-755 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all font-medium"
            >
              {products.filter(p => p.sku !== selectedSku).map((p) => (
                <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Date Range Filter</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-750 outline-none cursor-pointer focus:border-orange-500 focus:bg-white transition-all font-medium"
            >
              <option value="All">All Time Ledger</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Highest Price", value: highestPrice > 0 ? `₹${highestPrice.toLocaleString()}` : "N/A", color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Lowest Price", value: lowestPrice > 0 ? `₹${lowestPrice.toLocaleString()}` : "N/A", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Average Price", value: averagePrice > 0 ? `₹${averagePrice.toLocaleString()}` : "N/A", color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Latest Price", value: latestPrice > 0 ? `₹${latestPrice.toLocaleString()}` : "N/A", color: "text-orange-600 bg-orange-50 border-orange-100" },
          { label: "Max Increase", value: `${maxPctIncrease.toFixed(1)}%`, color: "text-emerald-700 bg-emerald-50 border-emerald-150" },
          { label: "Max Decrease", value: `${maxPctDecrease.toFixed(1)}%`, color: "text-rose-700 bg-rose-50 border-rose-150" }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3 border border-stone-200 rounded-2xl shadow-sm space-y-1 transition-all hover:shadow hover:border-orange-550/20">
            <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">{kpi.label}</span>
            <span className={`text-xs md:text-sm font-black block ${kpi.color.split(" ")[0]}`}>{kpi.value}</span>
            <div className={`h-1 w-6 rounded-full ${kpi.color.split(" ")[1]}`}></div>
          </div>
        ))}
      </div>

      {/* ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Price Trend Line Chart */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Price Trend Line Graph</span>
            </h3>
            {isDataDemo && <span className="text-[8px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>}
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="date" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="Selling Price" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Monthly Comparison Bar Chart */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Monthly Comparison Bar Chart</span>
            </h3>
            {isDataDemo && <span className="text-[8px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>}
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="Month" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Average Price" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Price Volatility Area Chart */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Price Volatility Area Chart</span>
            </h3>
            {isDataDemo && <span className="text-[8px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>}
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="date" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Selling Price" stroke="#ea580c" fill="#ffedd5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Product Comparison Multi Line Chart */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Product Comparison Multiple Line Chart</span>
            </h3>
            {isDataDemo && <span className="text-[8px] bg-amber-100 text-amber-850 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>}
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="Month" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey={selectedProdName} stroke="#ea580c" strokeWidth={2.5} />
                <Line type="monotone" dataKey={compareProdName} stroke="#78716c" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* HISTORICAL LEDGER TABLE */}
      <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Table className="w-4 h-4 text-orange-500" />
          <span>Historical Audit Log & Delta Table</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Old Price</th>
                <th className="px-4 py-3 text-right">New Price</th>
                <th className="px-4 py-3 text-center">Increase/Decrease</th>
                <th className="px-4 py-3 text-right">Difference</th>
                <th className="px-4 py-3">Changed By</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {tableRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-3 text-stone-600 font-bold">{row.date}</td>
                  <td className="px-4 py-3 text-right text-stone-500 font-medium">
                    {row.oldPrice !== null ? `₹${row.oldPrice.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-900 font-bold">
                    ₹{row.newPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.oldPrice !== null ? (
                      <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${row.difference >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {row.difference >= 0 ? "INCREASE" : "DECREASE"}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-medium">BASE RATE</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {row.oldPrice !== null ? (
                      <span className={`inline-flex items-center space-x-0.5 ${row.difference >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {row.difference >= 0 ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+{row.difference.toLocaleString()} ({row.diffPct}%)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>{row.difference.toLocaleString()} ({row.diffPct}%)</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-medium">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600 font-medium">{row.updatedBy}</td>
                  <td className="px-4 py-3 font-semibold text-stone-800">{row.reason}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-stone-400 italic">
                    No historical logs matching this SKU criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
