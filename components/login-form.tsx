"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowRight, UserCheck } from "lucide-react";

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
      email,
      password: password || "password123",
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Try using one of the demo accounts below.");
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
      setError("Demo login failed");
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white font-bold mx-auto shadow-xs">
          ▲
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Sign In to Workspace</h1>
        <p className="text-xs text-neutral-500">
          Multi-Tenant B2B Authentication & Workspace Access
        </p>
      </div>

      {/* Demo Fast Logins */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-3 shadow-2xs">
        <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-black" />
          <span>Select Workspace Profile:</span>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("miskr@example.com")}
            disabled={isLoading}
            className="w-full p-3 rounded-xl bg-black text-white hover:bg-neutral-800 text-left flex items-center justify-between text-xs transition-colors group shadow-xs cursor-pointer"
          >
            <div>
              <span className="font-bold text-white block">Miskr (You)</span>
              <span className="text-[11px] text-neutral-300 block">Organization Owner across All Workspaces</span>
            </div>
            <UserCheck className="h-4 w-4 text-white" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("alex@example.com")}
            disabled={isLoading}
            className="w-full p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center justify-between text-xs transition-colors group cursor-pointer"
          >
            <div>
              <span className="font-semibold text-neutral-900">Alex Rivera</span>
              <span className="text-[11px] text-neutral-500 block">Admin (Acme) • Admin (Stark) • Member (Studio)</span>
            </div>
            <UserCheck className="h-4 w-4 text-neutral-400" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("sarah@example.com")}
            disabled={isLoading}
            className="w-full p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center justify-between text-xs transition-colors group cursor-pointer"
          >
            <div>
              <span className="font-semibold text-neutral-900">Sarah Chen</span>
              <span className="text-[11px] text-neutral-500 block">Admin (Stark) • Admin (Acme)</span>
            </div>
            <UserCheck className="h-4 w-4 text-neutral-400" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Standard Email / Password Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-2xs">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-800">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="miskr@example.com"
            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-800">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password123"
            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span>{isLoading ? "Signing in..." : "Continue"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
