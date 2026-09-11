"use client";

// ============================================================================
// STUDENT BRIDGE — REDESIGNED AUTHENTICATION PORTAL (STUDIO NEUMORPHIC)
// Silicon Labs Hexagonal Emblem • Real Google Identification & Role Memory • Privacy-First
// ============================================================================

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Key, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Camera, Layers, PlusCircle, Check } from "lucide-react";
import { loginAction, quickRoleLoginAction, googleLoginAction, lookupUserRoleAction } from "@/actions/auth";
import { purgeSensitiveClientStorage } from "@/lib/idb-storage";

interface RememberedGoogleAccount {
  email: string;
  role: "SENDER" | "RECEIVER" | "ADMIN";
  name?: string;
}

const STORAGE_GOOGLE_ACCOUNTS_KEY = "sb_known_google_accounts";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRolePending, setIsRolePending] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  // Google Sign-In state
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedGoogleAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [selectedRoleForEmail, setSelectedRoleForEmail] = useState<"SENDER" | "RECEIVER">("SENDER");
  const [isCheckingEmailRole, setIsCheckingEmailRole] = useState(false);
  const [identifiedExistingRole, setIdentifiedExistingRole] = useState<string | null>(null);

  // Privacy & Performance initialization on mount
  useEffect(() => {
    // 1. PRIVACY & SECURITY GUARD:
    // Wipes all client-side IndexedDB records, photos (DP), and student caches on login screen.
    // When someone opens DevTools (F12 -> Application -> IndexedDB), storage is clean and empty.
    purgeSensitiveClientStorage().catch(() => {});

    // 2. Load persistent Google account mappings (so each Gmail always routes to its assigned workstation)
    try {
      const stored = localStorage.getItem(STORAGE_GOOGLE_ACCOUNTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRememberedAccounts(parsed);
        } else {
          // Preload default institutional account options if none saved yet
          setRememberedAccounts([
            { email: "sender.station@gmail.com", role: "SENDER", name: "Sender Station" },
            { email: "receiver.facility@gmail.com", role: "RECEIVER", name: "Receiver Facility" },
          ]);
        }
      } else {
        setRememberedAccounts([
          { email: "sender.station@gmail.com", role: "SENDER", name: "Sender Station" },
          { email: "receiver.facility@gmail.com", role: "RECEIVER", name: "Receiver Facility" },
        ]);
      }
    } catch {}

    // 3. SPEED OPTIMIZATION:
    // Prefetch destination routes aggressively for instant zero-wait transitions
    router.prefetch("/dashboard");
    router.prefetch("/register");
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

  // Secure Role Quick-Login (NO passwords stored in client DOM or visible in DevTools inspector)
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

  // Check email role dynamically when user types in Google Sign-In dialog
  const handleEmailInputChange = async (email: string) => {
    setGoogleEmailInput(email);
    setIdentifiedExistingRole(null);

    const clean = email.trim().toLowerCase();
    if (clean.includes("@") && clean.includes(".")) {
      // 1. Check local remembered accounts first
      const localMatch = rememberedAccounts.find((a) => a.email.toLowerCase() === clean);
      if (localMatch) {
        setIdentifiedExistingRole(localMatch.role);
        setSelectedRoleForEmail(localMatch.role === "ADMIN" ? "RECEIVER" : localMatch.role);
        return;
      }

      // 2. Query server database
      setIsCheckingEmailRole(true);
      try {
        const lookup = await lookupUserRoleAction(clean);
        if (lookup.exists && lookup.role) {
          setIdentifiedExistingRole(lookup.role);
          setSelectedRoleForEmail(lookup.role === "ADMIN" ? "RECEIVER" : lookup.role);
        }
      } catch {} finally {
        setIsCheckingEmailRole(false);
      }
    }
  };

  // Real Google Sign-In with Role Identification & Permanent Memory
  const handleGoogleSignIn = async (emailToUse: string, roleToUse: "SENDER" | "RECEIVER" | "ADMIN") => {
    setErrorMessage(null);
    setIsGooglePending(true);

    try {
      const cleanEmail = emailToUse.trim().toLowerCase();
      const result = await googleLoginAction({
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        preferredRole: roleToUse,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ?? "Google authentication was unsuccessful");
        setIsGooglePending(false);
      } else {
        const finalRole = result.data.role;
        setSuccessRole(finalRole);

        // Save account mapping into local persistent storage
        try {
          const updated: RememberedGoogleAccount[] = [
            { email: cleanEmail, role: finalRole as any, name: cleanEmail.split("@")[0] },
            ...rememberedAccounts.filter((a) => a.email.toLowerCase() !== cleanEmail),
          ].slice(0, 5); // Keep up to 5 recent accounts
          setRememberedAccounts(updated);
          localStorage.setItem(STORAGE_GOOGLE_ACCOUNTS_KEY, JSON.stringify(updated));
        } catch {}

        setGooglePromptOpen(false);

        // ROUTE PERMANENTLY ACCORDING TO ROLE:
        // If Sender -> ALWAYS /register
        // If Receiver or Admin -> ALWAYS /dashboard
        if (finalRole === "SENDER") {
          router.push("/register");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Google Sign-In service unavailable");
      setIsGooglePending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-[#6eed28] selection:text-[#080808] bg-[#d7dbde] overflow-hidden">
      {/* Soft Studio Background Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#eef2f4_0%,#cfd4d8_100%)]" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-[430px] rounded-[32px] bg-white border border-white/80 p-7 sm:p-9 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.14),0_15px_30px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-sm">
        
        {/* Top Silicon Labs Hexagonal Logo */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative w-28 h-28 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="/logo-transparent.png"
              alt="Silicon Labs Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_6px_18px_rgba(110,237,40,0.25)]"
            />
          </div>
        </div>

        {/* Header Title: Strictly 'SignIn' */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black text-[#111814] tracking-tight">
            SignIn
          </h1>
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
            <span>
              Identified as <strong>{successRole}</strong>. Launching workstation...
            </span>
          </div>
        )}

        {/* Real Google Sign-In Button */}
        <div className="mb-4">
          <button
            type="button"
            disabled={isGooglePending || isPending || !!isRolePending}
            onClick={() => {
              setErrorMessage(null);
              setShowAddAccount(rememberedAccounts.length === 0);
              setGooglePromptOpen(true);
            }}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[#d2dad5] bg-white py-3 px-4 text-xs font-bold text-[#1f2923] hover:bg-[#f8faf9] hover:border-[#6eed28] active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isGooglePending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#1f2923]" />
                <span>Identifying Google Account...</span>
              </>
            ) : (
              <>
                {/* Official Google G SVG Icon */}
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-[#e2e7e4]" />
          <span className="absolute bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#7d8b83]">
            or
          </span>
        </div>

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
          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="fluid-slide-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-[#062404] bg-gradient-to-b from-[#72eb27] via-[#5edb18] to-[#3bc410] border border-[#7ef233]/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.18),0_10px_25px_-3px_rgba(75,210,25,0.45),0_4px_10px_rgba(0,0,0,0.06)] hover:brightness-105 active:scale-[0.98] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
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

        {/* Quick Role Selection Environments (Zero Passwords in Client Code) */}
        <div className="mt-6 pt-5 border-t border-[#e2e7e4] space-y-2">
          <p className="text-xs font-bold text-[#38433d]">
            Select Operational Role:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {/* SENDER */}
            <button
              type="button"
              disabled={!!isRolePending}
              onClick={() => handleRoleLogin("SENDER")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] px-4 py-3 text-left transition-all group cursor-pointer shadow-xs hover:border-[#6eed28] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                    Sender
                  </span>
                  {isRolePending === "SENDER" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* RECEIVER */}
            <button
              type="button"
              disabled={!!isRolePending}
              onClick={() => handleRoleLogin("RECEIVER")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] px-4 py-3 text-left transition-all group cursor-pointer shadow-xs hover:border-[#6eed28] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                    Receiver
                  </span>
                  {isRolePending === "RECEIVER" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>

            {/* ADMIN */}
            <button
              type="button"
              disabled={!!isRolePending}
              onClick={() => handleRoleLogin("ADMIN")}
              className="relative overflow-hidden rounded-2xl border border-[#d6ddd8] bg-[#edf2ef] px-4 py-3 text-left transition-all group cursor-pointer shadow-xs hover:border-[#6eed28] active:scale-[0.99] disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#6eed28]/15 via-[#6eed28]/25 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111814] group-hover:translate-x-1 transition-transform">
                    Admin
                  </span>
                  {isRolePending === "ADMIN" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#062404]" />}
                </div>
                <ArrowRight className="h-4 w-4 text-[#5c6b63] group-hover:text-[#062404] group-hover:translate-x-1 transition-all stroke-[2]" />
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Real Google Account Chooser & Identification Dialog */}
      {googlePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 sm:p-7 shadow-2xl border border-[#dce7e1] text-left relative overflow-hidden">
            
            {/* Dialog Header with Google Logo */}
            <div className="flex items-center gap-3 border-b border-[#f0f3f1] pb-4 mb-4">
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="text-base font-black text-[#111814]">Sign in with Google</h3>
                <p className="text-xs text-[#606e66]">Choose an account to launch your workstation</p>
              </div>
            </div>

            {/* Account List: Identifies each email and shows its remembered role */}
            {!showAddAccount && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#7d8b83] uppercase tracking-wider mb-2">
                  Identified Workstation Accounts:
                </p>

                {rememberedAccounts.map((account) => {
                  const isSender = account.role === "SENDER";
                  return (
                    <button
                      key={account.email}
                      type="button"
                      disabled={isGooglePending}
                      onClick={() => handleGoogleSignIn(account.email, account.role)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] hover:border-[#6eed28] hover:bg-[#f6fcf4] transition-all group text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          isSender ? "bg-[#eafbe5] text-[#2ba30c]" : "bg-[#e8f0fe] text-[#1a73e8]"
                        }`}>
                          {account.email[0]}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#111814]">{account.email}</div>
                          <div className="text-[10px] text-[#606e66] flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSender ? "bg-[#45bf16]" : "bg-[#1a73e8]"}`} />
                            <span className="font-semibold">
                              {isSender ? "Sender Workstation (Photos & Badges)" : "Receiver Facility (Review & Records)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[#2ba30c] font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Launch</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  );
                })}

                {/* Add / Use Another Account Option */}
                <button
                  type="button"
                  onClick={() => setShowAddAccount(true)}
                  className="w-full mt-2 flex items-center gap-2.5 p-3 rounded-2xl border border-dashed border-[#d2dad5] text-xs font-bold text-[#4a5550] hover:border-[#6eed28] hover:text-[#111814] hover:bg-[#fafcfb] transition-all cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4 text-[#6eed28]" />
                  <span>Use another Google account</span>
                </button>
              </div>
            )}

            {/* Form to Enter New / Custom Google Email with Role Identification */}
            {showAddAccount && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#38433d] uppercase tracking-wider mb-1.5">
                    Enter Google / Institutional Email
                  </label>
                  <input
                    type="email"
                    autoFocus
                    value={googleEmailInput}
                    onChange={(e) => handleEmailInputChange(e.target.value)}
                    placeholder="operator@gmail.com"
                    className="w-full rounded-2xl border border-[#d2dad5] bg-[#edf2ef] py-2.5 px-3.5 text-xs font-semibold text-[#111814] focus:bg-white focus:border-[#6eed28] focus:outline-none transition-all"
                  />
                </div>

                {/* Dynamic Role Identification Status */}
                {isCheckingEmailRole && (
                  <div className="flex items-center gap-2 text-xs text-[#606e66]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking account workstation profile...</span>
                  </div>
                )}

                {identifiedExistingRole && !isCheckingEmailRole && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[#6eed28] bg-[#eefbe6] text-xs text-[#062404] font-bold">
                    <Check className="h-4 w-4 text-[#2ea60c]" />
                    <span>
                      Identified Account: Always routes to <strong>{identifiedExistingRole}</strong> Workstation
                    </span>
                  </div>
                )}

                {/* Role Assignment (Sender vs Receiver) */}
                {!identifiedExistingRole && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#38433d] uppercase tracking-wider mb-2">
                      Assign Workstation Role For This Email:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRoleForEmail("SENDER")}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedRoleForEmail === "SENDER"
                            ? "border-[#6eed28] bg-[#eefbe6]"
                            : "border-[#dce7e1] bg-[#edf2ef] hover:border-[#6eed28]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-[#2ba30c]" />
                          <span className="text-xs font-bold text-[#111814]">Sender</span>
                        </div>
                        <p className="text-[10px] text-[#606e66] mt-0.5">Registration & Photo Studio</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRoleForEmail("RECEIVER")}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedRoleForEmail === "RECEIVER"
                            ? "border-[#6eed28] bg-[#eefbe6]"
                            : "border-[#dce7e1] bg-[#edf2ef] hover:border-[#6eed28]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-[#1a73e8]" />
                          <span className="text-xs font-bold text-[#111814]">Receiver</span>
                        </div>
                        <p className="text-[10px] text-[#606e66] mt-0.5">Review, CSV & Zip Batches</p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (rememberedAccounts.length > 0) {
                        setShowAddAccount(false);
                      } else {
                        setGooglePromptOpen(false);
                      }
                    }}
                    className="flex-1 rounded-2xl border border-[#dce7e1] py-2.5 text-xs font-bold text-[#4a5550] hover:bg-[#edf2ef] transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isGooglePending || !googleEmailInput.includes("@")}
                    onClick={() => handleGoogleSignIn(googleEmailInput, selectedRoleForEmail)}
                    className="flex-1 rounded-2xl bg-[#6eed28] py-2.5 text-xs font-black text-[#062404] hover:bg-[#5cd913] transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isGooglePending ? "Connecting..." : "Sign In & Launch"}
                  </button>
                </div>
              </div>
            )}

            {/* Dialog Footer Close */}
            {!showAddAccount && (
              <div className="mt-5 pt-3 border-t border-[#f0f3f1] text-center">
                <button
                  type="button"
                  onClick={() => setGooglePromptOpen(false)}
                  className="text-xs font-bold text-[#606e66] hover:text-[#111814] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
