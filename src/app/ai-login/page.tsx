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

const loginSchema = zod.object({
  email: zod.string().email("Invalid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  rememberMe: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function AiLoginPage() {
  const router = useRouter();
  const loginSession = useErpStore((state) => state.loginSession);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/auth/ai-login", {
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
        toast.success(`Welcome to the AI Agent, ${data.user.name}!`);
        router.push("/ai-agent");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-850 p-4 font-sans relative overflow-hidden">
      {/* Premium gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-100 rounded-full blur-3xl -z-10 opacity-70"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl -z-10 opacity-50"></div>

      <div className="w-full max-w-md bg-white border border-[#fed7aa] p-8 rounded-2xl shadow-xl relative space-y-6">
        <div className="flex justify-center">
          <img src="/logo.png" alt="Conquer Logo" className="h-12 object-contain" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">AI Assistant Authentication</h2>
          <p className="text-xs text-stone-500 mt-1">Please enter your database credentials to unlock the AI Agent.</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2 animate-in fade-in-50">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">User Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="email"
                placeholder="e.g. admin@conquererp.com"
                {...register("email")}
                className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 placeholder-stone-400 transition-all"
              />
            </div>
            {errors.email && <span className="text-[10px] text-red-500 mt-1 block">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Account Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 placeholder-stone-400 transition-all"
              />
            </div>
            {errors.password && <span className="text-[10px] text-red-500 mt-1 block">{errors.password.message}</span>}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 text-stone-550 cursor-pointer">
              <input type="checkbox" {...register("rememberMe")} className="rounded border-stone-300 text-orange-550 focus:ring-0 bg-stone-50" />
              <span>Remember Session</span>
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Please contact system Administrator to reset passwords."); }} className="text-orange-600 hover:underline font-semibold">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-md shadow-orange-550/10 cursor-pointer pt-3"
          >
            <span>{loading ? "Authenticating AI..." : "Sign In to AI Agent"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-2.5 bg-white hover:bg-orange-50/50 border border-orange-200 text-orange-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <span>Return to ERP Inventory Portal</span>
          <Boxes className="w-3.5 h-3.5" />
        </button>

        <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
          Need an operational login?{" "}
          <Link href="/register" className="text-orange-600 hover:underline font-semibold">
            Register here
          </Link>
        </div>

        <div className="pt-4 border-t border-stone-100 space-y-2">
          <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center">
            Quick-Login Credentials (Testing)
          </span>
          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
            {testCredentials.map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => handleQuickLogin(cred.email, cred.pass)}
                className="p-1.5 bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-200 rounded-lg text-[10px] font-semibold text-stone-700 hover:text-orange-700 transition-all text-left flex flex-col cursor-pointer"
              >
                <span className="font-bold truncate">{cred.label}</span>
                <span className="text-[8px] text-stone-450 truncate mt-0.5">{cred.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
