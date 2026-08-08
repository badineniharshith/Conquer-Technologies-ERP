"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useErpStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Eye, EyeOff, Building2, UserCheck, ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "../../../public/logo.png";

const loginSchema = zod.object({
  email: zod.string().email("Invalid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  rememberMe: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
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
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Invalid credentials");
        toast.error(data.error || "Invalid credentials");
      } else {
        loginSession(data.user as any);
        toast.success(`Logged in as ${data.user.name}`);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred during login.");
      toast.error("Authentication system encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    toast.info("Credentials autofilled into form. Click Login to authenticate.");
  };

  const demoAccounts = [
    { role: "Admin", email: "superadmin@conquererp.com", pass: "Admin@123", badge: "SUPER_ADMIN" },
    { role: "Director", email: "marcus.sterling@conquererp.com", pass: "Admin@123", badge: "DIRECTOR" },
    { role: "Operations Manager", email: "sophia.chen@conquererp.com", pass: "Admin@123", badge: "MANAGER" },
    { role: "Assistant Manager", email: "ananya.sharma@conquererp.com", pass: "Admin@123", badge: "ASST_MGR" },
    { role: "Operations Executive", email: "karan.patel@conquererp.com", pass: "Admin@123", badge: "EXECUTIVE" },
    { role: "Customer", email: "asset@ibm.com", pass: "Admin@123", badge: "CUSTOMER" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  return (
    <div className="min-h-screen lg:h-screen w-full relative flex items-center justify-center bg-stone-950 font-sans overflow-y-auto lg:overflow-hidden p-4 sm:p-6 lg:p-0">

      {/* Full Screen Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1600')`
        }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/98 via-stone-950/88 to-stone-900/60 z-10" />
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] z-10" />

      {/* Main Container */}
      <div className="relative z-20 w-full lg:h-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 px-5 sm:px-10 lg:px-16 py-6 lg:py-0">

        {/* Left Column */}
        <div className="flex-1 w-full min-w-0 flex flex-col justify-center text-left space-y-7 max-w-2xl py-4 lg:py-0 lg:pr-6">
          <div className="border-l-[4px] border-l-[#e06246]/80 pl-6 sm:pl-8 space-y-6 sm:space-y-7">
            {/* Logo + Brand */}
            <div className="flex items-center space-x-4">
              <img
                src={logoImg.src}
                alt="Conquer Logo"
                className="h-12 w-12 object-contain bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15 shadow-lg"
              />
              <div>
                <p className="font-outfit text-white font-extrabold tracking-widest text-base sm:text-lg md:text-xl uppercase leading-none">Conquer Technologies</p>
                <p className="text-stone-300 text-xs sm:text-sm tracking-wider mt-2 font-medium leading-none">Enterprise Resource Platform</p>
              </div>
            </div>

            {/* Enterprise badge */}
            <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border w-fit shadow-sm"
              style={{ background: 'rgba(140,49,32,0.15)', borderColor: 'rgba(140,49,32,0.35)' }}>
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: '#e06246' }} />
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#e06246' }}>Enterprise Engine</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-outfit leading-none">
                Conquer Technologies'
                <span
                  className="block text-4xl sm:text-5xl lg:text-6xl font-black mt-2 bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #e06246 0%, #8c3120 70%, #641f12 100%)' }}
                >
                  ERP Portal
                </span>
              </h1>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-stone-500 font-semibold tracking-wider uppercase pl-6 sm:pl-8 pt-2">
            © {new Date().getFullYear()} Conquer Technologies. All rights reserved.
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="w-full lg:w-[430px] xl:w-[450px] flex-shrink-0 max-w-lg lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-white/[0.98] border border-stone-200/80 p-5 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            style={{ boxShadow: '0 24px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}
          >
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #8c3120, #e06246, #8c3120)' }} />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Login Type Tabs: Employee vs Customer */}
              <motion.div variants={itemVariants} className="flex items-center p-1 bg-stone-100/90 rounded-xl border border-stone-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("employee");
                    toast.info("Switched to Employee Login Portal");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === "employee"
                      ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" style={{ color: activeTab === "employee" ? "#8c3120" : undefined }} />
                  <span>Employee Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("customer");
                    toast.info("Switched to Enterprise Customer Portal");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === "customer"
                      ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" style={{ color: activeTab === "customer" ? "#8c3120" : undefined }} />
                  <span>Customer Login</span>
                </button>
              </motion.div>

              {/* Header */}
              <motion.div variants={itemVariants} className="text-left pt-1">
                <div className="flex items-center space-x-2.5 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    {activeTab === "employee" ? "Internal Staff Portal" : "Enterprise Client Portal"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 font-outfit leading-tight">
                  {activeTab === "employee" ? "System Sign In" : "Customer Portal Sign In"}
                </h2>
                <p className="text-xs text-stone-400 mt-1 font-medium">
                  {activeTab === "employee"
                    ? "Enter your operational credentials to authenticate."
                    : "Enter your customer portal account credentials."}
                </p>
              </motion.div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2 overflow-hidden"
                  >
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    <span className="font-medium">{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Single Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">User Email Address</label>
                  <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl focus-within:border-[#8c3120] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(140,49,32,0.08)] transition-all duration-200 shadow-sm">
                    <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-stone-400" />
                    </div>
                    <input
                      type="email"
                      placeholder={activeTab === "employee" ? "e.g. admin@conquererp.com" : "e.g. asset@ibm.com"}
                      {...register("email")}
                      className="w-full pr-3.5 py-3 bg-transparent text-sm outline-none text-stone-800 placeholder-stone-400 transition-all font-medium"
                    />
                  </div>
                  {errors.email && <span className="text-xs text-red-500 mt-1.5 block font-semibold">{errors.email.message}</span>}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Account Password</label>
                  <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl focus-within:border-[#8c3120] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(140,49,32,0.08)] transition-all duration-200 shadow-sm">
                    <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-stone-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className="w-full pr-2 py-3 bg-transparent text-sm outline-none text-stone-850 placeholder-stone-400 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3.5 pl-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer shrink-0"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <span className="text-xs text-red-500 mt-1.5 block font-semibold">{errors.password.message}</span>}
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 text-stone-550 cursor-pointer select-none font-semibold">
                    <input
                      type="checkbox"
                      {...register("rememberMe")}
                      className="w-3.5 h-3.5 rounded border-stone-300 focus:ring-0 bg-stone-550 cursor-pointer"
                      style={{ accentColor: '#8c3120' }}
                    />
                    <span>Remember Session</span>
                  </label>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); toast.info("Please contact system Administrator to reset passwords."); }}
                    className="font-bold hover:underline transition-colors text-xs"
                    style={{ color: '#8c3120' }}
                  >
                    Forgot password?
                  </a>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-1">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 text-white rounded-xl text-sm sm:text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #8c3120 0%, #a03828 50%, #782718 100%)',
                      boxShadow: '0 4px 20px -4px rgba(140,49,32,0.5), 0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                    {loading ? (
                      <span className="relative z-10">Authenticating...</span>
                    ) : (
                      <>
                        <span className="relative z-10">
                          {activeTab === "employee" ? "Login to Inventory Portal" : "Login to Customer Portal"}
                        </span>
                        <ArrowRight className="w-4 h-4 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </form>

              {/* Compact Demo Credentials Accordion */}
              <motion.div variants={itemVariants} className="pt-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setShowDemoAccordion(!showDemoAccordion)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/70 text-xs font-bold text-stone-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#8c3120]" />
                    <span>Demo Credentials (Seeded Accounts)</span>
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
                            <div className="font-bold text-stone-850 truncate flex items-center space-x-1.5">
                              <span>{acc.role}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-stone-200/60 text-stone-600">
                                {acc.pass}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">{acc.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAutofill(acc.email, acc.pass)}
                            className="px-2.5 py-1 bg-white hover:bg-[#fdf4f2] text-[#8c3120] border border-[#8c3120]/30 rounded-md font-bold text-[10px] transition-all cursor-pointer shrink-0 shadow-2xs"
                          >
                            Use Credentials
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
