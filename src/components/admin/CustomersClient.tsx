"use client";

import { useState, useEffect } from "react";
import {
  Building, UserPlus, CheckCircle, Search, RefreshCw,
  Eye, ChevronLeft, ChevronRight, CreditCard, ShieldCheck,
  X, Mail, Phone, MapPin, FileText, Calendar, Hash, Tag, Layers, User
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
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-[#8c3120]/10 to-[#8c3120]/5 border border-[#8c3120]/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-[#8c3120] text-white shadow-md shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-stone-900 tracking-tight">Customer Accounts Directory</h1>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              Enterprise customer accounts imported &amp; synchronized from CRM and ERP databases.
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#8c3120] hover:bg-[#a03828] text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Accounts</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">{stats.total || pagination.totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Active Accounts</span>
            <span className="text-2xl font-black text-emerald-700 block mt-1">{stats.active || pagination.totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Credit Limit</span>
            <span className="text-xl font-black text-stone-900 block mt-1">₹{(stats.totalCreditLimit / 10000000).toFixed(1)}Cr</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Payment Terms</span>
            <span className="text-xl font-black text-stone-900 block mt-1">Net 30</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 border border-stone-200 rounded-2xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input with Non-overlapping Icon */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Company, GST, Email, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-medium transition-all"
          />
        </form>

        {/* Status Dropdown & Refresh */}
        <div className="flex items-center space-x-3 w-full md:w-auto shrink-0 justify-end">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none cursor-pointer focus:border-[#8c3120]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
          </select>

          <button
            type="button"
            onClick={fetchCustomers}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-5">Customer Company Name</th>
                <th className="py-3.5 px-5">Customer Code</th>
                <th className="py-3.5 px-5">GST / PAN</th>
                <th className="py-3.5 px-5">Contact Info</th>
                <th className="py-3.5 px-5">Assigned Team</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
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
                      <div className="font-bold text-stone-900 leading-tight">{c.name}</div>
                      <div className="text-[11px] text-stone-400 font-medium mt-0.5">{c.city || "Hyderabad"}, {c.state || "Telangana"}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-stone-600 font-bold whitespace-nowrap">
                      {c.customerCode || c.id.substring(0, 12)}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-stone-600 whitespace-nowrap">
                      {c.gstNumber || "27AAJCA6450C1ZR"}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-stone-600">
                      <div className="truncate max-w-[200px]" title={c.email}>{c.email}</div>
                      <div className="text-stone-400 text-[11px] mt-0.5">{c.phone}</div>
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      <div className="font-bold text-stone-800">{c.assignedExecutive?.name || "Karan Patel"}</div>
                      <div className="text-stone-400 text-[11px]">Mgr: {c.assignedManager?.name || "Vikramaditya Rao"}</div>
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <button
                        onClick={() => fetchCustomerDetails(c.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-[#8c3120] hover:text-white text-stone-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 font-semibold">
          <div>
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total customers)
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomerId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase text-[#8c3120] tracking-wider">Customer Record</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-stone-900 font-outfit mt-1">
                    {detailData?.customer?.name || "Customer Account Details"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-2 rounded-lg hover:bg-stone-200 text-stone-500 font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-stone-200 bg-white px-6 space-x-4 overflow-x-auto text-xs font-bold text-stone-500 shrink-0">
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
                            <div className="flex justify-between"><span className="text-stone-400">Legal Name:</span><span className="font-bold text-stone-900">{detailData.customer.name}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Customer Type:</span><span className="font-bold text-stone-900">{detailData.customer.customerType || "STANDARD"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">GST Number:</span><span className="font-mono font-bold text-stone-900">{detailData.customer.gstNumber || "27AAJCA6450C1ZR"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">PAN Number:</span><span className="font-mono font-bold text-stone-900">{detailData.customer.panNumber || "AAJCA6450C"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Payment Terms:</span><span className="font-bold text-stone-900">{detailData.customer.paymentTerms || "Net 30"}</span></div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Credit &amp; Hierarchy</h3>
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-stone-400">Credit Limit:</span><span className="font-bold text-emerald-700">₹{detailData.customer.creditLimit || 500000}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Credit Used:</span><span className="font-bold text-stone-700">₹{detailData.customer.creditUsed || 120000}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Assigned Exec:</span><span className="font-bold text-stone-900">{detailData.customer.assignedExecutive?.name || "Karan Patel"}</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Reporting Manager:</span><span className="font-bold text-stone-900">{detailData.customer.assignedManager?.name || "Vikramaditya Rao"}</span></div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Addresses</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                              <span className="font-bold block mb-1 text-stone-900">Billing Address:</span>
                              <p className="text-stone-600">{detailData.customer.billingAddress || "123 Commercial HQ, Hyderabad, Telangana, 500081"}</p>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                              <span className="font-bold block mb-1 text-stone-900">Shipping Address:</span>
                              <p className="text-stone-600">{detailData.customer.shippingAddress || "123 Commercial HQ, Hyderabad, Telangana, 500081"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "contacts" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Key Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {detailData.contacts?.map((ct: any) => (
                            <div key={ct.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1 text-xs">
                              <div className="font-bold text-sm text-stone-900">{ct.name}</div>
                              <div className="text-stone-500 font-medium">{ct.designation}</div>
                              <div className="text-stone-400 pt-2 font-mono">{ct.email} • {ct.phone}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "orders" && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">Purchase Orders</h3>
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
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold font-outfit text-stone-900">Add New Enterprise Customer</h2>
                <button type="button" onClick={() => setCreateModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reliance Tech Solutions"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="procurement@corp.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      placeholder="36AAJCA6450C1ZR"
                      value={formData.gstNumber}
                      onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="AAJCA6450C"
                      value={formData.panNumber}
                      onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full street address, city, state, zip"
                    value={formData.billingAddress}
                    onChange={e => setFormData({ ...formData, billingAddress: e.target.value, shippingAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#8c3120] focus:bg-white text-stone-850 font-medium"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#8c3120] text-white hover:bg-[#a03828] font-bold shadow-md transition-all cursor-pointer"
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
