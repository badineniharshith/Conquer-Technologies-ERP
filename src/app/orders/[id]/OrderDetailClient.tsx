"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, MapPin, FileText, Package, Truck, Download, Calendar } from "lucide-react";

interface OrderDetailClientProps {
  order: any;
  items: any[];
  timeline: any[];
}

export default function OrderDetailClient({ order, items, timeline }: OrderDetailClientProps) {
  const stages = [
    { label: "1. Submitted", key: "Submitted" },
    { label: "2. Approved", key: "Approved" },
    { label: "3. Invoiced", key: "Invoiced" },
    { label: "4. Delivered", key: "Delivered" },
  ];

  const currentStageIndex = order.status === "Delivered" ? 3 : order.status === "Approved" ? 1 : 0;

  return (
    <div className="space-y-6 text-stone-850">
      {/* Back Button */}
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center space-x-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders List</span>
        </Link>
      </div>

      {/* Step Progress Header */}
      <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl font-black text-stone-900 font-outfit">
              Order #{order.order_number}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">PO Number: <span className="font-mono font-bold text-stone-700">{order.po_number}</span></p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs uppercase">
            {order.status}
          </span>
        </div>

        {/* 4-Stage Horizontal Progress Tracker */}
        <div className="pt-4 grid grid-cols-4 gap-2 border-t border-stone-100">
          {stages.map((st, idx) => {
            const isPassed = idx <= currentStageIndex;
            return (
              <div key={st.key} className="space-y-2">
                <div className={`h-2 rounded-full ${isPassed ? "bg-orange-500" : "bg-stone-100"}`} />
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${isPassed ? "text-orange-600" : "text-stone-300"}`} />
                  <span className={`text-xs font-bold ${isPassed ? "text-stone-900" : "text-stone-400"}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Items & Timeline | Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items Card */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center space-x-2">
              <Package className="w-4 h-4 text-orange-600" />
              <span>Order Line Items</span>
            </h2>

            <div className="divide-y divide-stone-100">
              {items.map((item, idx) => (
                <div key={idx} className="py-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">{item.item_name}</h4>
                      <p className="text-[10px] font-mono text-stone-400 font-semibold mt-0.5">SKU: {item.sku}</p>
                    </div>
                    <span className="font-bold text-stone-900 text-xs">
                      ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-stone-500 pt-1">
                    <span>Quantity: <strong className="text-stone-800">{item.quantity} units</strong></span>
                    <span>Unit Price: <strong className="text-stone-800">₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Breakdown */}
            <div className="border-t border-stone-200 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>₹{Number(order.total_amount * 0.8475).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>GST (18%)</span>
                <span>₹{Number(order.total_amount * 0.1525).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-stone-900 font-bold text-sm pt-2 border-t border-stone-100">
                <span>Total Amount</span>
                <span className="font-outfit text-orange-600">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline Card */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>SAP &amp; Dispatch Timeline</span>
            </h2>

            <div className="space-y-4">
              {timeline.map((t, idx) => (
                <div key={idx} className="flex space-x-3 items-start">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    t.completed ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
                  }`}>
                    {t.completed ? "✓" : idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900 text-xs">{t.stage}</span>
                      <span className="text-[10px] text-stone-400">{t.timestamp}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>Shipping Address</span>
            </h3>
            <p className="text-xs text-stone-700 font-semibold leading-relaxed">
              {order.shipping_address || "Bangalore HQ, Outer Ring Road, Bellandur, Bangalore - 560103"}
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Order Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Order Number:</span>
                <strong className="text-stone-900 font-mono">#{order.order_number}</strong>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>PO Number:</span>
                <strong className="text-stone-900 font-mono">{order.po_number}</strong>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Order Date:</span>
                <strong className="text-stone-900">{order.order_date}</strong>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Approval Status:</span>
                <strong className="text-emerald-700">{order.approval_status || "Approved"}</strong>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Delivery Info</span>
            </h3>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Expected Delivery</span>
              <p className="text-xs font-bold text-blue-900">{order.expected_delivery || "June 25, 2026"}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-stone-500" />
              <span>Documents</span>
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => alert("Downloading PO Invoice PDF...")}
                className="w-full flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 transition-colors cursor-pointer"
              >
                <span>Purchase Order PDF</span>
                <Download className="w-4 h-4 text-orange-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
