"use client";

import { useState } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Tag,
  ArrowRight,
  Plus,
  Eye,
  Activity,
  Percent,
  Flame,
  UserCheck,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";

interface RecommendationsClientProps {
  products: any[];
  prices: any[];
  inventory: any[];
}

export default function RecommendationsClient({
  products,
  prices,
  inventory
}: RecommendationsClientProps) {
  const { activeUser } = useErpStore();

  // Helper to fetch selling price and MRP
  const getProductPrice = (sku: string) => {
    const pr = prices.find(p => p.sku === sku);
    return {
      sellingPrice: pr?.sellingPrice || 50000,
      mrp: pr?.mrp || pr?.sellingPrice || 55000
    };
  };

  // Helper to check availability status
  const getAvailabilityStatus = (sku: string) => {
    const totalQty = inventory
      .filter((i) => i.sku === sku)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (totalQty > 10) return { label: "In Stock", color: "text-emerald-700 bg-emerald-50 border-emerald-100" };
    if (totalQty > 0) return { label: "Low Stock", color: "text-amber-700 bg-amber-50 border-amber-100" };
    return { label: "Out of Stock", color: "text-rose-700 bg-rose-50 border-rose-100" };
  };

  // 1. RECOMMENDED PRODUCTS (Directly matching Category/Brand)
  const recommendedProducts = products.slice(0, 4).map(p => ({
    ...p,
    prices: getProductPrice(p.sku),
    status: getAvailabilityStatus(p.sku)
  }));

  // 2. TRENDING PRODUCTS
  const trendingProducts = products.slice(1, 5).map(p => ({
    ...p,
    prices: getProductPrice(p.sku),
    status: getAvailabilityStatus(p.sku)
  }));

  // 3. PERSONALIZED SUGGESTIONS
  const personalizedSuggestions = products.slice(2, 6).map(p => ({
    ...p,
    prices: getProductPrice(p.sku),
    status: getAvailabilityStatus(p.sku)
  }));

  // 4. RECENTLY VIEWED (Curated Simulator)
  const recentlyViewed = products.slice(3, 7).map(p => ({
    ...p,
    prices: getProductPrice(p.sku),
    status: getAvailabilityStatus(p.sku)
  }));

  // 5. PRICE DROP ALERTS (Items where Selling Price < MRP)
  const priceDropAlerts = products
    .map(p => {
      const priceInfo = getProductPrice(p.sku);
      const dropAmount = priceInfo.mrp - priceInfo.sellingPrice;
      const dropPct = priceInfo.mrp > 0 ? Math.round((dropAmount / priceInfo.mrp) * 100) : 0;
      return {
        ...p,
        prices: priceInfo,
        dropPct,
        status: getAvailabilityStatus(p.sku)
      };
    })
    .filter(p => p.dropPct > 0)
    .sort((a, b) => b.dropPct - a.dropPct)
    .slice(0, 4);

  // 6. FREQUENTLY BOUGHT TOGETHER BUNDLES
  const bundles = [
    {
      id: "bundle-1",
      title: "Mobile Pro Ecosystem Bundle",
      items: [products[0], products[2]].filter(Boolean),
      discount: "5% Package Discount"
    },
    {
      id: "bundle-2",
      title: "Office Productivity Workspace",
      items: [products[1], products[3]].filter(Boolean),
      discount: "8% Package Discount"
    }
  ].filter(b => b.items.length > 0);

  // 7. SMART INSIGHTS ENGINE
  const getSmartInsights = () => {
    const insights = [];
    
    // Check if laptops exist in products
    const hasLaptops = products.some(p => p.category?.name?.toLowerCase().includes("laptop") || p.name?.toLowerCase().includes("book") || p.name?.toLowerCase().includes("laptop"));
    if (hasLaptops) {
      insights.push({
        text: "You purchased laptops frequently. External multi-port USB-C hubs and monitors are recommended accessories.",
        type: "suggestion"
      });
    }

    // Check if accessories are needed
    insights.push({
      text: "Protective cases and screen guards are available for your recently inspected Smartphones catalog.",
      type: "info"
    });

    // Check largest price drop
    if (priceDropAlerts.length > 0) {
      const bestDeal = priceDropAlerts[0];
      insights.push({
        text: `Great Deal: The price of ${bestDeal.name} has dropped by ${bestDeal.dropPct}%! Purchase now before catalog rates revert.`,
        type: "deal"
      });
    }

    return insights;
  };

  const insightsList = getSmartInsights();

  const handleAddBundleToCart = (title: string) => {
    toast.success(`Mock: Bundle "${title}" added to comparison queue!`);
  };

  const handleInspectProduct = (name: string) => {
    toast.info(`Inspecting recommendation metrics for: ${name}`);
  };

  const ProductCard = ({ p, showDrop = false }: { p: any, showDrop?: boolean }) => (
    <div
      key={p.sku}
      className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between hover:border-orange-500/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
    >
      <div>
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
            {p.brand}
          </span>
          {showDrop && p.dropPct && (
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center space-x-0.5">
              <Percent className="w-3 h-3" />
              <span>{p.dropPct}% OFF</span>
            </span>
          )}
        </div>
        
        <h4 className="font-bold text-stone-850 text-xs mt-3 truncate" title={p.name}>
          {p.name}
        </h4>
        <span className="text-[10px] text-stone-400 block font-mono font-medium mt-1">SKU: {p.sku}</span>
      </div>

      <div className="border-t border-stone-200/50 pt-3 mt-4 flex items-center justify-between">
        <div>
          <span className="text-[8px] text-stone-400 block font-bold uppercase">Price</span>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-stone-900 text-xs">₹{p.prices.sellingPrice.toLocaleString()}</span>
            {p.prices.mrp > p.prices.sellingPrice && (
              <span className="text-[10px] text-stone-400 line-through">₹{p.prices.mrp.toLocaleString()}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => handleInspectProduct(p.name)}
          className="p-1.5 bg-white border border-stone-250 hover:border-orange-500 hover:text-orange-600 text-stone-500 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Quick Inspect"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-650/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Product Recommendations & Insights</h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Explore personalized product suggestion indices, frequently bought bundle rates, and live price drop notifications.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>Product Intelligence</span>
        </div>
      </div>

      {/* SMART INSIGHTS NOTIFICATIONS */}
      {insightsList.length > 0 && (
        <div className="glass-panel p-5 bg-orange-50/20 border-orange-200 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5 border-b border-orange-100 pb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Catalog Intelligence & Smart Insights</span>
          </h3>
          <div className="space-y-2">
            {insightsList.map((ins, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 text-xs bg-white p-3 border border-stone-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-stone-700 font-medium">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDED PRODUCTS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
          <ShoppingBag className="w-4 h-4 text-orange-500" />
          <span>Recommended Products for You</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendedProducts.map((p) => (
            <ProductCard key={p.sku} p={p} />
          ))}
        </div>
      </div>

      {/* PRICE DROP ALERTS */}
      {priceDropAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Live Price Drop Alerts</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {priceDropAlerts.map((p) => (
              <ProductCard key={p.sku} p={p} showDrop={true} />
            ))}
          </div>
        </div>
      )}

      {/* FREQUENTLY BOUGHT TOGETHER */}
      {bundles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Frequently Bought Together Package Deals</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white border border-[#fed7aa] p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold text-stone-900 text-xs">{bundle.title}</span>
                    <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase">
                      {bundle.discount}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {bundle.items.map((item, idx) => {
                      const priceInfo = getProductPrice(item.sku);
                      return (
                        <div key={idx} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs flex flex-col justify-between">
                          <div>
                            <span className="font-bold text-stone-850 block truncate">{item.name}</span>
                            <span className="text-[9px] text-stone-400 block uppercase font-bold">{item.brand}</span>
                          </div>
                          <span className="font-bold text-stone-900 mt-2 block">
                            ₹{priceInfo.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => handleAddBundleToCart(bundle.title)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-500/10 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Queue Package Bundle</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRENDING & SUGGESTED CO-GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trending Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
            <Activity className="w-4 h-4 text-orange-500" />
            <span>Trending Products</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendingProducts.map((p) => (
              <ProductCard key={p.sku} p={p} />
            ))}
          </div>
        </div>

        {/* Personalized Suggestions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-orange-500" />
            <span>Personalized Suggestions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personalizedSuggestions.map((p) => (
              <ProductCard key={p.sku} p={p} />
            ))}
          </div>
        </div>
      </div>

      {/* RECENTLY VIEWED */}
      <div className="space-y-3 border-t pt-4 border-stone-200/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-550 flex items-center space-x-1.5">
          <Eye className="w-4 h-4 text-orange-500" />
          <span>Recently Viewed Products</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recentlyViewed.map((p) => (
            <ProductCard key={p.sku} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
