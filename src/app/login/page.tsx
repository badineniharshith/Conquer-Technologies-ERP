"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { authenticateUserAction } from "@/app/actions";
import { useErpStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, ShieldAlert, Sparkles, Boxes, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  const [loginTarget, setLoginTarget] = useState<"inventory" | "ai">("inventory");

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
      const apiEndpoint = loginTarget === "ai" ? "/api/auth/ai-login" : "/api/auth/login";
      const redirectPath = loginTarget === "ai" ? "/ai-agent" : "/dashboard";

      const res = await fetch(apiEndpoint, {
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
        router.push(redirectPath);
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
    { label: "Super Admin", email: "superadmin@conquererp.com", pass: "Admin@2026#Secure", badge: "SUPER_ADMIN" },
    { label: "System Admin", email: "admin@conquererp.com", pass: "Admin@2026", badge: "ADMIN" },
    { label: "Company Employee", email: "employee@conquererp.com", pass: "Employee@2026", badge: "EMPLOYEE" },
    { label: "Premium Customer", email: "customer@gmail.com", pass: "Customer#2026", badge: "CUSTOMER" }
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
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] text-stone-850 p-4 font-sans relative overflow-hidden">
      {/* Decorative background gradients — with float animation */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-100 rounded-full blur-3xl -z-10 opacity-70 animate-float-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl -z-10 opacity-50 animate-float-slow" style={{ animationDelay: "6s" }}></div>
      <div className="absolute top-2/3 left-1/2 w-72 h-72 bg-primary-100/40 rounded-full blur-3xl -z-10 opacity-40 animate-float-slow" style={{ animationDelay: "12s" }}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-[#fed7aa]/70 p-8 rounded-2xl shadow-xl relative"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants} className="flex justify-center">
            <img src="/logo.png" alt="Conquer Logo" className="h-12 object-contain" />
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">System Authentication</h2>
            <p className="text-xs text-stone-500 mt-1">Please enter your credentials to authenticate.</p>
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
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">User Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="email"
                  placeholder="e.g. admin@conquererp.com"
                  {...register("email")}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50/60 border border-stone-200/60 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(140,49,32,0.08)] text-stone-850 placeholder-stone-400 transition-all duration-250"
                />
              </div>
              {errors.email && <span className="text-[10px] text-red-500 mt-1 block">{errors.email.message}</span>}
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Account Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50/60 border border-stone-200/60 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(140,49,32,0.08)] text-stone-850 placeholder-stone-400 transition-all duration-250"
                />
              </div>
              {errors.password && <span className="text-[10px] text-red-500 mt-1 block">{errors.password.message}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-stone-550 cursor-pointer">
                <input type="checkbox" {...register("rememberMe")} className="rounded border-stone-300 text-orange-550 focus:ring-0 bg-stone-50" />
                <span>Remember Session</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Please contact system Administrator to reset passwords."); }} className="text-orange-600 hover:underline font-semibold">
                Forgot password?
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2 space-y-2.5">
              <motion.button
                type="submit"
                onClick={() => setLoginTarget("inventory")}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 shadow-md shadow-orange-500/15 cursor-pointer text-center"
              >
                <span>Login to Inventory</span>
              </motion.button>
              <motion.button
                type="submit"
                onClick={() => setLoginTarget("ai")}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 shadow-sm cursor-pointer text-center"
              >
                <span>Login to AI Agent</span>
              </motion.button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
            Need an operational login?{" "}
            <Link href="/register" className="text-orange-600 hover:underline font-semibold">
              Register here
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-4 border-t border-stone-100 space-y-2">
            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center">
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
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="p-2 bg-stone-50/80 hover:bg-orange-50 border border-stone-200/60 hover:border-orange-200 rounded-xl text-[10px] font-semibold text-stone-700 hover:text-orange-700 transition-colors text-left flex flex-col cursor-pointer"
                >
                  <span className="font-bold truncate">{cred.label}</span>
                  <span className="text-[8px] text-stone-450 truncate mt-0.5">{cred.badge}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
