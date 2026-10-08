import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  href?: string;
  showBadge?: boolean;
  showPartnerIcon?: boolean;
}

export function Logo({ className = "", href = "/", showBadge = false, showPartnerIcon = true }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)] rounded-lg ${className}`}
      aria-label="TravelDesk - Return to homepage"
    >
      {/* Crisp White Rounded Pill Container for Harbinger Corporate Lockup */}
      {showPartnerIcon && (
        <div className="hidden min-[400px]:flex h-8 sm:h-9 px-2.5 sm:px-3 bg-white rounded-lg items-center justify-center shadow-sm">
          <Image
            src="/images/harbinger-logo.png"
            alt="Harbinger Group"
            width={88}
            height={28}
            className="h-5 sm:h-5.5 w-auto object-contain"
            priority
          />
        </div>
      )}

      {/* Wordmark */}
      <span className="font-sans text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-white/95 transition-colors duration-200">
        Travel<span className="text-[var(--brand-teal)] font-semibold">Desk</span>
      </span>
    </Link>
  );
}
