import type { NextConfig } from "next";

// Ensure critical build/runtime environment variables have safe fallbacks during CI/CD
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "fallback-secret-for-jwt-signing-saas-platform-32chars";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
