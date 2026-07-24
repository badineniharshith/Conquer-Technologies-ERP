"use client";

import { useState, useEffect, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Search,
  Check,
  TrendingUp,
  Boxes,
  Layers,
  ArrowRightLeft,
  Sparkles,
  ShoppingBag,
  Info,
  DollarSign,
  ShoppingCart,
  Calendar,
  Layers3,
  Clock,
  ThumbsUp,
  Tag,
  Mail,
  User,
  Briefcase,
  Settings as SettingsIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface CustomerPortalProps {
  products: any[];
  inventory: any[];
  prices: any[];
}

const COLORS = ["#ea580c", "#d97706", "#2563eb", "#16a34a", "#dc2626", "#7c3aed"];

export default function CustomerPortal({ products, inventory, prices }: CustomerPortalProps) {
  const { activeUser } = useErpStore();
  const [currentUser, setCurrentUser] = useState<any>(activeUser);
  const [activePortalTab, setActivePortalTab] = useState<"dashboard" | "settings">("dashboard");
  const [compareSkus, setCompareSkus] = useState<string[]>(
    products.slice(0, 2).map((p) => p.sku)
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch((err) => console.error("Error refreshing session:", err));
  }, []);

  // Pre-build Maps for O(1) lookups
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => map.set(p.sku, p));
    return map;
  }, [products]);

  const priceMap = useMemo(() => {
    const map = new Map();
    prices.forEach(pr => map.set(pr.sku, pr));
    return map;
  }, [prices]);

  const skuStockMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(inv => {
      map.set(inv.sku, (map.get(inv.sku) || 0) + inv.quantity);
    });
    return map;
  }, [inventory]);

  // Helper to fetch selling price
  const getProductPrice = (sku: string) => {
    const priceRecord = priceMap.get(sku);
    return {
      sellingPrice: priceRecord?.sellingPrice || 50000,
      mrp: priceRecord?.mrp || priceRecord?.sellingPrice || 55000
    };
  };

  // Helper to check availability status
  const getAvailabilityStatus = (sku: string) => {
    const totalQty = skuStockMap.get(sku) || 0;

    if (totalQty > 10) return { label: "Available", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (totalQty > 0) return { label: "Limited Stock", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Out of Stock", color: "bg-red-50 text-red-655 border-red-200" };
  };

  // Seed deterministic order history based on actual catalog products
  const orders = useMemo(() => {
    if (products.length === 0) return [];

    const rawOrders = [
      {
        id: "ORD-2026-001",
        date: "2026-01-15",
        status: "Completed",
        items: [
          { sku: products[0]?.sku || "APP-IPH16-001", qty: 1 },
          { sku: products[2]?.sku || "GGL-PIX09-001", qty: 2 }
        ]
      },
      {
        id: "ORD-2026-002",
        date: "2026-03-10",
        status: "Completed",
        items: [
          { sku: products[1]?.sku || "APP-MACBK-001", qty: 1 }
        ]
      },
      {
        id: "ORD-2026-003",
        date: "2026-05-22",
        status: "Cancelled",
        items: [
          { sku: products[3]?.sku || "HP-ELITE-001", qty: 1 }
        ]
      },
      {
        id: "ORD-2026-004",
        date: "2026-06-18",
        status: "Completed",
        items: [
          { sku: products[0]?.sku || "APP-IPH16-001", qty: 1 },
          { sku: products[4]?.sku || "APP-IPAD-001", qty: 1 }
        ]
      },
      {
        id: "ORD-2026-005",
        date: "2026-07-01",
        status: "Pending",
        items: [
          { sku: products[1]?.sku || "APP-MACBK-001", qty: 1 },
          { sku: products[2]?.sku || "GGL-PIX09-001", qty: 1 }
        ]
      }
    ];

    return rawOrders.map((o) => {
      let total = 0;
      const itemsWithDetails = o.items.map((item) => {
        const prod = productMap.get(item.sku);
        const priceInfo = getProductPrice(item.sku);
        const itemTotal = priceInfo.sellingPrice * item.qty;
        total += itemTotal;
        return {
          ...item,
          name: prod?.name || item.sku,
          brand: prod?.brand || "Brand",
          categoryName: prod?.category?.name || "General",
          price: priceInfo.sellingPrice,
          total: itemTotal
        };
      });
      return {
        ...o,
        items: itemsWithDetails,
        total
      };
    });
  }, [products, priceMap, productMap]);

  // --- STATISTICAL METRICS (KPIs) ---
  const activeOrders = orders.filter((o) => o.status === "Pending" || o.status === "Completed");
  const totalSpending = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = activeOrders.length > 0 ? Math.round(totalSpending / activeOrders.length) : 0;
  const inStockItems = products.filter((p) => {
    const qty = inventory.filter((i) => i.sku === p.sku).reduce((sum, item) => sum + item.quantity, 0);
    return qty > 0;
  }).length;

  // --- GRAPHS DATA AGGREGATION ---
  // 1. Monthly Trend
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthlySpendingMap: Record<string, number> = {};
  orders.forEach((o) => {
    const date = new Date(o.date);
    const mLabel = monthNames[date.getMonth()];
    if (o.status !== "Cancelled") {
      monthlySpendingMap[mLabel] = (monthlySpendingMap[mLabel] || 0) + o.total;
    }
  });
  const monthlyTrendData = monthNames.map((m) => ({
    Month: m,
    "Spending Amount": monthlySpendingMap[m] || 0
  }));

  // 2. Category Distribution
  const categoryDistributionMap: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status !== "Cancelled") {
      o.items.forEach((item: any) => {
        categoryDistributionMap[item.categoryName] = (categoryDistributionMap[item.categoryName] || 0) + item.total;
      });
    }
  });
  const categoryData = Object.keys(categoryDistributionMap).map((catName) => ({
    name: catName,
    value: categoryDistributionMap[catName]
  }));

  // 3. Current vs Previous Month Spending
  const currentMonthSpending = monthlySpendingMap["Jul"] || 0;
  const previousMonthSpending = monthlySpendingMap["Jun"] || 0;
  const spendingComparisonData = [
    { name: "Previous Month (June)", Amount: previousMonthSpending },
    { name: "Current Month (July)", Amount: currentMonthSpending }
  ];

  // 4. Top Purchased Products
  const productQuantities: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status !== "Cancelled") {
      o.items.forEach((item: any) => {
        productQuantities[item.name] = (productQuantities[item.name] || 0) + item.qty;
      });
    }
  });
  const topProductsData = Object.keys(productQuantities)
    .map((pName) => ({
      name: pName.length > 15 ? pName.substring(0, 15) + "..." : pName,
      Quantity: productQuantities[pName]
    }))
    .sort((a, b) => b.Quantity - a.Quantity)
    .slice(0, 5);

  // 5. Order Status
  const statusCounts: Record<string, number> = { Completed: 0, Pending: 0, Cancelled: 0 };
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map((statusKey) => ({
    name: statusKey,
    value: statusCounts[statusKey]
  }));

  // Toggle compare selection
  const handleToggleCompare = (sku: string) => {
    setCompareSkus((prev) => {
      if (prev.includes(sku)) {
        return prev.filter((s) => s !== sku);
      }
      if (prev.length >= 3) {
        toast.warning("You can compare up to 3 products side-by-side.");
        return prev;
      }
      return [...prev, sku];
    });
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-orange-555" />
            <h1 className="text-xl font-bold text-stone-900 font-outfit">Welcome, {currentUser?.name || "Premium Customer"}</h1>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            Browse corporate analytics, inspect side-by-side product metrics, and view real-time orders logs.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <ShoppingBag className="w-4 h-4" />
          <span>Customer Access Portal</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-stone-200/60 pb-px">
        <button
          onClick={() => setActivePortalTab("dashboard")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer outline-none ${
            activePortalTab === "dashboard"
              ? "border-orange-500 text-orange-600 font-black"
              : "border-transparent text-stone-550 hover:text-stone-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>
        <button
          onClick={() => setActivePortalTab("settings")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer outline-none ${
            activePortalTab === "settings"
              ? "border-orange-500 text-orange-600 font-black"
              : "border-transparent text-stone-550 hover:text-stone-800"
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Account Settings</span>
        </button>
      </div>

      {activePortalTab === "dashboard" ? (
        <>
          {/* 1. TOP KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Purchases", value: `₹${totalSpending.toLocaleString()}`, color: "text-stone-900" },
              { label: "Total Orders", value: `${orders.length} Orders`, color: "text-stone-900" },
              { label: "Avg. Order Value", value: `₹${averageOrderValue.toLocaleString()}`, color: "text-stone-900" },
              { label: "In-Stock Items", value: `${inStockItems} Products`, color: "text-stone-900" }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-5 border border-[#fed7aa] rounded-2xl shadow-sm space-y-1 hover:shadow-md hover:border-orange-500/30 transition-all duration-300">
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">{kpi.label}</span>
                <span className="text-xl md:text-2xl font-black text-stone-900 block mt-1">{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* 2. COMPARISON SECTION */}
          <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-orange-505" />
                <span>Product Comparison Specification Matrix</span>
              </h2>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-stone-400 font-medium">Add to compare:</span>
                <select
                  onChange={(e) => {
                    const sku = e.target.value;
                    if (!sku) return;
                    handleToggleCompare(sku);
                    e.target.value = "";
                  }}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-orange-500 text-stone-700 font-medium"
                  value=""
                >
                  <option value="">-- Choose Product --</option>
                  {products
                    .filter((p) => !compareSkus.includes(p.sku))
                    .map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {compareSkus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-stone-200 pt-2">
                {/* Features list */}
                <div className="hidden md:flex flex-col justify-between py-2 text-stone-400 font-bold text-[10px] uppercase pr-4 space-y-6">
                  <div className="font-bold text-stone-900 border-b pb-2 text-xs">SPECIFICATIONS</div>
                  <div>Product SKU</div>
                  <div>Brand</div>
                  <div>Category</div>
                  <div>Selling Price</div>
                  <div>Catalog MRP</div>
                  <div>Availability</div>
                  <div>Action</div>
                </div>

                {/* Compare items */}
                {compareSkus.map((sku) => {
                  const p = products.find((prod) => prod.sku === sku);
                  if (!p) return null;
                  const price = getProductPrice(sku);
                  const availability = getAvailabilityStatus(sku);

                  return (
                    <div key={sku} className="p-3 space-y-4 md:space-y-6 md:pl-6 text-xs text-stone-700 animate-in fade-in-50 duration-200">
                      <div className="border-b pb-2 flex justify-between items-start">
                        <span className="font-bold text-stone-900 block text-xs">{p.name}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">SKU: </span>
                        <span className="font-mono text-stone-850 font-semibold">{p.sku}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">Brand: </span>
                        <span className="font-semibold text-stone-850">{p.brand}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">Category: </span>
                        <span>{p.category?.name || "General"}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">Selling Price: </span>
                        <span className="font-bold text-stone-900">₹{price.sellingPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">MRP: </span>
                        <span className="text-stone-505 font-medium line-through">₹{price.mrp.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between md:block">
                        <span className="md:hidden text-stone-400 font-semibold">Status: </span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${availability.color}`}>
                          {availability.label}
                        </span>
                      </div>
                      <div className="flex justify-end md:justify-start">
                        <button
                          onClick={() => handleToggleCompare(sku)}
                          className="px-2 py-1 text-[10px] text-rose-605 border border-rose-200 hover:bg-rose-50 rounded font-bold cursor-pointer transition-all active:scale-95"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                {compareSkus.length < 3 && (
                  <div className="hidden md:flex flex-col items-center justify-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl m-2 animate-pulse">
                    <Layers className="w-8 h-8 text-stone-300 animate-bounce" />
                    <span className="text-[10px] mt-2 font-bold text-stone-500">Add another to compare</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-stone-400 italic text-xs">
                No products selected for comparison. Choose a product from the list above.
              </div>
            )}
          </div>

          {/* 3. GRAPHS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-2 bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-550 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-505" />
                <span>Monthly Purchase Trend</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                    <XAxis dataKey="Month" stroke="#78716c" fontSize={10} fontStyle="semibold" />
                    <YAxis stroke="#78716c" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Legend formatter={(v) => <span className="text-[10px] text-stone-550 font-semibold">{v}</span>} />
                    <Line type="monotone" dataKey="Spending Amount" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution Pie Chart */}
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-550 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-505" />
                <span>Category Spending Distribution</span>
              </h3>
              <div className="h-64 w-full flex items-center justify-center">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                      <Legend formatter={(v) => <span className="text-[10px] text-stone-550 font-semibold">{v}</span>} layout="horizontal" verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-stone-400 italic text-xs">No data available</span>
                )}
              </div>
            </div>

            {/* Spending Comparison Bar Chart */}
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-555 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-orange-505" />
                <span>Spending Comparison (June vs July)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Bar dataKey="Amount" radius={[8, 8, 0, 0]}>
                      {spendingComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 1 ? "#ea580c" : "#78716c"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Purchased Products Chart */}
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-550 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-orange-505" />
                <span>Top Purchased Items (Quantity)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                    <XAxis type="number" stroke="#78716c" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#78716c" fontSize={9} width={90} />
                    <Tooltip />
                    <Bar dataKey="Quantity" fill="#d97706" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Status Donut Chart */}
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-550 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-orange-505" />
                <span>Order Status Split</span>
              </h3>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#16a34a" /> {/* Completed */}
                      <Cell fill="#ea580c" /> {/* Pending */}
                      <Cell fill="#dc2626" /> {/* Cancelled */}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={(v) => <span className="text-[10px] text-stone-550 font-semibold">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4. RECENT ORDERS */}
          <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-505" />
              <span>Recent Purchase Orders Log</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-505 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Order Date</th>
                    <th className="px-4 py-3">Purchased Items</th>
                    <th className="px-4 py-3 text-right">Order Value</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-stone-900">{o.id}</td>
                      <td className="px-4 py-3 text-stone-550 font-medium flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(o.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="px-4 py-3 text-stone-750 font-medium">
                        {o.items.map((item: any, idx) => (
                          <span key={idx} className="block">
                            • {item.name} <span className="text-[10px] text-stone-400">({item.qty}x)</span>
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-stone-905 font-outfit">
                        ₹{o.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            o.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : o.status === "Pending"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-red-50 text-red-655 border-red-200"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. RECOMMENDATIONS */}
          <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4 text-orange-555" />
              <span>Recommended Products for You</span>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {products.slice(0, 5).map((p) => {
                const price = getProductPrice(p.sku);
                return (
                  <div key={p.sku} className="w-64 shrink-0 bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition-all hover:shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
                          {p.brand}
                        </span>
                        <span className="text-[9px] text-stone-400 font-mono font-semibold">{p.sku}</span>
                      </div>
                      <h4 className="font-bold text-stone-850 text-xs mt-2 truncate" title={p.name}>
                        {p.name}
                      </h4>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-stone-400">
                        <Tag className="w-3 h-3" />
                        <span>{p.category?.name || "General"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-200/50 pt-2.5">
                      <div>
                        <span className="text-[9px] text-stone-450 block font-semibold uppercase">SELLING PRICE</span>
                        <span className="font-bold text-stone-900 text-xs">₹{price.sellingPrice.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (compareSkus.includes(p.sku)) {
                            toast.info("Product is already in compare list.");
                            return;
                          }
                          if (compareSkus.length >= 3) {
                            toast.warning("Compare list is full.");
                            return;
                          }
                          setCompareSkus((prev) => [...prev, p.sku]);
                          toast.success("Added to comparison grid.");
                        }}
                        className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-all active:scale-95 shadow-sm"
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
          {/* Personal Account Information */}
          <div className="bg-white border border-[#fed7aa] p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
              <User className="w-4 h-4 text-orange-555" />
              <span>Customer Information (Read-Only)</span>
            </h3>
            
            <div className="space-y-4 text-xs text-stone-600">
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Customer ID</span>
                <span className="font-mono font-semibold text-stone-855 text-sm">{currentUser?.customerId || "Not Provided"}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Company Name</span>
                <span className="font-semibold text-stone-855 text-sm">{currentUser?.companyName || currentUser?.name}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Email Address</span>
                <span className="font-mono font-semibold text-stone-800">{currentUser?.email}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Assigned Branch</span>
                <span className="font-semibold text-stone-800">{currentUser?.branch}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Access Status</span>
                <span className="inline-block self-start text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                  {currentUser?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Operations Executive */}
          <div className="bg-white border border-[#fed7aa] p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
              <Briefcase className="w-4 h-4 text-orange-555" />
              <span>Assigned Operations Executive</span>
            </h3>

            {currentUser?.assignedEmployee ? (
              <div className="space-y-5">
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold border border-orange-200/60 shadow-sm shrink-0">
                    {currentUser.assignedEmployee.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-850 block">{currentUser.assignedEmployee.name}</span>
                    <span className="text-[10px] text-stone-455 block font-semibold">Primary SCM Contact</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-stone-600 pl-1">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Employee ID</span>
                    <span className="font-semibold text-stone-800 font-mono">{currentUser.assignedEmployee.employeeId || "N/A"}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Email Address</span>
                    <span className="font-semibold text-stone-800 font-mono">{currentUser.assignedEmployee.email}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Phone Number</span>
                    <span className="font-semibold text-stone-800 font-mono">{currentUser.assignedEmployee.phone || "N/A"}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Branch</span>
                    <span className="font-semibold text-stone-855">{currentUser.assignedEmployee.branch || "Head Office"}</span>
                  </div>
                  {currentUser.assignedEmployee.reportsToName && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Reporting Assistant Manager</span>
                      <span className="font-semibold text-stone-800">{currentUser.assignedEmployee.reportsToName}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    href={`mailto:${currentUser.assignedEmployee.email}?subject=Conquer ERP Customer Inquiry`}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contact Representative</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 mx-auto">
                  <User className="w-5 h-5 text-stone-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-stone-850">No Operations Representative Assigned</p>
                  <p className="text-[10px] text-stone-450 max-w-[240px] mx-auto">
                    Please reach out to our corporate support desk for assistance with your account.
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href="mailto:support@conquererp.com?subject=Conquer ERP Customer Support Request"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-stone-500" />
                    <span>Contact Support</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
