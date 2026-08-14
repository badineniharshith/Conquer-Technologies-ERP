"use client";

import { useState } from "react";
import { Eye, Search, ClipboardList, FileText } from "lucide-react";
import Link from "next/link";
import { AnimatedModal } from "@/components/ui/motion";
import PODetailsModal from "@/components/purchase-orders/PODetailsModal";

interface OrdersClientProps {
  initialOrders: any[];
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "Approved" | "Invoiced" | "Delivered">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoNumber, setSelectedPoNumber] = useState<string | null>(null);

  const filteredOrders = initialOrders.filter((ord) => {
    const matchesTab = activeTab === "All" || ord.status === activeTab;
    const matchesSearch =
      (ord.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.po_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs = [
    { label: "All (88)", value: "All" },
    { label: "Pending (0)", value: "Pending" },
    { label: "Approved (8)", value: "Approved" },
    { label: "Invoiced (0)", value: "Invoiced" },
    { label: "Delivered (80)", value: "Delivered" },
  ];

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 font-outfit tracking-tight">Orders History</h1>
        <p className="text-stone-500 text-xs mt-1">
          Track procurement status, purchase orders, and delivery schedules for Acceldata account.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto bg-stone-100 p-1 rounded-xl text-xs font-bold">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.value
                    ? "bg-orange-500 text-white shadow-2xs font-extrabold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search Order # or PO #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Items Summary</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400 italic">
                    No orders found matching the filter parameters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.order_number} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold font-mono text-stone-900">
                      #{ord.order_number}
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-medium">{ord.order_date}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <button
                        onClick={() => setSelectedPoNumber(ord.po_number)}
                        className="text-orange-650 hover:underline hover:text-orange-750 font-bold transition-colors cursor-pointer text-left focus:outline-none inline-flex items-center space-x-1"
                        title="Click to view Customer details, Discounts, Stock Available, Need to Order & Printable PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-500 inline shrink-0" />
                        <span>{ord.po_number}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-stone-700 font-semibold">
                      {ord.units_count} units · {ord.line_items_count} line
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900 font-outfit">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        ord.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        ord.status === "Delivered" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-orange-50 text-orange-700 border-orange-200"
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/orders/${ord.order_number}`}
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

      {/* PO Details & Printable PDF Modal */}
      <AnimatedModal open={!!selectedPoNumber} onClose={() => setSelectedPoNumber(null)}>
        <div className="bg-white/95 backdrop-blur-xl border border-orange-200/70 p-6 rounded-2xl shadow-xl w-full max-w-4xl relative animate-scale-in">
          {selectedPoNumber && (
            <PODetailsModal 
              poIdentifier={selectedPoNumber} 
              onClose={() => setSelectedPoNumber(null)} 
            />
          )}
        </div>
      </AnimatedModal>
    </div>
  );
}
