"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, ExternalLink, LogOut, ArrowRight, Building } from "lucide-react";
import { useErpStore } from "@/lib/store";
import { logoutUserAction } from "@/app/actions";

export default function AccessDenied() {
  const activeUser = useErpStore((s) => s.activeUser);
  const logoutSession = useErpStore((s) => s.logoutSession);

  const handleLogout = async () => {
    try {
      await logoutUserAction();
      logoutSession();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] text-stone-850 p-6 relative overflow-hidden font-sans">
      {/* Background ambient blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-100 rounded-full blur-3xl -z-10 opacity-70" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl -z-10 opacity-50" />

      <div className="max-w-lg w-full bg-white border border-[#fed7aa] p-8 text-center rounded-2xl shadow-xl relative">
        <div className="mx-auto w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-stone-900 mb-2 font-outfit">
          ERP Access Restricted
        </h1>
        <p className="text-stone-600 text-xs mb-5 leading-relaxed font-medium">
          Access to the ERP platform is restricted exclusively to <strong>Operations</strong> and <strong>Administration</strong> teams.
        </p>

        {activeUser && (
          <div className="mb-5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs">
            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Signed In Account</div>
            <div className="font-bold text-stone-800 text-sm mt-0.5">{activeUser.name}</div>
            <div className="text-stone-500 text-[11px] font-mono mt-0.5">{activeUser.email}</div>
            <div className="text-stone-600 text-[11px] mt-1">
              Role: <span className="font-bold text-orange-700">{(activeUser.role || "Staff").replace(/_/g, " ")}</span>
            </div>
          </div>
        )}

        {/* CRM Redirection Card */}
        <div className="p-4 bg-orange-50/80 border border-orange-200/80 rounded-xl mb-6 text-left">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-orange-600 text-white rounded-xl mt-0.5 shrink-0 shadow-sm">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-stone-900 text-xs flex items-center space-x-1.5">
                <span>Your Account Has CRM Access</span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-orange-600 text-white">
                  CRM
                </span>
              </h3>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                Sales, Marketing, Presales, and Customer accounts can log in using the same credentials on the Conquer CRM website.
              </p>
              <a
                href="https://conquer-technologies-crm.vercel.app/login"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-[#8c3120] hover:bg-[#722718] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#8c3120]/20 cursor-pointer"
              >
                <span>Go to CRM Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-bold rounded-xl text-stone-700 transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch / Sign Out</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 text-[10px] text-stone-400 font-bold tracking-wider uppercase">
          CONQUER ACCESS CONTROL POLICY • OPERATIONS &amp; ADMIN EXCLUSIVE
        </div>
      </div>
    </div>
  );
}
