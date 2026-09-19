"use client";

// ============================================================================
// STUDENT BRIDGE — ENTERPRISE AUTHENTICATION PORTAL
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Key,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    try {
      let id = localStorage.getItem("sb_hardware_device_id");
      if (!id) {
        id = "dev-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
        localStorage.setItem("sb_hardware_device_id", id);
      }
      setDeviceId(id);
      document.cookie = `sb_device_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("emailOrUsername", usernameOrEmail);
    formData.set("password", password);
    formData.set("deviceId", deviceId || "browser-device");
    formData.set(
      "deviceInfo",
      typeof navigator !== "undefined"
        ? `${navigator.platform} • ${navigator.userAgent.slice(0, 90)}`
        : "Browser Client"
    );

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
          <p className="text-xs text-foreground-muted mt-1 tracking-wider uppercase font-mono">
            Institutional Identity &amp; Management Portal
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
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
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
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider font-mono">
                Gmail / Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-foreground-muted">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full rounded-lg border border-border bg-surface-secondary py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider font-mono">
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & 1 Device = 1 Role Enforcement Notice */}
          <div className="mt-6 pt-5 border-t border-border space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300">
              <Laptop className="h-3 w-3 text-accent" />
              <span>1 Device = 1 Role Hardware Enforcement Active</span>
            </div>
            <p className="text-xs text-foreground-muted">
              Role credentials and device authorizations are provisioned exclusively by the Administrator. Default demo credentials are permanently disabled.
            </p>
          </div>
        </div>

        {/* Official Production Portfolio & Deployment Link */}
        <div className="mt-6 text-center space-y-2">
          <div className="text-[11px] uppercase tracking-wider font-mono text-neutral-400">
            Official Production Deployment
          </div>
          <a
            href="https://my-projects-two-kappa.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-900/90 text-xs font-mono text-white hover:border-white hover:bg-neutral-800 transition-all shadow-md group"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold text-white">https://my-projects-two-kappa.vercel.app</span>
            <ExternalLink className="h-3 w-3 text-neutral-400 group-hover:text-white transition-colors" />
          </a>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-[11px] text-foreground-subtle flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-accent" />
          <span>Server-side cryptographic token verification active</span>
        </div>
      </div>
    </div>
  );
}
