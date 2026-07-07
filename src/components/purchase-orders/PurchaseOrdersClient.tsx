"use client";

import { useState, useTransition, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { 
  checkStockAvailabilityAction, 
  verifyPurchaseOrderAction, 
  createPurchaseOrderAction 
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
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertCircle
} from "lucide-react";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import { motion, AnimatePresence, AnimatedModal, StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface PurchaseOrdersClientProps {
  initialPurchaseOrders: any[];
  users: any[];
  branches: any[];
  products: any[];
}

export default function PurchaseOrdersClient({
  initialPurchaseOrders,
  users,
  branches,
  products
}: PurchaseOrdersClientProps) {
  const { activeRole, activeUser } = useErpStore();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");

  // Loading state per PO row action
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New PO Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newPoNumber, setNewPoNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedBranchCode, setSelectedBranchCode] = useState("HYD-HQ");
  const [orderItems, setOrderItems] = useState<{ sku: string; quantity: number }[]>([
    { sku: products[0]?.sku || "", quantity: 1 }
  ]);
  const [createLoading, setCreateLoading] = useState(false);

  // Filter customers for dropdown
  const customers = useMemo(() => users.filter(u => u.roleId === "CUSTOMER"), [users]);

  // Apply Role-Based Data Isolation
  const filteredPurchaseOrders = useMemo(() => {
    return initialPurchaseOrders.filter(po => {
      // 1. Customer role isolation: strictly see own POs
      if (activeRole === "CUSTOMER") {
        return po.customerId === activeUser?.id || po.customerId === "u-customer" || po.customerName === activeUser?.name;
      }

      // 2. Branch filters for staff
      const matchesBranch = branchFilter === "All" || po.branchCode === branchFilter;
      
      // 3. Search filter
      const matchesSearch = po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            po.customerName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesBranch && matchesSearch;
    });
  }, [initialPurchaseOrders, activeRole, activeUser, branchFilter, searchQuery]);

  const handleCheckStock = async (poId: string) => {
    setActionLoadingId(poId);
    try {
      const res = await checkStockAvailabilityAction(poId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Stock checked successfully. Status: ${res.stockStatus}`);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to check stock");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyPO = async (poId: string) => {
    setActionLoadingId(poId);
    try {
      const res = await verifyPurchaseOrderAction(poId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Purchase Order verified and stock allocated successfully!");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to verify PO");
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
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    setCreateLoading(true);
    const customer = users.find(u => u.id === selectedCustomerId);
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    try {
      const res = await createPurchaseOrderAction({
        poNumber: newPoNumber.trim(),
        customerId: selectedCustomerId,
        customerName: customer?.name || "Premium Customer",
        totalItems,
        branchCode: selectedBranchCode,
        itemsJson: JSON.stringify(orderItems)
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Purchase Order created and logged successfully!");
        setModalOpen(false);
        // Reset form
        setNewPoNumber("");
        setSelectedCustomerId("");
        setOrderItems([{ sku: products[0]?.sku || "", quantity: 1 }]);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create PO");
    } finally {
      setCreateLoading(false);
    }
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, { sku: products[0]?.sku || "", quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateOrderItem = (index: number, field: "sku" | "quantity", value: any) => {
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const isStaff = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "SALES_HEAD", "REGIONAL_SALES_MANAGER", "BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"].includes(activeRole);

  const getStockBadge = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-emerald-500/10 text-emerald-800 border-emerald-500/20";
      case "Shortage":
        return "bg-rose-500/10 text-rose-800 border-rose-500/20 animate-pulse";
      default:
        return "bg-stone-500/10 text-stone-700 border-stone-500/20";
    }
  };

  const getVerifyBadge = (status: string) => {
    if (status === "PO Verified & Stock Available") {
      return "bg-emerald-500 text-white font-extrabold shadow-sm";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
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
            <span>PO Received & Stock Checker</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Track inward customer Purchase Orders (PO), evaluate network warehouses, and authorize inventory allocation logs.
          </p>
        </div>

        {isStaff && (
          <motion.button
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/15 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Customer PO</span>
          </motion.button>
        )}
      </motion.div>

      {/* Filters (only for Staff roles) */}
      {isStaff && (
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 border border-stone-200 rounded-xl shadow-sm">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search PO Number or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 text-stone-850 animate-fade-in"
            />
          </div>

          <div className="flex items-center space-x-2 bg-stone-50 px-3 py-1.5 border border-stone-250 rounded-lg max-w-[240px] w-full">
            <Building className="w-4 h-4 text-stone-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 text-stone-700 font-semibold cursor-pointer w-full"
            >
              <option value="All">All Locations (Global)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
              ))}
            </select>
          </div>
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
              <th className="px-6 py-3">PO Number</th>
              <th className="px-6 py-3">Customer Profile</th>
              <th className="px-6 py-3">Date Received</th>
              <th className="px-6 py-3 text-center">Total Items</th>
              <th className="px-6 py-3 text-center">Stock Status</th>
              <th className="px-6 py-3 text-center">Verification Status</th>
              {isStaff && <th className="px-6 py-3 text-center">Verification Workflow</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredPurchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 7 : 6} className="px-6 py-16 text-center text-stone-400 italic">
                  <div className="flex flex-col items-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-stone-300" />
                    <span>No Purchase Orders Available. Create or simulate one to start verification.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchaseOrders.map((po, idx) => {
                const isLoading = actionLoadingId === po.id;
                
                return (
                  <tr key={po.id} className="table-row-hover animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}>
                    <td className="px-6 py-4 font-mono font-black text-orange-655 text-sm">{po.poNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-900">{po.customerName}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">ID: {po.customerId}</div>
                    </td>
                    <td className="px-6 py-4 text-stone-500 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(po.dateReceived).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold text-stone-800">{po.totalItems} unit(s)</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStockBadge(po.stockStatus)}`}>
                        {po.stockStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getVerifyBadge(po.verificationStatus)}`}>
                        {po.verificationStatus === "PO Verified & Stock Available" ? "Verified & Allocated" : po.verificationStatus}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleCheckStock(po.id)}
                            disabled={isLoading || po.verificationStatus === "PO Verified & Stock Available"}
                            className="px-2.5 py-1.5 border border-stone-200 rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold transition-all cursor-pointer text-[10px]"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Check Stock"}
                          </button>
                          
                          <button
                            onClick={() => handleVerifyPO(po.id)}
                            disabled={
                              isLoading || 
                              po.stockStatus !== "Available" || 
                              po.verificationStatus === "PO Verified & Stock Available"
                            }
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-40 font-bold transition-all cursor-pointer text-[10px]"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify & Allocate"}
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

      {/* Simulate Purchase Order Dialog Modal */}
      <AnimatedModal open={modalOpen} onClose={() => setModalOpen(false)}>
          <div className="bg-white/95 backdrop-blur-xl border border-[#fed7aa]/70 p-6 rounded-2xl shadow-xl w-full relative space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                <span className="font-extrabold text-sm text-stone-900 font-outfit">Simulate Inward Customer PO</span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">PO Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-2026-99"
                    value={newPoNumber}
                    onChange={(e) => setNewPoNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Select Customer</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850"
                  >
                    <option value="">Choose Customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-stone-550 uppercase tracking-wider mb-1">Branch Destination (Stock Lock)</label>
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
              </div>

              {/* Items list selection inside simulated PO */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-550 uppercase tracking-wider">Purchase Order Items Matrix</span>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
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
                      
                      <div className="w-20">
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-250 rounded-lg outline-none focus:border-orange-500 text-stone-850 text-center font-bold"
                        />
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
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? "Creating simulated PO..." : "Log Simulated PO"}
                </button>
              </div>
            </form>
          </div>
      </AnimatedModal>
    </div>
  );
}
