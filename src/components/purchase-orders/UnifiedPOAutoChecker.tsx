"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Package, 
  Building,
  ArrowRight,
  ClipboardCheck,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface UnifiedPOAutoCheckerProps {
  purchaseOrderId: string;
  onClose?: () => void;
}

export default function UnifiedPOAutoChecker({ 
  purchaseOrderId, 
  onClose 
}: UnifiedPOAutoCheckerProps) {
  const [poMetrics, setPoMetrics] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);

  useEffect(() => {
    async function executeStockAudit() {
      try {
        setIsVerifying(true);
        setWebError(null);
        
        // Fetch audit data from Next.js API Route
        const targetRes = await fetch(`/api/purchase-orders/audit/${purchaseOrderId}`);
        const transactionPayload = await targetRes.json();
        
        if (transactionPayload.success) {
          setPoMetrics(transactionPayload.data);
        } else {
          setWebError(transactionPayload.reason || "Failed to fetch PO metrics.");
        }
      } catch (err) {
        setWebError("Website connection link to the database dropped. Retrying...");
      } finally {
        setIsVerifying(false);
      }
    }
    
    if (purchaseOrderId) {
      executeStockAudit();
    }
  }, [purchaseOrderId]);

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-stone-500 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-semibold tracking-wide animate-pulse">
          Evaluating warehouse rows & reserving stock states...
        </p>
      </div>
    );
  }

  if (webError || !poMetrics) {
    return (
      <div className="p-8 text-center space-y-4 min-h-[300px] flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-rose-500 animate-bounce" />
        <h4 className="text-sm font-black text-stone-900">Database Pipeline Exception</h4>
        <p className="text-xs text-rose-600 font-medium max-w-sm">
          {webError || "An unexpected error occurred during real-time stock allocation check."}
        </p>
        {onClose && (
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-250 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // Helper for verification statuses styles
  const flagStatusStyle = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('delivered') || s.includes('complete')) {
      return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20';
    }
    if (s.includes('billing') || s.includes('verified')) {
      return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
    }
    if (s.includes('cancel')) {
      return 'bg-stone-500/10 text-stone-600 border-stone-200';
    }
    return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
  };

  return (
    <div className="text-stone-850 space-y-4">
      {/* Modal Header */}
      <div className="flex justify-between items-start border-b border-stone-150 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-extrabold tracking-tight text-stone-950 font-outfit">
              Order Allocation Status Check
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time stock audit and verification logs for inward purchase orders.
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Basic Metrics Summary */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Purchase Order Number</span>
          <div className="font-mono font-black text-sm text-orange-655 mt-0.5">{poMetrics.poNumber}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Client Profile</span>
          <div className="font-bold text-stone-900 mt-0.5 truncate">{poMetrics.customerName}</div>
        </div>
        <div className="col-span-2 pt-2 border-t border-stone-200/50 flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Verification Workflow</span>
          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${flagStatusStyle(poMetrics.currentStatus)}`}>
            {poMetrics.currentStatus === "PO Verified & Stock Available" ? "Verified & Allocated" : poMetrics.currentStatus}
          </span>
        </div>
      </div>

      {/* Real-time Inventory Verification Banner */}
      {/* Real-time Inventory Verification Banner */}
      <motion.div 
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`p-4 rounded-xl flex items-center justify-between border ${
          poMetrics.stockStatus === "Stock Adjusted"
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
            : poMetrics.isStockAvailable 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' 
            : poMetrics.stockStatus === "Partially Stock Adjusted"
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-800'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-800'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          {poMetrics.stockStatus === "Stock Adjusted" || poMetrics.isStockAvailable ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
          )}
          <div className="text-xs">
            <div className="font-extrabold">
              {poMetrics.stockStatus === "Stock Adjusted" 
                ? "Stock Adjusted & Fulfillable" 
                : poMetrics.isStockAvailable 
                ? "Stock Fulfillability Verified" 
                : poMetrics.stockStatus === "Partially Stock Adjusted"
                ? "Stock Partially Adjusted"
                : "Inventory Shortage Detected"}
            </div>
            <div className="text-[10px] opacity-85 mt-0.5">
              {poMetrics.stockStatus === "Stock Adjusted"
                ? `Covered by stock adjustment ${poMetrics.lastAdjustmentNumber || ''} on ${poMetrics.lastAdjustedAt ? new Date(poMetrics.lastAdjustedAt).toLocaleString("en-IN") : ''}`
                : poMetrics.isStockAvailable 
                ? "All requested item lines are fully stocked in destination branch." 
                : poMetrics.stockStatus === "Partially Stock Adjusted"
                ? `${poMetrics.totalAllocated || 0}/${poMetrics.totalRequested || 0} units fulfilled (${poMetrics.totalRemaining || 0} units remaining)`
                : "One or more item lines exceed available stock at warehouse."}
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
          poMetrics.stockStatus === "Stock Adjusted" || poMetrics.isStockAvailable
            ? 'bg-emerald-600 text-white border-emerald-600' 
            : poMetrics.stockStatus === "Partially Stock Adjusted"
            ? 'bg-amber-600 text-white border-amber-600'
            : 'bg-rose-600 text-white border-rose-600'
        }`}>
          {poMetrics.stockStatus || (poMetrics.isStockAvailable ? "Fulfillable" : "Shortage")}
        </span>
      </motion.div>

      {/* Item Line Breakdowns */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Item Allocation Matrix</h4>
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {poMetrics.lineItems?.map((productLine: any, index: number) => {
            const isCovered = productLine.status === "STOCK_ADJUSTED" || (productLine.currentStock >= productLine.requestedQty);
            return (
              <div 
                key={index} 
                className={`flex justify-between items-center text-xs p-3 rounded-lg border ${
                  productLine.status === "STOCK_ADJUSTED"
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isCovered 
                    ? 'bg-white border-stone-200' 
                    : 'bg-rose-50/30 border-rose-200/50'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-stone-800">{productLine.name || productLine.sku}</div>
                  <div className="text-[10px] text-stone-400 font-mono">SKU: {productLine.sku}</div>
                  {productLine.lastAdjustmentNumber && (
                    <div className="text-[9px] font-mono text-emerald-700 font-bold">
                      Adj: {productLine.lastAdjustmentNumber}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-right">
                  <div className="text-[10px] text-stone-500 font-medium">
                    <div>Ordered: <strong className="text-stone-850 font-bold">{productLine.requestedQty}</strong></div>
                    <div>Stock / Allocated: <strong className={isCovered ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{productLine.allocatedQty || productLine.currentStock}</strong></div>
                  </div>
                  <div className="shrink-0">
                    {isCovered ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] font-bold">✓</span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-[10px] font-bold">⚠</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Close button */}
      {onClose && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      )}
    </div>
  );
}
