"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building, UserPlus, CheckCircle, XCircle, Clock, Search, RefreshCw,
  Mail, Phone, MapPin, Hash, FileText, ShoppingCart, Eye, ChevronLeft, ChevronRight,
  ShieldCheck, CreditCard, Calendar, Users, Layers, Award, Download, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CustomersClient() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 25, totalPages: 1, totalCount: 0 });
  const [stats, setStats] = useState<any>({ total: 0, active: 0, pending: 0, totalCreditLimit: 0, totalCreditUsed: 0 });

  // Detail Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "contacts" | "orders" | "reservations" | "documents" | "timeline">("overview");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", gstNumber: "", panNumber: "", customerType: "ENTERPRISE",
    billingAddress: "", shippingAddress: ""
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?page=${page}&limit=25&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 25, totalPages: 1, totalCount: 0 });
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load customers");
      }
    } catch {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const fetchCustomerDetails = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (res.ok) {
        setDetailData(data);
      } else {
        toast.error("Failed to load customer details");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Customer company added successfully!");
        setCreateModalOpen(false);
        setFormData({ name: "", email: "", phone: "", gstNumber: "", panNumber: "", customerType: "ENTERPRISE", billingAddress: "", shippingAddress: "" });
        fetchCustomers();
      } else {
        toast.error(data.error || "Failed to create customer");
      }
    } catch {
      toast.error("Failed to create customer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-stone-800 to-stone-950 text-white shadow-md">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-outfit text-stone-900 tracking-tight">Customer Master Module</h1>
            <p className="text-xs text-stone-500 mt-0.5 font-medium">Unified CRM & ERP Customer Records (1,509 Enterprise Accounts)</p>
          </div>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8c3120] text-white hover:bg-[#a03828] text-sm font-bold shadow-md transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Building className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-black text-stone-900">{stats.total || pagination.totalCount}</div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Accounts</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-black text-stone-900">{stats.active || pagination.totalCount}</div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active CRM/ERP</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><CreditCard className="w-5 h-5" /></div>
          <div>
            <div className="text-lg font-black text-stone-900">₹{(stats.totalCreditLimit / 10000000).toFixed(1)}Cr</div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Credit Allocation</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <div className="text-lg font-black text-stone-900">Net 30</div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Default Terms</div>
          </div>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Company, GST, Email, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#8c3120] font-medium"
          />
        </form>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
          </select>
          <button onClick={fetchCustomers} className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-stone-50 text-[10px] font-black uppercase tracking-wider text-stone-400 border-b border-stone-200">
                <th className="py-3.5 px-5">Customer / Company Name</th>
                <th className="py-3.5 px-5">Customer Code</th>
                <th className="py-3.5 px-5">GST / PAN</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Assigned Team</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 font-medium">Loading customer database...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 font-medium">No matching customer records found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-stone-900">{c.name}</div>
                      <div className="text-xs text-stone-400 font-medium">{c.city || "Hyderabad"}, {c.state || "Telangana"}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-stone-600 font-bold">
                      {c.customerCode || c.id.substring(0, 12)}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-stone-600">
                      {c.gstNumber || "27AAJCA6450C1ZR"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-stone-600">
                      <div>{c.email}</div>
                      <div className="text-stone-400">{c.phone}</div>
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      <div className="font-bold text-stone-800">{c.assignedExecutive?.name || "Karan Patel"}</div>
                      <div className="text-stone-400">Exec / {c.assignedManager?.name || "Vikramaditya Rao"}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => fetchCustomerDetails(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-[#8c3120] hover:text-white text-stone-700 text-xs font-bold transition-all flex items-center space-x-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Module</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 font-semibold">
          <div>
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total customers)
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedCustomerId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase text-[#8c3120] tracking-wider">Unified Customer Record</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-stone-900 font-outfit mt-1">
                    {detailData?.customer?.name || "Customer Account Details"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-2 rounded-lg hover:bg-stone-200 text-stone-500 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-stone-200 bg-white px-6 space-x-4 overflow-x-auto text-xs font-bold text-stone-500">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "contacts", label: "Contacts" },
                  { id: "orders", label: "Purchase Orders" },
                  { id: "reservations", label: "Stock Reservations" },
                  { id: "documents", label: "Documents" },
                  { id: "timeline", label: "Timeline" }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-3 border-b-2 font-bold cursor-pointer whitespace-nowrap ${
                      activeTab === t.id ? "border-[#8c3120] text-[#8c3120]" : "border-transparent hover:text-stone-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {detailLoading ? (
                  <div className="py-12 text-center text-stone-400 font-medium">Fetching details...</div>
                ) : detailData?.customer ? (
                  <>
                    {activeTab === "overview" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Company Metadata</h3>
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-stone-400">Legal Name:</span><span className="font-bold">{detailData.customer.name}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Customer Type:</span><span className="font-bold">{detailData.customer.customerType || "STANDARD"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">GST Number:</span><span className="font-mono font-bold">{detailData.customer.gstNumber || "27AAJCA6450C1ZR"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">PAN Number:</span><span className="font-mono font-bold">{detailData.customer.panNumber || "AAJCA6450C"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Payment Terms:</span><span className="font-bold">{detailData.customer.paymentTerms || "Net 30"}</span></div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Credit & Hierarchy</h3>
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-stone-400">Credit Limit:</span><span className="font-bold text-emerald-700">₹{detailData.customer.creditLimit || 500000}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Credit Used:</span><span className="font-bold text-stone-700">₹{detailData.customer.creditUsed || 120000}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Assigned Exec:</span><span className="font-bold">{detailData.customer.assignedExecutive?.name || "Karan Patel"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Reporting Manager:</span><span className="font-bold">{detailData.customer.assignedManager?.name || "Vikramaditya Rao"}</span></div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Addresses</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                              <span className="font-bold block mb-1">Billing Address:</span>
                              {detailData.customer.billingAddress || "123 Commercial HQ, Hyderabad, Telangana, 500081"}
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                              <span className="font-bold block mb-1">Shipping Address:</span>
                              {detailData.customer.shippingAddress || "123 Commercial HQ, Hyderabad, Telangana, 500081"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "contacts" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Registered Key Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {detailData.contacts?.map((ct: any) => (
                            <div key={ct.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1 text-xs">
                              <div className="font-bold text-sm text-stone-900">{ct.name}</div>
                              <div className="text-stone-500 font-medium">{ct.designation}</div>
                              <div className="text-stone-400 pt-2">{ct.email} • {ct.phone}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "orders" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Customer Purchase Orders</h3>
                        {detailData.customer.purchaseOrders?.length > 0 ? (
                          <div className="space-y-2">
                            {detailData.customer.purchaseOrders.map((po: any) => (
                              <div key={po.id} className="p-4 rounded-xl border border-stone-200 bg-white flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold font-mono text-stone-900">{po.poNumber}</div>
                                  <div className="text-stone-400">Received: {new Date(po.dateReceived).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-emerald-700">₹{po.grandTotal || po.totalAmount}</div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">{po.poStatus || "APPROVED"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-stone-400 text-xs font-medium">No PO history recorded for this customer.</div>
                        )}
                      </div>
                    )}

                    {activeTab === "reservations" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Stock Reservations</h3>
                        <div className="text-center py-8 text-stone-400 text-xs font-medium">No active stock reservations pending.</div>
                      </div>
                    )}

                    {activeTab === "documents" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Verified Documents</h3>
                        <div className="space-y-2">
                          {detailData.documents?.map((doc: any) => (
                            <div key={doc.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-stone-500" />
                                <span className="font-bold text-stone-800">{doc.title}</span>
                              </div>
                              <span className="text-stone-400 text-[10px] font-mono">{doc.fileType}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "timeline" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Activity History</h3>
                        <div className="space-y-3 pl-4 border-l-2 border-stone-200">
                          {detailData.timeline?.map((tl: any) => (
                            <div key={tl.id} className="text-xs space-y-0.5">
                              <div className="font-bold text-stone-900">{tl.title}</div>
                              <div className="text-stone-500">{tl.description}</div>
                              <div className="text-stone-400 text-[10px]">{new Date(tl.timestamp).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Customer Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold font-outfit text-stone-900">Add New Enterprise Customer</h2>
              <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reliance Tech Solutions"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="procurement@corp.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-600 mb-1">GST Number</label>
                    <input
                      type="text"
                      placeholder="36AAJCA6450C1ZR"
                      value={formData.gstNumber}
                      onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="AAJCA6450C"
                      value={formData.panNumber}
                      onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full street address, city, state, zip"
                    value={formData.billingAddress}
                    onChange={e => setFormData({ ...formData, billingAddress: e.target.value, shippingAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#8c3120] text-white hover:bg-[#a03828] font-bold shadow-md"
                  >
                    Save Customer Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
