"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Clock, LogIn, X } from "lucide-react";

export function SessionExpiredModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "true" || searchParams.get("session_expired") === "true") {
      setIsOpen(true);
    }

    const handleSessionExpiredEvent = () => setIsOpen(true);
    window.addEventListener("traveldesk:session-expired", handleSessionExpiredEvent);
    return () => window.removeEventListener("traveldesk:session-expired", handleSessionExpiredEvent);
  }, [searchParams]);

  if (!isOpen || pathname === "/login") return null;

  const handleSignIn = () => {
    setIsOpen(false);
    const query = new URLSearchParams(searchParams.toString());
    query.delete("expired");
    query.delete("session_expired");
    router.push(`/login?from=${encodeURIComponent(pathname + (query.size ? "?" + query.toString() : ""))}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl flex flex-col items-center border border-white/15"
        style={{
          background: "rgba(11, 37, 69, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.20)",
        }}
      >
        {/* Dismiss Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--foreground-subtle)] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center mb-5 shadow-sm">
          <Clock className="w-7 h-7" />
        </div>

        {/* Headline & Body */}
        <h2 id="session-expired-title" className="font-serif text-2xl font-normal text-white mb-2 tracking-tight">
          Session expired
        </h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-6 max-w-xs leading-relaxed">
          Your session has timed out due to inactivity. Please sign in again to continue your travel request.
        </p>

        {/* Sign in Button */}
        <button
          onClick={handleSignIn}
          className="w-full py-2.5 px-6 rounded-lg bg-[var(--brand-teal)] text-[#071426] font-semibold text-xs hover:bg-[var(--brand-teal-hover)] transition-all flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-teal)]"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign in again</span>
        </button>
      </div>
    </div>
  );
}
