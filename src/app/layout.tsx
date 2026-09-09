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
    <html lang="en">
      <body className="min-h-screen bg-[#f7faf9] text-[#080808] antialiased selection:bg-[#02f52b] selection:text-[#080808]">
        {children}
      </body>
    </html>
  );
}
