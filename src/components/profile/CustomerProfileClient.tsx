"use client";

import { useState, useEffect } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  RefreshCw,
  Send,
  Lock,
  Building,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  submitProfileUpdateRequestAction,
  getProfileRequestsForUserAction,
  getPendingProfileRequestsAction,
  reviewProfileUpdateRequestAction
} from "@/app/actions";

export default function CustomerProfileClient() {
  const { activeUser } = useErpStore();
  const isCustomer = activeUser?.role === "CUSTOMER";
  const isStaff = !isCustomer && !!activeUser;

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [pendingStaffRequests, setPendingStaffRequests] = useState<any[]>([]);

  // Update modal state
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contactPerson: "",
    email: "",
    phone: "",
    companyAddress: "",
    alternateContact: ""
  });

  const loadProfileData = async () => {
    setLoading(true);
    try {
      if (!activeUser?.id) return;
      const res = await fetch(`/api/auth/me`);
      const data = await res.json();

      if (data.user) {
        setUserProfile(data.user);
        setFormData({
          contactPerson: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          companyAddress: data.user.address || "",
          alternateContact: data.user.alternateContact || ""
        });

        // Load profile requests
        const reqRes = await getProfileRequestsForUserAction(data.user.id);
        if (reqRes.success) {
          setProfileRequests(reqRes.requests || []);
        }
      }

      if (isStaff) {
        const staffReqRes = await getPendingProfileRequestsAction();
        if (staffReqRes.success) {
          setPendingStaffRequests(staffReqRes.requests || []);
        }
      }
    } catch {
      toast.error("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [activeUser]);

  const handleSubmitProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser?.id) return;
    setSubmitting(true);

    try {
      const res = await submitProfileUpdateRequestAction({
        userId: activeUser.id,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        companyAddress: formData.companyAddress,
        alternateContact: formData.alternateContact
      });

      if (res.success) {
        toast.success(res.message || "Profile update request submitted successfully!");
        setUpdateModalOpen(false);
        loadProfileData();
      } else {
        toast.error(res.error || "Failed to submit request.");
      }
    } catch {
      toast.error("Error submitting profile request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewRequest = async (requestId: string, action: "APPROVE" | "REJECT") => {
    if (!activeUser?.id) return;
    try {
      const res = await reviewProfileUpdateRequestAction({
        requestId,
        action,
        reviewerId: activeUser.id
      });

      if (res.success) {
        toast.success(res.message || `Request ${action.toLowerCase()}d!`);
        loadProfileData();
      } else {
        toast.error(res.error || "Failed to review request.");
      }
    } catch {
      toast.error("Network error processing review.");
    }
  };

  const emp = userProfile?.assignedEmployee || {
    employeeId: "EMP-0042",
    name: "Karan Patel",
    designation: "Senior Operations Executive",
    email: "karan.patel@conquererp.com",
    phone: "+91 98765 43210",
    branch: userProfile?.branch || "Hyderabad HQ"
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e06246] to-[#8c3120] flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-orange-900/30 shrink-0 border border-white/20">
              {userProfile?.name?.charAt(0) || "C"}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl sm:text-3xl font-black font-outfit tracking-tight">{userProfile?.companyName || userProfile?.name || "Enterprise Account"}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {userProfile?.customerId || "CUSTOMER"}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1 flex items-center space-x-3 font-medium">
                <span>Branch: <strong className="text-stone-200">{userProfile?.branch || "Hyderabad HQ"}</strong></span>
                <span>•</span>
                <span>Account Status: <strong className="text-emerald-400 font-bold uppercase">{userProfile?.status || "ACTIVE"}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadProfileData}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-stone-200 rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center space-x-2 border border-white/10 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            {isCustomer && (
              <button
                onClick={() => setUpdateModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#e06246] to-[#8c3120] hover:from-[#c8543a] hover:to-[#762718] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-950/40 transition-all flex items-center space-x-2 cursor-pointer border border-orange-400/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Request Profile Update</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 3 Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Company Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-stone-200/80">
              <div className="p-2.5 rounded-xl bg-orange-50 text-[#8c3120] border border-orange-200/60 shadow-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 font-outfit">Company Information</h3>
                <p className="text-[11px] text-stone-400 font-medium">Registered corporate details</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium">Customer ID</span>
                <span className="font-mono font-bold text-[#8c3120] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">{userProfile?.customerId || "CUS000001"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium">Company Name</span>
                <span className="font-bold text-stone-850 text-right">{userProfile?.companyName || userProfile?.name || "Oracle India Ltd"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium">GST Number</span>
                <span className="font-mono font-semibold text-stone-700">{userProfile?.gstNumber || "36AABCO1234F1Z5"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium">Registration No.</span>
                <span className="font-mono text-stone-600">REG-2026-HYD-882</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium">Assigned Branch</span>
                <span className="font-bold text-stone-800">{userProfile?.branch || "Hyderabad HQ"}</span>
              </div>
              <div className="pt-1">
                <span className="text-stone-400 font-medium block mb-1">Company Address</span>
                <p className="text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 font-medium leading-relaxed">
                  {userProfile?.address || "Plot 14, HITEC City, Phase 2, Madhapur, Hyderabad, Telangana 500081"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Contact Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-stone-200/80">
              <div className="p-2.5 rounded-xl bg-orange-50 text-[#8c3120] border border-orange-200/60 shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 font-outfit">Contact Information</h3>
                <p className="text-[11px] text-stone-400 font-medium">Primary account representative</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>Contact Person</span>
                </span>
                <span className="font-bold text-stone-900">{userProfile?.name || "Procurement Manager"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Email Address</span>
                </span>
                <span className="font-semibold text-stone-800 font-mono">{userProfile?.email || "procurement@oracle.com"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Phone Number</span>
                </span>
                <span className="font-semibold text-stone-800">{userProfile?.phone || "+91 40 6600 1000"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-400 font-medium flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Alternate Contact</span>
                </span>
                <span className="font-medium text-stone-600">{userProfile?.alternateContact || "+91 98765 12345"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-stone-400 font-medium flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verification Status</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">VERIFIED</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Assigned Operations Executive Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden bg-gradient-to-br from-white via-orange-50/20 to-white"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-stone-200/80">
              <div className="p-2.5 rounded-xl bg-orange-100/70 text-[#8c3120] border border-orange-200 shadow-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 font-outfit">Assigned Operations Executive</h3>
                <p className="text-[11px] text-stone-400 font-medium">Your dedicated account manager</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-800 to-stone-950 text-white font-black text-lg flex items-center justify-center shrink-0">
                  {emp.name?.charAt(0) || "K"}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 leading-tight">{emp.name}</h4>
                  <p className="text-[11px] text-[#8c3120] font-semibold mt-0.5">{emp.designation || "Operations Executive"}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-stone-100">
                <div className="flex justify-between">
                  <span className="text-stone-400">Employee ID</span>
                  <span className="font-mono font-bold text-stone-700">{emp.employeeId || "EMP000042"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Email</span>
                  <span className="font-mono font-medium text-stone-800">{emp.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Phone</span>
                  <span className="font-medium text-stone-800">{emp.phone || "+91 98765 00001"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Branch</span>
                  <span className="font-bold text-stone-800">{emp.branch || "Hyderabad HQ"}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Staff / Executive Pending Profile Update Requests Table */}
      {isStaff && pendingStaffRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold font-outfit text-stone-900">Pending Customer Profile Update Requests</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {pendingStaffRequests.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-[10px] font-black uppercase text-stone-400 border-b border-stone-200">
                  <th className="p-3">Customer</th>
                  <th className="p-3">Requested Contact Person</th>
                  <th className="p-3">Requested Email</th>
                  <th className="p-3">Requested Phone</th>
                  <th className="p-3">Requested Address</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingStaffRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3 font-bold text-stone-900">{req.user?.name || req.user?.companyName || req.userId}</td>
                    <td className="p-3 text-stone-800">{req.contactPerson}</td>
                    <td className="p-3 font-mono text-stone-700">{req.email}</td>
                    <td className="p-3 text-stone-700">{req.phone}</td>
                    <td className="p-3 text-stone-600 max-w-xs truncate">{req.companyAddress}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleReviewRequest(req.id, "APPROVE")}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewRequest(req.id, "REJECT")}
                        className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Customer Profile Request Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="glass-panel p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-[#8c3120]" />
            <h3 className="font-bold text-base text-stone-900 font-outfit">Profile Update Request History</h3>
          </div>
        </div>

        {profileRequests.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No profile update requests submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {profileRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-stone-50 border border-stone-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-stone-900">{req.contactPerson}</span>
                    <span className="text-stone-400">•</span>
                    <span className="font-mono text-stone-600">{req.email}</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">
                    Requested Address: {req.companyAddress} | Phone: {req.phone}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Submitted on: {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  {req.status === "PENDING" ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending Approval</span>
                    </span>
                  ) : req.status === "APPROVED" ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Customer Profile Update Modal */}
      <AnimatePresence>
        {updateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-[#8c3120]" />
                  <h3 className="text-base font-bold font-outfit text-stone-900">Request Profile Update</h3>
                </div>
                <button
                  onClick={() => setUpdateModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitProfileUpdate} className="p-6 space-y-4 text-xs">
                {/* Restricted Fields Notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start space-x-2">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold block">Approval Workflow Notice</span>
                    <span>Requested changes will be reviewed by your assigned Operations Executive before updating your profile.</span>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Contact Person</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Alternate Contact</label>
                    <input
                      type="text"
                      value={formData.alternateContact}
                      onChange={(e) => setFormData({ ...formData, alternateContact: e.target.value })}
                      className="input-field"
                      placeholder="+91 98765 00000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Company Address</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="input-field resize-none"
                  />
                </div>

                {/* Restricted read-only fields */}
                <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-3 opacity-60">
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase">Customer ID (Locked)</label>
                    <input type="text" disabled value={userProfile?.customerId || "CUS000001"} className="input-field bg-stone-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase">GST Number (Locked)</label>
                    <input type="text" disabled value={userProfile?.gstNumber || "36AABCO1234F1Z5"} className="input-field bg-stone-100 cursor-not-allowed" />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setUpdateModalOpen(false)}
                    className="btn-ghost px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary px-5 py-2 flex items-center space-x-2 cursor-pointer"
                  >
                    {submitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Approval</span>
                      </>
                    )}
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
