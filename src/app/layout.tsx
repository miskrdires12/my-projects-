import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Bridge — Enterprise Student Management & ID Portal",
  description: "Next.js + TypeScript Enterprise Student Portal with automated QR generation, live capture, and 8-up A4 ID print engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-foreground antialiased selection:bg-accent selection:text-black">
        {children}
      </body>
    </html>
  );
}
