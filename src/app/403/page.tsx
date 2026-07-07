"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] text-stone-850 p-6 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-100 rounded-full blur-3xl -z-10 opacity-70"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl -z-10 opacity-50"></div>

      <div className="max-w-md w-full bg-white border border-[#fed7aa] p-8 text-center rounded-2xl shadow-xl relative">
        <div className="mx-auto w-16 h-16 bg-red-50 border border-red-200 text-red-650 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 mb-2 font-outfit">403 - Forbidden</h1>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed font-semibold">
          Access Denied. Your current security perspective / role profile does not possess the permissions required to inspect this resource.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-bold rounded-lg text-stone-700 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-orange-500/10 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Dashboard</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-100 text-[10px] text-stone-400 font-bold">
          CONQUER SECURITY POLICY v5.5 • IP AUDITED
        </div>
      </div>
    </div>
  );
}
