import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
      {/* Soft ambient violet / pink background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/10 blur-3xl pointer-events-none rounded-full" />

      <Suspense fallback={<div className="text-xs text-neutral-400">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
