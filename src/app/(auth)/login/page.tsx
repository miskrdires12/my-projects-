"use client";

// ============================================================================
// STUDENT BRIDGE — ENTERPRISE AUTHENTICATION PORTAL
// ============================================================================

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
          router.push("/dashboard");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to communicate with authentication service.");
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black p-4 selection:bg-accent selection:text-black">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary border border-border mb-4 shadow-glow-sm">
            <Shield className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
            STUDENT <span className="text-accent">BRIDGE</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1 tracking-wider uppercase">
            Institutional Identity & Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-black">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground">Secure Sign In</h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Enter your credential pair to access your assigned role domain
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successRole && (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent-dim p-3.5 text-xs text-accent animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Session verified for role: <strong>{successRole}</strong>. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                Username or Institutional Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-foreground-muted">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin@studentbridge.internal"
                  className="w-full rounded-lg border border-border bg-surface-secondary py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-foreground-muted">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-border bg-surface-secondary py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 px-4 text-xs font-bold text-black uppercase tracking-wider hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all shadow-glow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Selection Buttons */}
          <div className="mt-6 pt-5 border-t border-border space-y-3">
            <p className="text-[11px] font-mono text-foreground-muted uppercase tracking-wider">
              Select Operational Role Environment:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("sender@studentbridge.internal", "Password123!")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    SENDER WORKSTATION
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5">
                    Data enrollment, webcam capture, photo editor, batches & receipts
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 shrink-0">sender →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("receiver@studentbridge.internal", "Password123!")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    RECEIVER FACILITY (20,000+)
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5">
                    Student directory, CSV export, external QR, photo zip, designer, print engine
                  </div>
                </div>
                <span className="text-[11px] font-mono text-blue-400 shrink-0">receiver →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("admin@studentbridge.internal", "AdminPassword123!")}
                className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-secondary hover:bg-surface-tertiary text-left transition-colors"
              >
                <div className="text-xs font-semibold text-accent flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  ADMINISTRATOR CONSOLE (ALL MODULES)
                </div>
                <span className="text-[11px] font-mono text-accent shrink-0">admin →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-[11px] text-foreground-subtle flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-accent" />
          <span>Server-side cryptographic token verification active</span>
        </div>
      </div>
    </div>
  );
}
