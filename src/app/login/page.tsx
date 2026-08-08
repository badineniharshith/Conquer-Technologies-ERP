"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Lock, Mail, ShieldAlert, Sparkles, ArrowRight,
  Eye, EyeOff, Building2, UserCheck, ChevronDown, ChevronUp,
  KeyRound, Users, Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "../../../public/logo.png";

const loginSchema = zod.object({
  email: zod.string().email("Invalid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  rememberMe: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

// Demo accounts split by portal
const employeeDemoAccounts = [
  { role: "L0 Super Admin", email: "superadmin@conquererp.com", pass: "Admin@123", badge: "SUPER_ADMIN" },
  { role: "L1 Director Ops", email: "marcus.sterling@conquererp.com", pass: "Admin@123", badge: "DIRECTOR" },
  { role: "L2 Ops Manager", email: "sophia.chen@conquererp.com", pass: "Admin@123", badge: "OPS_MANAGER" },
  { role: "L3 Asst. Manager", email: "ananya.sharma@conquererp.com", pass: "Admin@123", badge: "ASST_MGR" },
  { role: "L4 Ops Executive", email: "karan.patel@conquererp.com", pass: "Admin@123", badge: "EXECUTIVE" },
];

const customerDemoAccounts = [
  { role: "IBM Enterprise", email: "asset@ibm.com", pass: "Admin@123", badge: "CUSTOMER" },
  { role: "Oracle Corp", email: "oracle.contact@oracle.in", pass: "Admin@123", badge: "CUSTOMER" },
  { role: "Acceldata Inc", email: "admin@acceldata.io", pass: "Admin@123", badge: "CUSTOMER" },
  { role: "Enterprise User", email: "enterprise@client.com", pass: "Admin@123", badge: "CUSTOMER" },
];

export default function LoginPage() {
  const loginSession = useErpStore((state) => state.loginSession);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"employee" | "customer">("employee");
  const [showDemoAccordion, setShowDemoAccordion] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // Reset form and error on tab switch
  const switchTab = (tab: "employee" | "customer") => {
    setActiveTab(tab);
    setErrorMsg("");
    setShowDemoAccordion(false);
    reset({ email: "", password: "", rememberMe: false });
  };

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          portalType: activeTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Invalid credentials");
        toast.error(data.error || "Invalid credentials");
      } else {
        loginSession(data.user as any);
        toast.success(`Welcome back, ${data.user.name}!`);
        window.location.href = "/dashboard";
      }
    } catch {
      setErrorMsg("An unexpected error occurred during login.");
      toast.error("Authentication system encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    toast.info("Credentials autofilled. Click Login to continue.");
  };

  const isEmployee = activeTab === "employee";

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── BACKGROUNDS ─────────────────────────────────────────── */}
      {/* Employee BG */}
      <AnimatePresence>
        {isEmployee && (
          <motion.div
            key="emp-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-stone-950/30 via-stone-950/70 to-stone-950/98" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer BG */}
      <AnimatePresence>
        {!isEmployee && (
          <motion.div
            key="cust-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&q=80&w=1920')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/30 via-slate-950/70 to-slate-950/98" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:40px_40px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP PORTAL TOGGLE ───────────────────────────────────── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center p-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl">
          <button
            type="button"
            onClick={() => switchTab("employee")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
              isEmployee
                ? "bg-white text-stone-900 shadow-lg scale-105"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Portal</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("customer")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
              !isEmployee
                ? "bg-white text-stone-900 shadow-lg scale-105"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center lg:justify-stretch px-5 sm:px-10 lg:px-16 py-24 lg:py-0">

        {/* ── EMPLOYEE LAYOUT: Brand Left | Card Right ── */}
        <AnimatePresence mode="popLayout">
          {isEmployee && (
            <motion.div
              key="employee-layout"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col lg:flex-row items-center lg:items-center justify-between gap-10 lg:gap-16"
            >
              {/* Brand Left */}
              <div className="flex-1 text-left space-y-6 max-w-xl hidden lg:block">
                <div className="border-l-[4px] border-[#e06246]/80 pl-8 space-y-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={logoImg.src}
                      alt="Conquer Logo"
                      className="h-14 w-14 object-contain bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15 shadow-lg"
                    />
                    <div>
                      <p className="font-outfit text-white font-extrabold tracking-widest text-xl uppercase leading-none">Conquer Technologies</p>
                      <p className="text-stone-300 text-sm tracking-wider mt-1 font-medium">Enterprise Resource Platform</p>
                    </div>
                  </div>

                  <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border w-fit"
                    style={{ background: 'rgba(140,49,32,0.18)', borderColor: 'rgba(224,98,70,0.4)' }}>
                    <Sparkles className="w-4 h-4 animate-pulse" style={{ color: '#e06246' }} />
                    <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#e06246' }}>Operations Intelligence Engine</span>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                      ERP
                      <span
                        className="block text-5xl lg:text-6xl font-black mt-1 bg-clip-text text-transparent"
                        style={{ backgroundImage: 'linear-gradient(90deg, #e06246 0%, #8c3120 70%)' }}
                      >
                        Portal
                      </span>
                    </h1>
                    <p className="text-stone-400 text-sm leading-relaxed max-w-sm">
                      Unified inventory management, procurement, analytics, and team operations — all in one platform.
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 pt-2">
                    {["Inventory", "Analytics", "Procurement", "Teams"].map(tag => (
                      <span key={tag} className="text-[10px] text-stone-400 font-bold uppercase tracking-widest border-r border-stone-700 pr-4 last:border-r-0">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-stone-600 font-semibold tracking-wider uppercase pl-8">
                  © {new Date().getFullYear()} Conquer Technologies. All rights reserved.
                </div>
              </div>

              {/* Login Card — Right */}
              <div className="w-full lg:w-[430px] xl:w-[450px] flex-shrink-0">
                <LoginCard
                  activeTab="employee"
                  errorMsg={errorMsg}
                  loading={loading}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showDemoAccordion={showDemoAccordion}
                  setShowDemoAccordion={setShowDemoAccordion}
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  errors={errors}
                  handleAutofill={handleAutofill}
                  demoAccounts={employeeDemoAccounts}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CUSTOMER LAYOUT: Card Left | Brand Right ── */}
        <AnimatePresence mode="popLayout">
          {!isEmployee && (
            <motion.div
              key="customer-layout"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16"
            >
              {/* Login Card — Left */}
              <div className="w-full lg:w-[430px] xl:w-[450px] flex-shrink-0">
                <LoginCard
                  activeTab="customer"
                  errorMsg={errorMsg}
                  loading={loading}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showDemoAccordion={showDemoAccordion}
                  setShowDemoAccordion={setShowDemoAccordion}
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  errors={errors}
                  handleAutofill={handleAutofill}
                  demoAccounts={customerDemoAccounts}
                />
              </div>

              {/* Brand Right */}
              <div className="flex-1 text-right space-y-6 max-w-xl hidden lg:flex lg:flex-col lg:items-end">
                <div className="border-r-[4px] border-[#e06246]/80 pr-8 space-y-6 text-right">
                  <div className="flex items-center justify-end space-x-4">
                    <div className="text-right">
                      <p className="font-outfit text-white font-extrabold tracking-widest text-xl uppercase leading-none">VConquer</p>
                      <p className="text-stone-300 text-sm tracking-wider mt-1 font-medium">Corporate Client Portal</p>
                    </div>
                    <img
                      src={logoImg.src}
                      alt="Conquer Logo"
                      className="h-14 w-14 object-contain bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15 shadow-lg"
                    />
                  </div>

                  <div className="inline-flex items-center justify-end space-x-2 px-4 py-2 rounded-full border w-fit ml-auto"
                    style={{ background: 'rgba(100,120,140,0.2)', borderColor: 'rgba(180,200,220,0.35)' }}>
                    <Building2 className="w-4 h-4" style={{ color: '#93c5fd' }} />
                    <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#93c5fd' }}>Enterprise Client Access</span>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight leading-none text-right">
                      Client
                      <span
                        className="block text-5xl lg:text-6xl font-black mt-1 bg-clip-text text-transparent"
                        style={{ backgroundImage: 'linear-gradient(270deg, #93c5fd 0%, #60a5fa 70%)' }}
                      >
                        Dashboard
                      </span>
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-sm ml-auto">
                      Track your orders, manage stock reservations, browse product catalogs, and coordinate with your assigned operations team.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-2">
                    {["Orders", "Stock", "Catalog", "Support"].map(tag => (
                      <span key={tag} className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-l border-slate-700 pl-4 first:border-l-0">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 font-semibold tracking-wider uppercase pr-8">
                  © {new Date().getFullYear()} Conquer Technologies. All rights reserved.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── LOGIN CARD COMPONENT ──────────────────────────────────── */
function LoginCard({
  activeTab,
  errorMsg,
  loading,
  showPassword,
  setShowPassword,
  showDemoAccordion,
  setShowDemoAccordion,
  register,
  handleSubmit,
  onSubmit,
  errors,
  handleAutofill,
  demoAccounts,
}: {
  activeTab: "employee" | "customer";
  errorMsg: string;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showDemoAccordion: boolean;
  setShowDemoAccordion: (v: boolean) => void;
  register: any;
  handleSubmit: any;
  onSubmit: any;
  errors: any;
  handleAutofill: (email: string, pass: string) => void;
  demoAccounts: { role: string; email: string; pass: string; badge: string }[];
}) {
  const isEmployee = activeTab === "employee";

  const accentColor = isEmployee ? "#8c3120" : "#3b82f6";
  const accentGradient = isEmployee
    ? "linear-gradient(135deg, #8c3120 0%, #a03828 50%, #782718 100%)"
    : "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #2563eb 100%)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.97)",
        boxShadow: `0 24px 80px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full" style={{ background: accentGradient }} />

      <div className="p-6 sm:p-8 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{ color: accentColor, background: `${accentColor}12`, borderColor: `${accentColor}30` }}
            >
              {isEmployee ? "Internal Staff Portal" : "Enterprise Client Portal"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900 font-outfit leading-tight">
            {isEmployee ? "Employee Sign In" : "Corporate Sign In"}
          </h2>
          <p className="text-xs text-stone-400 font-medium">
            {isEmployee
              ? "Enter your operational credentials to access the ERP system."
              : "Enter your enterprise account credentials to access VConquer portal."}
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2 overflow-hidden"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span className="font-medium">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <div
              className="flex items-center bg-stone-50 border border-stone-200 rounded-xl transition-all duration-200 shadow-sm"
              style={{
                outline: "none",
              }}
            >
              <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-stone-400" />
              </div>
              <input
                type="email"
                placeholder={isEmployee ? "e.g. admin@conquererp.com" : "e.g. contact@company.com"}
                {...register("email")}
                className="w-full pr-3.5 py-3 bg-transparent text-sm outline-none text-stone-800 placeholder-stone-400 transition-all font-medium"
              />
            </div>
            {errors.email && <span className="text-xs text-red-500 mt-1 block font-semibold">{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl transition-all duration-200 shadow-sm">
              <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-stone-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                className="w-full pr-2 py-3 bg-transparent text-sm outline-none text-stone-800 placeholder-stone-400 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3.5 pl-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer shrink-0"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <span className="text-xs text-red-500 mt-1 block font-semibold">{errors.password.message}</span>}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-stone-600 cursor-pointer select-none font-semibold">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="w-3.5 h-3.5 rounded border-stone-300 cursor-pointer"
                style={{ accentColor }}
              />
              <span>Remember Session</span>
            </label>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toast.info("Please contact system Administrator to reset passwords."); }}
              className="font-bold hover:underline transition-colors"
              style={{ color: accentColor }}
            >
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.012 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer relative overflow-hidden"
            style={{
              background: accentGradient,
              boxShadow: `0 4px 20px -4px ${accentColor}60, 0 1px 3px rgba(0,0,0,0.15)`,
            }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
            {loading ? (
              <span className="relative z-10 flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </span>
            ) : (
              <>
                <span className="relative z-10">{isEmployee ? "Login to ERP Portal" : "Login to Client Portal"}</span>
                <ArrowRight className="w-4 h-4 relative z-10" />
              </>
            )}
          </motion.button>
        </form>

        {/* Demo Credentials Accordion */}
        <div className="pt-3 border-t border-stone-200/80">
          <button
            type="button"
            onClick={() => setShowDemoAccordion(!showDemoAccordion)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/70 text-xs font-bold text-stone-600 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <KeyRound className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Demo {isEmployee ? "Employee" : "Customer"} Accounts</span>
            </div>
            {showDemoAccordion ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
          </button>

          <AnimatePresence>
            {showDemoAccordion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 space-y-1.5"
              >
                {demoAccounts.map((acc) => (
                  <div
                    key={acc.email}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50/80 border border-stone-200/50 text-[11px]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-stone-800 truncate flex items-center space-x-1.5">
                        <span>{acc.role}</span>
                        <span className="text-[9px] px-1.5 rounded font-mono font-semibold bg-stone-200/60 text-stone-600">
                          {acc.pass}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">{acc.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofill(acc.email, acc.pass)}
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 border rounded-md font-bold text-[10px] transition-all cursor-pointer shrink-0 shadow-xs"
                      style={{ color: accentColor, borderColor: `${accentColor}30` }}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
