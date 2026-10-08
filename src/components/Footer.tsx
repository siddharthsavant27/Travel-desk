"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-[#061122]">
      <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><Logo showPartnerIcon={false} /><p className="mt-1 text-xs text-slate-400">Business travel, thoughtfully prepared.</p></div>
          <nav aria-label="Footer Navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <Link className="py-2 hover:text-teal-200" href="/visas/info">Visa guides</Link><Link className="py-2 hover:text-teal-200" href="/passport">Passport</Link><Link className="py-2 hover:text-teal-200" href="/travel-info">Destinations</Link><Link className="py-2 hover:text-teal-200" href="/faq">Help & FAQ</Link>
          </nav>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 pr-12 text-[11px] text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TravelDesk by Harbinger Group.</p>
          <p className="flex max-w-lg items-start gap-2 leading-5"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />Pre-screening guidance only. Confirm requirements with the official consular authority.</p>
        </div>
      </div>
    </footer>
  );
}
