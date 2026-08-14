"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Package, 
  Building,
  Printer,
  FileText,
  BadgeIndianRupee,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Truck,
  Hash,
  AlertCircle,
  ShoppingBag,
  Store,
  ArrowUpRight
} from "lucide-react";
import { motion } from "framer-motion";

interface PODetailsModalProps {
  poIdentifier: string; // PO ID or poNumber
  onClose: () => void;
}

export default function PODetailsModal({ poIdentifier, onClose }: PODetailsModalProps) {
  const [poData, setPoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPoDetails() {
      if (!poIdentifier) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/purchase-orders/audit/${encodeURIComponent(poIdentifier)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setPoData(json.data);
        } else {
          setError(json.error || json.reason || "Failed to load Purchase Order details.");
        }
      } catch (err: any) {
        setError("Network error fetching Purchase Order details.");
      } finally {
        setLoading(false);
      }
    }
    fetchPoDetails();
  }, [poIdentifier]);

  const handlePrint = () => {
    if (!poData) return;
    const printWin = window.open('', '_blank', 'width=950,height=1100');
    if (!printWin) {
      window.print();
      return;
    }

    const itemsRowsHtml = poData.lineItems?.map((item: any, idx: number) => {
      const hasShortage = item.needToOrder > 0;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${hasShortage ? 'background-color: #fffbeb;' : ''}">
          <td style="padding: 8px 10px; font-family: monospace; color: #64748b; font-size: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px 10px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${item.name}</div>
            <div style="font-family: monospace; color: #64748b; font-size: 9px;">SKU: ${item.sku}</div>
          </td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: #0f172a;">${item.requestedQty}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 600;">₹${Number(item.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace;">${item.discount ? item.discount + '%' : '—'}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace;">${item.tax ? item.tax + '%' : '18%'}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">₹${Number(item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; font-weight: 700; ${item.currentStock >= item.requestedQty ? 'color: #047857;' : 'color: #b45309;'}">${item.currentStock}</td>
          <td style="padding: 8px 10px; text-align: center;">
            ${hasShortage 
              ? `<span style="padding: 2px 6px; background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; border-radius: 4px; font-weight: 800; font-size: 9px;">${item.needToOrder} Units</span>` 
              : `<span style="color: #047857; font-weight: 700; font-size: 10px;">In Stock</span>`}
          </td>
        </tr>
      `;
    }).join('') || '';

    const dateStr = poData.dateReceived ? new Date(poData.dateReceived).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A";
    const deliveryStr = poData.expectedDelivery ? new Date(poData.expectedDelivery).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "Standard";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PO_${poData.poNumber}_Breakdown</title>
          <style>
            @page {
              size: A4;
              margin: 10mm 12mm 10mm 12mm;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 11px;
              line-height: 1.4;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .header-logo {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #0f172a;
            }
            .header-sub {
              font-size: 11px;
              color: #475569;
              font-weight: 500;
              margin-top: 2px;
            }
            .header-contact {
              font-size: 9px;
              color: #64748b;
              margin-top: 4px;
            }
            .po-title-box {
              text-align: right;
            }
            .po-title {
              font-size: 10px;
              font-weight: 900;
              color: #64748b;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }
            .po-num {
              font-family: monospace;
              font-size: 18px;
              font-weight: 900;
              color: #ea580c;
              margin-top: 2px;
            }
            .grid-cards {
              width: 100%;
              border-collapse: separate;
              border-spacing: 12px 0;
              margin-left: -12px;
              margin-right: -12px;
              margin-bottom: 16px;
            }
            .card-box {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 12px;
              vertical-align: top;
            }
            .card-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #ea580c;
              margin-bottom: 6px;
            }
            .table-main {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .table-main th {
              background-color: #f1f5f9;
              border-bottom: 1px solid #cbd5e1;
              color: #475569;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 8px 10px;
            }
            .summary-box {
              float: right;
              width: 260px;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 12px;
              margin-bottom: 16px;
            }
            .clearfix::after {
              content: "";
              clear: both;
              display: table;
            }
            .footer-box {
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              margin-top: 20px;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <!-- Document Header -->
          <table class="header-table">
            <tr>
              <td>
                <div class="header-logo">CONQUER TECHNOLOGIES</div>
                <div class="header-sub">Enterprise Supply Chain & Inventory Fulfillment Portal</div>
                <div class="header-contact">Plot 42, Phase II, Hitec City, Hyderabad - 500081 | GSTIN: 36AAACG1234A1Z5</div>
              </td>
              <td class="po-title-box">
                <div class="po-title">PURCHASE ORDER BREAKDOWN</div>
                <div class="po-num">#${poData.poNumber}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Date: ${dateStr}</div>
              </td>
            </tr>
          </table>

          <!-- Customer & Logistics Grid -->
          <table class="grid-cards">
            <tr>
              <td width="50%" class="card-box">
                <div class="card-title">CUSTOMER & ACCOUNT PROFILE</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${poData.companyName || poData.customerName}</div>
                ${poData.customerCode ? `<div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 2px;">Code: ${poData.customerCode}</div>` : ''}
                <div style="margin-top: 6px; font-size: 10px;">
                  <span style="color: #64748b; font-weight: 700;">GSTIN:</span> <strong style="font-family: monospace;">${poData.gstNumber || "N/A"}</strong>
                  &nbsp;|&nbsp;
                  <span style="color: #64748b; font-weight: 700;">PAN:</span> <strong style="font-family: monospace;">${poData.panNumber || "N/A"}</strong>
                </div>
                <div style="margin-top: 4px; font-size: 10px; color: #334155;">
                  Email: ${poData.email || "N/A"} | Phone: ${poData.phone || "N/A"}
                </div>
              </td>

              <td width="50%" class="card-box">
                <div class="card-title">ADDRESSES & LOGISTICS</div>
                <div style="font-size: 10px;">
                  <span style="color: #64748b; font-weight: 700;">Billing Address:</span><br/>
                  <div style="color: #1e293b; font-weight: 500; margin-bottom: 4px;">${poData.billingAddress || "N/A"}</div>
                  <span style="color: #64748b; font-weight: 700;">Shipping Address:</span><br/>
                  <div style="color: #1e293b; font-weight: 500;">${poData.shippingAddress || poData.billingAddress || "N/A"}</div>
                </div>
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b;">
                  Branch: <strong>${poData.branchCode}</strong> | Delivery Target: <strong>${deliveryStr}</strong>
                </div>
              </td>
            </tr>
          </table>

          <!-- Inventory Shortage Warning Alert -->
          ${totalShortageQty > 0 ? `
            <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;">
              <strong style="color: #78350f; font-size: 11px;">Inventory Action Required: ${totalShortageQty} Units Need to be Ordered</strong>
              <div style="color: #92400e; font-size: 10px; margin-top: 2px;">
                Available warehouse stock is lower than requested PO quantity. Reorder items are flagged in the matrix below.
              </div>
            </div>
          ` : ''}

          <!-- Items Breakdown Table -->
          <table class="table-main">
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">#</th>
                <th style="text-align: left;">Item Description & SKU</th>
                <th style="text-align: center; width: 70px;">Ordered Qty</th>
                <th style="text-align: right; width: 100px;">Unit Price (₹)</th>
                <th style="text-align: center; width: 60px;">Disc (%)</th>
                <th style="text-align: center; width: 60px;">Tax (GST)</th>
                <th style="text-align: right; width: 110px;">Net Total (₹)</th>
                <th style="text-align: center; width: 70px;">Stock Avail</th>
                <th style="text-align: center; width: 90px;">Need to Order</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <!-- Summary Box -->
          <div class="clearfix">
            <div class="summary-box">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Subtotal:</span>
                <span style="font-family: monospace; font-weight: 700; color: #0f172a;">₹${Number(subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 6px;">
                <span>Estimated Tax (GST):</span>
                <span style="font-family: monospace; color: #475569;">Included / 18%</span>
              </div>
              <div style="border-top: 2px solid #0f172a; padding-top: 6px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; color: #0f172a;">
                <span>Grand Total:</span>
                <span style="font-family: monospace; color: #ea580c; font-size: 15px;">₹${Number(grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <!-- Footer & Signatures -->
          <div class="footer-box">
            <table width="100%">
              <tr>
                <td width="60%" style="vertical-align: top; font-size: 9px; color: #64748b;">
                  <strong style="color: #0f172a; font-size: 10px; text-transform: uppercase;">Terms & Conditions</strong><br/>
                  1. Prices are inclusive of taxes where applicable.<br/>
                  2. Stock fulfillment is subject to branch inventory verification.<br/>
                  3. Dispatch dates are estimated based on inward supplier logistics.
                </td>
                <td width="40%" style="text-align: right; vertical-align: top;">
                  <strong style="color: #0f172a; font-size: 10px; text-transform: uppercase;">For Conquer Technologies</strong>
                  <div style="height: 36px;"></div>
                  <div style="font-size: 10px; color: #64748b; font-style: italic;">Authorized Signatory</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    printWin.document.write(printContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-stone-500 min-h-[360px]">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
        <p className="text-xs font-semibold tracking-wide animate-pulse text-stone-600 font-mono">
          Retrieving PO #{poIdentifier} customer order, stock & shortage details...
        </p>
      </div>
    );
  }

  if (error || !poData) {
    return (
      <div className="p-8 text-center space-y-4 min-h-[300px] flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-rose-500 animate-bounce" />
        <h4 className="text-sm font-black text-stone-900">Purchase Order Details Unavailable</h4>
        <p className="text-xs text-rose-600 font-medium max-w-sm">
          {error || "Unable to locate PO record."}
        </p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Calculate totals if missing
  const subtotal = poData.subtotal || poData.lineItems?.reduce((sum: number, item: any) => sum + (item.unitPrice * item.requestedQty), 0) || 0;
  const grandTotal = poData.grandTotal || poData.totalAmount || poData.lineItems?.reduce((sum: number, item: any) => sum + item.total, 0) || subtotal;
  const totalShortageQty = poData.lineItems?.reduce((sum: number, item: any) => sum + item.needToOrder, 0) || 0;

  return (
    <div className="text-stone-850 space-y-5 max-h-[85vh] overflow-y-auto pr-1">
      {/* CSS for PDF Print Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-po-document, #printable-po-document * {
            visibility: visible;
          }
          #printable-po-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
            font-size: 10pt;
            transform: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border: 1px solid #cbd5e1 !important;
          }
          .print-bg-header {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Action Header bar (Screen Only) */}
      <div className="flex justify-between items-center border-b border-stone-200 pb-3 no-print">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-200/60">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black text-stone-900 font-outfit tracking-tight">
                PO #{poData.poNumber}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                poData.isStockAvailable 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {poData.isStockAvailable ? "Full Stock Available" : `${totalShortageQty} Units Shortage`}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Customer Order Details, Inventory Allocation & Shortage Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable PDF</span>
          </button>

          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable PO Document Container */}
      <div id="printable-po-document" ref={printRef} className="space-y-5 bg-white p-2">
        {/* Printable Document Title / Company Header */}
        <div className="border-b-2 border-stone-900 pb-4 flex justify-between items-start">
          <div>
            <div className="text-xl font-black tracking-wider text-stone-950 font-outfit uppercase">
              Conquer Technologies
            </div>
            <div className="text-[11px] text-stone-600 mt-0.5 font-medium">
              Enterprise Supply Chain & Inventory Fulfillment Portal
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              Plot 42, Phase II, Hitec City, Hyderabad - 500081 | GSTIN: 36AAACG1234A1Z5
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black uppercase text-stone-500 tracking-widest">PURCHASE ORDER BREAKDOWN</div>
            <div className="font-mono font-black text-lg text-orange-650 mt-1">#{poData.poNumber}</div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              Date: {poData.dateReceived ? new Date(poData.dateReceived).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
            </div>
          </div>
        </div>

        {/* Customer & Address Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer / Company Info */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 print-border print-bg-header space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 font-black text-stone-900 uppercase text-[10px] tracking-wider text-orange-700">
              <Building className="w-3.5 h-3.5 shrink-0" />
              <span>Customer & Account Profile</span>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-sm text-stone-950">{poData.companyName || poData.customerName}</div>
              {poData.customerCode && (
                <div className="text-[10px] font-mono text-stone-500">Customer Code: {poData.customerCode}</div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="font-bold text-stone-400 block text-[9px] uppercase">GSTIN / Tax ID</span>
                  <span className="font-mono font-bold text-stone-850">{poData.gstNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-stone-400 block text-[9px] uppercase">PAN Number</span>
                  <span className="font-mono font-bold text-stone-850">{poData.panNumber || "N/A"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center space-x-1 text-stone-600 truncate">
                  <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                  <span className="truncate">{poData.email || "N/A"}</span>
                </div>
                <div className="flex items-center space-x-1 text-stone-600">
                  <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{poData.phone || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Shipping Address */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 print-border print-bg-header space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 font-black text-stone-900 uppercase text-[10px] tracking-wider text-orange-700">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Addresses & Logistics</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="font-bold text-stone-400 block text-[9px] uppercase">Billing Address</span>
                <p className="text-stone-800 leading-snug font-medium mt-0.5">{poData.billingAddress || "N/A"}</p>
              </div>
              <div>
                <span className="font-bold text-stone-400 block text-[9px] uppercase">Shipping Address</span>
                <p className="text-stone-800 leading-snug font-medium mt-0.5">{poData.shippingAddress || poData.billingAddress || "N/A"}</p>
              </div>
            </div>
            <div className="pt-1.5 border-t border-stone-200/60 flex justify-between items-center text-[10px] text-stone-500">
              <div>Branch: <strong className="text-stone-800">{poData.branchCode}</strong></div>
              <div>Delivery Target: <strong className="text-stone-800">{poData.expectedDelivery ? new Date(poData.expectedDelivery).toLocaleDateString("en-IN") : "Standard"}</strong></div>
            </div>
          </div>
        </div>

        {/* Vendor Card if Vendor is linked */}
        {poData.vendor && (
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs flex justify-between items-center print-border">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-amber-700" />
              <div>
                <div className="font-bold text-amber-950">Linked Vendor: {poData.vendor.name}</div>
                <div className="text-[10px] text-amber-800">
                  Contact: {poData.vendor.contactPerson} ({poData.vendor.phone}) | GST: {poData.vendor.gstNumber || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Shortage Warning Alert */}
        {totalShortageQty > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-xs print-border">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-black text-amber-950">Inventory Action Required: {totalShortageQty} Units Need to be Ordered</div>
                <div className="text-[10px] text-amber-800 mt-0.5">
                  Available warehouse stock is lower than requested PO quantity. Reorder suggestions calculated below.
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-600 text-white font-black text-[10px] rounded-lg uppercase tracking-wider">
              Shortage
            </span>
          </div>
        )}

        {/* Product Items Table */}
        <div className="border border-stone-200 rounded-xl overflow-hidden print-border">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold uppercase text-[9px] tracking-wider print-bg-header">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Item Description & SKU</th>
                <th className="px-3 py-2.5 text-center">Ordered Qty</th>
                <th className="px-3 py-2.5 text-right">Unit Price (₹)</th>
                <th className="px-3 py-2.5 text-center">Disc (%)</th>
                <th className="px-3 py-2.5 text-center">Tax (GST)</th>
                <th className="px-3 py-2.5 text-right">Net Total (₹)</th>
                <th className="px-3 py-2.5 text-center">Stock Avail</th>
                <th className="px-3 py-2.5 text-center">Need to Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-150">
              {poData.lineItems?.map((item: any, idx: number) => {
                const hasShortage = item.needToOrder > 0;
                return (
                  <tr key={idx} className={hasShortage ? "bg-amber-50/40" : "hover:bg-stone-50"}>
                    <td className="px-3 py-2.5 font-mono text-stone-400 text-[10px]">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-stone-900">{item.name}</div>
                      <div className="text-[10px] font-mono text-stone-500">SKU: {item.sku}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-stone-900">{item.requestedQty}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-stone-800">
                      ₹{item.unitPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-stone-600">
                      {item.discount ? `${item.discount}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-stone-600">
                      {item.tax ? `${item.tax}%` : "18%"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-950">
                      ₹{item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-stone-800">
                      <span className={item.currentStock >= item.requestedQty ? "text-emerald-700" : "text-amber-700"}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {hasShortage ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[10px] rounded-md inline-block">
                          {item.needToOrder} Units
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[10px] font-bold">In Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-full md:w-72 bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5 text-xs print-border print-bg-header">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-stone-900">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Estimated Tax (GST):</span>
              <span className="font-mono text-stone-700">Included / 18%</span>
            </div>
            <div className="border-t border-stone-300 pt-1.5 flex justify-between items-center text-sm font-black text-stone-950">
              <span>Grand Total:</span>
              <span className="font-mono text-orange-650 text-base">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Terms & Authorization Signatures (Visible on Printable PDF) */}
        <div className="pt-6 border-t border-stone-200 grid grid-cols-2 gap-8 text-[10px] text-stone-500">
          <div>
            <div className="font-bold text-stone-800 uppercase tracking-wider mb-1">Terms & Conditions</div>
            <p>1. Prices are inclusive of taxes where applicable.</p>
            <p>2. Stock fulfillment subject to branch verification.</p>
            <p>3. Dispatch target dates are estimated based on inward logistics.</p>
          </div>
          <div className="text-right flex flex-col justify-between">
            <div>
              <div className="font-bold text-stone-800 uppercase tracking-wider">For Conquer Technologies</div>
              <div className="text-stone-400 italic mt-6">Authorized Signatory</div>
            </div>
            <div className="text-[9px] text-stone-400 font-mono">Generated via ERP Supply Chain System</div>
          </div>
        </div>
      </div>

      {/* Screen Close Action */}
      <div className="pt-3 border-t flex justify-end no-print">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close View
        </button>
      </div>
    </div>
  );
}
