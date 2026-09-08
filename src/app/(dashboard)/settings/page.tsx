import React from "react";
import { Settings, Shield, Cpu, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <span>Institutional System Settings</span>
        </h1>
        <p className="text-xs text-foreground-muted mt-1">
          Identity server configuration, session cryptographic policies, and hardware acceleration status
        </p>
      </div>

      <div className="space-y-6">
        {/* Security & Cryptography Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-accent font-bold">
            <Shield className="h-4 w-4" />
            <span>Cryptographic Architecture</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-border bg-surface-secondary p-4 space-y-1">
              <span className="text-foreground-subtle font-mono uppercase text-[10px]">Session Token Algorithm</span>
              <p className="font-mono text-foreground font-bold">JWT (HS256) via JOSE</p>
              <p className="text-[11px] text-foreground-muted">Edge-compatible verified stateless cookie</p>
            </div>

            <div className="rounded-lg border border-border bg-surface-secondary p-4 space-y-1">
              <span className="text-foreground-subtle font-mono uppercase text-[10px]">Password Hashing Protocol</span>
              <p className="font-mono text-foreground font-bold">BCrypt (12 Salt Rounds)</p>
              <p className="text-[11px] text-foreground-muted">Resistance against GPU dictionary attacks</p>
            </div>

            <div className="rounded-lg border border-border bg-surface-secondary p-4 space-y-1">
              <span className="text-foreground-subtle font-mono uppercase text-[10px]">Session Cookie Security</span>
              <p className="font-mono text-accent font-bold">HTTP-Only • SameSite=Lax</p>
              <p className="text-[11px] text-foreground-muted">Client-side script access strictly prohibited</p>
            </div>

            <div className="rounded-lg border border-border bg-surface-secondary p-4 space-y-1">
              <span className="text-foreground-subtle font-mono uppercase text-[10px]">Active Session Lifespan</span>
              <p className="font-mono text-foreground font-bold">8 Hours (28,800s)</p>
              <p className="text-[11px] text-foreground-muted">Automatic invalidation upon expiration</p>
            </div>
          </div>
        </div>

        {/* Physical Print & Image Engine Specifications */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-accent font-bold">
            <Cpu className="h-4 w-4" />
            <span>Document & Media Processing Engine</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div>
                <div className="font-semibold text-foreground">A4 Imposition Geometry</div>
                <div className="text-foreground-muted text-[11px]">Standard 2×4 layout = 8 cards / sheet</div>
              </div>
              <span className="font-mono text-accent">85.60 × 53.98 mm (CR80)</span>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div>
                <div className="font-semibold text-foreground">Live WebRTC Camera Compression</div>
                <div className="text-foreground-muted text-[11px]">Client-side HTML5 canvas bounding</div>
              </div>
              <span className="font-mono text-foreground">600 × 800 (JPEG 0.75)</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Server-Side Pipeline Normalization</div>
                <div className="text-foreground-muted text-[11px]">Sharp auto-rotation, EXIF stripping, and magic byte validation</div>
              </div>
              <span className="font-mono text-accent flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
