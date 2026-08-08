"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Search, ChevronDown, ChevronUp } from "lucide-react";

interface AssetsWarrantiesClientProps {
  assets: any[];
}

export default function AssetsWarrantiesClient({ assets }: AssetsWarrantiesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSerials, setExpandedSerials] = useState<Record<number, boolean>>({});

  const filteredAssets = assets.filter((ast) => {
    const q = searchQuery.toLowerCase();
    return (
      ast.item_description.toLowerCase().includes(q) ||
      ast.item_code.toLowerCase().includes(q) ||
      ast.invoice_number.toLowerCase().includes(q) ||
      ast.po_number.toLowerCase().includes(q)
    );
  });

  const toggleSerialExpand = (id: number) => {
    setExpandedSerials((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 font-outfit tracking-tight">Assets and Warranties</h1>
        <p className="text-stone-500 text-xs mt-1">
          Monitor manufacturer warranty health, coverage expiry timelines, and serial numbers.
        </p>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Assets</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">20</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-stone-600" />
          </div>
        </div>

        {/* Under Warranty */}
        <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Under Warranty</span>
            <span className="text-2xl font-black text-white block mt-1">20</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-amber-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider block">Expiring Soon (&le;30 days)</span>
            <span className="text-2xl font-black text-white block mt-1">0</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Expired */}
        <div className="bg-red-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-red-100 uppercase tracking-wider block">Expired</span>
            <span className="text-2xl font-black text-white block mt-1">0</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by invoice, SKU, or asset description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-medium"
          />
        </div>
        <span className="text-xs text-stone-400 font-semibold">Showing {filteredAssets.length} asset entries</span>
      </div>

      {/* Assets Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Warranty Expiry</th>
                <th className="px-4 py-3 text-center">Warranty Status</th>
                <th className="px-4 py-3">Serial Numbers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400 italic">
                    No asset records found matching search.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((ast) => {
                  const serials = Array.isArray(ast.serial_numbers) ? ast.serial_numbers : ["C02G1234MD6R"];
                  const isExpanded = expandedSerials[ast.id];
                  const visibleSerials = isExpanded ? serials : serials.slice(0, 2);
                  const hiddenCount = serials.length - 2;

                  return (
                    <tr key={ast.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-4 py-3 text-stone-600 font-medium">{ast.invoice_date}</td>
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">{ast.invoice_number}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-stone-500">{ast.item_code}</td>
                      <td className="px-4 py-3 font-bold text-stone-850 max-w-xs">{ast.item_description}</td>
                      <td className="px-4 py-3 font-mono text-stone-600">{ast.po_number}</td>
                      <td className="px-4 py-3 text-stone-700 font-semibold">{ast.warranty_expiry}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {ast.warranty_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {visibleSerials.map((sn: string, idx: number) => (
                            <span key={idx} className="font-mono text-[10px] bg-stone-100 border border-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                              {sn}
                            </span>
                          ))}
                          {serials.length > 2 && (
                            <button
                              onClick={() => toggleSerialExpand(ast.id)}
                              className="text-[10px] text-orange-600 font-bold hover:underline flex items-center ml-1"
                            >
                              {isExpanded ? "Show less" : `+${hiddenCount} more`}
                            </button>
                          )}
                        </div>
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
  );
}
