import type { NextConfig } from "next";

// Ensure critical build/runtime environment variables have safe fallbacks during CI/CD
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "fallback-secret-for-jwt-signing-saas-platform-32chars";
}

// Fallback for NEXTAUTH_URL to prevent TypeError: Invalid URL on Vercel
const rawNextAuthUrl = process.env.NEXTAUTH_URL;
const resolvedNextAuthUrl =
  rawNextAuthUrl && rawNextAuthUrl.trim().length > 0
    ? rawNextAuthUrl.trim()
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

process.env.NEXTAUTH_URL = resolvedNextAuthUrl;

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: resolvedNextAuthUrl,
  },
};

export default nextConfig;
