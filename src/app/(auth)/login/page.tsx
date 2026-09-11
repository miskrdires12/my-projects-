"use client";

// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION PORTAL
// Silicon Labs Hexagonal Emblem • Fast Workstation Role Access • Privacy-First
// ============================================================================

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Camera,
  Printer,
  Shield,
} from "lucide-react";
import { loginAction, quickRoleLoginAction } from "@/actions/auth";
import { purgeSensitiveClientStorage } from "@/lib/idb-storage";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRolePending, setIsRolePending] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  // Privacy & Performance initialization on mount
  useEffect(() => {
    // Wipe client-side storage & caches on login screen for privacy
    purgeSensitiveClientStorage().catch(() => {});

    // Prefetch destination routes for instant zero-wait transitions
    router.prefetch("/dashboard");
    router.prefetch("/register");
    router.prefetch("/print-engine");
    router.prefetch("/students");
  }, [router]);

  // Standard username & password form submit
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

  // Secure Role Quick-Login (Direct access for station operators)
  const handleRoleLogin = async (role: "SENDER" | "RECEIVER" | "ADMIN") => {
    setErrorMessage(null);
    setIsRolePending(role);

    try {
      const result = await quickRoleLoginAction(role);
      if (!result.success || !result.data) {
        setErrorMessage(result.error ?? "Failed to initialize role environment");
        setIsRolePending(null);
      } else {
        setSuccessRole(result.data.role);
        if (result.data.role === "SENDER") {
          router.push("/register");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Role connection failed");
      setIsRolePending(null);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-[#8fe617] selection:text-[#080808] bg-[#d7dbde] overflow-hidden">
      {/* Soft Studio Background Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#eef2f4_0%,#cfd4d8_100%)]" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-[440px] rounded-[32px] bg-white border border-white/80 p-7 sm:p-9 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.14),0_15px_30px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-sm">
        
        {/* Top Silicon Labs Hexagonal Logo */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative w-28 h-28 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="/logo-transparent.png"
              alt="Silicon Labs Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_6px_18px_rgba(143,230,23,0.3)]"
            />
          </div>
        </div>

        {/* Header Title: Strictly 'SignIn' */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black text-[#111814] tracking-tight">
            SignIn
          </h1>
          <p className="text-xs text-[#6b7771] mt-0.5">
            Select your workstation or enter operator credentials
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
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#8fe617] bg-[#f2fcee] p-3 text-xs text-[#080808] font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-[#5cb811] shrink-0" />
            <span>
              Identified as <strong>{successRole}</strong>. Launching workstation...
            </span>
          </div>
        )}

        {/* Credential Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username Field */}
          <div>
            <label className="block text-[10px] font-bold text-[#38433d] uppercase tracking-wider mb-1.5 font-mono">
              Username or Email
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
                placeholder="operator@studentbridge.internal"
                className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] placeholder:text-[#88968e] focus:bg-white focus:border-[#8fe617] focus:outline-none focus:ring-2 focus:ring-[#8fe617]/30 transition-all shadow-inner"
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
                className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] placeholder:text-[#88968e] focus:bg-white focus:border-[#8fe617] focus:outline-none focus:ring-2 focus:ring-[#8fe617]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 3D Embossed Lemon Green Button with Fluid Sliding Hover Effect */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending || !!isRolePending}
              className="fluid-slide-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-[#062404] bg-gradient-to-b from-[#8fe617] via-[#7ecc10] to-[#6bb30b] border border-[#8fe617]/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.18),0_10px_25px_-3px_rgba(143,230,23,0.45),0_4px_10px_rgba(0,0,0,0.06)] hover:brightness-105 active:scale-[0.98] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#062404]" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Operational Role Selectors: Sender, Receiver, Admin */}
        <div className="mt-6 pt-5 border-t border-[#e2e7e4] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#38433d] uppercase tracking-wider font-mono">
              Quick Workstation Launch:
            </p>
            <span className="text-[10px] font-mono font-bold text-[#6b7771]">One-Click</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* SENDER */}
            <button
              type="button"
              disabled={!!isRolePending || isPending}
              onClick={() => handleRoleLogin("SENDER")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] p-3.5 text-left transition-all group cursor-pointer shadow-xs hover:border-[#8fe617] hover:shadow-[0_4px_16px_rgba(143,230,23,0.18)] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-[#d6ddd8] flex items-center justify-center text-[#062404] group-hover:border-[#8fe617] group-hover:bg-[#8fe617]/15 transition-all shrink-0">
                    <Camera className="h-4 w-4 text-[#062404]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111814] group-hover:translate-x-0.5 transition-transform">
                        Sender Station
                      </span>
                      {isRolePending === "SENDER" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                    </div>
                    <p className="text-[10px] text-[#6b7771] mt-0.5">
                      300 DPI Studio • Fast Registration • ID Generation
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* RECEIVER */}
            <button
              type="button"
              disabled={!!isRolePending || isPending}
              onClick={() => handleRoleLogin("RECEIVER")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] p-3.5 text-left transition-all group cursor-pointer shadow-xs hover:border-[#8fe617] hover:shadow-[0_4px_16px_rgba(143,230,23,0.18)] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-[#d6ddd8] flex items-center justify-center text-[#062404] group-hover:border-[#8fe617] group-hover:bg-[#8fe617]/15 transition-all shrink-0">
                    <Printer className="h-4 w-4 text-[#062404]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111814] group-hover:translate-x-0.5 transition-transform">
                        Receiver Workstation
                      </span>
                      {isRolePending === "RECEIVER" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                    </div>
                    <p className="text-[10px] text-[#6b7771] mt-0.5">
                      Batch Review • 8-Up Print Engine • Student Directory
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* ADMIN */}
            <button
              type="button"
              disabled={!!isRolePending || isPending}
              onClick={() => handleRoleLogin("ADMIN")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] p-3.5 text-left transition-all group cursor-pointer shadow-xs hover:border-[#8fe617] hover:shadow-[0_4px_16px_rgba(143,230,23,0.18)] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-[#d6ddd8] flex items-center justify-center text-[#062404] group-hover:border-[#8fe617] group-hover:bg-[#8fe617]/15 transition-all shrink-0">
                    <Shield className="h-4 w-4 text-[#062404]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111814] group-hover:translate-x-0.5 transition-transform">
                        Administrator Portal
                      </span>
                      {isRolePending === "ADMIN" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                    </div>
                    <p className="text-[10px] text-[#6b7771] mt-0.5">
                      Security Roles • System Settings • Database Sync
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
