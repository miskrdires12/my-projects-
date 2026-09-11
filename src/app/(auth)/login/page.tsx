"use client";

// ============================================================================
// STUDENT BRIDGE — REDESIGNED AUTHENTICATION PORTAL (STUDIO NEUMORPHIC)
// Matches exact high-precision visual design with Lemon Green accent,
// fluid sliding hover animations, instant prefetching, and zero lag.
// ============================================================================

import React, { useState, useTransition, useEffect } from "react";
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
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // Speed optimization: Aggressively prefetch destination routes on mount for instant zero-wait transitions
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/register");
    router.prefetch("/students");
  }, [router]);

  const handleQuickFill = (user: string, pass: string, roleName: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setActiveRole(roleName);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-[#6eed28] selection:text-[#080808] bg-[#d7dbde] overflow-hidden">
      {/* Soft Studio Background Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#eef2f4_0%,#cfd4d8_100%)]" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-[430px] rounded-[32px] bg-white border border-white/80 p-7 sm:p-9 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.14),0_15px_30px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-sm">
        
        {/* Top 3D Chrome Emblem with Glowing Orbit Rings */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative w-44 h-24 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="/sl-emblem-transparent.png"
              alt="Silicon Labs Emblem"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(110,237,40,0.3)]"
            />
          </div>
        </div>

        {/* Header Titles */}
        <div className="mb-5">
          <h1 className="text-xl font-black text-[#111814] tracking-tight">
            Secure Sign In
          </h1>
          <p className="text-xs text-[#606e66] mt-0.5">
            Enter your credentials to access your workstation
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-600 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successRole && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#6eed28] bg-[#eefbe6] p-3 text-xs text-[#080808] font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-[#44be14] shrink-0" />
            <span>Session verified for role: <strong>{successRole}</strong>. Launching...</span>
          </div>
        )}

        {/* Credential Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username Field */}
          <div>
            <label className="block text-[10px] font-bold text-[#38433d] uppercase tracking-wider mb-1.5 font-mono">
              Username or Institutional Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7d8b83]">
                <User className="h-4 w-4 stroke-[1.8]" />
              </div>
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="admin@studentbridge.internal"
                className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] placeholder:text-[#88968e] focus:bg-white focus:border-[#6eed28] focus:outline-none focus:ring-2 focus:ring-[#6eed28]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[10px] font-bold text-[#38433d] uppercase tracking-wider mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7d8b83]">
                <Key className="h-4 w-4 stroke-[1.8]" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] placeholder:text-[#88968e] focus:bg-white focus:border-[#6eed28] focus:outline-none focus:ring-2 focus:ring-[#6eed28]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 3D Embossed Lemon Green Button with Fluid Sliding Hover Effect */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="fluid-slide-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-[#062404] bg-gradient-to-b from-[#72eb27] via-[#5edb18] to-[#3bc410] border border-[#7ef233]/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.18),0_10px_25px_-3px_rgba(75,210,25,0.45),0_4px_10px_rgba(0,0,0,0.06)] hover:brightness-105 active:scale-[0.98] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#062404]" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Role Selection Environments with Fluid Sliding Hover Effect */}
        <div className="mt-6 pt-5 border-t border-[#e2e7e4] space-y-2">
          <p className="text-xs font-bold text-[#38433d]">
            Select Operational Role Environment:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {/* SENDER */}
            <button
              type="button"
              onClick={() => handleQuickFill("sender@studentbridge.internal", "Password123!", "Sender")}
              className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                activeRole === "Sender"
                  ? "border-[#6eed28] bg-[#eefbe6]"
                  : "border-[#d6ddd8] bg-[#edf2ef] hover:border-[#6eed28]"
              }`}
            >
              {/* Fluid sliding background sheen on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                  Sender
                </span>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* RECEIVER */}
            <button
              type="button"
              onClick={() => handleQuickFill("receiver@studentbridge.internal", "Password123!", "Receiver")}
              className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                activeRole === "Receiver"
                  ? "border-[#6eed28] bg-[#eefbe6]"
                  : "border-[#d6ddd8] bg-[#edf2ef] hover:border-[#6eed28]"
              }`}
            >
              {/* Fluid sliding background sheen on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                  Receiver
                </span>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* ADMIN */}
            <button
              type="button"
              onClick={() => handleQuickFill("admin@studentbridge.internal", "AdminPassword123!", "Admin")}
              className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                activeRole === "Admin"
                  ? "border-[#6eed28] bg-[#eefbe6]"
                  : "border-[#d6ddd8] bg-[#edf2ef] hover:border-[#6eed28]"
              }`}
            >
              {/* Fluid sliding background sheen on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                  Admin
                </span>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
