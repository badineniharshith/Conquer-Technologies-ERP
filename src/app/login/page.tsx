"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useErpStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Eye, EyeOff, Building2 } from "lucide-react";
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
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred during login.");
      toast.error("Authentication system encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    toast.info("Autofilled credentials. Click Sign In.");
  };

  const testCredentials = [
    { label: "Super Admin", email: "superadmin@conquererp.com", pass: "Admin@123", badge: "SUPER_ADMIN" },
    { label: "Admin", email: "admin@conquererp.com", pass: "Admin@123", badge: "ADMIN" },
    { label: "Employee", email: "employee@conquererp.com", pass: "Admin@123", badge: "EMPLOYEE" },
    { label: "Customer", email: "customer@gmail.com", pass: "Admin@123", badge: "CUSTOMER" }
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
      {/* Gradient overlay — heavier on the left, lighter on right */}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/98 via-stone-950/88 to-stone-900/60 z-10" />
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] z-10" />

      {/* Main Container — stretched desktop layout, clean mobile vertical stack */}
      <div className="relative z-20 w-full lg:h-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 px-5 sm:px-10 lg:px-16 py-6 lg:py-0">

        {/* ── Left Column ─────────────────────────────────────── */}
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

          {/* Footer */}
          <div className="text-xs sm:text-sm text-stone-500 font-semibold tracking-wider uppercase pl-6 sm:pl-8 pt-2">
            © {new Date().getFullYear()} Conquer Technologies. All rights reserved.
          </div>
        </div>

        {/* ── Right Column: Login Card ─────────────────────── */}
        <div className="w-full lg:w-[430px] xl:w-[450px] flex-shrink-0 max-w-lg lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-white/[0.98] border border-stone-200/80 p-5 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            style={{ boxShadow: '0 24px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}
          >
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #8c3120, #e06246, #8c3120)' }} />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="text-left pt-1">
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{ background: 'rgba(140,49,32,0.1)' }}>
                    <Building2 className="w-4 h-4" style={{ color: '#8c3120' }} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Secure Portal Access</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 font-outfit leading-tight">System Sign In</h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-1.5 font-medium">Enter your operational credentials to authenticate.</p>
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

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">User Email Address</label>
                  <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl focus-within:border-[#8c3120] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(140,49,32,0.08)] transition-all duration-200 shadow-sm">
                    <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-stone-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. admin@conquererp.com"
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
                    className="font-bold hover:underline transition-colors text-xs sm:text-sm"
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
                    {/* Subtle shimmer overlay */}
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                    {loading ? (
                      <span className="relative z-10">Authenticating...</span>
                    ) : (
                      <>
                        <span className="relative z-10">Login to Inventory Portal</span>
                        <ArrowRight className="w-4 h-4 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </form>

              {/* Quick Login */}
              <motion.div variants={itemVariants} className="pt-4 border-t border-stone-200/80 space-y-3">
                <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider text-center">
                  Quick-Login Credentials (Testing)
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {testCredentials.map((cred, idx) => (
                    <motion.button
                      key={cred.email}
                      type="button"
                      onClick={() => handleQuickLogin(cred.email, cred.pass)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.02, y: -0.5 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-2.5 bg-stone-50 border border-stone-200/60 rounded-xl text-xs font-semibold text-stone-700 transition-all text-left flex flex-col cursor-pointer hover:border-[#8c3120]/30 hover:bg-[#fdf4f2] w-full"
                    >
                      <span className="font-extrabold truncate text-stone-900 text-[11px]">{cred.email}</span>
                      <span className="text-[9px] text-stone-400 font-bold tracking-wider uppercase mt-0.5">{cred.badge.replace('_', ' ')}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
