"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/acme/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password: password || "password123",
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password. Verify your credentials and try again.");
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleQuickLogin(demoEmail: string) {
    setIsLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email: demoEmail,
      password: "password123",
      redirect: false,
    });

    if (res?.error) {
      setError("Authentication failed. Please verify credentials.");
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="h-9 w-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white mx-auto shadow-xs">
          <BrandLogo className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
          Sign in to Omni
        </h1>
        <p className="text-xs text-neutral-500">
          Enter your work email to access your workspace.
        </p>
      </div>

      {/* Main Authentication Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4"
      >
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">Work Email</label>
          <div className="relative">
            <Mail className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700">Password</label>
            <span className="text-[11px] text-neutral-400 hover:text-neutral-900 cursor-pointer">
              Forgot?
            </span>
          </div>
          <div className="relative">
            <Lock className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span>{isLoading ? "Signing in..." : "Continue"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Fast Account Switcher */}
      <div className="p-3.5 rounded-xl bg-white border border-neutral-200 space-y-2.5 text-xs shadow-2xs">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span className="font-medium text-neutral-700">Demo Accounts</span>
          <span className="text-[10px] text-neutral-400 font-mono">Instant sign-in</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickLogin("miskr@example.com")}
            disabled={isLoading}
            className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-center transition-colors cursor-pointer"
          >
            <span className="font-semibold text-neutral-900 block truncate text-[11px]">Miskr</span>
            <span className="text-[10px] text-neutral-500 block truncate">Owner</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("alex@example.com")}
            disabled={isLoading}
            className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-center transition-colors cursor-pointer"
          >
            <span className="font-semibold text-neutral-900 block truncate text-[11px]">Alex</span>
            <span className="text-[10px] text-neutral-500 block truncate">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("sarah@example.com")}
            disabled={isLoading}
            className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-center transition-colors cursor-pointer"
          >
            <span className="font-semibold text-neutral-900 block truncate text-[11px]">Sarah</span>
            <span className="text-[10px] text-neutral-500 block truncate">Admin</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-400">
        Enterprise SSO via SAML 2.0 & OIDC supported on Enterprise tier.
      </div>
    </div>
  );
}
