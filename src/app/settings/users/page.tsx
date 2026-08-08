"use client";

import { useState, useEffect, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Users, UserPlus, Shield, Building, Search, CheckCircle, XCircle,
  RefreshCw, ChevronDown, Mail, Phone, MapPin, Hash, Edit2, Power
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserManagementPage() {
  const { activeUser } = useErpStore();
  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN";

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    id: "", name: "", email: "", phone: "",
    roleId: "OPERATIONS_EXECUTIVE", branchId: "",
    reportsToId: "", status: "ACTIVE", password: "",
  });

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?userId=${activeUser?.id || ""}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setRoles(data.roles || []);
        setBranches(data.branches || []);
      } else {
        toast.error(data.error || "Failed to load users");
      }
    } catch {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsersData(); }, [activeUser]);

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id, name: user.name || "", email: user.email || "",
        phone: user.phone || "", roleId: user.roleId || "OPERATIONS_EXECUTIVE",
        branchId: user.branchId || "", reportsToId: user.reportsToId || "",
        status: user.status || "ACTIVE", password: "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        id: "", name: "", email: "", phone: "",
        roleId: "OPERATIONS_EXECUTIVE", branchId: branches[0]?.id || "",
        reportsToId: "", status: "ACTIVE", password: "",
      });
    }
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) { toast.error("Only Super Admin can modify accounts."); return; }
    try {
      const method = editingUser ? "PUT" : "POST";
      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingUser ? "User updated!" : "User created!");
        setModalOpen(false);
        fetchUsersData();
      } else {
        toast.error(data.error || "Operation failed.");
      }
    } catch { toast.error("An unexpected error occurred."); }
  };

  const handleToggleStatus = async (user: any) => {
    if (!isSuperAdmin) { toast.error("Only Super Admin can change status."); return; }
    const newStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Account ${newStatus === "ACTIVE" ? "activated" : "disabled"}`);
        fetchUsersData();
      } else { toast.error("Failed to update status."); }
    } catch { toast.error("Error updating account status."); }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const roleName = u.roleName || u.role?.name || u.roleId || "";
      const matchesSearch =
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.customerId?.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === "ALL" ||
        roleName.toUpperCase() === roleFilter.toUpperCase() ||
        u.roleId === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const getRoleBadge = (user: any) => {
    const roleName = user.roleName || user.role?.name || user.roleId || "";
    const map: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      DIRECTOR_OPERATIONS: "bg-rose-50 text-rose-700 border-rose-200",
      OPERATIONS_MANAGER: "bg-amber-50 text-amber-700 border-amber-200",
      ASSISTANT_MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
      OPERATIONS_EXECUTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CUSTOMER: "bg-stone-100 text-stone-600 border-stone-200",
    };
    return map[roleName] || "bg-stone-50 text-stone-600 border-stone-200";
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const roleHierarchy: Record<string, string> = {
    CUSTOMER: "OPERATIONS_EXECUTIVE",
    OPERATIONS_EXECUTIVE: "ASSISTANT_MANAGER",
    ASSISTANT_MANAGER: "OPERATIONS_MANAGER",
    OPERATIONS_MANAGER: "DIRECTOR_OPERATIONS",
    DIRECTOR_OPERATIONS: "SUPER_ADMIN",
  };

  const reportsToOptions = useMemo(() => {
    return users.filter(u => {
      if (u.id === formData.id) return false;
      const roleName = u.roleName || u.role?.name || u.roleId || "";
      return roleName !== "CUSTOMER";
    });
  }, [users, formData.id]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === "ACTIVE").length,
    employees: users.filter(u => (u.roleName || u.role?.name || u.roleId) !== "CUSTOMER").length,
    customers: users.filter(u => (u.roleName || u.role?.name || u.roleId) === "CUSTOMER").length,
  }), [users]);

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 text-white shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-stone-900 tracking-tight">User Management</h1>
            <p className="text-xs text-stone-400 mt-0.5">Manage employee accounts, roles, reporting lines, and permissions.</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button onClick={() => handleOpenModal()} className="btn-primary px-5 py-2.5 text-sm flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-primary-500" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Employees", value: stats.employees, icon: Shield, color: "text-blue-600" },
          { label: "Customers", value: stats.customers, icon: Building, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-stone-50 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">{s.value}</div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card p-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID, customer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 input-field"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field text-xs font-semibold w-full sm:w-48"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="DIRECTOR_OPERATIONS">Director of Operations</option>
            <option value="OPERATIONS_MANAGER">Operations SCM Manager</option>
            <option value="ASSISTANT_MANAGER">Assistant Manager</option>
            <option value="OPERATIONS_EXECUTIVE">Operations Executive</option>
            <option value="CUSTOMER">Customer</option>
            {roles.map(r => (
              !["SUPER_ADMIN", "ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE", "CUSTOMER"].includes(r.name) && (
                <option key={r.id} value={r.name || r.id}>{r.name}</option>
              )
            ))}
          </select>
          <button onClick={fetchUsersData} className="btn-ghost px-3 py-2 text-xs flex items-center space-x-1.5 shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-stone-50/80 text-[10px] font-black uppercase tracking-wider text-stone-400 border-b border-stone-200/60">
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">ID</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5 hidden md:table-cell">Branch</th>
                <th className="py-3.5 px-5 hidden lg:table-cell">Reports To</th>
                <th className="py-3.5 px-5">Status</th>
                {isSuperAdmin && <th className="py-3.5 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-stone-400 font-medium">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-primary-500 animate-spin" />
                    <span className="text-xs">Loading accounts...</span>
                  </div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-stone-400 font-medium text-xs">No users found matching query.</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="table-row-hover">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getRoleBadge(u)}`}>
                          {getInitials(u.name || "?")}
                        </div>
                        <div>
                          <div className="font-bold text-stone-850 text-xs">{u.name}</div>
                          <div className="text-[10px] text-stone-400 flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[10px] font-mono font-bold text-stone-500">
                        {u.employeeId || u.customerId || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getRoleBadge(u)}`}>
                        {u.roleName || u.role?.name || u.roleId.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 hidden md:table-cell">
                      <span className="text-[10px] font-medium text-stone-500 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{u.branch?.name || u.branchName || "Head Office"}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <span className="text-[10px] text-stone-400">{u.reportsTo?.name || "—"}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      {u.status === "ACTIVE" ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /><span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <XCircle className="w-3 h-3" /><span>{u.status}</span>
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3.5 px-5 text-right space-x-1.5">
                        <button onClick={() => handleOpenModal(u)} className="btn-ghost px-2.5 py-1.5 text-[10px] inline-flex items-center space-x-1">
                          <Edit2 className="w-3 h-3" /><span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                            u.status === "ACTIVE"
                              ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600"
                              : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600"
                          }`}
                        >
                          <Power className="w-3 h-3 inline mr-0.5" />
                          {u.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
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
                <h3 className="text-base font-bold font-outfit text-stone-900">
                  {editingUser ? "Edit User Account" : "Create New Account"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors">✕</button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field" placeholder="e.g. John Doe" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field" placeholder="john@conquererp.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field" placeholder="+91 98765 00000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Role</label>
                    <select value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: e.target.value, reportsToId: "" })}
                      className="input-field text-xs font-semibold">
                      {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Branch</label>
                    <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="input-field text-xs font-semibold">
                      <option value="">None / Head Office</option>
                      {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Reports To (Manager)</label>
                  <select value={formData.reportsToId} onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })}
                    className="input-field text-xs font-semibold">
                    <option value="">None (Top Level)</option>
                    {reportsToOptions.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role?.name || u.roleId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field text-xs font-semibold">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                      {editingUser ? "Reset Password" : "Password"}
                    </label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field" placeholder={editingUser ? "Leave blank to keep current" : "Default: Admin@123"} />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-3 border-t border-stone-100">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
                  <button type="submit" className="btn-primary px-5 py-2 text-xs">Save Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
