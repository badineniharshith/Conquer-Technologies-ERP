"use client";

import { useState } from "react";
import { useErpStore } from "@/lib/store";
import { uploadPriceSpreadsheetAction, updateProductPriceAction } from "@/app/actions";
import { toast } from "sonner";
import {
  DollarSign,
  UploadCloud,
  Clock,
  TrendingUp,
  Search,
  FileSpreadsheet,
  AlertCircle,
  Tag,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  X,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import SearchableDropdown from "@/components/ui/SearchableDropdown";

interface PriceIntelligenceClientProps {
  prices: any[];
  priceHistory: any[];
  products: any[];
  uploads: any[];
}

const BRANCH_NAMES: Record<string, string> = {
  "HYD-HQ": "Hyderabad Corporate HQ",
  "HYD-THUB": "Hyderabad T-Hub Experience Center",
  "HYD-JH": "Hyderabad Jubilee Hills",
  "BLR": "Bengaluru HSR Layout",
  "CHN": "Chennai Anna Nagar",
  "MUM": "Mumbai Worli",
  "DEL": "Gurgaon Delhi NCR",
  "VZG": "Visakhapatnam",
  "VJA": "Vijayawada"
};

const BRANCHES = ["HYD-HQ", "HYD-THUB", "HYD-JH", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];

export default function PriceIntelligenceClient({
  prices,
  priceHistory,
  products,
  uploads
}: PriceIntelligenceClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("matrix");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Excel upload state
  const [selectedBranch, setSelectedBranch] = useState("HYD-HQ");
  const [selectedTemplate, setSelectedTemplate] = useState("apple_pricing_june_2026.xlsx");
  const [uploadLoading, setUploadLoading] = useState(false);

  // Selected product for margin chart
  const [selectedChartSku, setSelectedChartSku] = useState(products[0]?.sku || "");

  // Inline Price Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSku, setEditSku] = useState("");
  const [editBranchCode, setEditBranchCode] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editMrp, setEditMrp] = useState(0);
  const [editLoading, setEditLoading] = useState(false);

  // Apply role isolation: branch users only see their own branch price
  const getBranchCodeFromDisplayName = (branchName: string) => {
    if (!branchName) return "HYD-HQ";
    const name = branchName.toLowerCase();
    if (name.includes("t-hub")) return "HYD-THUB";
    if (name.includes("jubilee") || name.includes("jh")) return "HYD-JH";
    if (name.includes("hyderabad") || name.includes("hq") || name.includes("office")) return "HYD-HQ";
    if (name.includes("bengaluru") || name.includes("bangalore") || name.includes("blr")) return "BLR";
    if (name.includes("chennai") || name.includes("chn")) return "CHN";
    if (name.includes("mumbai") || name.includes("mum")) return "MUM";
    if (name.includes("delhi") || name.includes("del") || name.includes("gurgaon")) return "DEL";
    if (name.includes("visakhapatnam") || name.includes("vzg")) return "VZG";
    if (name.includes("vijayawada") || name.includes("vja")) return "VJA";
    return "HYD-HQ";
  };
  const userBranchCode = activeUser ? getBranchCodeFromDisplayName(activeUser.branch) : "HYD-HQ";

  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 15;

  // Filtered products list
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category?.name && p.category.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  // Determine lowest price per SKU globally
  const lowestPriceMap: Record<string, number> = {};
  prices.forEach(p => {
    if (!lowestPriceMap[p.sku] || p.sellingPrice < lowestPriceMap[p.sku]) {
      lowestPriceMap[p.sku] = p.sellingPrice;
    }
  });

  // Calculate statistics
  const totalPricesCount = prices.length;
  const avgMargin = prices.length > 0
    ? Math.round((prices.reduce((sum, p) => sum + p.margin, 0) / prices.length) * 100)
    : 25;

  const handleExcelUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);

    try {
      await uploadPriceSpreadsheetAction({
        filename: selectedTemplate,
        branchCode: selectedBranch,
        userId: activeUser?.email || "admin@conquererp.com"
      });

      toast.success(`Excel Pricing Sheet ${selectedTemplate} processed successfully! Pricing updated for branch ${selectedBranch}.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to process spreadsheet");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDirectPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      await updateProductPriceAction({
        sku: editSku,
        branchCode: editBranchCode,
        costPrice: editCostPrice,
        sellingPrice: editSellingPrice,
        mrp: editMrp,
        userId: activeUser?.email || "admin@conquererp.com"
      });

      toast.success(`Pricing updated for SKU ${editSku} at branch ${editBranchCode}.`);
      setEditModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update pricing");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCellClick = (prod: any, bCode: string, prc: any) => {
    if (activeRole !== "SUPER_ADMIN" && activeRole !== "ADMIN") return;
    setEditSku(prod.sku);
    setEditProductName(prod.name);
    setEditBranchCode(bCode);
    setEditCostPrice(prc ? prc.costPrice : 0);
    setEditSellingPrice(prc ? prc.sellingPrice : 0);
    setEditMrp(prc ? prc.mrp : 0);
    setEditModalOpen(true);
  };

  // Aggregation for selected product margin chart
  const chartData = BRANCHES.map(bCode => {
    const prc = prices.find(p => p.sku === selectedChartSku && p.branchCode === bCode);
    return {
      name: bCode,
      "Selling Price": prc ? prc.sellingPrice : 0,
      "Cost Price": prc ? prc.costPrice : 0,
      "Margin (%)": prc ? Math.round(prc.margin * 100) : 0
    };
  }).filter(d => d["Selling Price"] > 0);

  const isEditable = activeRole === "SUPER_ADMIN" || activeRole === "ADMIN";

  return (
    <div className="space-y-6 text-stone-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
            <DollarSign className="w-6 h-6 text-orange-500" />
            <span>Price Intelligence Master</span>
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Analyze pricing margins, compare cross-branch rates, and configure direct selling parameters.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Pricing Records</span>
            <h3 className="text-2xl font-black mt-1 text-stone-900">{totalPricesCount}</h3>
            <span className="text-[10px] text-stone-500 mt-1 block">Active branch pricing entries</span>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Average Selling Margin</span>
            <h3 className="text-2xl font-black mt-1 text-emerald-600">{avgMargin}%</h3>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Healthy profit threshold
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Pricing Updates</span>
            <h3 className="text-2xl font-black mt-1 text-stone-900">{priceHistory.length}</h3>
            <span className="text-[10px] text-stone-500 mt-1 block">Uploaded price audits logged</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl text-stone-550">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${
            activeTab === "matrix" ? "border-orange-500 text-orange-600 font-bold" : "border-transparent text-stone-550 hover:text-stone-700"
          }`}
        >
          Branch Price Matrix
        </button>
        {isEditable && (
          <button
            onClick={() => setActiveTab("upload")}
            className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${
              activeTab === "upload" ? "border-orange-500 text-orange-600 font-bold" : "border-transparent text-stone-550 hover:text-stone-700"
            }`}
          >
            Excel Sheet Import
          </button>
        )}
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${
            activeTab === "history" ? "border-orange-500 text-orange-600 font-bold" : "border-transparent text-stone-550 hover:text-stone-700"
          }`}
        >
          Pricing Audit History
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${
            activeTab === "analytics" ? "border-orange-500 text-orange-600 font-bold" : "border-transparent text-stone-550 hover:text-stone-700"
          }`}
        >
          Pricing Analytics
        </button>
      </div>

      {/* --- PRICE MATRIX TAB --- */}
      {activeTab === "matrix" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between bg-white p-4 border border-stone-200 rounded-xl shadow-sm flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-md w-full relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search SKU, name, or category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 text-stone-850"
              />
            </div>
            <div className="text-[10px] text-stone-500 bg-orange-50/50 border border-[#fed7aa] px-3 py-1.5 rounded-lg flex items-center">
              <AlertCircle className="w-3.5 h-3.5 text-orange-600 mr-1.5 shrink-0" />
              <span>
                {isEditable 
                  ? "Click on any branch cell below to update Cost Price, Selling Price, and MRP directly."
                  : "Green highlights represent the lowest active branch selling rate."
                }
              </span>
            </div>
          </div>

          <div className="glass-panel overflow-x-auto bg-white border border-[#fed7aa] rounded-2xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-200 text-[10px]">
                <tr>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Model Name</th>
                  {BRANCHES.map(bCode => {
                    if (activeRole === "BRANCH_USER" && bCode !== userBranchCode) return null;
                    return (
                      <th key={bCode} className="px-6 py-3 text-right">
                        {BRANCH_NAMES[bCode]} ({bCode})
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={2 + BRANCHES.length} className="px-6 py-8 text-center italic text-stone-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-stone-50/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-orange-600">{prod.sku}</td>
                      <td className="px-6 py-4 font-semibold text-stone-800">{prod.name}</td>
                      {BRANCHES.map(bCode => {
                        if (activeRole === "BRANCH_USER" && bCode !== userBranchCode) return null;

                        const prc = prices.find(p => p.sku === prod.sku && p.branchCode === bCode);
                        if (!prc) {
                          return (
                            <td 
                              key={bCode} 
                              onClick={() => handleCellClick(prod, bCode, null)}
                              className={`px-6 py-4 text-right text-stone-400 italic ${isEditable ? "cursor-pointer hover:bg-orange-50/60" : ""}`}
                            >
                              Unpriced
                            </td>
                          );
                        }

                        const isLowest = prc.sellingPrice === lowestPriceMap[prod.sku];
                        return (
                          <td 
                            key={bCode} 
                            onClick={() => handleCellClick(prod, bCode, prc)}
                            className={`px-6 py-4 text-right ${isEditable ? "cursor-pointer hover:bg-orange-50/60 transition-colors" : ""}`}
                          >
                            <div className={`p-2 rounded-lg border ${
                              isLowest 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800" 
                                : "bg-stone-50 border-stone-200 text-stone-800"
                            }`}>
                              <span className="font-extrabold block">
                                ₹{prc.sellingPrice.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-stone-500 block mt-0.5">
                                Cost: ₹{prc.costPrice.toLocaleString()} • Margin: {Math.round(prc.margin * 100)}%
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center text-xs p-4 border-t border-stone-200">
                <span className="text-stone-500 font-bold">
                  Page {currentPage} of {totalPages} ({filteredProducts.length} total products)
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- EXCEL UPLOAD TAB --- */}
      {activeTab === "upload" && isEditable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
          <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-orange-500" />
              <span>Import Pricing Spreadsheets</span>
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Upload pricing spreadsheets containing new cost and selling rates. 
              The system auto-calculates margins and logs update histories.
            </p>

            <form onSubmit={handleExcelUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1.5">Select Branch Location</label>
                <SearchableDropdown
                  options={BRANCHES.map(bCode => ({ value: bCode, label: `${BRANCH_NAMES[bCode]} (${bCode})` })).filter(opt => !((activeRole as string) === "BRANCH_USER" && opt.value !== userBranchCode))}
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  disabled={(activeRole as string) === "BRANCH_USER"}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1.5">Select Spreadsheet File</label>
                <SearchableDropdown
                  options={[
                    { value: "apple_pricing_june_2026.xlsx", label: "apple_pricing_june_2026.xlsx" },
                    { value: "hp_spec_price_v2.xlsx", label: "hp_spec_price_v2.xlsx" },
                    { value: "google_pixel9_launch.xlsx", label: "google_pixel9_launch.xlsx" }
                  ]}
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                />
              </div>

              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-500/10 cursor-pointer disabled:opacity-50"
              >
                {uploadLoading ? "Uploading Spreadsheet..." : "Simulate Excel Pricing Import"}
              </button>
            </form>
          </div>

          {/* Upload log */}
          <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-stone-900">Spreadsheet Upload Activity</h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {uploads.length === 0 ? (
                <div className="text-xs text-stone-550 italic py-8 text-center">
                  No pricing spreadsheets uploaded yet.
                </div>
              ) : (
                uploads.map(u => (
                  <div key={u.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">{u.filename}</span>
                      <span className="text-[10px] text-stone-400">By: {u.uploadedBy} • {new Date(u.uploadedAt).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-emerald-500/10 text-emerald-850 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-lg">
                        {u.recordsCount} rows
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- AUDIT HISTORY TAB --- */}
      {activeTab === "history" && (
        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-stone-900">Pricing Modification Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Branch</th>
                  <th className="px-4 py-2.5">SKU Model</th>
                  <th className="px-4 py-2.5 text-right">Cost Price</th>
                  <th className="px-4 py-2.5 text-right">Selling Price</th>
                  <th className="px-4 py-2.5 text-right">MRP</th>
                  <th className="px-4 py-2.5 text-center">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {priceHistory.filter(h => activeRole === "ADMIN" || activeRole === "SUPER_ADMIN" || h.branchCode === userBranchCode).slice(0, 15).map(h => (
                  <tr key={h.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 text-[10px] text-stone-400">{new Date(h.updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{BRANCH_NAMES[h.branchCode]}</td>
                    <td className="px-4 py-3 font-mono font-bold text-orange-600">{h.sku}</td>
                    <td className="px-4 py-3 text-right text-stone-500">₹{h.costPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-850">₹{h.sellingPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-stone-500">₹{(h.mrp || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-stone-605">{h.updatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PRICE ANALYTICS TAB --- */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
          <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Select Analytics Product</h4>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedChartSku(p.sku)}
                  className={`w-full p-2.5 text-left rounded-lg text-xs font-semibold flex items-center justify-between border ${
                    selectedChartSku === p.sku
                      ? "bg-orange-500 border-orange-600 text-white font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 cursor-pointer"
                  }`}
                >
                  <span>{p.name}</span>
                  <span className={`font-mono text-[9px] font-bold px-1 py-0.5 rounded ${
                    selectedChartSku === p.sku ? "bg-orange-600 text-white" : "bg-stone-200 text-stone-600"
                  }`}>{p.sku}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Cross-Branch Price Comparison: <span className="text-orange-600 font-bold font-mono">{selectedChartSku}</span>
            </h4>
            <div className="h-64 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,49,32,0.05)" />
                  <XAxis dataKey="name" stroke="#78350f" fontSize={10} />
                  <YAxis stroke="#78350f" fontSize={10} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Price"]} />
                  <Legend />
                  <Bar dataKey="Cost Price" fill="#fb923c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Selling Price" fill="#ea580c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- INLINE EDIT MODAL --- */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-[#fed7aa] p-6 rounded-2xl shadow-xl w-full max-w-md relative space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-orange-500" />
                <span className="font-extrabold text-sm text-stone-900">Direct Product Pricing Editor</span>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDirectPriceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">SKU Code</span>
                  <span className="font-mono font-bold text-orange-600 block mt-0.5">{editSku}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Location Branch</span>
                  <span className="font-semibold text-stone-850 block mt-0.5">{BRANCH_NAMES[editBranchCode]} ({editBranchCode})</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-stone-200">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Product Details</span>
                  <span className="font-medium text-stone-700 block mt-0.5">{editProductName}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Branch Cost Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Branch Selling Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Branch Maximum Retail Price (MRP) (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editMrp}
                  onChange={(e) => setEditMrp(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? "Saving Changes..." : "Save Pricing Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
