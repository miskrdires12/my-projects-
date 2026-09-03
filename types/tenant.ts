export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

export type SubscriptionTier = "FREE" | "PRO" | "ENTERPRISE";

export type SubscriptionStatus =
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID";

export interface OrganizationMembershipInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: MembershipRole;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
}

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userRole: MembershipRole;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  userId: string;
  userEmail: string;
  userName: string;
}

export interface UserSession {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  organizations: OrganizationMembershipInfo[];
}
