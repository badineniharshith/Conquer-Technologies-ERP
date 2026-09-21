"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useErpStore } from "@/lib/store";
import { 
  checkStockAvailabilityAction, 
  verifyPurchaseOrderAction, 
  approvePurchaseOrderAction,
  createPurchaseOrderAction,
  lookupPurchaseOrderByNumberAction,
  getProductPriceAction,
  getNextPoNumberAction
} from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  ClipboardList, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  X,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Clock,
  Package,
  Truck,
  UserCheck,
  Sparkles,
  Store,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  BadgeIndianRupee,
  Hash,
  RefreshCw,
  FileText,
  ArrowUpRight,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import { motion, AnimatePresence, AnimatedModal, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import UnifiedPOAutoChecker from "./UnifiedPOAutoChecker";
import PODetailsModal from "./PODetailsModal";

interface PurchaseOrdersClientProps {
  initialPurchaseOrders: any[];
  users: any[];
  branches: any[];
  products: any[];
  vendors: any[];
}

export default function PurchaseOrdersClient({
  initialPurchaseOrders,
  users,
  branches,
  products,
  vendors
}: PurchaseOrdersClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Loading state per PO row action
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New PO Modal state
  const [modalOpen, setModalOpen] = useState(false);
  
  // Real-time PO Audit Modal state
  const [selectedAuditPoId, setSelectedAuditPoId] = useState<string | null>(null);
  const [poSearchInput, setPoSearchInput] = useState("");
  const [searchedPoData, setSearchedPoData] = useState<any | null>(null);
  const [isSearchingPo, setIsSearchingPo] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Handle PO Number Lookup & Full Audit Details Fetch
  const handleSearchPO = useCallback(async (overrideTerm?: string) => {
    const term = (overrideTerm !== undefined ? overrideTerm : poSearchInput).trim();
    if (!term) {
      setSearchedPoData(null);
      setSearchError(null);
      return;
    }
    setIsSearchingPo(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/purchase-orders/audit/${encodeURIComponent(term)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSearchedPoData(json.data);
      } else {
        // Fallback: check locally in initialPurchaseOrders
        const found = initialPurchaseOrders.find(
          p => p.poNumber.toLowerCase() === term.toLowerCase() || p.id.toLowerCase() === term.toLowerCase() || p.poNumber.toLowerCase().includes(term.toLowerCase())
        );
        if (found) {
          const res2 = await fetch(`/api/purchase-orders/audit/${encodeURIComponent(found.poNumber)}`);
          const json2 = await res2.json();
          if (json2.success && json2.data) {
            setSearchedPoData(json2.data);
            return;
          }
        }
        setSearchedPoData(null);
        setSearchError(json.reason || `Purchase Order "${term}" not found.`);
        toast.error(`Purchase Order "${term}" not found.`);
      }
    } catch (e: any) {
      setSearchError("Failed to search Purchase Order.");
      toast.error("Failed to load Purchase Order details.");
    } finally {
      setIsSearchingPo(false);
    }
  }, [poSearchInput, initialPurchaseOrders]);

  const handleClearSearch = () => {
    setPoSearchInput("");
    setSearchedPoData(null);
    setSearchError(null);
  };

  const [newPoNumber, setNewPoNumber] = useState("");
  const [poLookupLoading, setPoLookupLoading] = useState(false);
  const [poLookupFound, setPoLookupFound] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedBranchCode, setSelectedBranchCode] = useState("HYD-HQ");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  // Vendor auto-fill state
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorDetails, setVendorDetails] = useState<{
    name: string; contactPerson: string; email: string; phone: string; address: string; gstNumber: string;
  } | null>(null);
  const [vendorLoading, setVendorLoading] = useState(false);

  // Order items with unit prices
  const [orderItems, setOrderItems] = useState<{ sku: string; quantity: number; unitPrice: number; priceLoading: boolean }[]>([
    { sku: products[0]?.sku || "", quantity: 1, unitPrice: 0, priceLoading: false }
  ]);
  const [createLoading, setCreateLoading] = useState(false);
  const [crmSyncing, setCrmSyncing] = useState(false);

  // Computed total amount
  const totalAmount = useMemo(() =>
    orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  [orderItems]);

  // Filter customers for dropdown
  const customers = useMemo(() => users.filter(u => u.roleId === "CUSTOMER"), [users]);

  // Internal staff roles that can manage / verify POs
  const effectiveRole = activeRole || (typeof activeUser?.role === 'string' ? activeUser.role : (activeUser as any)?.role?.name) || (activeUser as any)?.roleId || "";
  const isStaff = [
    "SUPER_ADMIN",
    "ADMIN",
    "DIRECTOR_OPERATIONS",
    "OPERATIONS_MANAGER",
    "ASSISTANT_MANAGER",
    "OPERATIONS_EXECUTIVE",
    "EMPLOYEE",
    "BRANCH_MANAGER",
    "SALES_HEAD",
    "REGIONAL_SALES_MANAGER",
    "SALES_MANAGER",
    "SALES_EXECUTIVE"
  ].includes(effectiveRole);

  const canVerify = isStaff;

  // Management & Operations staff authorized to approve POs
  const canApprove = [
    "SUPER_ADMIN",
    "ADMIN",
    "DIRECTOR_OPERATIONS",
    "OPERATIONS_MANAGER",
    "ASSISTANT_MANAGER",
    "OPERATIONS_EXECUTIVE",
    "BRANCH_MANAGER",
    "SALES_HEAD",
    "REGIONAL_SALES_MANAGER"
  ].includes(effectiveRole);

  const isCustomer = effectiveRole === "CUSTOMER";

  // Apply Role-Based Data Isolation
  const filteredPurchaseOrders = useMemo(() => {
    return initialPurchaseOrders.filter(po => {
      // 1. Customer role isolation: see own POs
      if (isCustomer) {
        return (
          po.customerId === activeUser?.id ||
          po.customerName?.toLowerCase() === activeUser?.name?.toLowerCase() ||
          po.companyName?.toLowerCase() === activeUser?.companyName?.toLowerCase() ||
          po.customerEmail?.toLowerCase() === activeUser?.email?.toLowerCase() ||
          (activeUser?.email && po.email && po.email.toLowerCase() === activeUser.email.toLowerCase())
        );
      }

      // 2. Branch filters for staff
      const matchesBranch = branchFilter === "All" || po.branchCode === branchFilter;
      
      // 3. Status filter
      const matchesStatus = statusFilter === "All" || po.verificationStatus === statusFilter;
      
      // 4. Search filter
      const matchesSearch = po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            po.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (po.companyName || "").toLowerCase().includes(searchQuery.toLowerCase());

      return matchesBranch && matchesSearch && matchesStatus;
    });
  }, [initialPurchaseOrders, isCustomer, activeUser, branchFilter, searchQuery, statusFilter]);

  // Handle PO Number auto-lookup
  const handlePoNumberLookup = useCallback(async () => {
    if (!newPoNumber.trim() || newPoNumber.length < 3) return;
    setPoLookupLoading(true);
    try {
      const result = await lookupPurchaseOrderByNumberAction(newPoNumber.trim());
      if (result.found && result.po) {
        const po = result.po;
        setSelectedCustomerId(po.customerId || "");
        setCustomerName(po.customerName || "");
        setCompanyName(po.companyName || "");
        setSelectedBranchCode(po.branchCode || "HYD-HQ");
        setExpectedDelivery(po.expectedDelivery ? new Date(po.expectedDelivery).toISOString().split("T")[0] : "");
        if (po.items && po.items.length > 0) {
          setOrderItems(po.items.map((i: any) => ({ ...i, unitPrice: 0, priceLoading: false })));
        }
        setPoLookupFound(true);
        toast.success("PO found! Fields auto-populated from database.");
      } else {
        setPoLookupFound(false);
      }
    } catch (err) {
      setPoLookupFound(false);
    } finally {
      setPoLookupLoading(false);
    }
  }, [newPoNumber]);

  // Handle vendor selection auto-fill
  const handleVendorSelect = useCallback(async (vendorId: string) => {
    setSelectedVendorId(vendorId);
    if (!vendorId) { setVendorDetails(null); return; }
    setVendorLoading(true);
    try {
      const vendor = vendors.find((v: any) => v.id === vendorId);
      if (vendor) {
        setVendorDetails({
          name: vendor.name,
          contactPerson: vendor.contactPerson || "",
          email: vendor.email || "",
          phone: vendor.phone || "",
          address: vendor.address || "",
          gstNumber: vendor.gstNumber || ""
        });
      }
    } finally {
      setVendorLoading(false);
    }
  }, [vendors]);

  // Auto-fetch unit price when SKU or branch changes
  const handleSkuChange = useCallback(async (index: number, sku: string) => {
    setOrderItems(prev => prev.map((item, idx) =>
      idx === index ? { ...item, sku, priceLoading: true, unitPrice: 0 } : item
    ));
    try {
      const res = await getProductPriceAction(sku, selectedBranchCode);
      setOrderItems(prev => prev.map((item, idx) =>
        idx === index ? { ...item, unitPrice: res.unitPrice || 0, priceLoading: false } : item
      ));
    } catch {
      setOrderItems(prev => prev.map((item, idx) =>
        idx === index ? { ...item, priceLoading: false } : item
      ));
    }
  }, [selectedBranchCode]);

  const handleVerifyStock = async (poId: string) => {
    setActionLoadingId(poId);
    try {
      const res = await verifyPurchaseOrderAction(poId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`✅ PO verified successfully! Opportunity ${res.opportunityNumber} created.`);
        if (res.warning) {
          toast.warning(res.warning, { duration: 8000 });
        }
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to verify PO");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprovePo = async (poId: string) => {
    setActionLoadingId(poId);
    try {
      const res = await approvePurchaseOrderAction(poId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`🎉 Purchase Order ${res.poNumber} has been approved and cleared!`);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to approve PO");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNumber.trim()) {
      toast.error("Please enter a PO Number");
      return;
    }
    if (!selectedCustomerId && !customerName) {
      toast.error("Please select or enter a customer");
      return;
    }

    setCreateLoading(true);
    const customer = users.find(u => u.id === selectedCustomerId);
    const resolvedCustomerName = customer?.name || customerName || "Customer";
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const itemsForSubmit = orderItems.map(({ sku, quantity, unitPrice }) => ({ sku, quantity, unitPrice }));

    try {
      const res = await createPurchaseOrderAction({
        poNumber: newPoNumber.trim(),
        customerId: selectedCustomerId,
        customerName: resolvedCustomerName,
        companyName: companyName,
        vendorId: selectedVendorId || undefined,
        totalItems,
        branchCode: selectedBranchCode,
        itemsJson: JSON.stringify(itemsForSubmit),
        expectedDelivery: expectedDelivery || undefined,
        totalAmount
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Purchase Order created and logged successfully!");
        setModalOpen(false);
        resetForm();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create PO");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setModalOpen(true);
    try {
      const res = await getNextPoNumberAction();
      if (res?.poNumber) {
        setNewPoNumber(res.poNumber);
      }
    } catch {}
  };

  const handleSyncFromCrm = async () => {
    setCrmSyncing(true);
    try {
      const res = await fetch("/api/purchase-orders/crm-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        if (data.synced > 0) {
          toast.success(`✅ Synced ${data.synced} PO(s) from CRM: ${data.syncedPOs?.join(", ")}`);
          router.refresh();
        } else {
          toast.info("All CRM POs are already in ERP — nothing to sync.");
        }
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setCrmSyncing(false);
    }
  };

  const resetForm = () => {
    setNewPoNumber("");
    setSelectedCustomerId("");
    setCustomerName("");
    setCompanyName("");
    setExpectedDelivery("");
    setPoLookupFound(false);
    setSelectedVendorId("");
    setVendorDetails(null);
    setOrderItems([{ sku: products[0]?.sku || "", quantity: 1, unitPrice: 0, priceLoading: false }]);
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, { sku: products[0]?.sku || "", quantity: 1, unitPrice: 0, priceLoading: false }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateOrderItem = (index: number, field: "sku" | "quantity", value: any) => {
    if (field === "sku") {
      handleSkuChange(index, value);
    } else {
      setOrderItems(prev => prev.map((item, idx) => {
        if (idx === index) return { ...item, [field]: value };
        return item;
      }));
    }
  };

  const getVerifyBadge = (status: string) => {
    if (status === "Verified") {
      return "bg-emerald-500 text-white font-extrabold shadow-sm";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-emerald-500/10 text-emerald-800 border-emerald-500/20";
      case "Insufficient":
      case "Shortage":
        return "bg-rose-500/10 text-rose-800 border-rose-500/20 animate-pulse";
      default:
        return "bg-stone-500/10 text-stone-700 border-stone-500/20";
    }
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200/60 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 backdrop-blur-sm"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
            <ClipboardList className="w-6 h-6 text-orange-500" />
            <span>
              {isCustomer ? "My Purchase Orders" : "PO Verification & Stock Checker"}
            </span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            {isCustomer
              ? "Track the status of your Purchase Orders and delivery information."
              : "Verify inward customer Purchase Orders and automatically reserve stock. One-click verification updates inventory and creates an Opportunity."}
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <motion.button
              onClick={handleSyncFromCrm}
              disabled={crmSyncing}
              whileHover={{ scale: crmSyncing ? 1 : 1.02, y: crmSyncing ? 0 : -1 }}
              whileTap={{ scale: 0.97 }}
              title="Pull any new POs created in CRM into ERP"
              className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {crmSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <RefreshCw className="w-4 h-4 text-orange-500" />
              )}
              <span>{crmSyncing ? "Syncing from CRM..." : "Sync from CRM"}</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Prominent Search PO Bar */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200/80 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-orange-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={poSearchInput}
              onChange={(e) => setPoSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchPO();
                }
              }}
              placeholder="Enter PO Number (e.g. PO-002)..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-xs"
            />
            {poSearchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleSearchPO()}
              disabled={isSearchingPo}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/15 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all"
            >
              {isSearchingPo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search PO</span>
            </button>
            {searchedPoData && (
              <button
                onClick={handleClearSearch}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Clear Details
              </button>
            )}
          </div>
        </div>
        {searchError && (
          <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Searched PO: Complete Details Card */}
      {searchedPoData && (
        <div className="bg-white border-2 border-orange-300 rounded-2xl shadow-lg p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Top Bar: PO info & Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <span className="font-mono text-2xl font-black text-stone-950">
                  {searchedPoData.poNumber}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-3 py-1 rounded-full border ${
                  searchedPoData.stockStatus === "STOCK ADJUSTED & ASSIGNED"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : searchedPoData.stockStatus === "ASSIGNED"
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : searchedPoData.stockStatus === "PARTIALLY ASSIGNED"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {searchedPoData.stockStatus === "STOCK ADJUSTED & ASSIGNED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : searchedPoData.stockStatus === "ASSIGNED" ? (
                    <Package className="w-4 h-4 text-teal-600" />
                  ) : searchedPoData.stockStatus === "PARTIALLY ASSIGNED" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>{searchedPoData.stockStatus}</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Created on {new Date(searchedPoData.dateReceived || Date.now()).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })} • Branch: <strong className="text-stone-800">{searchedPoData.branchCode}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Verify PO Button (works even if stock is not available) */}
              {canVerify && searchedPoData.verificationStatus !== "Verified" && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleVerifyStock(searchedPoData.id || searchedPoData.poNumber);
                    await handleSearchPO(searchedPoData.poNumber);
                  }}
                  disabled={actionLoadingId === searchedPoData.id}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Verify PO even if stock is not available"
                >
                  {actionLoadingId === searchedPoData.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Verify Stock</span>
                </button>
              )}

              {/* Approve PO Button (works even if stock is not available) */}
              {canApprove && searchedPoData.approvalStatus !== "Approved" && searchedPoData.approvalStatus !== "APPROVED" && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleApprovePo(searchedPoData.id || searchedPoData.poNumber);
                    await handleSearchPO(searchedPoData.poNumber);
                  }}
                  disabled={actionLoadingId === searchedPoData.id}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Approve PO even if stock is not available"
                >
                  {actionLoadingId === searchedPoData.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Approve PO</span>
                </button>
              )}

              {(searchedPoData.approvalStatus === "Approved" || searchedPoData.approvalStatus === "APPROVED") && (
                <span className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Approved</span>
                </span>
              )}

              {/* Go to Stock Adjustment Button */}
              {(() => {
                const firstPending = searchedPoData.lineItems?.find((i: any) => (i.pendingQty || i.remainingQty || 0) > 0) || searchedPoData.lineItems?.[0];
                const pQty = firstPending ? (firstPending.pendingQty ?? firstPending.remainingQty ?? 0) : 0;
                return (
                  <button
                    onClick={() => {
                      router.push(`/stock-movement?action=adjust&poId=${encodeURIComponent(searchedPoData.poNumber)}&sku=${encodeURIComponent(firstPending?.sku || "")}&pending=${pQty}`);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/15 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Adjust Stock</span>
                  </button>
                );
              })()}

              <button
                onClick={() => setSelectedAuditPoId(searchedPoData.poNumber)}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Printable Breakdown
              </button>
              <button
                onClick={handleClearSearch}
                className="p-2 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer"
                title="Close Details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Meta Grid: Customer, Logistics, Handlers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Customer / Company</span>
              <span className="font-extrabold text-stone-900 text-sm block mt-0.5">
                {searchedPoData.companyName || searchedPoData.customerName || "Walk-in Customer"}
              </span>
              <span className="text-stone-500 text-[11px] block mt-0.5">
                GSTIN: {searchedPoData.gstNumber || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Contact & Logistics</span>
              <span className="font-bold text-stone-800 text-xs block mt-0.5">
                {searchedPoData.primaryContactName || searchedPoData.customerName}
              </span>
              <span className="text-stone-500 text-[11px] block mt-0.5">
                {searchedPoData.email || searchedPoData.phone || "No direct phone"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Workflow Verification</span>
              <span className="font-bold text-stone-800 text-xs block mt-0.5">
                Verification: <strong className="text-stone-900">{searchedPoData.verificationStatus || "Pending"}</strong>
              </span>
              <span className="text-stone-500 text-[11px] block mt-0.5">
                Verified by: {searchedPoData.verifiedBy || "Operations Team"}
              </span>
            </div>
          </div>

          {/* Product Allocation Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-orange-500" />
                <span>Product Stock Allocation Breakdown</span>
              </h4>
              <span className="text-[11px] text-stone-400 font-semibold">
                {searchedPoData.lineItems?.length || 0} product line(s)
              </span>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="px-3.5 py-2.5">Product & SKU</th>
                    <th className="px-3.5 py-2.5 text-center">Requested</th>
                    <th className="px-3.5 py-2.5 text-center">Available at Creation</th>
                    <th className="px-3.5 py-2.5 text-center">Initially Assigned</th>
                    <th className="px-3.5 py-2.5 text-center">Additional Stock</th>
                    <th className="px-3.5 py-2.5 text-center">Assigned After Adjustment</th>
                    <th className="px-3.5 py-2.5 text-center">Total Assigned</th>
                    <th className="px-3.5 py-2.5 text-center">Pending</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {searchedPoData.lineItems?.map((item: any) => {
                    const reqQty = Number(item.requestedQty || 0);
                    const initAvail = Number(item.initialAvailableStock || 0);
                    const initAssigned = Number(item.initialAssignedQty || 0);
                    const addStock = Number(item.adjustedQty || 0);
                    const addAssigned = Number(item.adjustedQty || 0);
                    const totalAssigned = Number(item.allocatedQty || 0);
                    const pendingQty = Number(item.pendingQty ?? item.remainingQty ?? 0);

                    return (
                      <tr key={item.id || item.sku} className="hover:bg-stone-50/70">
                        <td className="px-3.5 py-3">
                          <div className="font-extrabold text-stone-900">{item.name}</div>
                          <div className="font-mono text-[10px] text-orange-650 font-bold">SKU: {item.sku}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-extrabold border border-blue-200">
                              {initAssigned} units — Assigned at PO Creation
                            </span>
                            {addAssigned > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                                {addAssigned} units — Assigned through Stock Adjustment
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-stone-900 font-mono">
                          {reqQty}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono text-stone-600 font-medium">
                          {initAvail}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono font-extrabold text-blue-700 bg-blue-50/40">
                          {initAssigned}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono text-stone-700">
                          {addStock > 0 ? `+${addStock}` : "0"}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                          {addAssigned > 0 ? `+${addAssigned}` : "0"}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono font-black text-stone-950 text-xs">
                          {totalAssigned}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono">
                          {pendingQty > 0 ? (
                            <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {pendingQty}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-700">0</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            pendingQty === 0 && addAssigned > 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : pendingQty === 0
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : totalAssigned > 0
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {pendingQty === 0 && addAssigned > 0
                              ? "✓ STOCK ADJUSTED & ASSIGNED"
                              : pendingQty === 0
                              ? "ASSIGNED"
                              : totalAssigned > 0
                              ? "PARTIALLY ASSIGNED"
                              : "PENDING STOCK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Allocation Timeline / History */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Stock Allocation History & Audit Timeline</span>
            </h4>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
              {/* 1. Initial Creation Event */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 ring-4 ring-blue-100" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900">
                      {new Date(searchedPoData.dateReceived || Date.now()).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })} — PO Created
                    </strong>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Initial Ingestion
                    </span>
                  </div>
                  <div className="text-stone-600 text-[11px]">
                    Requested: <strong className="text-stone-900">{searchedPoData.totalRequested}</strong> • Available stock at creation: <strong className="text-stone-900">{searchedPoData.totalAvailableAtCreation}</strong> • Initially Assigned: <strong className="text-blue-700">{searchedPoData.totalInitiallyAssigned}</strong> • Pending: <strong className="text-rose-600">{searchedPoData.totalPending}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Adjustment Events */}
              {searchedPoData.allocations && searchedPoData.allocations.length > 0 ? (
                searchedPoData.allocations.map((alloc: any, idx: number) => {
                  const allocTime = alloc.created_at ? new Date(alloc.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  }) : "Recently";

                  return (
                    <div key={alloc.id || idx} className="flex items-start space-x-3 text-xs pt-3 border-t border-stone-200">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-100" />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-stone-900">{allocTime} — Stock Adjustment</strong>
                            <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {alloc.adjustment_number || "STOCK_ADJUSTMENT"}
                            </span>
                          </div>
                          {alloc.adjusted_by && (
                            <span className="text-[10px] text-stone-400 font-medium">By {alloc.adjusted_by}</span>
                          )}
                        </div>
                        <div className="text-stone-600 text-[11px]">
                          Stock added & allocated: <strong className="text-emerald-700">+{alloc.allocated_quantity} units</strong> • Product: <strong className="font-mono text-stone-900">{alloc.sku}</strong> • Reason: <span className="italic">{alloc.adjustment_reason || "Stock allocated for customer PO"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-stone-400 text-xs italic pl-5">
                  No subsequent stock adjustments recorded yet for this Purchase Order.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters (only for Staff roles) */}
      {isStaff && (
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search PO Number, Customer, or Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 text-stone-850 animate-fade-in"
            />
          </div>

          <div className="flex items-center space-x-2 bg-stone-50 px-3 py-1.5 border border-stone-250 rounded-lg min-w-[180px]">
            <Building className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 text-stone-700 font-semibold cursor-pointer w-full"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-stone-50 px-3 py-1.5 border border-stone-250 rounded-lg min-w-[160px]">
            <ShieldCheck className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 text-stone-700 font-semibold cursor-pointer w-full"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>
      )}

      {/* Summary Stats (Staff only) */}
      {isStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total POs", value: filteredPurchaseOrders.length, color: "orange", icon: ClipboardList },
            { 
              label: "Pending Stock", 
              value: filteredPurchaseOrders.filter(po => 
                po.stockStatus === "PENDING_STOCK" || po.stockStatus === "PENDING STOCK" || po.stockStatus === "Insufficient" || (po.poItems && po.poItems.some((i: any) => (i.remainingQuantity || 0) > 0))
              ).length, 
              color: "rose", 
              icon: AlertTriangle 
            },
            { 
              label: "Adjusted & Assigned", 
              value: filteredPurchaseOrders.filter(po => 
                po.stockStatus === "STOCK ADJUSTED & ASSIGNED" || po.stockStatus === "Stock Adjusted"
              ).length, 
              color: "emerald", 
              icon: CheckCircle2 
            },
            { 
              label: "Fully Assigned", 
              value: filteredPurchaseOrders.filter(po => 
                po.stockStatus === "ASSIGNED" || po.stockStatus === "Available"
              ).length, 
              color: "teal", 
              icon: Package 
            }
          ].map(stat => (
            <div key={stat.label} className={`bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg bg-${stat.color}-50 flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
              </div>
              <div>
                <div className="text-lg font-black text-stone-900">{stat.value}</div>
                <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main PO Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card overflow-x-auto rounded-2xl"
      >
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-200 text-[10px]">
            <tr>
              <th className="px-5 py-3">PO Number</th>
              <th className="px-5 py-3">Customer</th>
              {isStaff && <th className="px-5 py-3">Company</th>}
              <th className="px-5 py-3">Products</th>
              <th className="px-3 py-3 text-center">Requested</th>
              <th className="px-3 py-3 text-center">Assigned</th>
              <th className="px-3 py-3 text-center">Pending</th>
              <th className="px-5 py-3">Order Date</th>
              <th className="px-5 py-3 text-center">Stock Status</th>
              <th className="px-5 py-3 text-center">Verification</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredPurchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 11 : 8} className="px-6 py-16 text-center text-stone-400 italic">
                  <div className="flex flex-col items-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-stone-300" />
                    <span>
                      {isCustomer
                        ? "No Purchase Orders found for your account."
                        : "No Purchase Orders found. Create one to begin verification."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchaseOrders.map((po, idx) => {
                const isLoading = actionLoadingId === po.id;
                const isVerified = po.verificationStatus === "Verified";
                const isApproved = po.approvalStatus === "Approved" || po.approvalStatus === "APPROVED";
                
                const poItems = po.poItems || [];
                let items: { sku: string; quantity: number }[] = [];
                try { items = JSON.parse(po.itemsJson || "[]"); } catch {}
                
                // Compute requested, assigned, pending quantities
                let requestedQty = 0;
                let assignedQty = 0;
                let pendingQty = 0;

                if (poItems.length > 0) {
                  for (const pi of poItems) {
                    const req = Number(pi.quantity || 1);
                    const alloc = Number(pi.allocatedQuantity || 0);
                    const rem = Number(pi.remainingQuantity ?? Math.max(0, req - alloc));
                    requestedQty += req;
                    assignedQty += alloc;
                    pendingQty += rem;
                  }
                } else if (items.length > 0) {
                  requestedQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
                  if (po.stockStatus === "ASSIGNED" || po.stockStatus === "STOCK ADJUSTED & ASSIGNED" || po.stockStatus === "Stock Adjusted" || po.stockStatus === "Available") {
                    assignedQty = requestedQty;
                    pendingQty = 0;
                  } else {
                    assignedQty = 0;
                    pendingQty = requestedQty;
                  }
                }

                return (
                  <tr key={po.id} className="table-row-hover animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}>
                    <td className="px-5 py-4 font-mono font-black text-orange-655 text-sm">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedAuditPoId(po.id)}
                          className="font-black text-left text-orange-655 hover:underline hover:text-orange-700 cursor-pointer transition-colors focus:outline-none"
                          title="Click to view Customer Order, Discounts, Stock Allocation & Printable PDF"
                        >
                          {po.poNumber}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPoSearchInput(po.poNumber);
                            handleSearchPO(po.poNumber);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Inspect Allocation Details above"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-stone-900">{po.customerName}</div>
                      {isStaff && <div className="text-[10px] text-stone-400 mt-0.5">ID: {po.customerId?.substring(0, 12)}...</div>}
                    </td>
                    {isStaff && (
                      <td className="px-5 py-4 text-stone-600 text-xs font-medium">
                        {po.companyName || <span className="text-stone-300 italic">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        {(poItems.length > 0 ? poItems : items).slice(0, 2).map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="font-mono text-[10px] text-stone-600">{item.sku}</span>
                          </div>
                        ))}
                        {(poItems.length > 0 ? poItems : items).length > 2 && (
                          <span className="text-[10px] text-stone-400">+{(poItems.length > 0 ? poItems : items).length - 2} more</span>
                        )}
                      </div>
                    </td>

                    {/* Requested Qty */}
                    <td className="px-3 py-4 text-center font-extrabold text-stone-900 text-xs">
                      {requestedQty}
                    </td>

                    {/* Assigned Qty */}
                    <td className="px-3 py-4 text-center font-extrabold text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                        {assignedQty}
                      </span>
                    </td>

                    {/* Pending Qty */}
                    <td className="px-3 py-4 text-center font-extrabold text-xs">
                      {pendingQty > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700">
                          {pendingQty}
                        </span>
                      ) : (
                        <span className="text-stone-400 font-mono">0</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-stone-500 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(po.dateReceived).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>

                    {/* Stock Status Column */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {(po.stockStatus === "STOCK ADJUSTED & ASSIGNED" || po.stockStatus === "Stock Adjusted") ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>✓ Stock Adjusted & Assigned</span>
                            </span>
                            {po.lastAdjustmentNumber && (
                              <span className="text-[8px] font-mono font-bold text-emerald-700 mt-0.5" title="Adjustment Reference">
                                {po.lastAdjustmentNumber}
                              </span>
                            )}
                          </div>
                        ) : (po.stockStatus === "PARTIALLY ASSIGNED / PENDING STOCK" || po.stockStatus === "Partially Stock Adjusted" || (assignedQty > 0 && pendingQty > 0)) ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Partially Assigned</span>
                            </span>
                            <span className="text-[8px] font-bold text-amber-700 mt-0.5">
                              {pendingQty} Pending
                            </span>
                          </div>
                        ) : (po.stockStatus === "ASSIGNED" || po.stockStatus === "Available" || (requestedQty > 0 && assignedQty === requestedQty)) ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>ASSIGNED</span>
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>PENDING STOCK</span>
                            </span>
                            {pendingQty > 0 && (
                              <span className="text-[8px] font-bold text-rose-700 mt-0.5">
                                {pendingQty} Shortage
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Verification Status Column */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300" title={po.verifiedBy ? `Verified by ${po.verifiedBy} on ${po.verifiedDate ? new Date(po.verifiedDate).toLocaleString() : ''}` : 'Verified'}>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        )}
                        {po.verifiedBy && (
                          <span className="text-[8px] text-stone-400 font-medium truncate max-w-[100px]" title={`Verified by ${po.verifiedBy}`}>
                            By: {po.verifiedBy}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* 1. VERIFY BUTTON: shown when verification is Pending */}
                        {canVerify && !isVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyStock(po.id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-[11px] text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Verify stock availability against current ERP inventory"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Verify</span>
                          </button>
                        )}

                        {/* 2. APPROVE BUTTON: shown when Approval is Pending (works whether stock is available or not) */}
                        {canApprove && !isApproved && (
                          <button
                            type="button"
                            onClick={() => handleApprovePo(po.id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-[11px] text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Approve Purchase Order (clears even if stock is not available)"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Approve</span>
                          </button>
                        )}

                        {/* 3. APPROVED BADGE: shown when Approved */}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>APPROVED</span>
                          </span>
                        )}

                        {/* 4. RE-VERIFY ACTION: optional button to re-run check if stock changed */}
                        {canVerify && isVerified && !isApproved && (
                          <button
                            type="button"
                            onClick={() => handleVerifyStock(po.id)}
                            disabled={isLoading}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Re-verify stock"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                          </button>
                        )}

                        {/* 5. ADJUST BUTTON: when pending stock exists */}
                        {pendingQty > 0 && (
                          <Link
                            href={`/stock-movement?action=adjust&poId=${encodeURIComponent(po.id)}&sku=${encodeURIComponent(poItems[0]?.sku || items[0]?.sku || "")}&pending=${encodeURIComponent(pendingQty)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer shadow-xs"
                            title="Adjust Stock for this PO"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                            <span>Adjust</span>
                          </Link>
                        )}

                        {/* 6. VIEW BUTTON: always available */}
                        <button
                          type="button"
                          onClick={() => setSelectedAuditPoId(po.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer"
                          title="View Details, Pricing, & Print"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Create Purchase Order Modal */}
      <AnimatedModal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}>
          <div className="bg-white/95 backdrop-blur-xl border border-[#fed7aa]/70 p-6 rounded-2xl shadow-xl w-full relative space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                <span className="font-extrabold text-sm text-stone-900 font-outfit">New Purchase Order</span>
              </div>
              <button 
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              {/* PO Number with auto-lookup */}
              <div>
                <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">
                  PO Number <span className="text-orange-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-2026-99"
                    value={newPoNumber}
                    onChange={(e) => { setNewPoNumber(e.target.value); setPoLookupFound(false); }}
                    onBlur={handlePoNumberLookup}
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  />
                  <button
                    type="button"
                    onClick={handlePoNumberLookup}
                    disabled={poLookupLoading || !newPoNumber.trim()}
                    className="px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {poLookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">Auto-fill</span>
                  </button>
                </div>
                {poLookupFound && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-emerald-600 font-semibold text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PO found — all fields auto-populated from database
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-555 uppercase tracking-wider mb-1">Customer</label>
                  <SearchableDropdown
                    options={customers.map(c => ({
                      value: c.id,
                      label: `${c.customerId ? `[${c.customerId}] ` : ""}${c.name} ${c.companyName ? `(${c.companyName})` : `(${c.email})`}`
                    }))}
                    value={selectedCustomerId}
                    onChange={(val) => {
                      setSelectedCustomerId(val);
                      const c = customers.find(cu => cu.id === val);
                      if (c) {
                        setCustomerName(c.name);
                        setCompanyName(c.companyName || c.name);
                        
                        // Auto-fill branch
                        if (c.branchId) {
                          const br = branches.find(b => b.id === c.branchId || b.name === c.branchId);
                          if (br) {
                            setSelectedBranchCode(br.id);
                          }
                        } else if (c.assignedEmployee && c.assignedEmployee.branchCode) {
                          setSelectedBranchCode(c.assignedEmployee.branchCode);
                        }
                      }
                    }}
                    placeholder="Search Customer ID or Name..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Branch / Location</label>
                  <select
                    required
                    value={selectedBranchCode}
                    onChange={(e) => setSelectedBranchCode(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  />
                </div>
              </div>

              {/* Auto-filled Customer Summary Card */}
              {selectedCustomerId && (() => {
                const sel = customers.find(c => c.id === selectedCustomerId);
                if (!sel) return null;
                return (
                  <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-[10px] text-stone-600 space-y-1">
                    <div className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-0.5">Auto-Filled Customer Profile</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <div><span className="font-bold text-stone-400">ID:</span> {sel.customerId || "—"}</div>
                      <div><span className="font-bold text-stone-400">Company:</span> {sel.companyName || sel.name}</div>
                      <div><span className="font-bold text-stone-400">GST:</span> {sel.gstNumber || "—"}</div>
                      <div><span className="font-bold text-stone-400">Phone:</span> {sel.phone || "—"}</div>
                      <div><span className="font-bold text-stone-400">Email:</span> {sel.email}</div>
                      <div><span className="font-bold text-stone-400">Address:</span> {sel.address || "—"}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Vendor Section */}
              <div className="border-t border-stone-100 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-stone-550 uppercase tracking-wider block">Vendor (Optional)</span>
                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                >
                  <option value="">No Vendor / Walk-in</option>
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>

                {/* Vendor auto-fill card */}
                {vendorLoading && (
                  <div className="flex items-center gap-2 text-stone-400 text-[10px]"><Loader2 className="w-3 h-3 animate-spin" /> Loading vendor details...</div>
                )}
                {vendorDetails && !vendorLoading && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-xl p-3 space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-700 mb-2">
                      <Store className="w-3 h-3" />
                      Auto-filled Vendor Details
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
                        <UserCheck className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="font-semibold">{vendorDetails.contactPerson || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
                        <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{vendorDetails.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
                        <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{vendorDetails.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
                        <Hash className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="font-mono">{vendorDetails.gstNumber || "—"}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[10px] text-stone-600 col-span-2">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                        <span>{vendorDetails.address || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-550 uppercase tracking-wider">Order Items</span>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <select
                          value={item.sku}
                          onChange={(e) => updateOrderItem(index, "sku", e.target.value)}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                        >
                          {products.map(p => (
                            <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-16">
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850 text-center font-bold"
                        />
                      </div>

                      {/* Unit Price auto-fill display */}
                      <div className="w-24 flex items-center gap-1 px-2 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-lg">
                        {item.priceLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                        ) : (
                          <BadgeIndianRupee className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                        <span className="text-[10px] font-bold text-emerald-700">
                          {item.priceLoading ? "..." : item.unitPrice ? item.unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"}
                        </span>
                      </div>

                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="p-1 hover:bg-stone-150 text-rose-500 rounded cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Running Total Amount */}
                {totalAmount > 0 && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Estimated Total</span>
                    <span className="text-sm font-black text-orange-600">
                      ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
      </AnimatedModal>

      {/* Real-time PO Audit & Printable PDF Modal */}
      <AnimatedModal open={!!selectedAuditPoId} onClose={() => setSelectedAuditPoId(null)}>
        <div className="bg-white/95 backdrop-blur-xl border border-orange-200/70 p-6 rounded-2xl shadow-xl w-full max-w-4xl relative animate-scale-in">
          {selectedAuditPoId && (
            <PODetailsModal 
              poIdentifier={selectedAuditPoId} 
              onClose={() => {
                setSelectedAuditPoId(null);
                router.refresh();
              }} 
            />
          )}
        </div>
      </AnimatedModal>
    </div>
  );
}
