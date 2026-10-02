"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

const loginSchema = zod.object({
  email: zod.string().min(1, "Email address is required").email("Please enter a valid email address"),
  password: zod.string().min(1, "Password is required"),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

// The 5 Main Employee Credentials (L0 - L4)
const MAIN_EMPLOYEE_CREDENTIALS = [
  { label: "Admin", email: "admin@conquererp.com", pass: "Admin@123" },
  { label: "Director Ops", email: "marcus.sterling@conquererp.com", pass: "Admin@123" },
  { label: "Ops Manager", email: "sophia.chen@conquererp.com", pass: "Admin@123" },
  { label: "Asst Manager", email: "ananya.sharma@conquererp.com", pass: "Admin@123" },
  { label: "Executive", email: "karan.patel@conquererp.com", pass: "Admin@123" },
];

export default function LoginPage() {
  const loginSession = useErpStore((state) => state.loginSession);
  const [errorMsg, setErrorMsg] = useState("");
  const [crmRedirectUrl, setCrmRedirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg("");
    setCrmRedirectUrl(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
          portalType: "employee",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid email or password.");
        if (data.isCrmOnly || data.crmUrl) {
          setCrmRedirectUrl(data.crmUrl || "https://conquer-technologies-crm.vercel.app/login");
        }
        toast.error(data.error || "Authentication failed");
      } else {
        loginSession(data.user as any);
        toast.success(`Welcome back, ${data.user.name || "Employee"}!`);
        window.location.href = "/dashboard";
      }
    } catch {
      setErrorMsg("An unexpected connection error occurred. Please try again.");
      toast.error("Network or authentication server error.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (email: string, pass: string, label: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
    setErrorMsg("");
    toast.info(`Filled credentials for ${label}`);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Please contact your IT administrator to reset your password.");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#fbfbfb]"
      style={{
        background: "radial-gradient(circle at 50% 30%, #ffffff 0%, #f4f5f7 100%)",
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Centered Login Card */}
      <div className="w-full max-w-[430px] sm:max-w-[440px] bg-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-stone-200/60 p-7 sm:p-9 transition-all">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Conquer Logo"
            className="h-10 w-auto object-contain mb-3 drop-shadow-xs"
          />
          <h1 className="text-xl sm:text-[22px] font-black text-stone-900 tracking-tight uppercase leading-tight">
            CONQUER ERP
          </h1>
          <p className="text-[10px] sm:text-[10.5px] font-bold text-stone-500 uppercase tracking-widest mt-1">
            APPLE PREMIUM BUSINESS PARTNER
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mt-5 p-3.5 bg-red-50/90 border border-red-200/90 rounded-xl text-xs text-red-700 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
            {crmRedirectUrl && (
              <div className="pt-1">
                <a
                  href={crmRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B2515] text-white text-[11px] font-bold rounded-lg hover:bg-[#771f11] transition-colors shadow-xs"
                >
                  <span>Launch Conquer CRM</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          
          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              EMAIL ADDRESS
            </label>
            <div className="relative flex items-center border border-stone-200 rounded-lg bg-white focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-300 transition-all">
              <Mail className="w-4 h-4 text-stone-400 ml-3.5 mr-2.5 shrink-0" />
              <input
                type="email"
                placeholder="name@conquer.com"
                {...register("email")}
                className="w-full py-2.5 pr-3 text-sm text-stone-800 placeholder:text-stone-400 bg-transparent outline-none font-medium"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-stone-500 hover:text-[#8B2515] hover:underline transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center border border-stone-200 rounded-lg bg-white focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-300 transition-all">
              <Lock className="w-4 h-4 text-stone-400 ml-3.5 mr-2.5 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                className="w-full py-2.5 pr-2 text-sm text-stone-800 placeholder:text-stone-400 bg-transparent outline-none font-medium"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="pr-3 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer shrink-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#8B2515] hover:bg-[#771f11] active:scale-[0.99] text-white font-bold text-sm rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 bg-[#faf8f6] border border-stone-200/70 rounded-xl p-4 sm:p-4.5 text-xs">
          <div className="font-bold text-xs sm:text-[12.5px] text-[#8B2515] mb-2.5">
            Demo Credentials (Password: Admin@123)
          </div>
          <div className="space-y-1.5">
            {MAIN_EMPLOYEE_CREDENTIALS.map((acc) => (
              <div
                key={acc.email}
                onClick={() => handleAutofill(acc.email, acc.pass, acc.label)}
                className="flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded-md hover:bg-stone-200/50 cursor-pointer transition-colors group"
                title="Click to autofill"
              >
                <span className="text-stone-500 font-medium group-hover:text-stone-800 text-[11.5px] transition-colors">
                  {acc.label}:
                </span>
                <span className="text-stone-800 font-semibold font-mono text-[11.5px] group-hover:text-[#8B2515] transition-colors">
                  {acc.email}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
