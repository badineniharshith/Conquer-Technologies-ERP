"use client";

import { useState } from "react";
import { Plus, Users, UserCheck, UserX, Globe, X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AssignUsersClientProps {
  initialUsers: any[];
}

export default function AssignUsersClient({ initialUsers }: AssignUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [companyDomain, setCompanyDomain] = useState("oracle.in"); // Default company domain tag
  const [profession, setProfession] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [loading, setLoading] = useState(false);

  const MAX_USERS = 5;
  const isLimitReached = users.length >= MAX_USERS;

  // KPIs
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === "Active" || u.status === "ACTIVE").length;
  const inactiveCount = users.filter((u) => u.status === "Inactive" || u.status === "INACTIVE").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLimitReached) {
      toast.error(`Maximum corporate user limit reached (${MAX_USERS}/${MAX_USERS} users).`);
      return;
    }

    if (!name.trim() || !username.trim() || !password || !confirmPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username: username.trim(),
          domain: companyDomain.trim(),
          profession,
          designation,
          password,
          confirmPassword,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user.");
      }

      toast.success(data.message || "User created successfully!");
      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
      }
      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUsername("");
    setProfession("");
    setDesignation("");
    setPassword("");
    setConfirmPassword("");
    setStatus("Active");
  };

  return (
    <div className="space-y-6 text-stone-850">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 font-outfit tracking-tight">Assign Users</h1>
          <p className="text-stone-500 text-xs mt-1">
            Manage organization team members permitted to place hardware orders under corporate account.
          </p>
        </div>

        <button
          onClick={() => {
            if (isLimitReached) {
              toast.error(`Maximum limit reached (${MAX_USERS}/${MAX_USERS} users allocated).`);
              return;
            }
            setIsModalOpen(true);
          }}
          disabled={isLimitReached}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 ${
            isLimitReached
              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-[#EA580C] hover:bg-orange-600 text-white cursor-pointer"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Create User ({totalUsers}/{MAX_USERS})</span>
        </button>
      </div>

      {/* Max User Alert Banner if reached */}
      {isLimitReached && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800 font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Maximum User Limit Reached ({totalUsers}/{MAX_USERS})</strong> — Corporate accounts are capped at a maximum of 5 users. Contact your Conquer SCM Manager to expand seat allocation.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Users</span>
            <span className="text-2xl font-black text-stone-900 block mt-1">{totalUsers} <span className="text-xs font-normal text-stone-400">/ {MAX_USERS} max</span></span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active */}
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Active</span>
            <span className="text-2xl font-black text-emerald-700 block mt-1">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Inactive */}
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Inactive</span>
            <span className="text-2xl font-black text-stone-600 block mt-1">{inactiveCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Allowed Domain Tag */}
        <div className="bg-white p-5 border border-stone-200 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Allowed Company Tag</span>
            <span className="text-sm font-extrabold text-orange-600 block mt-1 font-mono">@{companyDomain}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Profession</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone-400 italic">
                    <p className="text-sm font-semibold text-stone-600">No users created yet.</p>
                    <p className="text-xs text-stone-400 mt-1">Click 'Create User' to assign up to {MAX_USERS} team members ending with @{companyDomain}.</p>
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-stone-900 block">{u.name}</span>
                        <span className="text-[10px] font-mono text-stone-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700 font-medium">{u.profession || "Engineering"}</td>
                    <td className="px-4 py-3 text-stone-700 font-medium">{u.designation || "Software Engineer"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        u.status === "Active" || u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-600 border-stone-200"
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-medium">
                      {new Date(u.created_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-between items-center text-xs text-stone-500 font-medium">
          <span>Showing {users.length} of max {MAX_USERS} users</span>
          <div className="flex space-x-2">
            <button disabled className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-stone-400 cursor-not-allowed">Previous</button>
            <button disabled className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-stone-400 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

      {/* CREATE USER OVERLAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden space-y-5"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center space-x-2">
                <span>+ Create Corporate User ({totalUsers + 1}/{MAX_USERS})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Company Domain Selection */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Company Tag / Domain *</label>
                <select
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:border-orange-500"
                >
                  <option value="oracle.in">@oracle.in</option>
                  <option value="acceldata.io">@acceldata.io</option>
                  <option value="reliance.com">@reliance.com</option>
                  <option value="tata.com">@tata.com</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-medium"
                />
              </div>

              {/* Email Split Input */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Company Email *</label>
                <div className="flex rounded-xl overflow-hidden border border-stone-200 focus-within:border-orange-500">
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 bg-stone-50 text-xs outline-none focus:bg-white text-stone-850 font-mono font-medium"
                  />
                  <div className="bg-stone-100 border-l border-stone-200 px-3 py-2.5 text-xs font-mono font-bold text-stone-600 flex items-center shrink-0">
                    @{companyDomain}
                  </div>
                </div>
                <p className="text-[10px] text-stone-400 italic mt-1">
                  All corporate users must end with company tag @{companyDomain}.
                </p>
              </div>

              {/* Profession */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Profession</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering / DevOps"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-medium"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Set temporary password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status Toggle Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <span className="block text-xs font-bold text-stone-800">Account Status *</span>
                  <span className="text-[10px] text-stone-400">Set active permission for corporate ordering.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(status === "Active" ? "Inactive" : "Active")}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                    status === "Active" ? "bg-emerald-500 justify-end" : "bg-stone-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex justify-end space-x-2 bg-stone-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 px-5 py-2 bg-[#EA580C] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? "Saving..." : "✓ Save User"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
