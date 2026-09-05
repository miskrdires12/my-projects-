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

        const cleanEmail = credentials.email.toLowerCase().trim();
        let user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        // If user doesn't exist, create them dynamically so ANYONE can sign in immediately
        if (!user) {
          const rawPrefix = cleanEmail.split("@")[0] || "User";
          const formattedName = rawPrefix
            .split(/[._-]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          const passwordHash = await bcrypt.hash(credentials.password || "password123", 10);
          user = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: formattedName,
              passwordHash,
            },
          });

          // Automatically assign membership to default organization (acme) as OWNER
          const defaultOrg = await prisma.organization.findFirst({
            where: { slug: "acme" },
          });

          if (defaultOrg) {
            await prisma.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: defaultOrg.id,
                role: "OWNER",
              },
            });
          }
        } else {
          // Check password if set, or allow default demo password123
          if (user.passwordHash && credentials.password) {
            const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!isValid && credentials.password !== "password123") {
              return null;
            }
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
