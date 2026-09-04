"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

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
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-purple-600/30 border border-fuchsia-500/30 flex items-center justify-center text-white mx-auto shadow-[0_0_20px_rgba(217,70,239,0.3)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-white"
          >
            <path d="M4 6h4v12H4z" />
            <path d="M16 6h4v12h-4z" />
            <path d="M8 12h8" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white font-sans">
          Helios Investments
        </h1>
        <p className="text-xs text-neutral-400">
          Sign in to access your investment portfolio & workspace.
        </p>
      </div>

      {/* Main Authentication Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-3xl bg-[#13131b] border border-white/[0.08] shadow-2xl space-y-4"
      >
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Work Email</label>
          <div className="relative">
            <Mail className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-300">Password</label>
            <span className="text-[11px] text-neutral-400 hover:text-white cursor-pointer">
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
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500/50 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-full helios-ai-btn text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span>{isLoading ? "Signing in..." : "Continue"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Fast Account Switcher */}
      <div className="p-4 rounded-3xl bg-[#13131b] border border-white/[0.08] space-y-2.5 text-xs shadow-xl">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="font-medium text-white flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-fuchsia-400" />
            <span>Instant Demo Sign-in</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">1-click</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("miskr@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-white block truncate text-[11px] group-hover:text-fuchsia-300">Nadia</span>
            <span className="text-[10px] text-neutral-400 block truncate">Owner</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("alex@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-white block truncate text-[11px] group-hover:text-fuchsia-300">Alex</span>
            <span className="text-[10px] text-neutral-400 block truncate">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("sarah@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-white block truncate text-[11px] group-hover:text-fuchsia-300">Sarah</span>
            <span className="text-[10px] text-neutral-400 block truncate">Member</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-500">
        Enterprise SSO via SAML 2.0 & OIDC supported on Enterprise tier.
      </div>
    </div>
  );
}
