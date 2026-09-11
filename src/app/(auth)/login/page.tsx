"use client";

// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION PORTAL
// Silicon Labs Hexagonal Emblem • Workstation Role Selection • Privacy-First
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
  Check,
} from "lucide-react";
import { loginAction, quickRoleLoginAction } from "@/actions/auth";
import { purgeSensitiveClientStorage } from "@/lib/idb-storage";

type WorkstationRole = "SENDER" | "RECEIVER" | "ADMIN";

interface PresetConfig {
  title: string;
  subtitle: string;
  email: string;
  pass: string;
  dest: string;
}

const ROLE_PRESETS: Record<WorkstationRole, PresetConfig> = {
  SENDER: {
    title: "Sender Station",
    subtitle: "300 DPI Studio • Fast Registration • ID Generation",
    email: "sender@studentbridge.internal",
    pass: "Password123!",
    dest: "/register",
  },
  RECEIVER: {
    title: "Receiver Workstation",
    subtitle: "Batch Review • 8-Up Print Engine • Student Directory",
    email: "receiver@studentbridge.internal",
    pass: "Password123!",
    dest: "/dashboard",
  },
  ADMIN: {
    title: "Administrator Portal",
    subtitle: "Security Roles • System Settings • Database Sync",
    email: "admin@studentbridge.internal",
    pass: "AdminPassword123!",
    dest: "/dashboard",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<WorkstationRole | null>(null);
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

  // When user clicks a workstation option, populate it inside the signin box
  const handleSelectRole = (role: WorkstationRole) => {
    setSelectedRole(role);
    setUsernameOrEmail(ROLE_PRESETS[role].email);
    setPassword(ROLE_PRESETS[role].pass);
    setErrorMessage(null);
  };

  // Submit signin and navigate to the selected workstation page
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // If a preset workstation is selected and matches the fields, execute instant preset login
    if (
      selectedRole &&
      usernameOrEmail.trim().toLowerCase() === ROLE_PRESETS[selectedRole].email.toLowerCase()
    ) {
      startTransition(async () => {
        try {
          const result = await quickRoleLoginAction(selectedRole);
          if (!result.success || !result.data) {
            setErrorMessage(result.error ?? "Failed to initialize workstation");
          } else {
            setSuccessRole(result.data.role);
            router.push(ROLE_PRESETS[selectedRole].dest);
          }
        } catch (err: any) {
          setErrorMessage(err?.message || "Workstation connection failed");
        }
      });
      return;
    }

    // Otherwise standard credentials authentication
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
          {/* Active Selected Workstation Pill inside the signin box */}
          {selectedRole && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#8fe617]/15 border border-[#8fe617] text-xs font-bold text-[#062404] animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
                <span>
                  Workstation: <strong>{ROLE_PRESETS[selectedRole].title}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-[#8fe617] text-[#062404] px-2 py-0.5 rounded-full font-black">
                Active
              </span>
            </div>
          )}

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
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  setSelectedRole(null);
                }}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedRole(null);
                }}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] placeholder:text-[#88968e] focus:bg-white focus:border-[#8fe617] focus:outline-none focus:ring-2 focus:ring-[#8fe617]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 3D Embossed Lemon Green Button with Fluid Sliding Hover Effect */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending}
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

        {/* Operational Role Selectors without Left Icons */}
        <div className="mt-6 pt-5 border-t border-[#e2e7e4] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#38433d] uppercase tracking-wider font-mono">
              Select Workstation:
            </p>
            <span className="text-[10px] font-mono font-bold text-[#6b7771]">Fills Sign In Box</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* SENDER */}
            <button
              type="button"
              onClick={() => handleSelectRole("SENDER")}
              className={`relative overflow-hidden rounded-2xl p-3.5 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                selectedRole === "SENDER"
                  ? "border-2 border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/40 shadow-[0_4px_16px_rgba(143,230,23,0.22)]"
                  : "border border-[#d6ddd8] bg-[#edf2ef] hover:border-[#8fe617]"
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#111814] block">
                    Sender Station
                  </span>
                  <p className="text-[10px] text-[#6b7771] mt-0.5">
                    300 DPI Studio • Fast Registration • ID Generation
                  </p>
                </div>
                {selectedRole === "SENDER" ? (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-black uppercase text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Selected</span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2] shrink-0" />
                )}
              </div>
            </button>

            {/* RECEIVER */}
            <button
              type="button"
              onClick={() => handleSelectRole("RECEIVER")}
              className={`relative overflow-hidden rounded-2xl p-3.5 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                selectedRole === "RECEIVER"
                  ? "border-2 border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/40 shadow-[0_4px_16px_rgba(143,230,23,0.22)]"
                  : "border border-[#d6ddd8] bg-[#edf2ef] hover:border-[#8fe617]"
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#111814] block">
                    Receiver Workstation
                  </span>
                  <p className="text-[10px] text-[#6b7771] mt-0.5">
                    Batch Review • 8-Up Print Engine • Student Directory
                  </p>
                </div>
                {selectedRole === "RECEIVER" ? (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-black uppercase text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Selected</span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2] shrink-0" />
                )}
              </div>
            </button>

            {/* ADMIN */}
            <button
              type="button"
              onClick={() => handleSelectRole("ADMIN")}
              className={`relative overflow-hidden rounded-2xl p-3.5 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] ${
                selectedRole === "ADMIN"
                  ? "border-2 border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/40 shadow-[0_4px_16px_rgba(143,230,23,0.22)]"
                  : "border border-[#d6ddd8] bg-[#edf2ef] hover:border-[#8fe617]"
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8fe617]/15 via-[#8fe617]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#111814] block">
                    Administrator Portal
                  </span>
                  <p className="text-[10px] text-[#6b7771] mt-0.5">
                    Security Roles • System Settings • Database Sync
                  </p>
                </div>
                {selectedRole === "ADMIN" ? (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-black uppercase text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Selected</span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2] shrink-0" />
                )}
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
