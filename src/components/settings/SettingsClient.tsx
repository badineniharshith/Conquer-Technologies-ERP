"use client";

import { useState, useMemo } from "react";
import { useErpStore } from "@/lib/store";
import { 
  updateUserStatusAction, 
  resetCustomerPasswordAction, 
  logoutUserAction,
  createAdministrativeUserAction,
  updateUserAction,
  updateBranchPermissionsAction
} from "@/app/actions";
import { toast } from "sonner";
import {
  User,
  Sliders,
  Building,
  Lock,
  LogOut,
  ShieldCheck,
  Server,
  Plus,
  Trash2,
  Edit2,
  Save,
  Key,
  Users,
  Briefcase,
  UserCheck,
  UserX,
  Smartphone,
  CheckCircle,
  Globe,
  Bell,
  Sparkles,
  Database,
  Monitor,
  Search,
  FileSpreadsheet
} from "lucide-react";
import { useRouter } from "next/navigation";
import SystemConfigPanel from "../admin/SystemConfigPanel";

interface SettingsClientProps {
  users: any[];
  roles: any[];
  branches?: any[];
  auditLogs: any[];
}

export default function SettingsClient({ users, roles, branches = [], auditLogs }: SettingsClientProps) {
  const { activeRole, activeUser, theme, toggleTheme, logoutSession } = useErpStore();
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

  const currentUserData = users.find(u => u.id === activeUser?.id);

  const [activeTab, setActiveTab] = useState("general");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Profile & General Form States
  const [profileName, setProfileName] = useState(activeUser?.name || "ERP Administrator");
  const [profileEmail, setProfileEmail] = useState(activeUser?.email || "admin@conquererp.com");
  const [profilePhone, setProfilePhone] = useState("9876543210");
  const [profilePassword, setProfilePassword] = useState("••••••••");
  
  const [companyName, setCompanyName] = useState("Conquer ERP HQ");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [language, setLanguage] = useState("en");

  // Notifications States
  const [notiEmail, setNotiEmail] = useState(true);
  const [notiPush, setNotiPush] = useState(true);
  const [notiSms, setNotiSms] = useState(false);
  const [notiInventory, setNotiInventory] = useState(true);
  const [notiLowStock, setNotiLowStock] = useState(true);

  // Appearance States
  const [density, setDensity] = useState("Comfort");
  const [accentColor, setAccentColor] = useState("Orange");



  // Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enable2FA, setEnable2FA] = useState(false);

  // Mock Active Sessions State
  const [sessions, setSessions] = useState([
    { id: "sess-1", device: "Chrome / Windows 11", location: "Bengaluru, India", ip: "157.45.12.98", active: true },
    { id: "sess-2", device: "Safari / iPhone 15", location: "Hyderabad, India", ip: "192.168.1.45", active: false },
    { id: "sess-3", device: "ERP Client App / iPad OS", location: "Mumbai, India", ip: "103.88.23.4", active: false }
  ]);

  // Developer Console Logs
  const [devConsoleLogs, setDevConsoleLogs] = useState([
    { id: "log-1", name: "Conquer Admin", email: "admin@conquererp.com", status: "SUCCESS", browser: "Chrome / Windows 11", ip: "157.45.12.98", loginTime: "2026-07-03 10:15 AM", logoutTime: "2026-07-03 11:30 AM", duration: "1h 15m", active: false },
    { id: "log-2", name: "Hyderabad Manager", email: "hyd@conquererp.com", status: "SUCCESS", browser: "Chrome / Windows 11", ip: "192.168.1.45", loginTime: "2026-07-03 11:45 AM", logoutTime: "2026-07-03 12:50 PM", duration: "1h 05m", active: false },
    { id: "log-3", name: "Bengaluru RSM", email: "blr@conquererp.com", status: "SUCCESS", browser: "Safari / iPhone 15", ip: "103.88.23.4", loginTime: "2026-07-03 01:20 PM", logoutTime: "Active Session", duration: "Active", active: true },
    { id: "log-4", name: "Unknown User", email: "hack@attacker.com", status: "FAILED", browser: "Firefox / Linux", ip: "203.0.113.88", loginTime: "2026-07-03 02:40 PM", logoutTime: "-", duration: "-", active: false },
    { id: "log-5", name: "Chennai Sales RSM", email: "chn@conquererp.com", status: "SUCCESS", browser: "Chrome / macOS", ip: "182.72.44.112", loginTime: "2026-07-03 03:10 PM", logoutTime: "2026-07-03 04:30 PM", duration: "1h 20m", active: false },
    { id: "log-6", name: "Mumbai Sales Executive", email: "mumbai@conquererp.com", status: "SUCCESS", browser: "Safari / iPad OS", ip: "122.160.2.14", loginTime: "2026-07-03 04:15 PM", logoutTime: "Active Session", duration: "Active", active: true },
    { id: "log-7", name: "Unknown User", email: "admin@conquererp.com", status: "FAILED", browser: "Chrome / Windows 10", ip: "198.51.100.12", loginTime: "2026-07-03 04:45 PM", logoutTime: "-", duration: "-", active: false },
    { id: "log-8", name: "Gurgaon Staff Member", email: "gurgaon@conquererp.com", status: "SUCCESS", browser: "Firefox / Windows 11", ip: "115.110.12.98", loginTime: "2026-07-03 05:00 PM", logoutTime: "2026-07-03 05:45 PM", duration: "45m", active: false }
  ]);

  // Dev Console Filters
  const [devSearch, setDevSearch] = useState("");
  const [devBrowserFilter, setDevBrowserFilter] = useState("All");
  const [devStatusFilter, setDevStatusFilter] = useState("All");
  const [devPage, setDevPage] = useState(1);

  const filteredDevLogs = useMemo(() => {
    return devConsoleLogs.filter(log => {
      const matchesSearch = log.name.toLowerCase().includes(devSearch.toLowerCase()) || 
                            log.email.toLowerCase().includes(devSearch.toLowerCase()) ||
                            log.ip.includes(devSearch);
      
      const matchesBrowser = devBrowserFilter === "All" || 
                            (devBrowserFilter === "Chrome" && log.browser.includes("Chrome")) ||
                            (devBrowserFilter === "Safari" && log.browser.includes("Safari")) ||
                            (devBrowserFilter === "Firefox" && log.browser.includes("Firefox"));
      
      const matchesStatus = devStatusFilter === "All" || log.status === devStatusFilter;

      return matchesSearch && matchesBrowser && matchesStatus;
    });
  }, [devConsoleLogs, devSearch, devBrowserFilter, devStatusFilter]);

  const devConsoleItemsPerPage = 5;
  const totalDevPages = Math.ceil(filteredDevLogs.length / devConsoleItemsPerPage) || 1;
  const paginatedDevLogs = filteredDevLogs.slice((devPage - 1) * devConsoleItemsPerPage, devPage * devConsoleItemsPerPage);

  const handleExportDevLogs = () => {
    let csv = "User,Email,Status,Browser,IP,Login Time,Logout Time,Session Duration\n";
    filteredDevLogs.forEach(log => {
      csv += `"${log.name}","${log.email}","${log.status}","${log.browser}","${log.ip}","${log.loginTime}","${log.logoutTime}","${log.duration}"\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conquer_developer_logs_${Date.now()}.csv`;
    link.click();
    toast.success("Logs exported successfully.");
  };

  // Roles & Permissions States (Super Admin)
  const [rolesList, setRolesList] = useState(roles);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  
  // Permission Matrix State
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    SUPER_ADMIN: { "view_catalog": true, "edit_products": true, "manage_stock": true, "manage_prices": true, "manage_users": true },
    ADMIN: { "view_catalog": true, "edit_products": true, "manage_stock": true, "manage_prices": true, "manage_users": false },
    EMPLOYEE: { "view_catalog": true, "edit_products": true, "manage_stock": true, "manage_prices": false, "manage_users": false },
    CUSTOMER: { "view_catalog": true, "edit_products": false, "manage_stock": false, "manage_prices": false, "manage_users": false }
  });

  // User Management filters and pagination
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [userPage, setUserPage] = useState(1);

  // User details editing state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserBranch, setEditUserBranch] = useState("");
  const [editUserStatus, setEditUserStatus] = useState("");
  const [editUserInherit, setEditUserInherit] = useState(true);
  const [editUserPermissions, setEditUserPermissions] = useState<string[]>([]);
  const [editUserLoading, setEditUserLoading] = useState(false);

  // Provisioning login ID state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState("EMPLOYEE");
  const [newUserBranch, setNewUserBranch] = useState("None");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserLoading, setNewUserLoading] = useState(false);

  // Branch-wide permissions configuration state
  const [selectedBranchPermId, setSelectedBranchPermId] = useState("");
  const [branchPermissions, setBranchPermissions] = useState<string[]>([]);
  const [branchPermLoading, setBranchPermLoading] = useState(false);

  // Password reset modal state
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPasswordPlain, setResetPasswordPlain] = useState("");

  const ALL_ROUTES = useMemo(() => [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/products", label: "Product Catalog" },
    { path: "/categories", label: "Categories Management" },
    { path: "/pricing", label: "Pricing & Margin Controls" },
    { path: "/price-history", label: "Price Auditing Logs" },
    { path: "/stock-movement", label: "Inventory Movements" },
    { path: "/analytics", label: "Procurement Analytics" },
    { path: "/admin", label: "Admin Operations" },
    { path: "/settings", label: "System Settings" },
    { path: "/reserved-stock", label: "Reserved Stock Locks" }
  ], []);

  const handleBranchSelectForPerm = (branchId: string) => {
    setSelectedBranchPermId(branchId);
    if (!branchId) {
      setBranchPermissions([]);
      return;
    }
    const branch = branches.find(b => b.id === branchId);
    if (branch?.pagePermissions) {
      try {
        setBranchPermissions(JSON.parse(branch.pagePermissions));
      } catch {
        setBranchPermissions([]);
      }
    } else {
      setBranchPermissions([]);
    }
  };

  const handleBranchPermissionToggle = (path: string) => {
    setBranchPermissions(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        return [...prev, path];
      }
    });
  };

  const handleSaveBranchPermissions = async () => {
    if (!selectedBranchPermId) return;
    setBranchPermLoading(true);
    try {
      const res = await updateBranchPermissionsAction(selectedBranchPermId, JSON.stringify(branchPermissions));
      if (!res.success) {
        toast.error("Failed to save branch permissions.");
      } else {
        toast.success("Branch permissions updated successfully!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update branch permissions.");
    } finally {
      setBranchPermLoading(false);
    }
  };

  // Open Edit Details modal for user
  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setEditUserName(u.name || "");
    setEditUserEmail(u.email || "");
    setEditUserPhone(u.phone || "");
    setEditUserRole(u.roleId || "");
    setEditUserBranch(u.branchName || u.branch || "None");
    setEditUserStatus(u.status || "ACTIVE");
    setEditUserInherit(u.inheritBranchPermissions ?? true);
    
    if (u.pagePermissions) {
      try {
        setEditUserPermissions(JSON.parse(u.pagePermissions));
      } catch {
        setEditUserPermissions([]);
      }
    } else {
      setEditUserPermissions([]);
    }
  };

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const adminUsers = users.filter(
    (u) => u.status === "ACTIVE" && ["SUPER_ADMIN", "ADMIN"].includes(u.roleId)
  );
  const employeeUsers = users.filter(
    (u) => u.status === "ACTIVE" && !["SUPER_ADMIN", "ADMIN", "CUSTOMER"].includes(u.roleId)
  );
  const customerUsers = users.filter((u) => u.roleId === "CUSTOMER");

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            (user.phone && user.phone.includes(userSearch));
      
      const matchesRole = roleFilter === "All" || user.roleId === roleFilter;
      
      const userBranch = user.branchName || user.branch || "None";
      const matchesBranch = branchFilter === "All" || 
                            (branchFilter === "None" && (userBranch === "None" || !userBranch)) ||
                            userBranch === branchFilter;
      
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [users, userSearch, roleFilter, branchFilter]);

  const usersPerPage = 10;
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);
  }, [filteredUsers, userPage]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile details updated successfully!");
  };

  const handleUpdatePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("User preferences saved successfully.");
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    toast.success("Security configurations updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success("Session revoked successfully.");
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const newId = `role-${Date.now()}`;
    setRolesList(prev => [...prev, { id: newId, name: newRoleName.trim() }]);
    toast.success(`Role "${newRoleName}" created successfully.`);
    setNewRoleName("");
  };

  const handleDeleteRole = (id: string) => {
    const role = rolesList.find(r => r.id === id);
    if (["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "CUSTOMER"].includes(role?.name)) {
      toast.error("Cannot delete core system roles.");
      return;
    }
    setRolesList(prev => prev.filter(r => r.id !== id));
    toast.success("Role deleted successfully.");
  };

  const handleStartEditRole = (id: string, name: string) => {
    setEditingRoleId(id);
    setEditingRoleName(name);
  };

  const handleSaveEditRole = () => {
    if (!editingRoleName.trim()) return;
    setRolesList(prev => prev.map(r => r.id === editingRoleId ? { ...r, name: editingRoleName.trim() } : r));
    toast.success("Role updated.");
    setEditingRoleId(null);
  };

  const handlePermissionToggle = (roleKey: string, permKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [permKey]: !prev[roleKey]?.[permKey]
      }
    }));
    toast.success(`Permission updated for role ${roleKey}.`);
  };

  const handleAction = async (userId: string, status: string, role?: string) => {
    setLoadingId(userId);
    try {
      const res = await updateUserStatusAction({
        userId,
        status,
        role,
        adminEmail: activeUser?.email || "admin@conquererp.com"
      });

      if (!res.success) {
        toast.error("Failed to update user profile.");
      } else {
        toast.success(`User updated successfully!`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Operation failed.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPasswordPlain.trim()) return;
    setLoadingId(resetUser.id);
    try {
      const res = await resetCustomerPasswordAction(resetUser.id, resetPasswordPlain);
      if (res.success) {
        toast.success(`Password for ${resetUser.name} updated successfully.`);
        setResetUser(null);
        setResetPasswordPlain("");
      } else {
        toast.error("Failed to reset password.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }
    setNewUserLoading(true);
    try {
      const res = await createAdministrativeUserAction({
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        roleId: newUserRole,
        branchName: newUserBranch,
        passwordPlain: newUserPassword
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`User login ID created successfully for ${newUserName}!`);
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPhone("");
        setNewUserRole("EMPLOYEE");
        setNewUserBranch("None");
        setNewUserPassword("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user.");
    } finally {
      setNewUserLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserLoading(true);
    try {
      const res = await updateUserAction({
        id: editingUser.id,
        name: editUserName,
        email: editUserEmail,
        phone: editUserPhone,
        roleId: editUserRole,
        branchName: editUserBranch,
        status: editUserStatus,
        inheritBranchPermissions: editUserInherit,
        pagePermissions: JSON.stringify(editUserPermissions)
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("User details and page permissions updated successfully!");
        setEditingUser(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update user.");
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out successfully.");
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed.");
    }
  };

  const menuItems = [
    { id: "general", label: "General", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Sliders },

    ...(activeRole === "SUPER_ADMIN" || activeRole === "ADMIN" ? [
      { id: "system", label: "System", icon: Server }
    ] : []),
    ...(activeRole === "SUPER_ADMIN" ? [
      { id: "dev_console", label: "Developer Console", icon: Monitor }
    ] : [])
  ];

  return (
    <div className="space-y-6 text-stone-850">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">System Settings & Controls</h1>
        <p className="text-stone-500 mt-1 text-xs md:text-sm">
          Update profile settings, preferences, security details, and organization controls.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible border-b lg:border-b-0 lg:border-r border-stone-200 pb-2 lg:pb-0 lg:pr-4 gap-1">
          {menuItems.map((item) => {
            const ActiveIcon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/10"
                    : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"
                }`}
              >
                <ActiveIcon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* GENERAL SECTION */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Company Info */}
              <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                  <Building className="w-4 h-4 text-orange-505" />
                  <span>Company Details & Localizations</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Company Logo</label>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-605 font-outfit">
                        ERP
                      </div>
                      <button
                        type="button"
                        onClick={() => toast.success("Logo uploader triggered (simulation).")}
                        className="px-3 py-1.5 border border-stone-250 hover:bg-stone-50 font-bold rounded-lg text-stone-700 cursor-pointer text-xs transition-colors"
                      >
                        Upload Logo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Default Time Zone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white cursor-pointer font-medium"
                    >
                      <option value="UTC">UTC (GMT+0:00)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                      <option value="America/New_York">EST (GMT-5:00)</option>
                      <option value="Europe/London">BST (GMT+1:00)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">System Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white cursor-pointer font-medium"
                    >
                      <option value="INR">INR (₹) Indian Rupee</option>
                      <option value="USD">USD ($) US Dollar</option>
                      <option value="EUR">EUR (€) Euro</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => toast.success("Company localized settings updated successfully.")}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Localizations
                </button>
              </div>

              {/* Personal User Profile */}
              <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                  <User className="w-4 h-4 text-orange-505" />
                  <span>Personal User Profile</span>
                </h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs max-w-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">System Access Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-750 focus:border-orange-500 focus:bg-white cursor-pointer font-medium"
                      >
                        <option value="en">English (US)</option>
                        <option value="es">Spanish (ES)</option>
                        <option value="hi">Hindi (IN)</option>
                        <option value="te">Telugu (IN)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Save Profile Changes
                  </button>
                </form>
                {currentUserData && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 mt-4 max-w-lg">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-500">Account Registration:</span>
                      <span className="font-bold text-stone-850">{new Date(currentUserData.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-500">Last Login Date & Time:</span>
                      <span className="font-bold text-orange-600">{formatLastLogin(currentUserData.lastLoginAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECURITY SECTION */}
          {activeTab === "security" && (
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-5 animate-in fade-in-50 duration-200">
              <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                <Lock className="w-4 h-4 text-orange-505" />
                <span>Security Configurations</span>
              </h3>

              <form onSubmit={handleUpdateSecurity} className="space-y-4 text-xs max-w-lg">
                <h4 className="font-bold text-stone-750 text-xs">Change Password</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-800 focus:border-orange-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t pt-3 space-y-1.5">
                  <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={enable2FA}
                      onChange={(e) => setEnable2FA(e.target.checked)}
                      className="rounded border-stone-300 text-orange-500 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                    />
                    <span>Two-Factor Authentication (2FA)</span>
                  </label>
                  <p className="text-[10px] text-stone-400 pl-6">
                    MFA verification codes will be requested during system login sessions to secure data access.
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-650 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Update Credentials
                </button>
              </form>

              {/* Active Sessions */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <h4 className="font-bold text-stone-700 text-xs flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-orange-505" />
                  <span>Active Login Sessions</span>
                </h4>
                <div className="divide-y divide-stone-100">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-stone-800 block">{sess.device}</span>
                        <span className="text-[10px] text-stone-400 block font-medium">
                          IP: {sess.ip} • Location: {sess.location}
                        </span>
                      </div>
                      <div>
                        {sess.active ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold px-2 py-0.5 rounded uppercase">
                            Current Session
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            className="px-2 py-1 text-[10px] text-rose-600 border border-rose-255 hover:bg-rose-50 font-bold rounded cursor-pointer transition-all active:scale-95"
                          >
                            Revoke Access
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device history list */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <h4 className="font-bold text-stone-700 text-xs flex items-center space-x-1.5">
                  <Monitor className="w-4 h-4 text-orange-505" />
                  <span>Security Device History Logs</span>
                </h4>
                <div className="overflow-x-auto text-[10px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b text-stone-550 font-semibold uppercase">
                        <th className="p-2">Device Name</th>
                        <th className="p-2">IP Address</th>
                        <th className="p-2">Approx Location</th>
                        <th className="p-2 text-right">Last Synchronized</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      <tr className="hover:bg-stone-50/50">
                        <td className="p-2 font-bold">Chrome 126.0 / Windows 11</td>
                        <td className="p-2 font-mono">157.45.12.98</td>
                        <td className="p-2">Bengaluru Corporate HQ</td>
                        <td className="p-2 text-right font-medium">Today, 06:14 PM</td>
                      </tr>
                      <tr className="hover:bg-stone-50/50">
                        <td className="p-2 font-bold">Safari Mobile / iPhone 15</td>
                        <td className="p-2 font-mono">192.168.1.45</td>
                        <td className="p-2">Hyderabad Tech-Hub</td>
                        <td className="p-2 text-right font-medium">Yesterday, 04:30 PM</td>
                      </tr>
                      <tr className="hover:bg-stone-50/50">
                        <td className="p-2 font-bold">ERP Desktop client v1.2 / iPad OS</td>
                        <td className="p-2 font-mono">103.88.23.4</td>
                        <td className="p-2">Mumbai central depot</td>
                        <td className="p-2 text-right font-medium">July 01, 2026, 11:20 AM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SECTION */}
          {activeTab === "notifications" && (
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in-50 duration-200">
              <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                <Bell className="w-4 h-4 text-orange-505" />
                <span>Alert Notifications Settings</span>
              </h3>
              <div className="space-y-4 text-xs">
                <div className="space-y-3">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Notification Channels</span>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={notiEmail}
                        onChange={(e) => setNotiEmail(e.target.checked)}
                        className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                      />
                      <span>Email Notifications alerts</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={notiPush}
                        onChange={(e) => setNotiPush(e.target.checked)}
                        className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                      />
                      <span>Web Push notifications</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={notiSms}
                        onChange={(e) => setNotiSms(e.target.checked)}
                        className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                      />
                      <span>SMS / WhatsApp messages alerts</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Inventory Alert Rules</span>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={notiInventory}
                        onChange={(e) => setNotiInventory(e.target.checked)}
                        className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                      />
                      <span>Critical Inventory depletion warning triggers</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-stone-750 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={notiLowStock}
                        onChange={(e) => setNotiLowStock(e.target.checked)}
                        className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 bg-stone-50 cursor-pointer"
                      />
                      <span>Replenishment low-stock reorder reminders</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => toast.success("Notification configurations saved successfully.")}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Notification Configurations
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE SECTION */}
          {activeTab === "appearance" && (
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in-50 duration-200">
              <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                <Sliders className="w-4 h-4 text-orange-505" />
                <span>Appearance Settings</span>
              </h3>
              <div className="space-y-4 text-xs max-w-md">
                {/* Theme mode */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Visual Theme Mode</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => theme !== "light" && toggleTheme()}
                      className={`flex items-center space-x-1.5 px-4 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        theme === "light"
                          ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                          : "bg-stone-50 border-stone-200 text-stone-655"
                      }`}
                    >
                      <span>☀️ Light Theme</span>
                    </button>
                    <button
                      onClick={() => theme !== "dark" && toggleTheme()}
                      className={`flex items-center space-x-1.5 px-4 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        theme === "dark"
                          ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                          : "bg-stone-50 border-stone-200 text-stone-655"
                      }`}
                    >
                      <span>🌙 Dark Theme (Simulated)</span>
                    </button>
                  </div>
                </div>

                {/* Density */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Layout Density</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white cursor-pointer w-48 font-medium"
                  >
                    <option value="Comfort">Comfort (Standard spacing)</option>
                    <option value="Cozy">Cozy (Reduced margins)</option>
                    <option value="Compact">Compact (Densely aligned)</option>
                  </select>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Accent Color Theme</label>
                  <select
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white cursor-pointer w-48 font-medium"
                  >
                    <option value="Orange">Orange Theme (Default)</option>
                    <option value="Blue">Classic Blue</option>
                    <option value="Emerald">Forest Green Emerald</option>
                    <option value="Indigo">Modern Indigo</option>
                  </select>
                </div>

                <button
                  onClick={() => toast.success("Visual styles updated.")}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Apply Theme Accent Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === "system" && (activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* System Diagnostics */}
              <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                  <Server className="w-4 h-4 text-orange-505" />
                  <span>System Resource Diagnostics</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-stone-50 border p-3 rounded-xl border-stone-200 space-y-0.5">
                    <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Cache Status</span>
                    <span className="font-black text-stone-850 block">94% Clean (1.2 MB)</span>
                    <button
                      onClick={() => toast.success("Systems caching buffers cleared.")}
                      className="text-[9px] text-orange-605 font-bold hover:underline cursor-pointer block pt-1"
                    >
                      Clear Cache
                    </button>
                  </div>
                  <div className="bg-stone-50 border p-3 rounded-xl border-stone-200 space-y-0.5">
                    <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Database Status</span>
                    <span className="font-black text-emerald-655 block">🟢 Operational</span>
                    <span className="text-[9px] text-stone-450 block font-semibold">PostgreSQL Server v15.3</span>
                  </div>
                  <div className="bg-stone-50 border p-3 rounded-xl border-stone-200 space-y-0.5">
                    <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Storage Usage</span>
                    <span className="font-black text-stone-850 block">12.8 MB / 500 MB</span>
                    <span className="text-[9px] text-stone-400 block">2.56% consumed</span>
                  </div>
                  <div className="bg-stone-50 border p-3 rounded-xl border-stone-200 space-y-0.5">
                    <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">ERP Build Version</span>
                    <span className="font-black text-stone-850 block font-mono">v1.4.2-next</span>
                    <span className="text-[9px] text-stone-405 block font-semibold">Next.js 16 production build</span>
                  </div>
                </div>
              </div>

              {/* Core configuration panel */}
              {activeRole === "SUPER_ADMIN" && (
                <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 border-b pb-2">
                    <Database className="w-4 h-4 text-orange-505" />
                    <span>Global Database Credentials config</span>
                  </h3>
                  <SystemConfigPanel />
                </div>
              )}

              {/* Custom Permissions Matrix */}
              {activeRole === "SUPER_ADMIN" && (
                <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
                  <div className="border-b pb-2 flex justify-between items-center text-xs">
                    <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-orange-505" />
                      <span>Roles & Custom Permissions Manager</span>
                    </h3>
                    <span className="text-[9px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-black uppercase tracking-wider border border-orange-100">
                      Super Admin Mode
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Add Custom Role */}
                    <div className="space-y-3 md:border-r md:pr-6 border-stone-200">
                      <span className="font-bold text-stone-750 block">Add Custom system role</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="e.g. AUDITOR"
                          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none text-stone-850 focus:border-orange-500 focus:bg-white text-xs font-bold uppercase tracking-wider"
                        />
                        <button
                          onClick={handleCreateRole}
                          className="flex items-center space-x-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>

                      <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                        <span className="text-[10px] text-stone-400 font-bold uppercase block tracking-wider">Configured Roles</span>
                        {rolesList.map(role => (
                          <div key={role.id} className="flex justify-between items-center p-2 bg-stone-50 border rounded-lg border-stone-200">
                            {editingRoleId === role.id ? (
                              <div className="flex gap-2 flex-1 mr-2">
                                <input
                                  type="text"
                                  value={editingRoleName}
                                  onChange={(e) => setEditingRoleName(e.target.value)}
                                  className="flex-1 px-2 py-0.5 bg-white border rounded uppercase text-xs font-bold"
                                />
                                <button onClick={handleSaveEditRole} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold font-mono tracking-wider text-orange-655 uppercase text-[10px]">
                                {role.name}
                              </span>
                            )}
                            <div className="flex gap-1">
                              {editingRoleId !== role.id && (
                                <button
                                  onClick={() => handleStartEditRole(role.id, role.name)}
                                  className="p-1 text-stone-505 hover:bg-stone-200/50 rounded cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className="space-y-3">
                      <span className="font-bold text-stone-750 block">Roles system Permissions Matrix</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-stone-50 text-stone-550 border-b font-bold">
                              <th className="p-2">Role Name</th>
                              <th className="p-2 text-center">Stock</th>
                              <th className="p-2 text-center">Prices</th>
                              <th className="p-2 text-center">Users</th>

                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-150">
                            {Object.keys(permissions).map((roleKey) => (
                              <tr key={roleKey} className="hover:bg-stone-50/50">
                                <td className="p-2 font-bold font-mono text-stone-700">{roleKey}</td>
                                {["manage_stock", "manage_prices", "manage_users"].map((permKey) => (
                                  <td key={permKey} className="p-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={permissions[roleKey]?.[permKey] || false}
                                      onChange={() => handlePermissionToggle(roleKey, permKey)}
                                      className="rounded border-stone-300 text-orange-505 focus:ring-0 w-3.5 h-3.5 bg-stone-50 cursor-pointer"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Pending Approvals (Super Admin Only) */}
              {activeRole === "SUPER_ADMIN" && pendingUsers.length > 0 && (
                <div className="glass-panel p-5 bg-orange-50/10 border-orange-200 rounded-2xl shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-orange-100">
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-5 h-5 text-orange-505" />
                      <h3 className="font-bold text-sm text-stone-900 font-outfit">Pending User Approvals</h3>
                    </div>
                    <span className="text-[10px] bg-orange-100 border border-orange-200 text-orange-700 font-bold px-2 py-0.5 rounded">
                      {pendingUsers.length} Pending
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pendingUsers.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 rounded-xl border border-stone-200 gap-4"
                      >
                        <div className="space-y-1 text-xs">
                          <h4 className="font-bold text-stone-900">{p.name}</h4>
                          <p className="text-[10px] text-stone-550">Email: {p.email} | Branch: {p.branch || "None"}</p>
                        </div>

                        <div className="flex items-center space-x-3 self-end sm:self-center">
                          <select
                            id={`role-select-${p.id}`}
                            defaultValue="EMPLOYEE"
                            className="px-2 py-1 bg-stone-50 border border-stone-250 rounded text-xs outline-none text-stone-750 cursor-pointer"
                          >
                            {rolesList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => {
                              const select = document.getElementById(`role-select-${p.id}`) as HTMLSelectElement;
                              handleAction(p.id, "ACTIVE", select.value);
                            }}
                            disabled={loadingId !== null}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => handleAction(p.id, "REJECTED")}
                            disabled={loadingId !== null}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consolidated Unified User Management Directory */}
              <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 font-outfit">
                      <Users className="w-5 h-5 text-orange-505" />
                      <span>User Management & Security Logins</span>
                    </h3>
                    <p className="text-stone-500 text-[10px] sm:text-xs mt-0.5">
                      Provision new login IDs, configure individual permissions, or deactivate accounts.
                    </p>
                  </div>
                  {(activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") && (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/10 cursor-pointer self-start sm:self-center shrink-0 transition-all active:scale-95 border-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Login ID</span>
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 cursor-pointer font-semibold focus:border-orange-500"
                    >
                      <option value="All">All Roles</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={branchFilter}
                      onChange={(e) => {
                        setBranchFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 cursor-pointer font-semibold focus:border-orange-500"
                    >
                      <option value="All">All Branches</option>
                      <option value="None">None (Unassigned)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Unified Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-505 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">User Details</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Branch Location</th>
                        <th className="px-4 py-3">Last Login</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {paginatedUsers.map((u) => {
                        const uBranch = u.branchName || u.branch || "None";
                        return (
                          <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-bold text-stone-900 block">{u.name}</span>
                              <span className="text-[10px] text-stone-400 font-medium block mt-0.5">{u.email}</span>
                              {u.phone && <span className="text-[9px] text-stone-400 font-mono mt-0.5 block">{u.phone}</span>}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-orange-655 uppercase text-[10px]">{u.roleId}</td>
                            <td className="px-4 py-3 text-stone-600 font-semibold">{uBranch}</td>
                            <td className="px-4 py-3 text-stone-500 font-medium whitespace-nowrap">
                              {formatLastLogin(u.lastLoginAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                  u.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-705 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                {(activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") && (
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                                    title="Edit User details & permissions"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setResetUser(u)}
                                  className="p-1 text-amber-605 hover:bg-amber-50 border border-amber-250 rounded cursor-pointer"
                                  title="Reset Password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                                {(activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") && (
                                  <button
                                    onClick={() => handleAction(u.id, u.status === "ACTIVE" ? "REJECTED" : "ACTIVE")}
                                    className={`p-1 border rounded cursor-pointer ${
                                      u.status === "ACTIVE"
                                        ? "text-red-655 hover:bg-red-50 border-red-250"
                                        : "text-emerald-600 hover:bg-emerald-50 border-emerald-250"
                                    }`}
                                    title={u.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
                                  >
                                    {u.status === "ACTIVE" ? (
                                      <UserX className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center italic text-stone-400">
                            No system users found matching selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalUserPages > 1 && (
                  <div className="flex justify-between items-center text-xs pt-3 border-t">
                    <span className="text-stone-450 font-bold">
                      Page {userPage} of {totalUserPages} ({filteredUsers.length} total users)
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                        disabled={userPage === 1}
                        className="px-2.5 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setUserPage(prev => Math.min(totalUserPages, prev + 1))}
                        disabled={userPage === totalUserPages}
                        className="px-2.5 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Branch-Wide Role Permissions Configurator (Super Admin Only) */}
              {activeRole === "SUPER_ADMIN" && (
                <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2 font-outfit">
                      <Building className="w-5 h-5 text-orange-505" />
                      <span>Branch-Wide Route Permissions Mapping</span>
                    </h3>
                    <p className="text-stone-500 text-[10px] sm:text-xs mt-0.5">
                      Configure default allowed routes for users assigned to specific branches.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-1">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Branch to Configure</label>
                      <select
                        value={selectedBranchPermId}
                        onChange={(e) => handleBranchSelectForPerm(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-250 rounded-xl outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold cursor-pointer"
                      >
                        <option value="">-- Choose Branch --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>

                      {selectedBranchPermId && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveBranchPermissions}
                            disabled={branchPermLoading}
                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer flex items-center justify-center border-none"
                          >
                            {branchPermLoading ? "Saving Permissions..." : "Save Branch Permissions"}
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedBranchPermId ? (
                      <div className="md:col-span-2 space-y-3">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Select Allowed Routes for Branch</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-4 border rounded-xl max-h-60 overflow-y-auto">
                          {ALL_ROUTES.map((route) => (
                            <label key={route.path} className="flex items-center space-x-2.5 p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={branchPermissions.includes(route.path)}
                                onChange={() => handleBranchPermissionToggle(route.path)}
                                className="rounded border-stone-300 text-orange-505 focus:ring-0 w-4 h-4 cursor-pointer"
                              />
                              <div className="text-xs font-semibold text-stone-750">
                                <span>{route.label}</span>
                                <span className="block text-[8px] text-stone-400 font-mono font-normal mt-0.5">{route.path}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="md:col-span-2 flex items-center justify-center border border-dashed border-stone-300 bg-stone-50 p-8 rounded-xl text-stone-405 italic text-center font-medium">
                        Please select a branch location from the dropdown to edit its dynamic route permissions table.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEVELOPER CONSOLE TAB */}
          {activeTab === "dev_console" && activeRole === "SUPER_ADMIN" && (
            <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 gap-3">
                <div>
                  <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-orange-505" />
                    <span>Administrative Developer Console</span>
                  </h3>
                  <p className="text-stone-500 text-[10px] sm:text-xs mt-1">
                    System logins audit tracker, failed login warnings, IP routing records, and session metrics.
                  </p>
                </div>
                <button
                  onClick={handleExportDevLogs}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-center shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Logs</span>
                </button>
              </div>

              {/* Filters & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={devSearch}
                    onChange={(e) => { setDevSearch(e.target.value); setDevPage(1); }}
                    placeholder="Search logs by name, email, IP..."
                    className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 focus:bg-white transition-all font-semibold"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={devStatusFilter}
                    onChange={(e) => { setDevStatusFilter(e.target.value); setDevPage(1); }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 cursor-pointer font-semibold focus:border-orange-500"
                  >
                    <option value="All">All Authentication Statuses</option>
                    <option value="SUCCESS">Successful Logins (SUCCESS)</option>
                    <option value="FAILED">Failed Attempts (FAILED)</option>
                  </select>
                </div>

                {/* Browser Filter */}
                <div>
                  <select
                    value={devBrowserFilter}
                    onChange={(e) => { setDevBrowserFilter(e.target.value); setDevPage(1); }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 cursor-pointer font-semibold focus:border-orange-500"
                  >
                    <option value="All">All Browsers / Agents</option>
                    <option value="Chrome">Google Chrome</option>
                    <option value="Safari">Apple Safari</option>
                    <option value="Firefox">Mozilla Firefox</option>
                  </select>
                </div>
              </div>

              {/* logs table */}
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b text-stone-505 font-bold uppercase">
                      <th className="p-3">User Profile</th>
                      <th className="p-3">Browser / Agent</th>
                      <th className="p-3">IP Address</th>
                      <th className="p-3">Login Time</th>
                      <th className="p-3">Logout Time</th>
                      <th className="p-3 text-right">Duration</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {paginatedDevLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50/50">
                        <td className="p-3">
                          <span className="font-bold block text-stone-900">{log.name}</span>
                          <span className="text-[9px] text-stone-400 font-medium">{log.email}</span>
                        </td>
                        <td className="p-3 font-semibold text-stone-600">{log.browser}</td>
                        <td className="p-3 font-mono">{log.ip}</td>
                        <td className="p-3 font-medium text-stone-500">{log.loginTime}</td>
                        <td className="p-3 font-medium text-stone-500">{log.logoutTime}</td>
                        <td className="p-3 text-right font-semibold text-stone-800">{log.duration}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-rose-50 border-rose-200 text-rose-700 animate-pulse font-black"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedDevLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center italic text-stone-400">
                          No developer login log files found matching selected search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalDevPages > 1 && (
                <div className="flex justify-between items-center text-xs pt-3 border-t">
                  <span className="text-stone-450 font-bold">
                    Page {devPage} of {totalDevPages} ({filteredDevLogs.length} audit entries)
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setDevPage(prev => Math.max(1, prev - 1))}
                      disabled={devPage === 1}
                      className="px-2 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setDevPage(prev => Math.min(totalDevPages, prev + 1))}
                      disabled={devPage === totalDevPages}
                      className="px-2 py-1 border rounded bg-stone-50 hover:bg-stone-100 disabled:opacity-40 font-bold cursor-pointer transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

      {/* CREATE NEW LOGIN ID MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleCreateUserSubmit} className="bg-white rounded-2xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2 text-xs">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5 font-outfit">
                <Users className="w-5 h-5 text-orange-500" />
                <span>Provision New Login ID</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPhone("");
                  setNewUserPassword("");
                }}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ajay Kumar"
                  required
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. ajay@conquererp.com"
                  required
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="9988776655"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Initial Password</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Assign Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 cursor-pointer font-semibold"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Assign Branch</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 cursor-pointer font-semibold"
                  >
                    <option value="None">None (Unassigned)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPhone("");
                  setNewUserPassword("");
                }}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newUserLoading}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {newUserLoading ? "Provisioning..." : "Provision Access"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER DETAILS & PAGE PERMISSIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleEditUserSubmit} className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2 text-xs">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5 font-outfit">
                <Edit2 className="w-4 h-4 text-orange-500" />
                <span>Edit Login ID & Permissions</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 cursor-pointer font-semibold"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Branch</label>
                  <select
                    value={editUserBranch}
                    onChange={(e) => setEditUserBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 cursor-pointer font-semibold"
                  >
                    <option value="None">None (Unassigned)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Account Login Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none text-stone-850 focus:border-orange-500 cursor-pointer font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                  <option value="REJECTED">REJECTED (Deactivated / Blocked)</option>
                  <option value="PENDING">PENDING (Awaiting Approval)</option>
                </select>
              </div>

              {/* Dynamic Permissions Inheritance Toggle */}
              <div className="pt-2 border-t">
                <label className="flex items-center space-x-2 text-stone-750 font-bold mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserInherit}
                    onChange={(e) => setEditUserInherit(e.target.checked)}
                    className="rounded border-stone-300 text-orange-550 w-4 h-4 cursor-pointer"
                  />
                  <span>Inherit route access settings from assigned Branch</span>
                </label>

                {editUserInherit ? (
                  <div className="p-3 bg-stone-50 rounded-xl text-stone-500 text-[10px] border font-medium">
                    This user inherits page access maps from their assigned branch ({editUserBranch}). If the branch has no page access settings, role defaults apply.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Custom Allowed Routes Override</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-3 border rounded-xl max-h-40 overflow-y-auto">
                      {ALL_ROUTES.map((route) => {
                        const isChecked = editUserPermissions.includes(route.path);
                        return (
                          <label key={route.path} className="flex items-center space-x-2 p-1.5 bg-white hover:bg-stone-100 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setEditUserPermissions(prev => {
                                  if (prev.includes(route.path)) {
                                    return prev.filter(p => p !== route.path);
                                  } else {
                                    return [...prev, route.path];
                                  }
                                });
                              }}
                              className="rounded border-stone-300 text-orange-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="text-[10px] font-semibold text-stone-700">
                              <span>{route.label}</span>
                              <span className="block text-[8px] text-stone-400 font-mono font-normal">{route.path}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editUserLoading}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {editUserLoading ? "Saving Changes..." : "Save Details"}
              </button>
            </div>
          </form>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
