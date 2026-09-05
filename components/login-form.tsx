"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "./theme-provider";
import { toTiny } from "@/lib/tiny-text";

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
      {/* Top Bar with Brand & Day/Night Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M4 6h4v12H4z" />
              <path d="M16 6h4v12h-4z" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <span className="font-bold text-sm text-neutral-900 dark:text-white font-sans">Helios</span>
        </div>

        {/* Day / Night Mode Switcher */}
        <ThemeToggle />
      </div>

      {/* Brand Title */}
      <div className="text-center space-y-1.5 pt-2">
        <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white font-sans">
          Sign In to Workspace
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Engineered & Developed by <strong className="text-black dark:text-white font-semibold">Miskr Dires</strong>
        </p>
      </div>

      {/* Main Authentication Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-3xl bg-white dark:bg-[#121217] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl space-y-4"
      >
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-300 leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Work Email</label>
          <div className="relative">
            <Mail className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Password</label>
            <span className="text-[11px] text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer">
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
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
          <span>Demo Password: password123</span>
          <span className="text-emerald-500 font-semibold">Ready</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Authenticating...</span>
            </div>
          ) : (
            <>
              <span>Continue to Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Fast Account Switcher */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121217] border border-neutral-200/80 dark:border-white/[0.08] space-y-2.5 text-xs shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>Instant Demo Sign-in</span>
          </span>
          <span className="text-[10px] font-mono">1-click</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("miskr@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-neutral-900 dark:text-white block truncate text-[11px]">Miskr</span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">Owner</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("alex@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-neutral-900 dark:text-white block truncate text-[11px]">Alex</span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("sarah@example.com")}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-center transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-neutral-900 dark:text-white block truncate text-[11px]">Sarah</span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">Member</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-400">
        Enterprise multi-tenant core · Developed by Miskr Dires.
      </div>
    </div>
  );
}
