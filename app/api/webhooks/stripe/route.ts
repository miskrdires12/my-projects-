import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, mapPriceIdToTier } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mapStripeStatusToPrisma(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      return "CANCELED";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const isMockDev = req.headers.get("x-mock-webhook") === "true";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  // Development bypass for UI simulator
  if (isMockDev && process.env.NODE_ENV !== "production") {
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid mock JSON body" }, { status: 400 });
    }
  } else {
    // Production signature verification
    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or webhook secret configuration" },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook Verification Failed]: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  }

  console.log(`[Stripe Webhook Received]: ${event.type} (ID: ${event.id})`);

  try {
    switch (event.type) {
      // -----------------------------------------------------------------------
      // 1. Checkout Session Completed (New initial subscription setup)
      // -----------------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const orgId = session.metadata?.organizationId;

        if (orgId && customerId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId || undefined,
            },
          });

          await prisma.auditLog.create({
            data: {
              organizationId: orgId,
              action: "STRIPE_CHECKOUT_COMPLETED",
              resourceType: "Billing",
              resourceId: subscriptionId,
              metadata: JSON.stringify({ customerId, sessionMode: session.mode }),
            },
          });
        }
        break;
      }

      // -----------------------------------------------------------------------
      // 2. Subscription Created or Updated
      // -----------------------------------------------------------------------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items?.data?.[0]?.price?.id;

        const mappedTier = priceId ? mapPriceIdToTier(priceId) : "FREE";
        const mappedStatus = mapStripeStatusToPrisma(subscription.status);
        const orgId = subscription.metadata?.organizationId;

        // Find tenant by explicit metadata or matching customer ID
        const targetOrg = await prisma.organization.findFirst({
          where: orgId
            ? { id: orgId }
            : { stripeCustomerId: customerId },
        });

        if (targetOrg) {
          const updatedOrg = await prisma.organization.update({
            where: { id: targetOrg.id },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              subscriptionTier: mappedTier,
              subscriptionStatus: mappedStatus,
              currentPeriodEnd: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000)
                : null,
            },
          });

          await prisma.auditLog.create({
            data: {
              organizationId: updatedOrg.id,
              action: `SUBSCRIPTION_${event.type.split(".")[2].toUpperCase()}`,
              resourceType: "Subscription",
              resourceId: subscription.id,
              metadata: JSON.stringify({
                tier: mappedTier,
                status: mappedStatus,
                priceId,
              }),
            },
          });
        }
        break;
      }

      // -----------------------------------------------------------------------
      // 3. Subscription Deleted (Canceled or Expired)
      // -----------------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const targetOrg = await prisma.organization.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId: customerId },
            ],
          },
        });

        if (targetOrg) {
          await prisma.organization.update({
            where: { id: targetOrg.id },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionTier: "FREE",
              subscriptionStatus: "CANCELED",
              currentPeriodEnd: null,
            },
          });

          await prisma.auditLog.create({
            data: {
              organizationId: targetOrg.id,
              action: "SUBSCRIPTION_CANCELED",
              resourceType: "Subscription",
              resourceId: subscription.id,
              metadata: JSON.stringify({ previousTier: targetOrg.subscriptionTier }),
            },
          });
        }
        break;
      }

      // -----------------------------------------------------------------------
      // 4. Invoice Payment Succeeded
      // -----------------------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const targetOrg = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (targetOrg) {
            await prisma.organization.update({
              where: { id: targetOrg.id },
              data: {
                subscriptionStatus: "ACTIVE",
              },
            });

            await prisma.auditLog.create({
              data: {
                organizationId: targetOrg.id,
                action: "INVOICE_PAYMENT_SUCCEEDED",
                resourceType: "Invoice",
                resourceId: invoice.id,
                metadata: JSON.stringify({
                  amountPaid: invoice.amount_paid,
                  currency: invoice.currency,
                }),
              },
            });
          }
        }
        break;
      }

      // -----------------------------------------------------------------------
      // 5. Invoice Payment Failed (Mark tenant PAST_DUE)
      // -----------------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const targetOrg = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (targetOrg) {
            await prisma.organization.update({
              where: { id: targetOrg.id },
              data: {
                subscriptionStatus: "PAST_DUE",
              },
            });

            await prisma.auditLog.create({
              data: {
                organizationId: targetOrg.id,
                action: "INVOICE_PAYMENT_FAILED",
                resourceType: "Invoice",
                resourceId: invoice.id,
                metadata: JSON.stringify({
                  attemptCount: invoice.attempt_count,
                  amountDue: invoice.amount_due,
                }),
              },
            });
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook Unhandled Event]: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true, eventType: event.type }, { status: 200 });
  } catch (err: any) {
    console.error(`[Stripe Webhook Handler Error]: ${err.message}`, err);
    return NextResponse.json(
      { error: "Webhook handler failed during database synchronization." },
      { status: 500 }
    );
  }
}
