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
  ShoppingCart,
  Calendar,
  Clock,
  ThumbsUp,
  Tag,
  Mail,
  User,
  Briefcase,
  Plus,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CustomerPortalProps {
  products: any[];
  inventory: any[];
  prices: any[];
}

export default function CustomerPortal({ products, inventory, prices }: CustomerPortalProps) {
  const router = useRouter();
  const { activeUser } = useErpStore();

  const allocatedSkus = [
    {
      sku: "ITM-MAC16-001",
      name: "Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD) - Space Black",
      unitPrice: "₹3,49,900.00",
      available: 2,
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60"
    },
    {
      sku: "ITM-MAC14-002",
      name: "Apple MacBook Pro 14-inch M3 Pro (18GB RAM, 512GB SSD) - Silver",
      unitPrice: "₹1,99,900.00",
      available: 4,
      imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=60"
    },
    {
      sku: "ITM-AIR15-003",
      name: "Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight",
      unitPrice: "₹89,620.11",
      available: 8,
      imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60"
    }
  ];

  const recentOrders = [
    { orderNumber: "181414", date: "June 15, 2026", status: "Approved", units: 50, amount: "₹4,481,005.50" },
    { orderNumber: "713636", date: "June 10, 2026", status: "Approved", units: 10, amount: "₹896,201.10" },
    { orderNumber: "923411", date: "May 28, 2026", status: "Delivered", units: 25, amount: "₹4,997,500.00" }
  ];

  return (
    <div className="space-y-6 text-stone-850">
      {/* Welcome & Dashboard Heading */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 font-outfit tracking-tight">Dashboard</h1>
        <p className="text-stone-500 text-xs mt-1">Welcome back! Here's your procurement overview.</p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Allocated SKUs</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">3</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-orange-600 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Available Units</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">14</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Pending Approval</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">0</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Order in Process</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">8</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primary CTA */}
        <div className="md:col-span-2 bg-gradient-to-r from-[#8c3120] to-[#b33e28] text-white p-6 rounded-2xl shadow-md flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-200 bg-black/20 px-2 py-0.5 rounded">Quick Procurement</span>
            <h2 className="text-lg font-extrabold font-outfit mt-2">Place New Hardware Order</h2>
            <p className="text-orange-100 text-xs mt-1">Browse your company's allocated inventory and initiate instant purchase orders.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/allocated-stock")}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-[#8c3120] font-bold rounded-xl text-xs hover:bg-orange-50 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Place New Order</span>
            </button>
            <button
              onClick={() => router.push("/reserved-stock")}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-black/25 hover:bg-black/40 text-white font-bold rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Reserve Stock</span>
            </button>
          </div>
        </div>

        {/* Secondary Links */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Quick Portal Links</span>
          <div className="space-y-2">
            <Link href="/reserved-stock" className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl hover:bg-orange-100/60 flex items-center justify-between transition-colors">
              <div className="flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-stone-900">Stock Reservations</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-orange-200/80 text-orange-900 px-2 py-0.5 rounded">Active Holds</span>
            </Link>
            <Link href="/assets-warranties" className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl hover:bg-stone-100 flex items-center justify-between transition-colors">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-stone-900">Expiring Warranties</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">0 Expired</span>
            </Link>
            <Link href="/orders" className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl hover:bg-stone-100 flex items-center justify-between transition-colors">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-stone-900">Track Orders</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">8 In Transit</span>
            </Link>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Quick Portal Links</h3>
            <div className="space-y-2 mt-3 text-xs">
              <Link href="/assets-warranties" className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-orange-50 rounded-xl border border-stone-150 transition-all text-stone-800 font-semibold group">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>View Expiring Warranties</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">0 Expired</span>
              </Link>

              <Link href="/orders" className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-orange-50 rounded-xl border border-stone-150 transition-all text-stone-800 font-semibold group">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span>Track Orders</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">8 In Transit</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated SKUs Grid/Scroll */}
      <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Allocated Inventory SKUs</h2>
          <Link href="/allocated-stock" className="text-xs text-orange-600 hover:underline font-bold flex items-center space-x-1">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allocatedSkus.map((item) => (
            <div key={item.sku} className="border border-stone-200 rounded-2xl p-4 space-y-3 hover:border-orange-300 transition-all bg-stone-50/50 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-36 rounded-xl bg-stone-100 overflow-hidden relative border border-stone-200/60">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {item.available} in stock
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 font-semibold">{item.sku}</span>
                <h4 className="font-bold text-stone-900 text-xs line-clamp-2">{item.name}</h4>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/80">
                <div>
                  <span className="text-[9px] text-stone-400 block font-bold uppercase">UNIT PRICE</span>
                  <span className="text-xs font-bold text-stone-900">{item.unitPrice}</span>
                </div>
                <Link
                  href={`/allocated-stock/${item.sku}`}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition-all shadow-2xs"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-stone-200 p-5 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Recent Company Orders</h2>
            <Link href="/orders" className="text-xs text-orange-600 font-bold hover:underline">View All Orders</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Order #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Units</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.orderNumber} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-bold text-stone-900 font-mono">#{ord.orderNumber}</td>
                    <td className="px-4 py-3 text-stone-600">{ord.date}</td>
                    <td className="px-4 py-3 text-stone-800 font-medium">{ord.units} units</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{ord.amount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        ord.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/orders/${ord.orderNumber}`} className="text-orange-600 font-bold hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warranty Alerts */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-2xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Warranty Health Alerts</h2>

          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>All Assets Active & Protected</span>
              </div>
              <p className="text-[11px] text-emerald-700">20 hardware units currently under active manufacturer warranty coverage.</p>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Expiring in 30 Days</span>
              <p className="text-xs font-bold text-stone-800">0 assets expiring soon</p>
              <p className="text-[11px] text-stone-500">No immediate warranty renewals required for Acceldata account.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
