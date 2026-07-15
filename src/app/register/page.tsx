"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { registerUserAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Sparkles, User, Mail, Phone, Building, Briefcase, Lock, Workflow } from "lucide-react";
import Link from "next/link";
import { useErpStore } from "@/lib/store";

const registerSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod.string().min(10, "Phone must be at least 10 digits"),
  address: zod.string().min(5, "Address must be at least 5 characters"),
  companyName: zod.string().min(2, "Company Name is required"),
  gstNumber: zod.string().optional().refine((val) => {
    if (!val) return true;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.toUpperCase());
  }, "Invalid Indian GST format"),
  branch: zod.string().min(1, "Please select your primary branch"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: zod.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterFormValues = zod.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const loginSession = useErpStore((state) => state.loginSession);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", companyName: "", gstNumber: "", branch: "Hyderabad", password: "", confirmPassword: "" }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const res = await registerUserAction({
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        companyName: values.companyName,
        gstNumber: values.gstNumber || undefined,
        passwordHash: values.password,
        branch: values.branch
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Account registered and activated successfully!");
        if (res.user) {
          loginSession({
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: "CUSTOMER",
            branch: res.user.branch || "Head Office",
            status: "ACTIVE"
          });
        }
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error("Registration failed. Please verify fields.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-100 p-4 font-sans relative">
        <div className="w-full max-w-md glass-panel bg-[#0d121f]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full w-max mx-auto animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Registration Request Logged</h2>
            <p className="text-xs text-slate-400">
              Your request has been filed in the directory queue. An administrator will review your operational role credentials.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Log Status:</span>
              <span className="font-bold text-amber-500">PENDING APPROVAL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">System Notification:</span>
              <span className="text-slate-300">Admin alerted</span>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all block cursor-pointer"
          >
            Return to Login Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-100 p-4 font-sans relative overflow-hidden">
      {/* Background shape */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-xl bg-[#0d121f]/95 border border-slate-800 backdrop-blur-md p-6 rounded-2xl shadow-2xl space-y-6">
        <div className="flex items-center space-x-2.5">
          <img src="/logo.png" alt="Conquer Logo" className="h-16 object-contain" />
          <span className="font-extrabold text-lg tracking-wider text-white">CONQUER ERP</span>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Create Sourcing Account</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill out your operational parameters for security review.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...register("name")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.name && <span className="text-[10px] text-rose-500 mt-1 block">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  placeholder="e.g. john@tech.com"
                  {...register("email")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.email && <span className="text-[10px] text-rose-500 mt-1 block">{errors.email.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  {...register("phone")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.phone && <span className="text-[10px] text-rose-500 mt-1 block">{errors.phone.message}</span>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Company Name</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. ABC Enterprises"
                  {...register("companyName")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.companyName && <span className="text-[10px] text-rose-500 mt-1 block">{errors.companyName.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">GST Number (optional)</label>
              <input
                type="text"
                placeholder="15-digit GSTIN"
                {...register("gstNumber")}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white uppercase"
              />
              {errors.gstNumber && <span className="text-[10px] text-rose-500 mt-1 block">{errors.gstNumber.message}</span>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Primary Branch Allocation</label>
              <select
                {...register("branch")}
                className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-300"
              >
                <option value="Hyderabad">Hyderabad Branch (HYD)</option>
                <option value="Bangalore">Bangalore Branch (BLR)</option>
                <option value="Chennai">Chennai Branch (CHN)</option>
                <option value="Head Office">Head Office (HO)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Registered Address</label>
              <textarea
                placeholder="Enter complete operational address"
                {...register("address")}
                rows={2}
                className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-350 resize-none"
              />
              {errors.address && <span className="text-[10px] text-rose-500 mt-1 block">{errors.address.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.password && <span className="text-[10px] text-rose-500 mt-1 block">{errors.password.message}</span>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
              {errors.confirmPassword && <span className="text-[10px] text-rose-500 mt-1 block">{errors.confirmPassword.message}</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-55"
          >
            {loading ? "Filing request..." : "Submit Registration Request"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-450 border-t border-slate-850 pt-4">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline font-semibold">
            Return to sign-in portal
          </Link>
        </div>
      </div>
    </div>
  );
}
