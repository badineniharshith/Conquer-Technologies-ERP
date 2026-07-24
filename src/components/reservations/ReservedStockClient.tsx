"use client";

import { useEffect, useState } from "react";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import { 
  purchaseReservedStockAction, 
  checkAndExpireReservationsAction, 
  cancelReservationAction,
  acceptReservationAction,
  rejectReservationAction,
  createReservationAction,
  updateReservationAction,
  verifyModifiedReservationAction,
  verifyReservationAction,
  processReservationAction
} from "@/app/actions";
import { toast } from "sonner";
import { 
  Boxes, 
  Calendar, 
  Clock, 
  Tag, 
  MapPin, 
  AlertTriangle, 
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  PlusCircle,
  User,
  FileText,
  Edit2,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface ReservedStockClientProps {
  reservations: any[];
  currentUser: any;
  customers?: any[];
  products?: any[];
  inventory?: any[];
  branches?: any[];
}

export default function ReservedStockClient({
  reservations,
  currentUser,
  customers = [],
  products = [],
  inventory = [],
  branches = []
}: ReservedStockClientProps) {
  const router = useRouter();
  const [loadingResId, setLoadingResId] = useState<string | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Reservation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<Array<{ productId: string; sku: string; quantity: number }>>([]);
  const [tempSku, setTempSku] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [notes, setNotes] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [createStatus, setCreateStatus] = useState<"Draft" | "Pending Verification">("Pending Verification");

  // Edit Reservation Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const isCustomer = currentUser.role === "CUSTOMER";

  // Filter active customers based on text input - supports Customer ID, Name, Company, Email
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.customerId?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Lock page scrolling when create reservation modal is open
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal]);

  // Update current time every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger expiry check on page load
  useEffect(() => {
    const triggerExpiryCheck = async () => {
      try {
        const result = await checkAndExpireReservationsAction();
        if (result.success && result.expiredCount > 0) {
          toast.info(`${result.expiredCount} expired stock reservation(s) released back to inventory.`);
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to run reservation expiry check:", err);
      }
    };
    triggerExpiryCheck();
  }, [router]);

  // For Employee/Customer: get branches that have stock details
  const availableBranchesForProduct = tempSku
    ? (isCustomer 
        ? inventory.filter(i => i.sku === tempSku)
        : inventory.filter(i => i.sku === tempSku && (i.quantity - i.reservedQty) > 0)
      )
    : [];

  const selectedBranchStock = tempSku && selectedBranchCode
    ? (() => {
        const item = inventory.find(i => i.sku === tempSku && i.branchCode === selectedBranchCode);
        if (!item) return 0;
        return Math.max(0, item.quantity - item.reservedQty);
      })()
    : 0;

  // Auto-select first branch when tempSku changes
  useEffect(() => {
    if (tempSku && !selectedBranchCode) {
      if (availableBranchesForProduct.length > 0) {
        setSelectedBranchCode(availableBranchesForProduct[0].branchCode);
      }
    }
  }, [tempSku]);

  const handlePurchase = async (reservationId: string) => {
    setLoadingResId(reservationId);
    try {
      const res = await purchaseReservedStockAction(reservationId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation successfully checked out! Stock converted to completed purchase order.");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete purchase.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleAccept = async (reservationId: string) => {
    if (!confirm("Are you sure you want to accept this reservation? The reserved stock will be permanently allocated.")) return;
    setLoadingResId(reservationId);
    try {
      const res = await acceptReservationAction(reservationId, currentUser.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation accepted and stock allocated successfully!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept reservation.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleReject = async (reservationId: string) => {
    if (!confirm("Are you sure you want to reject this reservation? The reserved stock will be released back to available inventory.")) return;
    setLoadingResId(reservationId);
    try {
      const res = await rejectReservationAction(reservationId, currentUser.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation rejected and stock released successfully.");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reject reservation.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation? The reserved stock will be released back to available inventory.")) return;
    setCancellingResId(reservationId);
    try {
      const res = await cancelReservationAction(reservationId, currentUser.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation cancelled. Stock released back to available inventory.");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel reservation.");
    } finally {
      setCancellingResId(null);
    }
  };

  const handleVerifyAccept = async (resId: string) => {
    if (!confirm("Approve customer changes and allocate stock for this reservation?")) return;
    setLoadingResId(resId);
    try {
      const res = await verifyModifiedReservationAction(resId, "ACCEPT");
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation changes verified and accepted!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify changes.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleVerifyReject = async (resId: string) => {
    if (!confirm("Reject customer changes and cancel this reservation?")) return;
    setLoadingResId(resId);
    try {
      const res = await verifyModifiedReservationAction(resId, "REJECT");
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation changes rejected and cancelled.");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reject changes.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleVerify = async (reservationId: string) => {
    if (!confirm("Are you sure you want to verify this reservation?")) return;
    setLoadingResId(reservationId);
    try {
      const res = await verifyReservationAction(reservationId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation verified successfully!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify reservation.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleProcess = async (reservationId: string) => {
    if (!confirm("Start processing this reservation?")) return;
    setLoadingResId(reservationId);
    try {
      const res = await processReservationAction(reservationId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation moved to processing!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start processing.");
    } finally {
      setLoadingResId(null);
    }
  };

  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleSubmitVerification = async (res: any) => {
    setLoadingResId(res.id);
    try {
      const items = res.items || [];
      const result = await updateReservationAction({
        reservationId: res.id,
        items: items.map((it: any) => ({ productId: it.productId, quantity: it.quantity })),
        expiresAt: res.expiresAt,
        notes: res.notes || undefined
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Reservation submitted for verification successfully!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit reservation.");
    } finally {
      setLoadingResId(null);
    }
  };

  const handleOpenEditModal = (res: any) => {
    setEditingRes(res);
    setSelectedBranchCode(res.branchCode);
    const expDate = new Date(res.expiresAt);
    const tzOffset = expDate.getTimezoneOffset() * 60000;
    const localExpDate = new Date(expDate.getTime() - tzOffset);
    setEditExpiresAt(localExpDate.toISOString().slice(0, 16));
    setEditNotes(res.notes || "");
    
    // Populate multi-product list
    const items = res.items || [];
    if (items.length > 0) {
      setSelectedItems(items.map((it: any) => ({
        productId: it.productId,
        sku: it.sku,
        quantity: it.quantity
      })));
    } else if (res.productId) {
      setSelectedItems([{
        productId: res.productId,
        sku: res.sku,
        quantity: res.quantity
      }]);
    } else {
      setSelectedItems([]);
    }
    
    setShowEditModal(true);
  };

  const handleEditReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRes || selectedItems.length === 0 || !editExpiresAt) {
      toast.error("Please fill in all required fields and add at least one product.");
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateReservationAction({
        reservationId: editingRes.id,
        items: selectedItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
        expiresAt: editExpiresAt,
        notes: editNotes
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation updated successfully! Awaiting staff verification.");
        setShowEditModal(false);
        setEditingRes(null);
        setSelectedItems([]);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update reservation.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomerId = isCustomer ? currentUser.id : selectedCustomerId;
    if (!finalCustomerId || selectedItems.length === 0 || !selectedBranchCode) {
      toast.error("Please fill in all required fields and add at least one product.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await createReservationAction({
        items: selectedItems.map(it => ({ productId: it.productId, quantity: it.quantity })),
        customerId: finalCustomerId,
        branchCode: selectedBranchCode,
        notes,
        employeeId: isCustomer ? undefined : currentUser.id,
        deadlineDays: isCustomer ? undefined : deadlineDays,
        status: createStatus
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        const successMsg = isCustomer 
          ? "Stock reservation submitted successfully!"
          : "Stock reservation submitted successfully (Pending Customer acceptance)!";
        toast.success(successMsg);
        setShowCreateModal(false);
        // Reset states
        setSelectedCustomerId("");
        setCustomerSearch("");
        setSelectedItems([]);
        setSelectedBranchCode("");
        setNotes("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create reservation.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Helper to format remaining time
  const getRemainingTime = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const diffMs = expiry.getTime() - currentTime.getTime();

    if (diffMs <= 0) {
      return { expired: true, text: "Expired" };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text = "";
    if (diffDays > 0) {
      text += `${diffDays}d `;
    }
    text += `${diffHours}h ${diffMins}m`;

    return { expired: false, text, days: diffDays };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "PENDING":
      case "Pending Verification":
        return "bg-amber-50 text-amber-700 border-amber-250 font-bold";
      case "Draft":
        return "bg-stone-50 text-stone-500 border-stone-300 font-bold";
      case "Verified":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
      case "Pending Customer Approval":
        return "bg-indigo-50 text-indigo-750 border-indigo-250 font-bold";
      case "Modified by Customer (Pending Verification)":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "ACCEPTED":
      case "Accepted":
        return "bg-emerald-50 text-emerald-700 border-emerald-250 font-extrabold";
      case "Processing":
        return "bg-blue-50 text-blue-700 border-blue-205 font-bold animate-pulse";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold";
      case "EXPIRED":
        return "bg-red-50 text-red-750 border-red-200 font-semibold";
      case "COMPLETED":
      case "Completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-350 font-semibold";
      case "CANCELLED":
      case "Cancelled":
        return "bg-stone-100 text-stone-500 border-stone-300 font-semibold";
      default:
        return "bg-stone-50 text-stone-750 border-stone-200";
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      // 1. Search name/SKU/Number match
      const customerName = res.user?.name || "";
      const productName = res.product?.name || "";
      const matchesSearch = 
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (res.reservationNumber || "").toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status match
      let matchesStatus = true;
      if (statusFilter === "PENDING") {
        matchesStatus = ["PENDING", "Pending Verification", "Pending Customer Approval", "Modified by Customer (Pending Verification)", "Draft"].includes(res.status);
      } else if (statusFilter === "SUCCESSFUL") {
        matchesStatus = ["ACCEPTED", "Accepted", "Verified", "Processing", "COMPLETED", "Completed", "ACTIVE"].includes(res.status);
      } else if (statusFilter === "CANCELLED") {
        matchesStatus = ["CANCELLED", "Cancelled", "REJECTED", "EXPIRED"].includes(res.status);
      }

      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  const activeReservations = filteredReservations.filter(r => 
    ["ACTIVE", "PENDING", "ACCEPTED", "Accepted", "Verified", "Processing", "Pending Verification", "Modified by Customer (Pending Verification)", "Pending Customer Approval", "Draft"].includes(r.status)
  );
  
  const inactiveReservations = filteredReservations.filter(r => 
    !["ACTIVE", "PENDING", "ACCEPTED", "Accepted", "Verified", "Processing", "Pending Verification", "Modified by Customer (Pending Verification)", "Pending Customer Approval", "Draft"].includes(r.status)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
            <Boxes className="w-6 h-6 text-orange-500" />
            <span>{isCustomer ? "My Reserved Stock" : "Customer Stock Reservations"}</span>
          </h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            {isCustomer 
              ? "Review, accept, or reject stock reservations locked for your business procurement." 
              : "Manage and submit temporary inventory locks on behalf of your assigned customers."
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              setShowCreateModal(true);
              if (isCustomer) {
                setSelectedCustomerId(currentUser.id);
              }
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-550/15 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Reservation</span>
          </button>
          <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs">
            <Clock className="w-4 h-4" />
            <span>14-Day Lock Window</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by customer name, product SKU, or reservation ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-xs font-semibold text-stone-850 transition-all duration-200 shadow-sm"
          />
        </div>

        <div className="w-full md:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-xs font-semibold text-stone-850 cursor-pointer shadow-sm transition-all duration-200"
          >
            <option value="ALL">All Reservation Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="SUCCESSFUL">Successful / Accepted</option>
            <option value="CANCELLED">Cancelled / Rejected / Expired</option>
          </select>
        </div>
      </div>

      {/* Active Reservations */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>Active Reservations</span>
        </h2>

        {activeReservations.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-400 italic text-xs">
            {isCustomer 
              ? "You have no pending stock reservations requiring your acceptance." 
              : "No active client reservations currently locked in the system."
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeReservations.map((res) => {
              const timer = getRemainingTime(res.expiresAt);
              const progressPercent = Math.max(0, Math.min(100, ( ( 14 * 24 * 60 * 60 * 1000 - (new Date(res.expiresAt).getTime() - currentTime.getTime()) ) / (14 * 24 * 60 * 60 * 1000) ) * 100));

              return (
                <div key={res.id} className="bg-white border border-stone-200 hover:border-orange-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
                        {res.items && res.items.length > 0 ? "Ecosystem" : (res.product?.brand || "Brand")}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </div>

                    <div>
                      {res.items && res.items.length > 0 ? (
                        <div className="space-y-1.5 bg-stone-50 border border-stone-200 rounded-xl p-2.5 max-h-32 overflow-y-auto">
                          {res.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-stone-850">
                              <span className="truncate pr-2" title={item.product?.name || item.sku}>
                                {item.product?.name || item.sku}
                              </span>
                              <span className="text-orange-600 font-bold shrink-0 font-mono">{item.quantity} u</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-stone-850 text-xs truncate" title={res.product?.name || res.sku}>
                            {res.product?.name || res.sku}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-mono block mt-0.5">SKU: {res.sku}</span>
                        </>
                      )}
                    </div>

                    <div className="space-y-1.5 border-t border-stone-100 pt-2.5 text-xs text-stone-600">
                      {!isCustomer && (
                        <div className="flex justify-between">
                          <span className="font-medium text-stone-450">Customer:</span>
                          <span className="font-bold text-stone-900 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            {res.user?.name || "N/A"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-medium text-stone-455">Quantity Reserved:</span>
                        <span className="font-bold text-orange-600">
                          {res.items && res.items.length > 0 
                            ? `${res.items.reduce((sum: number, it: any) => sum + it.quantity, 0)} total units` 
                            : `${res.quantity} units`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-stone-450">Branch:</span>
                        <span className="flex items-center text-[10px] text-stone-500 font-semibold">
                          <MapPin className="w-3.5 h-3.5 mr-0.5 text-stone-400" />
                          {res.branchCode}
                        </span>
                      </div>
                      {res.notes && (
                        <div className="border-t border-stone-50 mt-1.5 pt-1.5">
                          <span className="text-[9px] text-stone-400 block font-semibold uppercase">Notes</span>
                          <p className="text-[10px] text-stone-500 italic mt-0.5 bg-stone-50 p-2 rounded-lg border border-stone-100 flex items-start gap-1">
                            <FileText className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                            <span>
                              {isCustomer 
                                ? (res.notes.split(" | [Shortage Warning]")[0].split("[Shortage Warning]")[0] || "No customer notes") 
                                : res.notes}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-2.5 space-y-1">
                      <span className="text-[9px] text-stone-400 block font-semibold uppercase">Reservation Period</span>
                      <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] text-stone-500 font-semibold">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-stone-400" />
                          {new Date(res.reservedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center">
                          <ArrowRight className="w-3 h-3 text-stone-300 mx-1" />
                          {new Date(res.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 space-y-1.5">
                      <div className="flex flex-wrap justify-between items-center gap-1 text-[10px] font-bold text-orange-600 uppercase">
                        <span>Time Remaining</span>
                        <span>{timer.text}</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1">
                        <div 
                          className="bg-orange-500 h-1 rounded-full transition-all"
                          style={{ width: `${100 - progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="border-t border-stone-100 pt-3 mt-3 space-y-2 text-left">
                      <span className="text-[9px] text-stone-400 block font-semibold uppercase tracking-wider">Status History & Timestamps</span>
                      <div className="space-y-1.5 pl-2 border-l border-orange-200">
                        {res.draftedAt && (
                          <div className="text-[10px] text-stone-500">
                            <span className="font-bold text-stone-850">Drafted:</span> {new Date(res.draftedAt).toLocaleString()}
                          </div>
                        )}
                        <div className="text-[10px] text-stone-500">
                          <span className="font-bold text-stone-850">Created:</span> {new Date(res.createdAt).toLocaleString()}
                        </div>
                        {res.verifiedAt && (
                          <div className="text-[10px] text-stone-500">
                            <span className="font-bold text-stone-850">Verified:</span> {new Date(res.verifiedAt).toLocaleString()}
                          </div>
                        )}
                        {res.acceptedAt && (
                          <div className="text-[10px] text-stone-500">
                            <span className="font-bold text-stone-850">Accepted:</span> {new Date(res.acceptedAt).toLocaleString()}
                          </div>
                        )}
                        {res.processingAt && (
                          <div className="text-[10px] text-stone-500">
                            <span className="font-bold text-stone-850">Processing:</span> {new Date(res.processingAt).toLocaleString()}
                          </div>
                        )}
                        {res.completedAt && (
                          <div className="text-[10px] text-stone-500">
                            <span className="font-bold text-stone-850">Completed:</span> {new Date(res.completedAt).toLocaleString()}
                          </div>
                        )}
                        {res.cancelledAt && (
                          <div className="text-[10px] text-stone-550">
                            <span className="font-bold text-stone-850">Cancelled:</span> {new Date(res.cancelledAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {isCustomer ? (
                      <div className="flex flex-col gap-2 pt-2">
                        {res.status === "Draft" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitVerification(res)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{loadingResId === res.id ? "Submitting..." : "Submit for Verification"}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(res)}
                              disabled={loadingResId !== null}
                              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingResId !== null}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {["Pending Verification", "PENDING", "Modified by Customer (Pending Verification)"].includes(res.status) && (
                          <div className="flex flex-col gap-2">
                            <div className="text-center bg-stone-50 border border-stone-200 text-stone-500 py-2.5 rounded-xl font-bold italic text-[10px]">
                              Awaiting Verification by Operations Staff...
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenEditModal(res)}
                                disabled={loadingResId !== null}
                                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-750 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                <span>Edit Details</span>
                              </button>
                              <button
                                onClick={() => handleCancel(res.id)}
                                disabled={cancellingResId !== null}
                                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {["Verified", "VERIFIED"].includes(res.status) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(res.id)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-550/15 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{loadingResId === res.id ? "Accepting..." : "Accept"}</span>
                            </button>
                            <button
                              onClick={() => handleReject(res.id)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-white hover:bg-red-50 border border-red-200 hover:border-red-400 text-red-600 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{loadingResId === res.id ? "Rejecting..." : "Reject"}</span>
                            </button>
                          </div>
                        )}

                        {["Accepted", "ACCEPTED"].includes(res.status) && (
                          <div className="flex flex-col gap-2">
                            <div className="text-center bg-orange-50 border border-orange-100 text-orange-700 py-2 rounded-xl font-bold text-[10px]">
                              Awaiting Representative to Start Processing...
                            </div>
                            <button
                              onClick={() => handlePurchase(res.id)}
                              disabled={loadingResId !== null}
                              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Boxes className="w-4 h-4 mr-1" />
                              <span>Purchase & Checkout</span>
                            </button>
                          </div>
                        )}

                        {res.status === "Processing" && (
                          <div className="flex flex-col gap-2">
                            <div className="text-center bg-indigo-50 border border-indigo-100 text-indigo-700 py-2 rounded-xl font-bold text-[10px]">
                              SCM Order is in Processing Stage
                            </div>
                            <button
                              onClick={() => handlePurchase(res.id)}
                              disabled={loadingResId !== null}
                              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Boxes className="w-4 h-4 mr-1" />
                              <span>Purchase & Checkout</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 pt-2">
                        {res.status === "Draft" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitVerification(res)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Submit for Verification</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(res)}
                              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingResId !== null}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {["Pending Verification", "PENDING", "Modified by Customer (Pending Verification)"].includes(res.status) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerify(res.id)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <ShieldCheck className="w-4 h-4 mr-1" />
                              <span>{loadingResId === res.id ? "Verifying..." : "Verify Lock"}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(res)}
                              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-750 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingResId !== null}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {["Verified", "VERIFIED"].includes(res.status) && (
                          <div className="flex flex-col gap-2">
                            <div className="text-center bg-emerald-50 border border-emerald-100 text-emerald-700 py-1.5 rounded-xl font-bold text-[10px]">
                              Verified Lock. Awaiting Customer Acceptance...
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenEditModal(res)}
                                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-750 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                <span>Adjust Details</span>
                              </button>
                              <button
                                onClick={() => handleCancel(res.id)}
                                disabled={cancellingResId !== null}
                                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                <span>Cancel Lock</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {["Accepted", "ACCEPTED"].includes(res.status) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcess(res.id)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              <span>{loadingResId === res.id ? "Processing..." : "Start Processing"}</span>
                            </button>
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingResId !== null}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {res.status === "Processing" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePurchase(res.id)}
                              disabled={loadingResId !== null}
                              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Boxes className="w-4 h-4 mr-1" />
                              <span>Purchase & Checkout</span>
                            </button>
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingResId !== null}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Previous Reservations History */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-stone-400" />
          <span>Reservation History</span>
        </h2>

        {inactiveReservations.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl py-6 text-center text-stone-400 italic text-xs">
            No reservation history logs found.
          </div>
        ) : (
          <div className="glass-panel overflow-x-auto bg-white border border-stone-200 rounded-2xl shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                  <th className="px-6 py-3">Reservation ID</th>
                  {!isCustomer && <th className="px-6 py-3">Customer</th>}
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3 text-right">Quantity</th>
                  <th className="px-6 py-3">Branch</th>
                  <th className="px-6 py-3">Reserved On</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inactiveReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-stone-500">{res.id}</td>
                    {!isCustomer && <td className="px-6 py-4 font-bold text-stone-700">{res.user?.name || "N/A"}</td>}
                    <td className="px-6 py-4 font-semibold text-stone-850">
                      {res.items && res.items.length > 0
                        ? res.items.map((item: any) => item.product?.name || item.sku).join(", ")
                        : res.product?.name || res.sku}
                    </td>
                    <td className="px-6 py-4 font-mono text-stone-500 text-[10px]">
                      {res.items && res.items.length > 0
                        ? res.items.map((item: any) => item.sku).join(", ")
                        : res.sku}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-stone-800">
                      {res.items && res.items.length > 0
                        ? `${res.items.reduce((sum: number, it: any) => sum + it.quantity, 0)} units`
                        : `${res.quantity} units`}
                    </td>
                    <td className="px-6 py-4 text-stone-500 font-medium">{res.branchCode}</td>
                    <td className="px-6 py-4 text-stone-500 font-medium">
                      {new Date(res.reservedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Reservation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-orange-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-stone-955 flex items-center space-x-2 font-outfit">
                <Boxes className="w-5 h-5 text-orange-505" />
                <span>Create Stock Reservation</span>
              </h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedCustomerId("");
                  setCustomerSearch("");
                  setTempSku("");
                  setSelectedItems([]);
                  setSelectedBranchCode("");
                  setTempQuantity(1);
                  setNotes("");
                }} 
                className="p-1 text-stone-400 hover:bg-stone-105 rounded cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-stone-450 hover:text-stone-600" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              {/* Customer Dropdown Search (Only for staff roles) */}
              {!isCustomer && (
                <div className="relative">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Customer</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by Customer ID, company name, or email..."
                      value={customerSearch}
                      onFocus={() => setDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomerId(""); // Reset if typing
                        setDropdownOpen(true);
                      }}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-0 focus:ring-transparent text-stone-800 font-semibold transition-all duration-200 shadow-sm"
                      required
                    />
                    <div className="absolute right-3 top-3 text-stone-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute z-50 left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-2xl shadow-2xl divide-y overflow-hidden">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-stone-450 italic text-center text-[10px]">No active customers found</div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearch(`${c.customerId || ""} — ${c.companyName || c.name} (${c.email})`);
                                setDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-stone-50 hover:text-stone-900 text-xs font-semibold transition-colors duration-200"
                            >
                              <span className="text-[10px] font-mono text-orange-600 font-bold mr-1.5">{c.customerId || "—"}</span>
                              {c.companyName || c.name} <span className="text-[10px] text-stone-400 font-normal">({c.email})</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* Auto-fill summary card */}
                  {selectedCustomerId && (() => {
                    const sel = customers.find(c => c.id === selectedCustomerId);
                    if (!sel) return null;
                    return (
                      <div className="mt-2 p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-[10px] text-stone-600 space-y-1">
                        <div className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-1">Auto-Filled Customer Details</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="font-bold text-stone-400">ID:</span> {sel.customerId || "—"}</div>
                          <div><span className="font-bold text-stone-400">Company:</span> {sel.companyName || sel.name}</div>
                          <div><span className="font-bold text-stone-400">GST:</span> {sel.gstNumber || "—"}</div>
                          <div><span className="font-bold text-stone-400">Phone:</span> {sel.phone || "—"}</div>
                          <div><span className="font-bold text-stone-400">Email:</span> {sel.email}</div>
                          <div><span className="font-bold text-stone-400">Address:</span> {sel.address || "—"}</div>
                          {sel.assignedEmployee && (
                            <>
                              <div><span className="font-bold text-stone-400">Executive:</span> {sel.assignedEmployee.name}</div>
                              <div><span className="font-bold text-stone-400">Branch:</span> {sel.assignedEmployee.branchName || "—"}</div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

                  {/* Branch Selection */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Branch Warehouse</label>
                <select
                  value={selectedBranchCode}
                  onChange={(e) => setSelectedBranchCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-semibold shadow-sm cursor-pointer transition-all duration-200"
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id || b.name} value={b.id || b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Products List */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Selected Products</label>
                {selectedItems.length === 0 ? (
                  <div className="p-3 bg-stone-50 border border-dashed border-stone-300 rounded-xl text-center text-stone-450 italic text-[10px]">
                    No products added yet. Add at least one product below.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItems.map((item, idx) => {
                      const prod = products.find(p => p.sku === item.sku);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                          <div>
                            <div className="font-bold text-stone-900 text-[11px]">{prod?.name || item.sku}</div>
                            <div className="text-[10px] text-stone-400 font-mono">{item.sku}</div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-orange-655 text-xs">{item.quantity} units</span>
                            <button
                              type="button"
                              onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Product Section */}
              <div className="bg-stone-50/50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Add Product to Reservation</div>
                <div className="grid grid-cols-1 gap-2">
                  <SearchableDropdown
                    options={products.map((p) => ({
                      value: p.sku,
                      label: `${p.name} (${p.sku})`
                    }))}
                    value={tempSku}
                    onChange={(val) => setTempSku(val)}
                    placeholder="-- Choose Product --"
                  />
                </div>
                
                {selectedBranchCode && tempSku && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl outline-none focus:border-orange-500 text-stone-850 font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tempSku || tempQuantity <= 0) {
                          toast.error("Please select a product and enter a valid quantity.");
                          return;
                        }
                        if (selectedItems.some(it => it.sku === tempSku)) {
                          toast.error("This product has already been added to the reservation.");
                          return;
                        }
                        const prod = products.find(p => p.sku === tempSku);
                        if (!prod) return;
                        setSelectedItems([...selectedItems, { productId: prod.id, sku: tempSku, quantity: tempQuantity }]);
                        setTempSku("");
                        setTempQuantity(1);
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm active:scale-95"
                    >
                      Add Product
                    </button>
                  </div>
                )}

                {/* Stock Availability Summary & Selected Count with Shortage/Procurement Math */}
                {!isCustomer && tempSku && selectedBranchCode && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 text-[11px] text-stone-700 font-semibold space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span>Available Free Stock:</span>
                      <span className="text-stone-900 font-extrabold">{selectedBranchStock} units</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600">
                      <span>Selected Quantity:</span>
                      <span className="font-extrabold">{tempQuantity} units</span>
                    </div>
                    {tempQuantity > selectedBranchStock ? (
                      <div className="flex justify-between items-center text-rose-650 font-bold pt-1.5 border-t border-orange-100">
                        <span>Shortage / Need to Order:</span>
                        <span>{tempQuantity - selectedBranchStock} units</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-normal pt-1.5 border-t border-orange-100">
                        <span>Remaining Available:</span>
                        <span>{selectedBranchStock - tempQuantity} units</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Reservation Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Client wants to inspect stock before finalizing bulk order..."
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-0 focus:ring-transparent text-stone-850 font-semibold h-20 resize-none transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Deadline Days input (Only for staff roles) */}
              {!isCustomer && (
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Reservation Deadline (Days): {deadlineDays} Days
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                    className="w-full h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-bold mt-1">
                    <span>1 Day</span>
                    <span>7 Days</span>
                    <span>14 Days</span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedCustomerId("");
                    setCustomerSearch("");
                    setTempSku("");
                    setSelectedItems([]);
                    setSelectedBranchCode("");
                    setTempQuantity(1);
                    setNotes("");
                    setDeadlineDays(14);
                  }}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={() => setCreateStatus("Draft")}
                  disabled={createLoading || !selectedBranchCode}
                  className="flex-1 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-770 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  {createLoading ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  type="submit"
                  onClick={() => setCreateStatus("Pending Verification")}
                  disabled={createLoading || !selectedBranchCode}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-305 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-orange-550/15 cursor-pointer flex items-center justify-center"
                >
                  {createLoading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer: Edit Reservation Modal */}
      {showEditModal && editingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-orange-200 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-stone-950 flex items-center space-x-2 font-outfit">
                <Edit2 className="w-5 h-5 text-orange-500" />
                <span>Edit Stock Reservation</span>
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRes(null);
                }} 
                className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-stone-450 hover:text-stone-600" />
              </button>
            </div>

            <form onSubmit={handleEditReservationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Branch Location</label>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-850">
                  {selectedBranchCode}
                </div>
              </div>

              {/* Selected Products List */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Selected Products</label>
                {selectedItems.length === 0 ? (
                  <div className="p-3 bg-stone-50 border border-dashed border-stone-300 rounded-xl text-center text-stone-400 italic text-[10px]">
                    No products added yet. Add at least one product below.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItems.map((item, idx) => {
                      const prod = products.find(p => p.sku === item.sku);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                          <div>
                            <div className="font-bold text-stone-900 text-[11px]">{prod?.name || item.sku}</div>
                            <div className="text-[10px] text-stone-400 font-mono">{item.sku}</div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-orange-655 text-xs">{item.quantity} units</span>
                            <button
                              type="button"
                              onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Product Section */}
              <div className="bg-stone-50/50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Add Product to Reservation</div>
                <div className="grid grid-cols-1 gap-2">
                  <SearchableDropdown
                    options={products.map((p) => ({
                      value: p.sku,
                      label: `${p.name} (${p.sku})`
                    }))}
                    value={tempSku}
                    onChange={(val) => setTempSku(val)}
                    placeholder="-- Choose Product --"
                  />
                </div>
                {tempSku && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl outline-none focus:border-orange-500 text-stone-850 font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tempSku || tempQuantity <= 0) {
                          toast.error("Please select a product and enter a valid quantity.");
                          return;
                        }
                        if (selectedItems.some(it => it.sku === tempSku)) {
                          toast.error("This product has already been added to the reservation.");
                          return;
                        }
                        const prod = products.find(p => p.sku === tempSku);
                        if (!prod) return;
                        setSelectedItems([...selectedItems, { productId: prod.id, sku: tempSku, quantity: tempQuantity }]);
                        setTempSku("");
                        setTempQuantity(1);
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm active:scale-95"
                    >
                      Add Product
                    </button>
                  </div>
                )}

                {/* Stock Availability Summary */}
                {!isCustomer && tempSku && selectedBranchCode && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 text-[11px] text-stone-700 font-semibold space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span>Available Free Stock:</span>
                      <span className="text-stone-900 font-extrabold">{selectedBranchStock} units</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600">
                      <span>Selected Quantity:</span>
                      <span className="font-extrabold">{tempQuantity} units</span>
                    </div>
                    {tempQuantity > selectedBranchStock ? (
                      <div className="flex justify-between items-center text-rose-650 font-bold pt-1.5 border-t border-orange-100">
                        <span>Shortage / Need to Order:</span>
                        <span>{tempQuantity - selectedBranchStock} units</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-normal pt-1.5 border-t border-orange-100">
                        <span>Remaining Available:</span>
                        <span>{selectedBranchStock - tempQuantity} units</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expiration Date & Time */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Expiration Date & Time (Editable only by SCM Staff)
                </label>
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  disabled={isCustomer}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Reservation Notes (Optional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional instructions or lock extension details..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold h-20 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRes(null);
                  }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-orange-550/15 cursor-pointer flex items-center justify-center"
                >
                  {editLoading ? "Saving Changes..." : "Submit Updates"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
