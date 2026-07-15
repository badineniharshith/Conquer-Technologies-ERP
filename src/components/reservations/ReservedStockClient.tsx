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
  verifyModifiedReservationAction
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
}

export default function ReservedStockClient({
  reservations,
  currentUser,
  customers = [],
  products = [],
  inventory = []
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
  
  const [selectedSku, setSelectedSku] = useState("");
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Reservation Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const isCustomer = currentUser.role === "CUSTOMER";

  // Filter active customers based on text input
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
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

  // For Employee/Customer: get branches that have free stock for the selected product
  const availableBranchesForProduct = selectedSku
    ? inventory.filter(i => i.sku === selectedSku && (i.quantity - i.reservedQty) > 0)
    : [];

  const selectedBranchStock = selectedSku && selectedBranchCode
    ? (() => {
        const item = inventory.find(i => i.sku === selectedSku && i.branchCode === selectedBranchCode);
        if (!item) return 0;
        return Math.max(0, item.quantity - item.reservedQty);
      })()
    : 0;

  // Auto-select first branch with stock when product changes
  useEffect(() => {
    if (selectedSku) {
      if (availableBranchesForProduct.length > 0) {
        setSelectedBranchCode(availableBranchesForProduct[0].branchCode);
      } else {
        setSelectedBranchCode("");
      }
      setSelectedQuantity(1);
    }
  }, [selectedSku]);

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

  const handleOpenEditModal = (res: any) => {
    setEditingRes(res);
    setEditQuantity(res.quantity);
    const expDate = new Date(res.expiresAt);
    const tzOffset = expDate.getTimezoneOffset() * 60000;
    const localExpDate = new Date(expDate.getTime() - tzOffset);
    setEditExpiresAt(localExpDate.toISOString().slice(0, 16));
    setEditNotes(res.notes || "");
    setShowEditModal(true);
  };

  const handleEditReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRes || editQuantity <= 0 || !editExpiresAt) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateReservationAction({
        reservationId: editingRes.id,
        quantity: editQuantity,
        expiresAt: editExpiresAt,
        notes: editNotes
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reservation updated successfully! Awaiting staff verification.");
        setShowEditModal(false);
        setEditingRes(null);
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
    if (!finalCustomerId || !selectedSku || !selectedBranchCode || selectedQuantity <= 0) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (selectedQuantity > selectedBranchStock) {
      toast.error(`Cannot reserve more than available branch stock (${selectedBranchStock} units).`);
      return;
    }

    const matchedProduct = products.find(p => p.sku === selectedSku);
    const productId = matchedProduct?.id || "";

    setCreateLoading(true);
    try {
      const res = await createReservationAction({
        productId,
        sku: selectedSku,
        quantity: selectedQuantity,
        customerId: finalCustomerId,
        branchCode: selectedBranchCode,
        notes,
        employeeId: isCustomer ? undefined : currentUser.id
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
        setSelectedSku("");
        setSelectedBranchCode("");
        setSelectedQuantity(1);
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
        return "bg-amber-50 text-amber-700 border-amber-250 font-bold";
      case "Pending Customer Approval":
        return "bg-indigo-50 text-indigo-750 border-indigo-250 font-bold";
      case "Modified by Customer (Pending Verification)":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-250 font-extrabold";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold";
      case "EXPIRED":
        return "bg-red-50 text-red-750 border-red-200 font-semibold";
      case "COMPLETED":
        return "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      case "CANCELLED":
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
        matchesStatus = ["PENDING", "Pending Customer Approval", "Modified by Customer (Pending Verification)"].includes(res.status);
      } else if (statusFilter === "SUCCESSFUL") {
        matchesStatus = ["ACCEPTED", "COMPLETED", "ACTIVE"].includes(res.status);
      } else if (statusFilter === "CANCELLED") {
        matchesStatus = ["CANCELLED", "REJECTED", "EXPIRED"].includes(res.status);
      }

      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  const activeReservations = filteredReservations.filter(r => 
    ["ACTIVE", "PENDING", "ACCEPTED", "Pending Customer Approval", "Modified by Customer (Pending Verification)"].includes(r.status)
  );
  
  const inactiveReservations = filteredReservations.filter(r => 
    !["ACTIVE", "PENDING", "ACCEPTED", "Pending Customer Approval", "Modified by Customer (Pending Verification)"].includes(r.status)
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
                        {res.product?.brand || "Brand"}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-stone-850 text-xs truncate" title={res.product?.name || res.sku}>
                        {res.product?.name || res.sku}
                      </h4>
                      <span className="text-[10px] text-stone-400 font-mono block mt-0.5">SKU: {res.sku}</span>
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
                        <span className="font-medium text-stone-450">Quantity Reserved:</span>
                        <span className="font-bold text-orange-600">{res.quantity} units</span>
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
                            <span>{res.notes}</span>
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
                    {isCustomer ? (
                      res.status === "Modified by Customer (Pending Verification)" ? (
                        <div className="text-center bg-stone-50 border border-stone-200 text-stone-500 py-2.5 rounded-xl font-bold italic text-[10px]">
                          Awaiting Verification by Operations Staff...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
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
                              className="flex-1 py-2 bg-white hover:bg-red-55 border border-red-200 hover:border-red-400 text-red-600 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{loadingResId === res.id ? "Rejecting..." : "Reject"}</span>
                            </button>
                          </div>
                          {(res.status === "Pending Customer Approval" || res.status === "PENDING") && (
                            <button
                              onClick={() => handleOpenEditModal(res)}
                              disabled={loadingResId !== null}
                              className="w-full py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-750 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              <span>Edit Details</span>
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      res.status === "Modified by Customer (Pending Verification)" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyAccept(res.id)}
                            disabled={loadingResId !== null}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-305 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{loadingResId === res.id ? "Verifying..." : "Verify & Accept"}</span>
                          </button>
                          <button
                            onClick={() => handleVerifyReject(res.id)}
                            disabled={loadingResId !== null}
                            className="flex-1 py-2 bg-white hover:bg-red-50 border border-red-200 hover:border-red-400 text-red-600 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{loadingResId === res.id ? "Rejecting..." : "Reject Changes"}</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePurchase(res.id)}
                            disabled={loadingResId !== null || cancellingResId !== null || res.status === "Pending Customer Approval"}
                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-orange-550/15 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{loadingResId === res.id ? "Processing Purchase..." : "Convert to Purchase Order"}</span>
                          </button>
                          <button
                            onClick={() => handleCancel(res.id)}
                            disabled={loadingResId !== null || cancellingResId !== null}
                            className="w-full py-1.5 bg-white hover:bg-red-55 border border-red-200 hover:border-red-450 text-red-500 font-bold rounded-xl text-[11px] transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{cancellingResId === res.id ? "Cancelling..." : "Cancel"}</span>
                          </button>
                        </>
                      )
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
                    <td className="px-6 py-4 font-semibold text-stone-850">{res.product?.name || res.sku}</td>
                    <td className="px-6 py-4 font-mono text-stone-500">{res.sku}</td>
                    <td className="px-6 py-4 text-right font-bold text-stone-800">{res.quantity} units</td>
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
                  setSelectedSku("");
                  setSelectedBranchCode("");
                  setSelectedQuantity(1);
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
                      placeholder="Search customer by name or email..."
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
                                setCustomerSearch(`${c.name} (${c.email})`);
                                setDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-stone-50 hover:text-stone-900 text-xs font-semibold transition-colors duration-200"
                            >
                              {c.name} <span className="text-[10px] text-stone-400 font-normal">({c.email})</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Product Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Product</label>
                <SearchableDropdown
                  options={products.map((p) => ({
                    value: p.sku,
                    label: `${p.name} (${p.sku})`
                  }))}
                  value={selectedSku}
                  onChange={(val) => setSelectedSku(val)}
                  placeholder="-- Choose Product --"
                />
              </div>

              {/* Branch Selection & Real-Time Stock Availability */}
              {selectedSku && (
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Branch & Stock Location</label>
                  {availableBranchesForProduct.length === 0 ? (
                    <div className="text-red-550 font-bold p-2 bg-red-50 rounded-xl border border-red-100 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>No stock available for this product in any branch!</span>
                    </div>
                  ) : (
                    <select
                      value={selectedBranchCode}
                      onChange={(e) => setSelectedBranchCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-semibold shadow-sm cursor-pointer transition-all duration-200"
                      required
                    >
                      {availableBranchesForProduct.map((b) => (
                        <option key={b.branchCode} value={b.branchCode}>
                          {b.branchCode} -- ({b.quantity - b.reservedQty} available units)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Quantity */}
              {selectedBranchCode && selectedBranchStock > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                      Quantity to Reserve (Max: {selectedBranchStock})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedBranchStock}
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-bold"
                      required
                    />
                  </div>

                  {/* Stock Availability Summary & Selected Count */}
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 text-[11px] text-stone-700 font-semibold space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span>Available Free Stock:</span>
                      <span className="text-stone-900 font-extrabold">{selectedBranchStock} units</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600">
                      <span>Selected to Reserve:</span>
                      <span className="font-extrabold">{selectedQuantity} units</span>
                    </div>
                    {selectedBranchStock - selectedQuantity >= 0 && (
                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-normal pt-1.5 border-t border-orange-100">
                        <span>Remaining Available Stock:</span>
                        <span>{selectedBranchStock - selectedQuantity} units</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Reservation Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Client wants to inspect stock before finalizing bulk order..."
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white focus:ring-0 focus:ring-transparent text-stone-800 font-semibold h-20 resize-none transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedCustomerId("");
                    setCustomerSearch("");
                    setSelectedSku("");
                    setSelectedBranchCode("");
                    setSelectedQuantity(1);
                    setNotes("");
                  }}
                  className="flex-1 py-2.5 bg-stone-105 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !selectedBranchCode || selectedBranchStock <= 0}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-orange-550/15 cursor-pointer flex items-center justify-center"
                >
                  {createLoading ? "Creating..." : "Confirm Lock"}
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
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Product Details</label>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-750">
                  <p className="font-bold text-stone-900">{editingRes.product?.name || editingRes.sku}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">SKU: {editingRes.sku} | Branch: {editingRes.branchCode}</p>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Quantity to Reserve
                </label>
                <input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-bold"
                  required
                />
              </div>

              {/* Expiration Date & Time */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Expiration Date & Time (Must be within lock limits)
                </label>
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-bold"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-800 font-medium h-20 resize-none"
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
