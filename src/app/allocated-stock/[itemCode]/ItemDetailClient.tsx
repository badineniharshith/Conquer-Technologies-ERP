"use client";

import Link from "next/link";
import { ArrowLeft, Cpu, HardDrive, Monitor, Palette, Boxes, Calendar, Building, Info } from "lucide-react";

interface ItemDetailClientProps {
  item: any;
}

export default function ItemDetailClient({ item }: ItemDetailClientProps) {
  return (
    <div className="space-y-6 text-stone-850">
      {/* Back Navigation */}
      <div>
        <Link
          href="/allocated-stock"
          className="inline-flex items-center space-x-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Allocated Stock</span>
        </Link>
      </div>

      {/* Main Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Image Panel */}
        <div className="lg:col-span-5 bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs flex flex-col items-center justify-center">
          <div className="w-full h-80 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200/80 relative">
            <img
              src={item.image_url || "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60"}
              alt={item.product_name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-3 right-3 bg-stone-900 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-sm">
              APPLE
            </span>
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-7 bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bg-orange-100 text-orange-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase border border-orange-200">
                APPLE
              </span>
              <span className="text-xs font-mono font-bold text-stone-400">
                Item Code: {item.item_code}
              </span>
            </div>

            <h1 className="text-xl font-black text-stone-900 font-outfit leading-tight">
              {item.product_name}
            </h1>

            <div className="pt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-stone-900 font-outfit">
                ₹{Number(item.unit_price || 89620.11).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-stone-400 font-medium">(Excl. Taxes)</span>
            </div>
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-b border-stone-100 py-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Available Units</span>
              <span className="text-3xl font-black text-emerald-700 block mt-1">{item.available_units || 8}</span>
            </div>

            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl text-center">
              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Total Allocated</span>
              <span className="text-3xl font-black text-orange-700 block mt-1">{item.total_allocated || 15}</span>
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            <button
              onClick={() => alert("Initiating hardware allocation request for " + item.product_name)}
              className="w-full py-3 bg-[#8c3120] hover:bg-[#b33e28] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              Request Stock Allocation
            </button>
          </div>
        </div>
      </div>

      {/* Specifications Table */}
      <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center space-x-2">
          <Info className="w-4 h-4 text-orange-600" />
          <span>Product Specifications</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center space-x-1.5 text-stone-400 font-bold uppercase text-[10px]">
              <Monitor className="w-3.5 h-3.5 text-stone-500" />
              <span>Screen Size</span>
            </div>
            <p className="font-bold text-stone-900">{item.screen_size || "15.3-inch Liquid Retina"}</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center space-x-1.5 text-stone-400 font-bold uppercase text-[10px]">
              <Cpu className="w-3.5 h-3.5 text-stone-500" />
              <span>Processor Chip</span>
            </div>
            <p className="font-bold text-stone-900">{item.chip || "Apple M2 / M3"}</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center space-x-1.5 text-stone-400 font-bold uppercase text-[10px]">
              <HardDrive className="w-3.5 h-3.5 text-stone-500" />
              <span>Storage Capacity</span>
            </div>
            <p className="font-bold text-stone-900">{item.storage || "512GB SSD"}</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center space-x-1.5 text-stone-400 font-bold uppercase text-[10px]">
              <Palette className="w-3.5 h-3.5 text-stone-500" />
              <span>Colour Variant</span>
            </div>
            <p className="font-bold text-stone-900">{item.colour || "Space Black / Midnight"}</p>
          </div>
        </div>
      </div>

      {/* Bottom Split Section: Stock Details & Warehouse Units */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Details */}
        <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Stock Details</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-medium">Allocated To</span>
              <span className="font-bold text-stone-900">Acceldata Technology Private Limited</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-medium">Item Group</span>
              <span className="font-bold text-stone-900">Apple Commercial Hardware</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-medium">Stock Group</span>
              <span className="font-bold text-stone-900">{item.stock_group || "Laptops"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-medium">Item Property</span>
              <span className="font-bold text-stone-900">Serial Tracked &amp; Allocated</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone-500 font-medium">Last Synced</span>
              <span className="font-mono text-stone-700 font-semibold">{new Date(item.last_synced || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Units Table */}
        <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-2xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Warehouse Units Inventory</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5 text-center">Units</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5">In Date</th>
                  <th className="px-4 py-2.5">Doc Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-bold text-stone-900">{item.warehouse || "AMP"}</td>
                  <td className="px-4 py-3 text-center font-bold text-stone-900">{item.available_units || 8}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      Available
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{item.in_date || "2026-06-10"}</td>
                  <td className="px-4 py-3 text-stone-600">{item.doc_date || "2026-06-10"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
