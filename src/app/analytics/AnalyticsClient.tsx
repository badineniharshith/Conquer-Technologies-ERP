"use client";

import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { BarChart3, TrendingUp, AlertTriangle, Boxes, Tag, ShieldCheck, LineChart as LineIcon } from "lucide-react";

interface AnalyticsClientProps {
  products: any[];
  prices: any[];
  inventory: any[];
  categories: any[];
  priceHistory: any[];
}

const COLORS = ["#8c3120", "#292524", "#d97706", "#dc2626", "#a855f7"];

const BRANCH_NAMES: Record<string, string> = {
  "HYD-HQ": "Hyderabad HQ",
  "HYD-THUB": "Hyderabad T-Hub",
  "HYD-JH": "Hyderabad Jubilee Hills",
  "BLR": "Bengaluru",
  "CHN": "Chennai",
  "MUM": "Mumbai",
  "DEL": "Gurgaon",
  "VZG": "Visakhapatnam",
  "VJA": "Vijayawada"
};

export default function AnalyticsClient({
  products,
  prices,
  inventory,
  categories,
  priceHistory
}: AnalyticsClientProps) {
  // Pre-build Maps for O(1) lookups
  const productMap = new Map();
  products.forEach(p => productMap.set(p.sku, p));

  const priceMap = new Map();
  prices.forEach(pr => priceMap.set(`${pr.sku}_${pr.branchCode}`, pr));

  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c.id, c));

  const inventoryByBranchMap = new Map();
  inventory.forEach(item => {
    let list = inventoryByBranchMap.get(item.branchCode);
    if (!list) {
      list = [];
      inventoryByBranchMap.set(item.branchCode, list);
    }
    list.push(item);
  });

  // Aggregate Metrics
  const totalProducts = products.length;
  const totalStockUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const assetValuation = inventory.reduce((sum, item) => {
    const branchPrice = priceMap.get(`${item.sku}_${item.branchCode}`);
    const catalogItem = productMap.get(item.sku);
    const itemPrice = branchPrice ? branchPrice.sellingPrice : (catalogItem ? catalogItem.price : 50000);
    return sum + (item.quantity * itemPrice);
  }, 0);

  const lowStockItems = inventory.filter(item => {
    const p = productMap.get(item.sku);
    const limit = p ? p.reorderLevel : 8;
    return item.quantity < limit;
  });

  // Recharts Data: Category Stock Distribution
  const categoryStats: Record<string, number> = {};
  inventory.forEach(item => {
    const matched = productMap.get(item.sku);
    const category = matched ? categoryMap.get(matched.categoryId) : null;
    const categoryName = category ? category.name : "Uncategorized";
    categoryStats[categoryName] = (categoryStats[categoryName] || 0) + item.quantity;
  });
  const pieData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

  // Recharts Data: Price History Trends for first active SKU in logs
  const targetSku = priceHistory[0]?.sku || "APP-IP16";
  const targetProduct = productMap.get(targetSku);
  const targetName = targetProduct ? targetProduct.name : targetSku;

  const trendData = priceHistory
    .filter(h => h.sku === targetSku)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .map(h => ({
      date: new Date(h.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      price: h.sellingPrice,
      mrp: h.mrp
    }));

  // Recharts Data: Branch Asset Value
  const branchCodes = ["HYD-HQ", "HYD-THUB", "HYD-JH", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];
  const barData = branchCodes.map(code => {
    const branchInv = inventoryByBranchMap.get(code) || [];
    const value = branchInv.reduce((sum: number, item: any) => {
      const branchPrice = priceMap.get(`${item.sku}_${code}`);
      const catalogItem = productMap.get(item.sku);
      const itemPrice = branchPrice ? branchPrice.sellingPrice : (catalogItem ? catalogItem.price : 50000);
      return sum + (item.quantity * itemPrice);
    }, 0);
    return { name: BRANCH_NAMES[code] || code, value };
  }).filter(b => b.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Asset & Stock Analytics</h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Audit inventory asset valuations, classify stock counts by brand, and evaluate branch distributions.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <BarChart3 className="w-4 h-4" />
          <span>Intelligence Dashboard</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Asset Valuation</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">₹{assetValuation.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Catalog Items</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">{totalProducts} SKUs</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Stock Volume</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">{totalStockUnits.toLocaleString()} units</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Low Stock Alerts</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">{lowStockItems.length} lines</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Asset Valuation by Branch (₹)</h4>
            {inventory.length === 0 && (
              <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="name" stroke="#78716c" fontSize={9} />
                <YAxis stroke="#78716c" fontSize={9} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" fill="#8c3120" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Brand Stock Distribution & Critical Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Category Volume Share</h4>
              {inventory.length === 0 && (
                <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
              )}
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-around text-[10px] text-stone-500 font-semibold mt-2 gap-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Items ledger */}
          <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Critical Alerts</span>
            </h4>
            <div className="overflow-y-auto max-h-48 space-y-2 flex-1 pr-1">
              {lowStockItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="p-2 bg-stone-50 rounded-lg border border-stone-200 text-[10px]">
                  <span className="font-bold text-stone-900 block">{item.itemName}</span>
                  <span className="text-stone-500 block">{BRANCH_NAMES[item.branchCode] || item.branchCode} • Qty: **{item.quantity}**</span>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <div className="text-[10px] text-stone-400 italic py-8 text-center bg-stone-50 border border-dashed rounded-lg">
                  All branches are adequately stocked.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <LineIcon className="w-5 h-5 text-orange-500 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Price Trend Analysis: <span className="text-orange-600 font-extrabold">{targetName}</span>
            </h3>
          </div>
          {priceHistory.length === 0 && (
            <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
          )}
        </div>
        <p className="text-stone-500 text-xs mt-1">
          Historical chart mapping price revisions and market MRP margins extracted from raw database histories.
        </p>
        <div className="h-72">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-400 italic border border-dashed rounded-xl bg-stone-50">
              No historical price change records logged for this product.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                <XAxis dataKey="date" stroke="#78716c" fontSize={10} />
                <YAxis stroke="#78716c" fontSize={10} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="price" name="Selling Price" stroke="#d97706" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="mrp" name="Catalog MRP" stroke="#292524" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
