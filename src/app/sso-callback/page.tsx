"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useErpStore } from "@/lib/store";
import { Loader2, ShieldCheck } from "lucide-react";

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginSession = useErpStore((state) => state.loginSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const token = searchParams.get("token");
      const userParam = searchParams.get("user");
      const portalParam = searchParams.get("portal");

      if (!token && !code) {
        setError("No SSO authorization token detected.");
        return;
      }

      try {
        const res = await fetch("/api/auth/sso/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, code }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to validate SSO authorization code.");
          return;
        }

        // Hydrate ERP local session from server-verified data only
        loginSession(data.user);

        // Redirect to dashboard
        if (data.user.role === "CUSTOMER") {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      } catch (err: any) {
        setError("Network error during SSO callback authentication.");
      }
    };

    handleCallback();
  }, [searchParams, loginSession, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">SSO Authentication Error</h2>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <a
            href="/login"
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200 rounded-2xl shadow-lg max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
          <ShieldCheck size={26} />
        </div>
        <h3 className="text-base font-bold text-slate-900">Connecting to ERP</h3>
        <p className="text-xs text-slate-500">
          Validating Single Sign-On credentials and preparing your dashboard...
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-600">
          <Loader2 size={16} className="animate-spin" />
          <span>Entering ERP...</span>
        </div>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  );
}
