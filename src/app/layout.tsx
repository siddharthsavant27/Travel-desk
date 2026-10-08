import { Suspense } from "react";
import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";
import "./workflow.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AIConciergeLauncher } from "@/components/AIConciergeLauncher";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { conciergeConfig } from "@/lib/concierge/config";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TravelDesk by Harbinger | Corporate Travel & Visa Pre-Screening",
  description:
    "AI-assisted corporate travel and consular visa pre-screening platform engineered for business mobility and regulatory guidance.",
  icons: {
    icon: "/images/harbinger-logo.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  let unreadCount = 0;

  if (user) {
    try {
      unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      });
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <html
      data-scroll-behavior="smooth"
      lang="en"
      className={`${newsreader.variable} ${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--canvas-bg)] text-[var(--foreground)] selection:bg-[var(--brand-teal)]/30 selection:text-[var(--brand-teal)] relative">
        {/* Ambient Aurora Glow Background */}
        <div className="aurora-background" aria-hidden="true">
          <div className="aurora-glow-teal" />
          <div className="aurora-glow-violet" />
          <div className="aurora-glow-bottom" />
        </div>

        <a href="#main-content" className="skip-link">Skip to content</a>
        <Navbar user={user} unreadNotificationsCount={unreadCount} />
        <main id="main-content" tabIndex={-1} className="flex-1 relative z-10 min-w-0">{children}</main>
        <Footer />
        <AIConciergeLauncher key={`${user?.id ?? "guest"}:${user?.sessionVersion ?? 0}`} signedIn={Boolean(user)} mustChangePassword={user?.mustChangePassword} configured={Boolean(conciergeConfig())} />
        <Suspense fallback={null}>
          <SessionExpiredModal />
        </Suspense>
      </body>
    </html>
  );
}
