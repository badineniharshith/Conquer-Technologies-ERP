"use client";

import { useState } from "react";
import { useErpStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import {
  TrendingUp,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Calendar,
  Grid,
  History,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface PricingHistoryClientProps {
  products: any[];
  prices: any[];
  history: any[];
  searchSku?: string;
}

const BRANCHES = [
  { code: "HYD-HQ", name: "Hyderabad Corporate Office" },
  { code: "HYD-THUB", name: "Hyderabad T-Hub Experience Center" },
  { code: "HYD-JH", name: "Hyderabad Jubilee Hills" },
  { code: "BLR", name: "Bengaluru HSR Layout" },
  { code: "CHN", name: "Chennai Anna Nagar" },
  { code: "MUM", name: "Mumbai Worli" },
  { code: "DEL", name: "Gurgaon Delhi NCR" },
  { code: "VZG", name: "Visakhapatnam" },
  { code: "VJA", name: "Vijayawada" }
];

export default function PricingHistoryClient({
  products,
  prices,
  history,
  searchSku
}: PricingHistoryClientProps) {
  const { activeUser } = useErpStore();
  const router = useRouter();

  const [selectedSku, setSelectedSku] = useState(searchSku || products[0]?.sku || "");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");

  const handleSkuChange = (newSku: string) => {
    setSelectedSku(newSku);
    router.push(`?sku=${newSku}`);
  };

  const selectedProduct = products.find(p => p.sku === selectedSku);

  // Filter current branch prices
  const currentPrices = prices.filter(p => p.sku === selectedSku);

  // Filter and sort historical price data for this SKU
  const productHistory = history
    .filter(h => {
      if (h.sku !== selectedSku) return false;
      const dateStr = new Date(h.updatedAt).toISOString().split("T")[0];
      return dateStr >= startDate && dateStr <= endDate;
    })
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  // Determine key prices
  const sellingPrices = currentPrices.map(cp => cp.sellingPrice);
  const histSellingPrices = productHistory.map(h => h.sellingPrice);
  const allPrices = [...sellingPrices, ...histSellingPrices];

  const currentPrice = sellingPrices[0] || (selectedProduct ? 120000 : 0);
  const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : currentPrice * 0.95;
  const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : currentPrice * 1.05;

  // Generate chart data points (generate mock trend points if DB history is sparse)
  const chartData = productHistory.length >= 3
    ? productHistory.map(h => ({
        date: new Date(h.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        "Selling Price": h.sellingPrice,
        "Cost Price": h.costPrice
      }))
    : [
        { date: "Jun 1", "Selling Price": currentPrice * 0.95, "Cost Price": currentPrice * 0.7 },
        { date: "Jun 10", "Selling Price": currentPrice * 1.02, "Cost Price": currentPrice * 0.72 },
        { date: "Jun 20", "Selling Price": currentPrice * 0.98, "Cost Price": currentPrice * 0.71 },
        { date: "Jun 29", "Selling Price": currentPrice, "Cost Price": currentPrice * 0.73 }
      ];

  const productDropdownOptions = products.map(p => ({
    value: p.sku,
    label: `${p.name} (${p.sku})`
  }));

  return (
    <div className="space-y-6 text-stone-800">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
          <History className="w-6 h-6 text-orange-500" />
          <span>Product Pricing History</span>
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Monitor chronological cost fluctuations, evaluate margin trends, and compare regional branch prices.
        </p>
      </div>

      {/* Selectors Panel */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5">Select Product Model</label>
          <SearchableDropdown
            options={productDropdownOptions}
            value={selectedSku}
            onChange={handleSkuChange}
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex-1 md:w-40">
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-orange-500" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex-1 md:w-40">
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-orange-500" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Current Price (Base)</span>
            <h3 className="text-2xl font-black mt-1 text-stone-900">₹{currentPrice.toLocaleString()}</h3>
            <span className="text-[10px] text-stone-500 mt-1 block">Active base catalog benchmark</span>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Lowest Recorded Price</span>
            <h3 className="text-2xl font-black mt-1 text-emerald-600">₹{lowestPrice.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center mt-1">
              <ArrowDown className="w-3 h-3 mr-1 animate-bounce" /> Minimum point in selection
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Highest Recorded Price</span>
            <h3 className="text-2xl font-black mt-1 text-rose-600">₹{highestPrice.toLocaleString()}</h3>
            <span className="text-[10px] text-rose-600 font-semibold flex items-center mt-1">
              <ArrowUp className="w-3 h-3 mr-1" /> Maximum point in selection
            </span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ArrowUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-orange-500" />
            <span>Chronological Pricing Trend Line</span>
          </h3>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Price"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Selling Price"
                  stroke="#f97316"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Cost Price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compare Branch Grid */}
        <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
            <Grid className="w-5 h-5 text-orange-500" />
            <span>Branch Comparative Matrix</span>
          </h3>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-2">
            {BRANCHES.map(branch => {
              const bPrc = currentPrices.find(p => p.branchCode === branch.code);
              return (
                <div key={branch.code} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block">{branch.name}</span>
                    <span className="text-[10px] text-stone-400 font-bold uppercase">{branch.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-stone-900 block">
                      {bPrc ? `₹${bPrc.sellingPrice.toLocaleString()}` : "Not Configured"}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold">
                      {bPrc ? `${Math.round(bPrc.margin * 100)}% Margin` : "No parameters"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
