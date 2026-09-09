"use client";

// ============================================================================
// STUDENT BRIDGE — ENTERPRISE AUTHENTICATION PORTAL (SILICON LABS)
// ============================================================================

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Key, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleQuickFill = (user: string, pass: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("emailOrUsername", usernameOrEmail);
    formData.set("password", password);

    startTransition(async () => {
      try {
        const result = await loginAction(null, formData);
        if (!result.success || !result.data) {
          setErrorMessage(result.error ?? "Authentication failed");
        } else {
          setSuccessRole(result.data.role);
          if (result.data.role === "SENDER") {
            router.push("/register");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to communicate with authentication service.");
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f7faf9] p-4 text-[#080808] selection:bg-[#02f52b] selection:text-[#080808]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#02f52b]/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header with Silicon Labs Logo */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-[#dce7e1] p-2 mb-3 shadow-[0_0_20px_rgba(2,245,43,0.25)]">
            <img
              src="/logo.png"
              alt="Silicon Labs Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#080808] font-mono flex items-center gap-1.5">
            <span>SILICON</span>
            <span className="text-[#080808] bg-[#02f52b] px-1.5 py-0.5 rounded text-lg font-black">LABS</span>
          </h1>
          <p className="text-xs font-semibold text-[#6b7771] mt-1 tracking-wider uppercase font-mono">
            Student Identity &amp; Card Manufacturing Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-7 shadow-xl">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#080808]">Secure Sign In</h2>
            <p className="text-xs text-[#6b7771] mt-0.5">
              Enter your credentials to access your workstation
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-50 p-3.5 text-xs text-red-600 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successRole && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#02f52b] bg-[#eef5f1] p-3.5 text-xs text-[#080808] font-bold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-[#080808] shrink-0" />
              <span>Session verified for role: <strong>{successRole}</strong>. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3f4743] mb-1.5 uppercase tracking-wider">
                Username or Institutional Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#6b7771]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin@studentbridge.internal"
                  className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] py-2.5 pl-10 pr-3.5 text-sm text-[#080808] placeholder:text-[#6b7771] focus:border-[#02f52b] focus:outline-none focus:ring-2 focus:ring-[#02f52b]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3f4743] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#6b7771]">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] py-2.5 pl-10 pr-3.5 text-sm text-[#080808] placeholder:text-[#6b7771] focus:border-[#02f52b] focus:outline-none focus:ring-2 focus:ring-[#02f52b]/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#02f52b] py-2.5 px-4 text-xs font-black text-[#080808] uppercase tracking-wider hover:bg-[#00dc25] focus:outline-none focus:ring-2 focus:ring-[#02f52b] disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(2,245,43,0.35)] active:scale-98"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Selection Buttons */}
          <div className="mt-6 pt-5 border-t border-[#dce7e1] space-y-2.5">
            <p className="text-[11px] font-mono text-[#6b7771] uppercase tracking-wider font-semibold">
              Select Operational Role Environment:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("sender@studentbridge.internal", "Password123!")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#dce7e1] bg-[#f7faf9] hover:bg-[#eef5f1] hover:border-[#02f52b] text-left transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#02f52b]" />
                    SENDER WORKSTATION
                  </div>
                  <div className="text-[11px] text-[#6b7771] mt-0.5">
                    Student registration &amp; photo capture studio
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#080808] shrink-0">sender →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("receiver@studentbridge.internal", "Password123!")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#dce7e1] bg-[#f7faf9] hover:bg-[#eef5f1] hover:border-[#02f52b] text-left transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#02f52b]" />
                    RECEIVER FACILITY
                  </div>
                  <div className="text-[11px] text-[#6b7771] mt-0.5">
                    Directory, CSV exports, photo zip, designer &amp; 8-up printing
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#080808] shrink-0">receiver →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("admin@studentbridge.internal", "AdminPassword123!")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#dce7e1] bg-[#f7faf9] hover:bg-[#eef5f1] hover:border-[#02f52b] text-left transition-all"
              >
                <div className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#080808]" />
                  ADMINISTRATOR CONSOLE
                </div>
                <span className="text-[11px] font-mono font-bold text-[#080808] shrink-0">admin →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center text-[11px] text-[#6b7771] font-mono flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#02f52b]" />
          <span>Encrypted stateless authentication session active</span>
        </div>
      </div>
    </div>
  );
}
