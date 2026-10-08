"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Eye, EyeOff, FlaskConical, Info } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(false);
    setIsLocked(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail.toLowerCase().endsWith("@harbingergroup.com")) {
      setEmailError(true);
      setError("Enter a valid @harbingergroup.com address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, from }),
        signal: AbortSignal.timeout(20000),
      });

      const data = await res.json().catch(() => ({ error: "The server returned an unexpected response. Please try again." }));

      if (!res.ok) {
        if (
          res.status === 423 ||
          data.isLocked ||
          (data.error && data.error.toLowerCase().includes("too many attempts"))
        ) {
          setIsLocked(true);
          setError(
            data.error || "Too many attempts, try again in 15 minutes."
          );
        } else {
          setError(
            data.error || "Incorrect email or password. Please try again."
          );
        }
        return;
      }

      window.location.href = data.redirectUrl || "/dashboard";
    } catch (failure) {
      setError(failure instanceof Error && failure.name === "TimeoutError"
        ? "Sign-in took too long. Please try again; the server may still be starting."
        : "Unable to reach the sign-in service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (
    role: "CUSTOMER" | "CSR" | "ADMIN",
    displayEmail: string,
    displayPass: string,
    roleTitle: string
  ) => {
    setEmail(displayEmail);
    setPassword(displayPass);
    setError(null);
    setEmailError(false);
    setIsLocked(false);
    setDemoNotice(`Signing in as ${roleTitle}…`);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, from }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json().catch(() => ({ error: "The server returned an unexpected response. Please try again." }));
      if (res.ok) {
        window.location.href =
          data.redirectUrl ||
          (role === "CUSTOMER" ? "/dashboard" : "/review");
      } else {
        setError(data.error || "Unable to sign in to this demo account. Please try again.");
      }
    } catch (failure) {
      setError(failure instanceof Error && failure.name === "TimeoutError"
        ? "Sign-in took too long. Please try again; the server may still be starting."
        : "Unable to reach the sign-in service. Please try again.");
    } finally {
      setLoading(false);
      setDemoNotice(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center select-none overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {/* Full-bleed Fixed Cinematic Airport Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(7, 20, 38, 0.55) 0%, rgba(7, 20, 38, 0.75) 100%), url('/images/login_screen.png')",
        }}
      />

      {/* Dynamic Atmospheric Aurora Underlays */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-[#4fdbc8]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed top-1/4 -right-48 w-[500px] h-[500px] bg-[#314769]/25 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed -bottom-32 left-1/3 w-[460px] h-[460px] bg-[#e1940b]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Top Header: Corner-Aligned Logo */}
      <header className="w-full flex items-center justify-between z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fdbc8] rounded-lg transition-transform duration-150 hover:scale-102"
          aria-label="Return to TravelDesk Homepage"
        >
          <div className="h-8 sm:h-9 px-2.5 sm:px-3 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Image
              alt="Harbinger Group"
              className="h-5 sm:h-5.5 w-auto object-contain"
              src="/images/harbinger-logo.png"
              width={92}
              height={28}
              priority
            />
          </div>
          <span className="font-sans text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-white/95 transition-colors">
            Travel<span className="text-[#4fdbc8] font-semibold">Desk</span>
          </span>
        </Link>
      </header>

      {/* Primary Authentication Glass Container */}
      <div className="w-full max-w-[460px] z-20 my-auto py-6 flex flex-col gap-4">
        <main
          className="relative rounded-[20px] p-8 md:p-10 flex flex-col gap-6"
          style={{
            background: "rgba(255, 255, 255, 0.07)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow:
              "0 20px 50px -10px rgba(0, 0, 0, 0.65), 0 0 45px -10px rgba(79, 219, 200, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)",
          }}
        >
          {/* Card Header */}
          <div className="flex flex-col items-start gap-1">
            <h1 className="font-serif text-[36px] leading-[44px] text-[#d7e3fc] tracking-tight font-normal">
              Sign in
            </h1>
          </div>

          {/* State Banners (Alerts) */}
          {searchParams.get("expired") === "true" && <p role="status" className="rounded-xl border border-amber-200/20 bg-amber-200/10 p-3 text-sm text-amber-100">Your session has ended. Sign in again to continue from where you left off.</p>}
          {/* Temporarily Locked State Banner */}
          {isLocked && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl bg-[#e1940b]/20 border border-[#ffb957]/30 text-[#ffddb5] shadow-sm animate-in fade-in"
              id="banner-locked"
              role="alert"
            >
              <Lock className="w-5 h-5 text-[#ffb957] shrink-0 mt-0.5" />
              <div className="text-left text-sm leading-snug">
                <span className="font-semibold block mb-0.5 text-[#ffddb5]">
                  Security Notice
                </span>
                {error || "Too many attempts, try again in 15 minutes."}
              </div>
            </div>
          )}

          {/* Wrong Credentials State Banner */}
          {!isLocked && error && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/30 text-[#ffdad6] shadow-sm animate-in fade-in"
              id="banner-invalid-creds"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
              <div
                className="text-left text-sm leading-snug"
                id="login-error-alert"
              >
                {error}
              </div>
            </div>
          )}

          {/* Sign In Form */}
          <form className="flex flex-col gap-5" id="auth-form" onSubmit={handleLogin}>
            {/* Email Input Section */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs font-semibold text-[#d7e3fc] tracking-wide uppercase"
                  htmlFor="email"
                >
                  Company email
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  className="w-full h-11 px-4 rounded-lg bg-[#030e20]/70 text-[#d7e3fc] placeholder:text-[#859490] border border-white/10 text-sm outline-none transition-all duration-200 focus:bg-[#0f1c2e] focus:border-[#4fdbc8]/60 shadow-inner"
                  id="email"
                  name="email"
                  placeholder="name@harbingergroup.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                />
              </div>
              {/* Field Validation Notice */}
              {emailError && (
                <div
                  className="flex items-center gap-1.5 text-[#ffb4ab] mt-0.5 text-xs font-medium"
                  id="email-error-msg"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Enter a valid @harbingergroup.com address</span>
                </div>
              )}
            </div>

            {/* Password Input Section */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs font-semibold text-[#d7e3fc] tracking-wide uppercase"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  className="w-full h-11 pl-4 pr-11 rounded-lg bg-[#030e20]/70 text-[#d7e3fc] placeholder:text-[#859490] border border-white/10 text-sm outline-none transition-all duration-200 focus:bg-[#0f1c2e] focus:border-[#4fdbc8]/60 shadow-inner"
                  id="password"
                  name="password"
                  placeholder="••••••••••••"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 text-[#bbcac6] hover:text-[#d7e3fc] flex items-center justify-center p-1 rounded transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  title="Toggle password visibility"
                  type="button"
                >
                  <span id="eye-icon">
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className={`w-full h-11 mt-1 rounded-lg font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 shadow-md focus:outline-none focus:scale-[0.99] active:scale-[0.98] ${
                isLocked
                  ? "bg-[#1e2a3d] text-[#859490] cursor-not-allowed"
                  : "bg-[#14b8a6] hover:bg-[#4fdbc8] text-[#003731] cursor-pointer"
              }`}
              id="btn-submit"
              type="submit"
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <span id="btn-text">Signing in...</span>
                  <span
                    className="animate-spin rounded-full h-4 w-4 border-2 border-[#003731] border-t-transparent inline-block"
                    id="btn-spinner"
                  />
                </>
              ) : (
                <span id="btn-text">Sign in</span>
              )}
            </button>
          </form>
          <Link href="/access-help" className="text-sm text-[#8ce8dc] underline underline-offset-4">Need an account or forgot your password?</Link>
        </main>

        {/* Demo Accounts Strip (Below Main Card) */}
        {isDemoMode && (
          <section className="w-full">
            <div className="rounded-xl bg-[#0f1c2e]/70 border border-white/10 backdrop-blur-md p-4 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#859490] flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-[#4fdbc8]" /> Demo accounts (testing only)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#142032]/60 hover:bg-[#293549] transition-all duration-150 group text-center border border-white/5 hover:border-[#4fdbc8]/30 cursor-pointer"
                  type="button"
                  disabled={loading}
                  aria-label="Log in as Demo Customer"
                  onClick={() =>
                    handleDemoLogin(
                      "CUSTOMER",
                      process.env.NEXT_PUBLIC_DEMO_CUSTOMER_EMAIL || "customer@harbingergroup.com",
                      process.env.NEXT_PUBLIC_DEMO_CUSTOMER_PASSWORD || "DemoCustomer2026!",
                      "Customer (Employee)"
                    )
                  }
                >
                  <span className="text-xs font-semibold text-[#d7e3fc] group-hover:text-[#4fdbc8] transition-colors">
                    Customer
                  </span>
                  <span className="text-[11px] text-[#859490]">(Employee)</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#142032]/60 hover:bg-[#293549] transition-all duration-150 group text-center border border-white/5 hover:border-[#4fdbc8]/30 cursor-pointer"
                  type="button"
                  disabled={loading}
                  aria-label="Log in as Demo CSR"
                  onClick={() =>
                    handleDemoLogin(
                      "CSR",
                      process.env.NEXT_PUBLIC_DEMO_CSR_EMAIL || "csr@harbingergroup.com",
                      process.env.NEXT_PUBLIC_DEMO_CSR_PASSWORD || "DemoCSR2026!",
                      "CSR (Reviewer)"
                    )
                  }
                >
                  <span className="text-xs font-semibold text-[#d7e3fc] group-hover:text-[#4fdbc8] transition-colors">
                    CSR
                  </span>
                  <span className="text-[11px] text-[#859490]">(Reviewer)</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#142032]/60 hover:bg-[#293549] transition-all duration-150 group text-center border border-white/5 hover:border-[#4fdbc8]/30 cursor-pointer"
                  type="button"
                  disabled={loading}
                  aria-label="Log in as Demo Admin"
                  onClick={() =>
                    handleDemoLogin(
                      "ADMIN",
                      process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || "admin@harbingergroup.com",
                      process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "DemoAdmin2026!",
                      "Admin (Manager)"
                    )
                  }
                >
                  <span className="text-xs font-semibold text-[#d7e3fc] group-hover:text-[#4fdbc8] transition-colors">
                    Admin
                  </span>
                  <span className="text-[11px] text-[#859490]">(Manager)</span>
                </button>
              </div>
              {demoNotice && (
                <div
                  className="text-center text-[11px] text-[#4fdbc8] font-medium transition-opacity duration-200 animate-in fade-in"
                  id="demo-notification"
                >
                  {demoNotice}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Discrete Clean Bottom Area */}
      <footer className="w-full py-2 text-center text-[#859490]/60 text-xs z-10">
        <p>Authorized users only.</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-[#859490]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
