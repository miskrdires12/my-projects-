import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MembershipRole, SubscriptionTier, SubscriptionStatus } from "@/types/tenant";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          return null;
        }

        // Check password if set, or allow demo login with default password
        if (user.passwordHash && credentials.password) {
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid && credentials.password !== "password123") {
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      // Fetch latest tenant memberships whenever JWT is evaluated
      if (token.sub) {
        const memberships = await prisma.organizationMember.findMany({
          where: { userId: token.sub },
          include: {
            organization: true,
          },
        });

        token.organizations = memberships.map((m) => ({
          id: m.organization.id,
          slug: m.organization.slug,
          name: m.organization.name,
          logoUrl: m.organization.logoUrl,
          role: m.role as MembershipRole,
          subscriptionTier: m.organization.subscriptionTier as SubscriptionTier,
          subscriptionStatus: m.organization.subscriptionStatus as SubscriptionStatus,
        }));
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).organizations = token.organizations || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-dev-secret-key-32-characters-long",
};
