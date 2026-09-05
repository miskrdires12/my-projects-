import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#07070b] text-neutral-900 dark:text-white flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden transition-colors duration-200">
      <Suspense fallback={<div className="text-xs text-neutral-400">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
