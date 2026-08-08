"use client";

import { useState } from "react";
import { Search, RotateCcw, Eye, Boxes } from "lucide-react";
import Link from "next/link";

interface AllocatedStockClientProps {
  items: any[];
}

export default function AllocatedStockClient({ items }: AllocatedStockClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("All Stock");
  const [groupFilter, setGroupFilter] = useState("All Stock Groups");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStock = true;
    if (stockFilter === "In Stock") matchesStock = item.available_units > 0;
    if (stockFilter === "Low Stock") matchesStock = item.available_units <= 3 && item.available_units > 0;

    let matchesGroup = true;
    if (groupFilter !== "All Stock Groups") matchesGroup = item.stock_group === groupFilter;

    return matchesSearch && matchesStock && matchesGroup;
  });

  const handleReset = () => {
    setSearchQuery("");
    setStockFilter("All Stock");
    setGroupFilter("All Stock Groups");
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 font-outfit tracking-tight">Allocated Stock</h1>
        <p className="text-stone-500 text-xs mt-1">
          Inspect hardware inventory reserved exclusively for Acceldata Technology Private Limited.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by product title or Item Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-medium"
          />
        </div>

        {/* Filter Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 outline-none cursor-pointer focus:border-orange-500"
          >
            <option value="All Stock">All Stock</option>
            <option value="In Stock">In Stock (&gt; 0)</option>
            <option value="Low Stock">Low Stock (&le; 3)</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 outline-none cursor-pointer focus:border-orange-500"
          >
            <option value="All Stock Groups">All Stock Groups</option>
            <option value="Laptops">Laptops</option>
            <option value="Desktops">Desktops</option>
            <option value="Monitors">Monitors</option>
          </select>

          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-center">Image</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Stock Group</th>
                <th className="px-4 py-3 text-center">Available Units</th>
                <th className="px-4 py-3 text-center">Ageing</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400 italic">
                    No matching allocated stock items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.item_code} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 mx-auto">
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-stone-900 block">{item.product_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-stone-500">{item.item_code}</td>
                    <td className="px-4 py-3 font-medium text-stone-700">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-bold">
                        {item.stock_group}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.available_units} units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-stone-600">
                      {item.ageing_days} days
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900 font-outfit">
                      ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/allocated-stock/${item.item_code}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
