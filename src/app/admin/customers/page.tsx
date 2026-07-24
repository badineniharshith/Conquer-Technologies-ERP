"use client";

import { useState, useEffect, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Building, UserPlus, CheckCircle, XCircle, Clock, Search, RefreshCw,
  Mail, Phone, MapPin, Hash, ShieldAlert, FileText, ShoppingCart, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CustomersManagementPage() {
  const { activeUser } = useErpStore();
  const role = activeUser?.role || "CUSTOMER";

  const isExecutive = role === "OPERATIONS_EXECUTIVE";
  const isManagerOrDirector = ["OPERATIONS_MANAGER", "DIRECTOR_OPERATIONS", "SUPER_ADMIN"].includes(role);
  const canApprove = isManagerOrDirector;

  const [customers, setCustomers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", companyName: "", gstNumber: "", address: "",
    reportsToId: activeUser?.id || "", password: "Admin@123",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?userId=${activeUser?.id || ""}`);
      const data = await res.json();
      if (res.ok) {
        const allUsers: any[] = data.users || [];
        const custs = allUsers.filter((u) => u.roleId === "CUSTOMER");
        const execs = allUsers.filter((u) => u.roleId === "OPERATIONS_EXECUTIVE");
        setCustomers(custs);
        setExecutives(execs);
      } else {
        toast.error(data.error || "Failed to load customers");
      }
    } catch {
      toast.error("Error retrieving customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [activeUser]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name, email: formData.email, phone: formData.phone,
          roleId: "CUSTOMER",
          reportsToId: isExecutive ? activeUser?.id : formData.reportsToId,
          password: formData.password, status: "PENDING",
          companyName: formData.companyName, gstNumber: formData.gstNumber, address: formData.address,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Customer created and pending approval!");
        setModalOpen(false);
        setFormData({ name: "", email: "", phone: "", companyName: "", gstNumber: "", address: "", reportsToId: activeUser?.id || "", password: "Admin@123" });
        fetchCustomers();
      } else {
        toast.error(data.error || "Failed to create customer.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleApproveReject = async (id: string, action: "APPROVE" | "REJECT") => {
    if (!canApprove) { toast.error("Only Managers/Directors can approve."); return; }
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        toast.success(`Customer account ${action === "APPROVE" ? "APPROVED" : "REJECTED"}.`);
        fetchCustomers();
      } else { toast.error("Failed to process."); }
    } catch { toast.error("Network error."); }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.customerId?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.gstNumber?.toLowerCase().includes(q) ||
        c.reportsTo?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === "ACTIVE").length,
    pending: customers.filter(c => c.status === "PENDING").length,
    rejected: customers.filter(c => c.status === "REJECTED").length,
  }), [customers]);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 text-white shadow-md">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-stone-900 tracking-tight">Customer Management</h1>
            <p className="text-xs text-stone-400 mt-0.5">Manage enterprise customer accounts, approvals, and assignments.</p>
          </div>
        </div>
        {(isExecutive || isManagerOrDirector) && (
          <button onClick={() => setModalOpen(true)} className="btn-primary px-5 py-2.5 text-sm flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Create Customer</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: stats.total, icon: Building, color: "text-primary-500" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-amber-600" },
          { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-stone-50 ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div>
              <div className="text-2xl font-bold text-stone-900">{s.value}</div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by Customer ID, company, name, GST..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 input-field" />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs font-semibold w-full sm:w-44">
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <button onClick={fetchCustomers} className="btn-ghost px-3 py-2 text-xs flex items-center space-x-1.5 shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-stone-50/80 text-[10px] font-black uppercase tracking-wider text-stone-400 border-b border-stone-200/60">
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Customer ID</th>
                <th className="py-3.5 px-5 hidden md:table-cell">Company</th>
                <th className="py-3.5 px-5 hidden lg:table-cell">GST Number</th>
                <th className="py-3.5 px-5 hidden lg:table-cell">Assigned Executive</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-stone-400">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-primary-500 animate-spin" />
                    <span className="text-xs">Loading customers...</span>
                  </div>
                </td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-stone-400 text-xs">No customers found.</td></tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-500 border border-primary-200 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(c.name || "?")}
                        </div>
                        <div>
                          <div className="font-bold text-stone-850 text-xs">{c.name}</div>
                          <div className="text-[10px] text-stone-400 flex items-center space-x-2">
                            <span className="flex items-center"><Mail className="w-3 h-3 mr-0.5" />{c.email}</span>
                            {c.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-0.5" />{c.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[10px] font-mono font-bold text-primary-500 bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded">
                        {c.customerId || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 hidden md:table-cell">
                      <span className="text-[10px] font-semibold text-stone-600">{c.companyName || c.name}</span>
                    </td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <span className="text-[10px] font-mono text-stone-400">{c.gstNumber || "—"}</span>
                    </td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <div className="text-[10px] font-semibold text-stone-600">{c.reportsTo?.name || "Unassigned"}</div>
                      <div className="text-[9px] text-stone-400">{c.reportsTo?.email || ""}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      {c.status === "ACTIVE" ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /><span>Active</span>
                        </span>
                      ) : c.status === "PENDING" ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                          <Clock className="w-3 h-3" /><span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <XCircle className="w-3 h-3" /><span>{c.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1">
                      {c.status === "PENDING" && canApprove ? (
                        <>
                          <button onClick={() => handleApproveReject(c.id, "APPROVE")}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors">
                            Approve
                          </button>
                          <button onClick={() => handleApproveReject(c.id, "REJECT")}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold transition-colors">
                            Reject
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          <Link href="/reserved-stock" className="px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-[9px] font-semibold transition-colors inline-flex items-center space-x-0.5">
                            <ShoppingCart className="w-3 h-3" /><span>Reservations</span>
                          </Link>
                          <Link href="/purchase-orders" className="px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-[9px] font-semibold transition-colors inline-flex items-center space-x-0.5">
                            <FileText className="w-3 h-3" /><span>POs</span>
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Customer Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-stone-100">
                <h3 className="text-base font-bold font-outfit text-stone-900">Create Enterprise Customer</h3>
                <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-stone-600">✕</button>
              </div>
              <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Contact Person</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Company Name</label>
                    <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="input-field" placeholder="Cisco India Systems" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field" placeholder="procurement@cisco.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field" placeholder="+91 40 6600 1000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">GST Number</label>
                    <input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="input-field" placeholder="36AABCC1234F1Z5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Password</label>
                    <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-field" placeholder="Plot 42, HITEC City, Hyderabad" />
                </div>

                {!isExecutive && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Assign to Executive</label>
                    <select value={formData.reportsToId} onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })} className="input-field text-xs font-semibold">
                      {executives.map((ex) => (<option key={ex.id} value={ex.id}>{ex.name} ({ex.email})</option>))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Account will be created as <strong>PENDING</strong> and requires L1/L2 approval before the customer can log in.</span>
                </div>

                <div className="pt-3 flex justify-end space-x-3 border-t border-stone-100">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
                  <button type="submit" className="btn-primary px-5 py-2 text-xs">Submit for Approval</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
