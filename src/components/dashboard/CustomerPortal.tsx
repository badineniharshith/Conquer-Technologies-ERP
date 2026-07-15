"use client";

import { useState, useMemo } from "react";
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
  Tag
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
  const [compareSkus, setCompareSkus] = useState<string[]>(
    products.slice(0, 2).map((p) => p.sku)
  );

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
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold text-stone-900 font-outfit">Welcome, {activeUser?.name || "Premium Customer"}</h1>
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
            <ArrowRightLeft className="w-4 h-4 text-orange-500" />
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
                    <span className="font-semibold text-stone-800">{p.brand}</span>
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
                    <span className="text-stone-500 font-medium line-through">₹{price.mrp.toLocaleString()}</span>
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
                      className="px-2 py-1 text-[10px] text-rose-600 border border-rose-200 hover:bg-rose-50 rounded font-bold cursor-pointer transition-all active:scale-95"
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
                <span className="text-[10px] mt-2 font-bold text-stone-550">Add another to compare</span>
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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Monthly Purchase Trend</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="Month" stroke="#78716c" fontSize={10} fontStyle="semibold" />
                <YAxis stroke="#78716c" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend formatter={(v) => <span className="text-[10px] text-stone-500 font-semibold">{v}</span>} />
                <Line type="monotone" dataKey="Spending Amount" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-orange-500" />
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
                  <Legend formatter={(v) => <span className="text-[10px] text-stone-500 font-semibold">{v}</span>} layout="horizontal" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-stone-400 italic text-xs">No data available</span>
            )}
          </div>
        </div>

        {/* Spending Comparison Bar Chart */}
        <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-orange-500" />
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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-orange-500" />
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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-orange-500" />
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
                <Legend formatter={(v) => <span className="text-[10px] text-stone-500 font-semibold">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. RECENT ORDERS */}
      <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm space-y-4 min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>Recent Purchase Orders Log</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
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
                  <td className="px-4 py-3 text-stone-500 font-medium flex items-center space-x-1">
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
                  <td className="px-4 py-3 text-right font-bold text-stone-900">
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
          <ThumbsUp className="w-4 h-4 text-orange-500" />
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
                    <span className="text-[9px] text-stone-400 block font-semibold uppercase">SELLING PRICE</span>
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
    </div>
  );
}
