"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Lock, Key, Shield, Eye, EyeOff, CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Requirements check
  const hasLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const calculateStrength = () => {
    if (!newPassword) return { score: 0, label: "Unassessed" };
    let score = 0;
    if (hasLength) score++;
    if (hasUpper) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    if (score === 1) return { score: 1, label: "Weak" };
    if (score === 2) return { score: 2, label: "Moderate" };
    if (score === 3) return { score: 3, label: "Strong" };
    if (score === 4) return { score: 4, label: "Optimal" };
    return { score: 0, label: "Unassessed" };
  };

  const strength = calculateStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasLength) {
      setError("Password must be at least 10 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, from: new URLSearchParams(window.location.search).get("from") }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update password.");
        return;
      }

      window.location.href = data.redirectUrl || "/dashboard";
    } catch {
      setError("A network error occurred while updating your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 py-8 relative z-20">
      <div className="w-full max-w-[540px]">
        {/* Top Header Pill */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-teal)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Account Security • Password Setup
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--foreground-subtle)] text-xs">
            <Lock className="w-3.5 h-3.5 text-[var(--brand-amber)]" />
            <span>Secure account</span>
          </div>
        </div>

        {/* Card Container */}
        <div
          className="relative rounded-2xl p-8 md:p-10 flex flex-col gap-6"
          style={{
            background: "rgba(11, 37, 69, 0.70)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.65), 0 0 45px -10px rgba(20, 184, 166, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.20)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <Logo />
            <span className="text-[11px] font-semibold tracking-wide bg-white/10 text-[var(--brand-teal)] px-3 py-1 rounded-full border border-white/10">
              Security Update
            </span>
          </div>

          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-normal text-white tracking-tight mb-2">
              Change your password
              <span className="block text-xs uppercase tracking-wider text-[var(--brand-teal)] mt-1 font-sans font-semibold">
                Account security
              </span>
            </h1>
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
              To secure your corporate travel profile and travel documents, please set a permanent password before continuing.
            </p>
          </div>

          {error && (
            <div
              className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Current Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]" htmlFor="currentPassword">
                Current password
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 absolute left-3.5 text-[var(--foreground-subtle)]" />
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current or temporary password"
                  className="w-full h-11 pl-10 pr-10 rounded-lg glass-input text-sm placeholder:text-[var(--foreground-subtle)] focus:bg-[#071426]/80 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 p-1 text-[var(--foreground-subtle)] hover:text-white transition-colors"
                  aria-label="Toggle current password visibility"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]" htmlFor="newPassword">
                New permanent password
              </label>
              <div className="relative flex items-center">
                <Shield className="w-4 h-4 absolute left-3.5 text-[var(--foreground-subtle)]" />
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create strong passphrase"
                  className="w-full h-11 pl-10 pr-10 rounded-lg glass-input text-sm placeholder:text-[var(--foreground-subtle)] focus:bg-[#071426]/80 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 p-1 text-[var(--foreground-subtle)] hover:text-white transition-colors"
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Rating Bars */}
              <div className="pt-1.5">
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                  <span className="text-[var(--foreground-subtle)]">Complexity Rating</span>
                  <span className="uppercase tracking-wider font-semibold text-[var(--brand-teal)]">
                    {strength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                  <div className={`rounded-full transition-all duration-300 ${strength.score >= 1 ? "bg-[var(--brand-teal)]" : "bg-white/10"}`} />
                  <div className={`rounded-full transition-all duration-300 ${strength.score >= 2 ? "bg-[var(--brand-teal)]" : "bg-white/10"}`} />
                  <div className={`rounded-full transition-all duration-300 ${strength.score >= 3 ? "bg-[var(--brand-teal)]" : "bg-white/10"}`} />
                  <div className={`rounded-full transition-all duration-300 ${strength.score >= 4 ? "bg-[var(--brand-teal)]" : "bg-white/10"}`} />
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 text-[var(--foreground-subtle)]" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full h-11 pl-10 pr-10 rounded-lg glass-input text-sm placeholder:text-[var(--foreground-subtle)] focus:bg-[#071426]/80 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 p-1 text-[var(--foreground-subtle)] hover:text-white transition-colors"
                  aria-label="Toggle confirmation password visibility"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Requirements Checklist */}
            <div className="p-4 rounded-xl bg-[#071426]/70 border border-white/10 space-y-2 mt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
                Security Requirements
              </span>
              <ul className="space-y-1.5 text-xs text-[var(--foreground-muted)]">
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasLength ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-teal)]" /> : <Circle className="w-3.5 h-3.5 text-[var(--foreground-subtle)]" />}
                    <span>At least 10 characters in length</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasLength ? "text-[var(--brand-teal)]" : "text-[var(--foreground-subtle)]"}`}>
                    {hasLength ? "Met" : "Required"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-teal)]" /> : <Circle className="w-3.5 h-3.5 text-[var(--foreground-subtle)]" />}
                    <span>At least one uppercase letter (A–Z)</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasUpper ? "text-[var(--brand-teal)]" : "text-[var(--foreground-subtle)]"}`}>
                    {hasUpper ? "Met" : "Required"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-teal)]" /> : <Circle className="w-3.5 h-3.5 text-[var(--foreground-subtle)]" />}
                    <span>At least one number (0–9)</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasNumber ? "text-[var(--brand-teal)]" : "text-[var(--foreground-subtle)]"}`}>
                    {hasNumber ? "Met" : "Required"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-teal)]" /> : <Circle className="w-3.5 h-3.5 text-[var(--foreground-subtle)]" />}
                    <span>At least one special character (!@#$%^&*)</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasSpecial ? "text-[var(--brand-teal)]" : "text-[var(--foreground-subtle)]"}`}>
                    {hasSpecial ? "Met" : "Recommended"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-lg bg-[var(--brand-teal)] text-[#071426] font-semibold text-sm tracking-wide flex items-center justify-center gap-2 shadow-md hover:bg-[var(--brand-teal-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-teal)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update password and continue</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
