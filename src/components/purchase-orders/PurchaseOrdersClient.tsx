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
  RefreshCw
} from "lucide-react";
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

  const isStaff = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"].includes(activeRole);
  const isCustomer = activeRole === "CUSTOMER";

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
            <motion.button
              onClick={handleOpenCreateModal}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/15 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </motion.button>
          </div>
        )}
      </motion.div>

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
            { label: "Pending", value: filteredPurchaseOrders.filter(po => po.verificationStatus === "Pending").length, color: "amber", icon: Clock },
            { label: "Verified", value: filteredPurchaseOrders.filter(po => po.verificationStatus === "Verified").length, color: "emerald", icon: CheckCircle2 },
            { label: "Stock Issues", value: filteredPurchaseOrders.filter(po => po.stockStatus === "Insufficient").length, color: "rose", icon: AlertTriangle }
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
              <th className="px-5 py-3 text-center">Qty</th>
              <th className="px-5 py-3">Order Date</th>
              {isStaff && <th className="px-5 py-3">Expected Delivery</th>}
              <th className="px-5 py-3 text-center">Status</th>
              {isStaff && <th className="px-5 py-3 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredPurchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 9 : 6} className="px-6 py-16 text-center text-stone-400 italic">
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
                let items: { sku: string; quantity: number }[] = [];
                try { items = JSON.parse(po.itemsJson || "[]"); } catch {}
                const totalQty = items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <tr key={po.id} className="table-row-hover animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}>
                    <td className="px-5 py-4 font-mono font-black text-orange-655 text-sm">
                      <button
                        onClick={() => setSelectedAuditPoId(po.id)}
                        className="font-black text-left text-orange-655 hover:underline hover:text-orange-700 cursor-pointer transition-colors focus:outline-none"
                        title="Click to view Customer Order, Discounts, Stock Allocation & Printable PDF"
                      >
                        {po.poNumber}
                      </button>
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
                        {items.slice(0, 2).map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="font-mono text-[10px] text-stone-600">{item.sku}</span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <span className="text-[10px] text-stone-400">+{items.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-extrabold text-stone-800">{totalQty}</td>
                    <td className="px-5 py-4 text-stone-500 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(po.dateReceived).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>
                    {isStaff && (
                      <td className="px-5 py-4 text-stone-500 font-medium">
                        {po.expectedDelivery ? (
                          <div className="flex items-center space-x-1.5">
                            <Truck className="w-3.5 h-3.5 text-orange-400" />
                            <span>{new Date(po.expectedDelivery).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          <span className="text-stone-300 italic text-[10px]">Not set</span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getVerifyBadge(po.verificationStatus)}`}>
                          {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Verify: {po.verificationStatus}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          Approve: {po.approvalStatus || 'Pending Approval'}
                        </span>
                      </div>
                    </td>
                    {isStaff && (
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyStock(po.id)}
                            disabled={isLoading || isVerified}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold text-[11px] transition-all cursor-pointer shadow-sm ${
                              isVerified
                                ? "bg-emerald-700 text-white border border-emerald-800 opacity-90 cursor-default"
                                : "bg-[#8c3120] hover:bg-[#742718] text-white hover:shadow-md active:scale-95"
                            } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                            style={{ color: "#ffffff", backgroundColor: isVerified ? "#047857" : "#8c3120" }}
                            title={isVerified ? "Already Verified" : "Verify Stock Availability"}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            ) : isVerified ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                <span>Verify</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprovePo(po.id)}
                            disabled={isLoading || (po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold text-[11px] transition-all cursor-pointer shadow-sm ${
                              (po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED')
                                ? "bg-emerald-700 text-white border border-emerald-800 opacity-90 cursor-default"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md active:scale-95"
                            } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                            style={{ color: "#ffffff", backgroundColor: (po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED') ? "#047857" : "#059669" }}
                            title={(po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED') ? "Already Approved" : "Approve Purchase Order"}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            ) : (po.approvalStatus === 'Approved' || po.approvalStatus === 'APPROVED') ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Approved</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-white" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    )}
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
