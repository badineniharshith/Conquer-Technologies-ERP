"use client";

import { useState, useMemo, useEffect } from "react";
import { checkAndExpireReservationsAction } from "@/app/actions";
import { toast } from "sonner";
import { 
  Boxes, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchableDropdown from "@/components/ui/SearchableDropdown";

interface AdminReservationsClientProps {
  reservations: any[];
}

export default function AdminReservationsClient({
  reservations
}: AdminReservationsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  // Trigger expiry check on demand
  const handleCheckExpiry = async () => {
    setCheckingExpiry(true);
    try {
      const result = await checkAndExpireReservationsAction();
      if (result.success) {
        if (result.expiredCount > 0) {
          toast.success(`${result.expiredCount} expired reservation(s) successfully processed and returned to stock.`);
          router.refresh();
        } else {
          toast.info("All active reservations are within validity period. No expiries processed.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process expiries.");
    } finally {
      setCheckingExpiry(false);
    }
  };

  // Run expiry check on component mount once
  useEffect(() => {
    handleCheckExpiry();
  }, []);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      const customerName = res.user?.name || "";
      const productName = res.product?.name || "";
      const matchesSearch = 
        customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.id.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = false;
      if (selectedStatus === "All") {
        matchesStatus = true;
      } else if (selectedStatus === "ACTIVE") {
        matchesStatus = res.status === "ACTIVE" || res.status === "PENDING" || res.status === "ACCEPTED";
      } else {
        matchesStatus = res.status === selectedStatus;
      }
      const matchesBranch = selectedBranch === "All" || res.branchCode === selectedBranch;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [reservations, searchQuery, selectedStatus, selectedBranch]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "EXPIRED":
        return "bg-red-50 text-red-700 border-red-200 font-semibold";
      case "COMPLETED":
        return "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      case "CANCELLED":
        return "bg-stone-100 text-stone-500 border-stone-300 font-semibold";
      default:
        return "bg-stone-50 text-stone-750 border-stone-200";
    }
  };

  const getRemainingTime = (expiryDateStr: string, status: string) => {
    if (status !== "ACTIVE" && status !== "PENDING" && status !== "ACCEPTED") return "N/A";
    const expiry = new Date(expiryDateStr);
    const diffMs = expiry.getTime() - new Date().getTime();

    if (diffMs <= 0) {
      return "Expired";
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h left`;
    }
    return `${diffHours}h left`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center space-x-2 font-outfit">
            <Boxes className="w-6 h-6 text-orange-500" />
            <span>Customer Stock Reservations Log</span>
          </h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Global monitoring control panel of all locked, purchased, and expired stock reservations across branches.
          </p>
        </div>
        <button
          onClick={handleCheckExpiry}
          disabled={checkingExpiry}
          className="flex items-center space-x-2 bg-white border border-stone-250 hover:border-orange-550 hover:bg-orange-50/20 px-3.5 py-2 rounded-xl text-stone-700 hover:text-orange-655 font-bold text-xs shrink-0 cursor-pointer disabled:opacity-60 transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingExpiry ? 'animate-spin text-orange-550' : 'text-stone-500'}`} />
          <span>{checkingExpiry ? "Syncing Expiries..." : "Process Expiries"}</span>
        </button>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search by customer name, product SKU, reservation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white placeholder-stone-400 transition-all text-stone-850 font-medium"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Status</label>
            <SearchableDropdown
              options={[
                { value: "All", label: "All Statuses" },
                { value: "ACTIVE", label: "Active Locks" },
                { value: "COMPLETED", label: "Purchased" },
                { value: "EXPIRED", label: "Expired" }
              ]}
              value={selectedStatus}
              onChange={setSelectedStatus}
            />
          </div>
          
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Branch</label>
            <SearchableDropdown
              options={[
                { value: "All", label: "All Branches" },
                { value: "HYD-HQ", label: "Hyderabad HQ (HYD-HQ)" },
                { value: "HYD-THUB", label: "Hyderabad T-Hub (HYD-THUB)" },
                { value: "HYD-JH", label: "Hyderabad Jubilee Hills (HYD-JH)" },
                { value: "BLR", label: "Bengaluru (BLR)" },
                { value: "CHN", label: "Chennai (CHN)" },
                { value: "MUM", label: "Mumbai (MUM)" },
                { value: "DEL", label: "Gurgaon Delhi NCR (DEL)" },
                { value: "VZG", label: "Visakhapatnam (VZG)" },
                { value: "VJA", label: "Vijayawada (VJA)" }
              ]}
              value={selectedBranch}
              onChange={setSelectedBranch}
            />
          </div>
        </div>
      </div>

      {/* Results Log Table */}
      <div className="glass-panel overflow-x-auto bg-white border border-[#fed7aa] rounded-2xl shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
              <th className="px-6 py-3">Customer Name</th>
              <th className="px-6 py-3">Product Specifications</th>
              <th className="px-6 py-3">SKU</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3">Branch</th>
              <th className="px-6 py-3">Reserved At</th>
              <th className="px-6 py-3">Expires At</th>
              <th className="px-6 py-3">Validity Left</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredReservations.map((res) => (
              <tr key={res.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-900 flex items-center space-x-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>{res.user?.name || "Customer"}</span>
                </td>
                <td className="px-6 py-4 font-semibold text-stone-850">{res.product?.name || "Product"}</td>
                <td className="px-6 py-4 font-mono text-stone-500">{res.sku}</td>
                <td className="px-6 py-4 text-right font-bold text-stone-850">{res.quantity} units</td>
                <td className="px-6 py-4 text-stone-500 font-medium">
                  <div className="flex items-center space-x-0.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{res.branchCode}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-stone-500">
                  {new Date(res.reservedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-stone-500">
                  {new Date(res.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-stone-500 font-medium font-mono">
                  {getRemainingTime(res.expiresAt, res.status)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(res.status)}`}>
                    {res.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredReservations.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-stone-400 italic">
                  No customer reservations match the specified parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
