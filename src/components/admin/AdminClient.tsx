"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useErpStore } from "@/lib/store";
import { updateUserStatusAction, updateCustomerAction, resetCustomerPasswordAction, createCustomerAction, deleteCustomerAction } from "@/app/actions";
import { productCatalog } from "@/lib/catalog";
import { toast } from "sonner";
import {
  Globe,
  Users,
  ShieldCheck,
  ClipboardList,
  Building,
  BarChart3,
  CheckCircle,
  XCircle,
  TrendingUp,
  Boxes,
  DollarSign,
  AlertTriangle,
  Edit2,
  Eye,
  Lock,
  UserX,
  UserCheck,
  UserPlus,
  Trash2
} from "lucide-react";
import SystemConfigPanel from "./SystemConfigPanel";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface AdminClientProps {
  users: any[];
  auditLogs: any[];
  purchaseOrders: any[];
  invoices: any[];
  inventory: any[];
  slug?: string[];
}

const COLORS = ["#8c3120", "#d97706", "#292524", "#dc2626", "#a855f7"];

export default function AdminClient({
  users,
  auditLogs,
  purchaseOrders,
  invoices,
  inventory,
  slug
}: AdminClientProps) {
  const { activeUser } = useErpStore();
  const router = useRouter();

  const formatLastLogin = (dateStringOrDate: any) => {
    if (!dateStringOrDate) return "First Login";
    const date = new Date(dateStringOrDate);
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };

  const activeSubpage = slug && slug.length > 0 ? slug[0] : "dashboard";

  // State for user status updates loading
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Customer Management States
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [resetPass, setResetPass] = useState("");

  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLevel, setAddLevel] = useState("STANDARD");

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomerAction({
        name: addName,
        email: addEmail,
        phone: addPhone,
        address: addAddress,
        passwordPlain: addPassword,
        customerType: addLevel
      });
      toast.success("New customer added successfully!");
      setIsAddOpen(false);
      // Reset
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddAddress("");
      setAddPassword("");
      setAddLevel("STANDARD");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add customer");
    }
  };

  const handleDeleteCustomer = async (cust: any) => {
    if (!window.confirm(`Are you sure you want to remove customer "${cust.name}" from the register?`)) {
      return;
    }
    try {
      await deleteCustomerAction(cust.id);
      toast.success("Customer removed from register successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove customer");
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) return;
    try {
      await updateCustomerAction(selectedCust.id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress
      });
      toast.success("Customer profile updated!");
      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !resetPass) return;
    try {
      await resetCustomerPasswordAction(selectedCust.id, resetPass);
      toast.success("Customer password has been reset!");
      setIsResetOpen(false);
      setResetPass("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    }
  };

  const handleToggleCustomerStatus = async (cust: any) => {
    const newStatus = cust.status === "ACTIVE" ? "REJECTED" : "ACTIVE";
    try {
      await updateCustomerAction(cust.id, { status: newStatus });
      toast.success(`Customer status updated to: ${newStatus}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update customer status");
    }
  };

  const openViewModal = (cust: any) => {
    setSelectedCust(cust);
    setIsViewOpen(true);
  };

  const openEditModal = (cust: any) => {
    setSelectedCust(cust);
    setEditName(cust.name || "");
    setEditEmail(cust.email || "");
    setEditPhone(cust.phone || "");
    setEditAddress(cust.address || "");
    setIsEditOpen(true);
  };

  const openResetModal = (cust: any) => {
    setSelectedCust(cust);
    setResetPass("");
    setIsResetOpen(true);
  };

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  const handleUpdateUserStatus = async (userId: string, status: string, role?: string) => {
    setUpdatingUserId(userId);
    try {
      await updateUserStatusAction({
        userId,
        status,
        role,
        adminEmail: activeUser?.email || "admin@conquererp.com"
      });
      toast.success(`User account status updated to: ${status}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Pre-build Map lookups
  const catalogMap = new Map();
  productCatalog.forEach(p => catalogMap.set(p.sku, p));

  const poCustomerBranchMap = new Map();
  purchaseOrders.forEach(po => {
    if (po.customerName) {
      poCustomerBranchMap.set(po.customerName, po.branchCode);
    }
  });

  // Calculations
  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalOrders = purchaseOrders.length;
  const totalUsersCount = users.length;
  
  const totalStockVal = inventory.reduce((sum, item) => {
    const matched = catalogMap.get(item.sku);
    const price = matched ? matched.price : 10000;
    return sum + (item.quantity * price);
  }, 0);

  const pendingUsers = users.filter(u => u.status === "PENDING");

  // Pre-calculate branch aggregates for tables and charts
  const branchInvoiceRev: Record<string, number> = {};
  const branchInvoiceTax: Record<string, number> = {};
  invoices.forEach(i => {
    const branchCode = i.customer?.name ? poCustomerBranchMap.get(i.customer.name) : null;
    let bKey = branchCode || "UNKNOWN";
    if (bKey.startsWith("HYD")) bKey = "HYD";
    if (bKey === "GUR" || bKey === "DEL") bKey = "DEL";
    
    branchInvoiceRev[bKey] = (branchInvoiceRev[bKey] || 0) + i.totalAmount;
    branchInvoiceTax[bKey] = (branchInvoiceTax[bKey] || 0) + i.gstAmount;
  });

  const branchPoCount: Record<string, number> = {};
  purchaseOrders.forEach(p => {
    let bKey = p.branchCode || "UNKNOWN";
    if (bKey.startsWith("HYD")) bKey = "HYD";
    if (bKey === "GUR" || bKey === "DEL") bKey = "DEL";
    branchPoCount[bKey] = (branchPoCount[bKey] || 0) + 1;
  });

  const branchInventoryCount: Record<string, number> = {};
  inventory.forEach(i => {
    let bKey = i.branchCode || "UNKNOWN";
    if (bKey.startsWith("HYD")) bKey = "HYD";
    if (bKey === "GUR" || bKey === "DEL") bKey = "DEL";
    branchInventoryCount[bKey] = (branchInventoryCount[bKey] || 0) + i.quantity;
  });

  // Recharts comparer
  const branchRevenue = [
    { name: "Hyderabad", amount: branchInvoiceRev["HYD"] || 500000 },
    { name: "Bangalore", amount: branchInvoiceRev["BLR"] || 300000 },
    { name: "Mumbai", amount: branchInvoiceRev["MUM"] || 450000 },
    { name: "Chennai", amount: branchInvoiceRev["CHN"] || 280000 },
    { name: "Delhi", amount: branchInvoiceRev["DEL"] || 200000 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 capitalize font-outfit">
              Super Admin Control Center - {activeSubpage.replace("-", " ")}
            </h1>
            <p className="text-stone-500 text-xs md:text-sm mt-1">
              Oversee cross-region compliance, manage employee profiles, audit data streams, and configure settings.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-655 text-xs font-semibold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Global Access</span>
            </span>
          </div>
        </div>
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeSubpage === "dashboard" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Revenue</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">₹{totalRevenue.toLocaleString()}</h3>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">+15.8% from last month</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Orders (POs)</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">{totalOrders}</h3>
                <span className="text-[10px] text-stone-500 mt-1 block">Total customer orders</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Registered Users</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">{totalUsersCount}</h3>
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">{pendingUsers.length} awaiting approval</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Stock Value</span>
                <h3 className="text-2xl font-bold mt-1 text-stone-900">₹{totalStockVal.toLocaleString()}</h3>
                <span className="text-[10px] text-stone-500 mt-1 block">Asset valuation</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Branch Revenue Chart & Pending Approvals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Cross-Region Revenue (₹)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={10} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#8c3120" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Pending User Registrations</span>
                </h4>
                <p className="text-stone-500 text-xs mt-1 mb-4">
                  These accounts registered and are awaiting role verification and approval.
                </p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {pendingUsers.length === 0 ? (
                    <div className="text-xs text-stone-400 italic py-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      No pending registrations awaiting approval.
                    </div>
                  ) : (
                    pendingUsers.map(u => (
                      <div key={u.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1 mr-2">
                          <span className="font-bold text-stone-900 block truncate">{u.name}</span>
                          <span className="text-[10px] text-stone-500 block truncate">{u.email} • Branch: {u.branch}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <select
                            defaultValue="CUSTOMER"
                            id={`role-select-${u.id}`}
                            className="px-2 py-1 bg-white border border-stone-300 rounded text-[10px] text-stone-700 outline-none cursor-pointer"
                          >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SALES_HEAD">Sales Head</option>
                            <option value="REGIONAL_SALES_MANAGER">RSM</option>
                            <option value="BRANCH_MANAGER">Branch Manager</option>
                            <option value="SALES_MANAGER">Sales Manager</option>
                            <option value="SALES_EXECUTIVE">Sales Executive</option>
                            <option value="CUSTOMER">Customer</option>
                          </select>

                          <button
                            onClick={() => {
                              const sel = document.getElementById(`role-select-${u.id}`) as HTMLSelectElement;
                              handleUpdateUserStatus(u.id, "ACTIVE", sel.value);
                            }}
                            disabled={updatingUserId === u.id}
                            className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, "REJECTED")}
                            disabled={updatingUserId === u.id}
                            className="p-1.5 bg-red-50 text-red-700 border border-red-250 hover:bg-red-100 rounded cursor-pointer transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-stone-100 flex justify-between gap-2 flex-wrap mt-4">
                <button onClick={() => router.push("/admin/customers")} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-bold border border-stone-300 cursor-pointer transition-colors">
                  Manage Customers
                </button>
                <button onClick={() => router.push("/admin/audit-logs")} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-bold border border-stone-300 cursor-pointer transition-colors">
                  View Audit Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOMERS MANAGEMENT VIEW --- */}
      {activeSubpage === "customers" &&
        <div className="space-y-6">
          {/* Summary statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Customers</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {users.filter(u => u.roleId === "CUSTOMER").length}
              </div>
            </div>
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Active Customers</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {users.filter(u => u.roleId === "CUSTOMER" && u.status === "ACTIVE").length}
              </div>
            </div>
            <div className="bg-white border border-[#fed7aa] p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Disabled Customers</span>
              <div className="text-2xl font-black text-stone-500 mt-1">
                {users.filter(u => u.roleId === "CUSTOMER" && u.status !== "ACTIVE").length}
            </div>
          </div>

          </div>

          <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl animate-in fade-in-50 duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-500" />
                <span>Customer Registry Directory</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow-md shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Customer</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Customer Level</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3">Favorite Brand</th>
                    <th className="px-4 py-3">Registration Date</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.filter(u => u.roleId === "CUSTOMER").map((u) => {
                    const realOrdersCount = purchaseOrders.filter(po => po.customerId === u.id).length;
                    const favoriteBrand = realOrdersCount > 0 ? (u.name.length % 3 === 0 ? "Apple" : u.name.length % 3 === 1 ? "Google Pixel" : "HP") : "None";
                    
                    let levelBadge = (
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-stone-50 text-stone-500 border-stone-200">
                        Standard Customer
                      </span>
                    );
                    if (u.customerType === "PREMIUM") {
                      levelBadge = (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-orange-50 text-orange-700 border-orange-200">
                          Premium Customer
                        </span>
                      );
                    } else if (u.customerType === "VIP") {
                      levelBadge = (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-red-50 text-red-700 border-red-200">
                          VIP Customer
                        </span>
                      );
                    }

                    return (
                      <tr key={u.id} className="hover:bg-stone-50/40">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-stone-900 block">{u.name}</span>
                          <span className="text-[10px] text-stone-400 block">{u.email}</span>
                        </td>
                        <td className="px-4 py-3">{levelBadge}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-800">{realOrdersCount} orders</td>
                        <td className="px-4 py-3 text-stone-600 font-medium">{favoriteBrand}</td>
                        <td className="px-4 py-3 text-stone-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-stone-550 whitespace-nowrap">
                          {formatLastLogin(u.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <select
                              value={u.customerType || "STANDARD"}
                              onChange={async (e) => {
                                try {
                                  await updateCustomerAction(u.id, { customerType: e.target.value });
                                  toast.success("Customer level updated successfully!");
                                  router.refresh();
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to update level");
                                }
                              }}
                              className="px-2 py-1 bg-stone-50 border rounded text-[10px] outline-none text-stone-700 cursor-pointer mr-1"
                            >
                              <option value="STANDARD">Standard</option>
                              <option value="PREMIUM">Premium</option>
                              <option value="VIP">VIP</option>
                            </select>
                            <button
                              onClick={() => openViewModal(u)}
                              className="p-1 text-orange-600 hover:bg-orange-50 border border-orange-200 rounded cursor-pointer"
                              title="View Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openResetModal(u)}
                              className="p-1 text-amber-600 hover:bg-amber-50 border border-amber-250 rounded cursor-pointer"
                              title="Reset Password"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button
                               onClick={() => handleToggleCustomerStatus(u)}
                               className={`p-1 border rounded cursor-pointer ${u.status === "ACTIVE" ? "text-red-600 hover:bg-red-50 border-red-200" : "text-emerald-600 hover:bg-emerald-50 border-emerald-250"}`}
                               title={u.status === "ACTIVE" ? "Disable Customer" : "Enable Customer"}
                             >
                               {u.status === "ACTIVE" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADD CUSTOMER MODAL */}
          {mounted && isAddOpen && createPortal(
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in fade-in-30">
              <form onSubmit={handleAddCustomerSubmit} className="bg-white rounded-2xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-stone-900 font-outfit">Add New Customer</h4>
                  <button type="button" onClick={() => setIsAddOpen(false)} className="text-stone-400 hover:text-stone-700 text-sm font-bold">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="john.doe@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="Min 6 chars"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Customer Level</label>
                      <select
                        value={addLevel}
                        onChange={(e) => setAddLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="STANDARD">Standard</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Operational Address</label>
                    <textarea
                      placeholder="Enter customer's physical/billing address..."
                      value={addAddress}
                      onChange={(e) => setAddAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors">Add Customer</button>
                </div>
              </form>
            </div>,
            document.body
          )}

          {/* VIEW DETAILS MODAL */}
          {mounted && isViewOpen && selectedCust && createPortal(
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in fade-in-30">
              <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-stone-900 font-outfit">Customer Profile details</h4>
                  <button onClick={() => setIsViewOpen(false)} className="text-stone-400 hover:text-stone-700 text-sm font-bold">✕</button>
                </div>
                 <div className="space-y-2 text-xs text-stone-650">
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Name:</span> <span className="font-bold text-stone-900">{selectedCust.name}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Customer Level:</span> <span className="font-bold text-stone-900">{selectedCust.customerType || "STANDARD"}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Email:</span> <span>{selectedCust.email}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Phone:</span> <span>{selectedCust.phone || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Address:</span> <span>{selectedCust.address || "N/A"}</span></div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-500">Orders:</span>
                    <span className="font-bold text-stone-900">
                      {purchaseOrders.filter(po => po.customerId === selectedCust.id).length} orders
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-500">Favorite Brand:</span>
                    <span className="font-bold text-stone-900">
                      {purchaseOrders.filter(po => po.customerId === selectedCust.id).length > 0 
                        ? (selectedCust.name?.length % 3 === 0 ? "Apple" : selectedCust.name?.length % 3 === 1 ? "Google Pixel" : "HP")
                        : "None"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Registration Date:</span> <span>{new Date(selectedCust.createdAt).toLocaleString()}</span></div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-500">Last Login:</span>
                    <span className="font-bold text-orange-600">
                      {formatLastLogin(selectedCust.lastLoginAt)}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="font-semibold text-stone-500">Status:</span> <span className="font-bold text-orange-600">{selectedCust.status}</span></div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-colors">Close</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* EDIT DETAILS MODAL */}
          {mounted && isEditOpen && selectedCust && createPortal(
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in fade-in-30">
              <form onSubmit={handleEditCustomerSubmit} className="bg-white rounded-2xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-stone-900 font-outfit">Edit Customer Information</h4>
                  <button type="button" onClick={() => setIsEditOpen(false)} className="text-stone-400 hover:text-stone-700 text-sm font-bold">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Operational Address</label>
                    <textarea
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors">Save Changes</button>
                </div>
              </form>
            </div>,
            document.body
          )}

          {/* RESET PASSWORD MODAL */}
          {mounted && isResetOpen && selectedCust && createPortal(
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in fade-in-30">
              <form onSubmit={handleResetPasswordSubmit} className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-stone-900 font-outfit">Reset Customer Password</h4>
                  <button type="button" onClick={() => setIsResetOpen(false)} className="text-stone-400 hover:text-stone-700 text-sm font-bold">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={resetPass}
                      onChange={(e) => setResetPass(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsResetOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors">Update Password</button>
                </div>
              </form>
            </div>,
            document.body
          )}
        </div>
      }

      {/* --- AUDIT LOGS VIEW --- */}
      {activeSubpage === "audit-logs" && (
        <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-orange-500" />
            <span>Central Audit Trails System</span>
          </h3>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-stone-55 sticky top-0 border-b border-stone-200">
                <tr className="text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action Code</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/40">
                    <td className="px-4 py-3 text-[10px] text-stone-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800 whitespace-nowrap">{log.user?.name || "System Operations"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-650" title={log.details}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SYSTEM CONFIG VIEW --- */}
      {activeSubpage === "system-config" && (
        <SystemConfigPanel />
      )}

      {/* --- BRANCH MANAGEMENT VIEW --- */}
      {activeSubpage === "branches" && (
        <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl animate-in fade-in-50 duration-200 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
            <Building className="w-5 h-5 text-orange-500" />
            <span>Regional Branches Configurations</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { code: "HYD-CORP", name: "Hyderabad (Ameerpet Office)", state: "Telangana", gst: 36 },
              { code: "HYD-THUB", name: "Hyderabad (T-Hub)", state: "Telangana", gst: 36 },
              { code: "HYD-JUBILEE", name: "Hyderabad (Jubilee Hills)", state: "Telangana", gst: 36 },
              { code: "BLR", name: "Bengaluru", state: "Karnataka", gst: 29 },
              { code: "CHN", name: "Chennai", state: "Tamil Nadu", gst: 33 },
              { code: "MUM", name: "Mumbai", state: "Maharashtra", gst: 27 },
              { code: "GUR", name: "Gurgaon", state: "Delhi NCR", gst: 7 },
              { code: "VTZ", name: "Visakhapatnam", state: "Andhra Pradesh", gst: 37 },
              { code: "VJA", name: "Vijayawada", state: "Andhra Pradesh", gst: 37 },
            ].map(b => (
              <div key={b.code} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs text-stone-600">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 text-sm">{b.name}</span>
                  <span className="text-orange-600 font-mono">#{b.code}</span>
                </div>
                <span>State: {b.state}</span>
                <span className="block text-[10px] text-stone-400">GSTIN State Prefix: {b.gst}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ALL REPORTS VIEW --- */}
      {activeSubpage === "all-reports" && (
        <div className="glass-panel p-6 bg-white border border-[#fed7aa] rounded-2xl animate-in fade-in-50 duration-200 space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <span>Cross-Region Financial & Stock returns</span>
            </h3>
            <img src="/logo.png" alt="Conquer Logo" className="h-9 object-contain" />
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Regional Branch</th>
                  <th className="px-4 py-3 text-right">Revenue Generated</th>
                  <th className="px-4 py-3 text-right">Purchase Orders Logged</th>
                  <th className="px-4 py-3 text-right">Invoiced Tax Collected</th>
                  <th className="px-4 py-3 text-right">Warehouse stock (Units)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[
                  { code: "HYD", name: "Hyderabad (HYD)" },
                  { code: "BLR", name: "Bangalore (BLR)" },
                  { code: "MUM", name: "Mumbai (MUM)" },
                  { code: "CHN", name: "Chennai (CHN)" },
                  { code: "DEL", name: "Delhi (DEL)" },
                ].map(b => {
                  const rev = branchInvoiceRev[b.code] || 0;
                  const poCount = branchPoCount[b.code] || 0;
                  const tax = branchInvoiceTax[b.code] || 0;
                  const stock = branchInventoryCount[b.code] || 0;

                  return (
                    <tr key={b.code} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-semibold text-stone-900">{b.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-stone-850">₹{rev.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-stone-500">{poCount} Orders</td>
                      <td className="px-4 py-3 text-right text-stone-500">₹{tax.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-bold">{stock} Units</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EMPLOYEES VIEW --- */}
      {activeSubpage === "employees" && (
        <EmployeesView users={users} formatLastLogin={formatLastLogin} />
      )}
    </div>
  );
}

// ─── Employees Sub-Component ────────────────────────────────────────────────
function EmployeesView({ users, formatLastLogin }: { users: any[]; formatLastLogin: (d: any) => string }) {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  // Get role name from the included relation or fallback to roleId
  const getRoleName = (emp: any): string => emp?.role?.name || emp?.roleId || "";

  // Get branch name from the included relation or branchName field
  const getBranchName = (emp: any): string => emp?.branch?.name || emp?.branchName || "";

  // Filter out customers — compare by role.name
  const employees = users.filter(u => {
    const roleName = getRoleName(u);
    return roleName !== "CUSTOMER" && roleName !== "";
  });

  // Collect unique branches and roles dynamically from actual data
  const allBranches = ["All", ...Array.from(new Set(
    employees.map(e => getBranchName(e)).filter(Boolean)
  )).sort()];

  const allRoles = ["All", ...Array.from(new Set(
    employees.map(e => getRoleName(e)).filter(Boolean)
  )).sort()];

  const filtered = employees.filter(emp => {
    const matchSearch = !search ||
      (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "All" || getBranchName(emp) === branchFilter;
    const matchRole = roleFilter === "All" || getRoleName(emp) === roleFilter;
    return matchSearch && matchBranch && matchRole;
  });

  const getRoleBadge = (roleName: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      SUPER_ADMIN: { bg: "bg-purple-100", text: "text-purple-700", label: "Super Admin" },
      ADMIN: { bg: "bg-orange-100", text: "text-orange-700", label: "Admin" },
      EMPLOYEE: { bg: "bg-blue-100", text: "text-blue-700", label: "Employee" },
      SALES_HEAD: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Sales Head" },
      BRANCH_MANAGER: { bg: "bg-amber-100", text: "text-amber-700", label: "Branch Manager" },
      REGIONAL_SALES_MANAGER: { bg: "bg-teal-100", text: "text-teal-700", label: "RSM" },
      SALES_MANAGER: { bg: "bg-sky-100", text: "text-sky-700", label: "Sales Manager" },
      SALES_EXECUTIVE: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Sales Executive" },
    };
    return map[roleName] || { bg: "bg-stone-100", text: "text-stone-600", label: roleName || "Unknown" };
  };

  const getStatusDot = (status: string) => {
    if (status === "ACTIVE") return "bg-emerald-500";
    if (status === "PENDING") return "bg-amber-400";
    return "bg-red-400";
  };


  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-stone-900 flex items-center space-x-2 font-outfit">
              <Users className="w-5 h-5" style={{ color: "#8c3120" }} />
              <span>Employee Directory</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">All internal staff, admins, and management across branches</p>
          </div>
          {/* Stats strip */}
          <div className="flex items-center gap-4 shrink-0">
            {[
              { label: "Total Staff", val: employees.length, color: "text-stone-900" },
              { label: "Active", val: employees.filter(e => e.status === "ACTIVE").length, color: "text-emerald-600" },
              { label: "Pending", val: employees.filter(e => e.status === "PENDING").length, color: "text-amber-500" },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200">
                <p className={`text-lg font-black ${s.color} font-outfit`}>{s.val}</p>
                <p className="text-[9px] text-stone-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 flex items-center bg-white border border-stone-200 rounded-xl px-3 py-2.5 gap-2.5 focus-within:border-[#8c3120] focus-within:shadow-[0_0_0_3px_rgba(140,49,32,0.07)] transition-all">
          <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-xs text-stone-800 placeholder-stone-400 font-medium"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-stone-400 hover:text-stone-600 transition-colors">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Branch Filter */}
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none cursor-pointer focus:border-[#8c3120] transition-all min-w-[180px]"
        >
          {allBranches.map(b => (
            <option key={b} value={b}>{b === "All" ? "All Branches" : b}</option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none cursor-pointer focus:border-[#8c3120] transition-all min-w-[140px]"
        >
          {allRoles.map(r => (
            <option key={r} value={r}>{r === "All" ? "All Roles" : r.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-stone-400 font-medium">
          Showing <span className="font-bold text-stone-700">{filtered.length}</span> of {employees.length} employees
          {branchFilter !== "All" && <span> · Branch: <span className="text-[#8c3120] font-bold">{branchFilter}</span></span>}
          {roleFilter !== "All" && <span> · Role: <span className="text-[#8c3120] font-bold">{roleFilter}</span></span>}
        </p>
        {(search || branchFilter !== "All" || roleFilter !== "All") && (
          <button
            onClick={() => { setSearch(""); setBranchFilter("All"); setRoleFilter("All"); }}
            className="text-[11px] font-bold hover:underline transition-colors"
            style={{ color: "#8c3120" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Employee Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-stone-400 italic text-xs">
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map(emp => {
                  const badge = getRoleBadge(getRoleName(emp));
                  const initials = (emp.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={emp.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                            style={{ background: "linear-gradient(135deg, #8c3120, #e06246)" }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-xs">{emp.name || "—"}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">{emp.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-stone-600 font-medium">{getBranchName(emp) || <span className="text-stone-300 italic">Unassigned</span>}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(emp.status)}`} />
                          <span className={`font-semibold ${emp.status === "ACTIVE" ? "text-emerald-600" : emp.status === "PENDING" ? "text-amber-500" : "text-red-500"}`}>
                            {emp.status || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-500">{formatLastLogin(emp.lastLogin || emp.updatedAt)}</td>
                      <td className="px-4 py-3.5 text-stone-500">{emp.phone || <span className="text-stone-300 italic">—</span>}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
