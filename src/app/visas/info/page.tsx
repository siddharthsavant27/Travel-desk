import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { Disclosure } from "@/components/Disclosure";
import { portalGuidance } from "@/data/concierge-knowledge";
import { 
  ExternalLink, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Compass,
} from "lucide-react";

export default function VisaInfoDirectoryPage() {
  const lastVerified = "October 2026";

  return (
    <div className="page-shell !max-w-[1100px] space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link 
          href="/visas" 
          className="back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Visa Navigator</span>
        </Link>
      </div>

      <PageHeading eyebrow="Visa reference" title="Business visa guides" description="Compare the essentials for Germany and the United States. Expand a section for the detailed activity rules and use the official links to confirm current requirements." />
      <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">{portalGuidance.visa}</p>

      {/* Quick Jump Links */}
      <div className="flex flex-wrap gap-2.5 pb-2 border-b border-[var(--glass-border)]">
        <a href="#schengen-business" className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:text-[var(--brand-teal)] transition-colors">
          Schengen Business (Germany)
        </a>
        <a href="#us-b1" className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:text-[var(--brand-teal)] transition-colors">
          US B-1 Business Visitor
        </a>
        <a href="#us-l1" className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:text-[var(--brand-teal)] transition-colors">
          US L-1 Intra-Company Transferee
        </a>
        <a href="#us-h1b" className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:text-[var(--brand-teal)] transition-colors">
          US H-1B Specialty Occupation
        </a>
      </div>

      {/* Section 1: Schengen Business (Germany) */}
      <section id="schengen-business" className="glass-panel p-5 sm:p-7 space-y-5 border border-[var(--glass-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)]">
              European Union / Germany
            </span>
            <h2 className="text-2xl font-serif font-semibold text-[var(--foreground)]">
              Schengen Business Visa (Category C - Short Stay)
            </h2>
          </div>
          <span className="text-xs text-[var(--foreground-subtle)] bg-[var(--canvas-bg-alt)] px-3 py-1 rounded-md border border-[var(--glass-border)]">
            Verified: {lastVerified}
          </span>
        </div>

        <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
          The Schengen Business Visa enables foreign nationals to travel within the 29 Schengen member states (with Germany as main destination) for up to 90 days in any rolling 180-day period. It is strictly limited to commercial activities and prohibits employment or local gainful labor.
        </p>

        {/* Key Metrics Table */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Official Consular Fee
            </span>
            <span className="text-base font-semibold text-[var(--foreground)] font-mono">
              €90 EUR
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Statutory EU fee per Regulation (EU) 2024/1415 (effective 11 June 2024).
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Travel Medical Insurance
            </span>
            <span className="text-base font-semibold text-[var(--foreground)] font-mono">
              €30,000 EUR
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Mandatory minimum coverage including emergency medical and repatriation.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Statutory Passport Rule
            </span>
            <span className="text-base font-semibold text-[var(--foreground)]">
              3 Months Beyond Trip
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Article 12 Schengen Visa Code: issued &lt; 10 years ago, valid &ge; 3 mos post-departure.
            </p>
          </div>
        </div>

        <Disclosure title="Permitted & prohibited activities">
        {/* Permissible vs Prohibited Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-[var(--brand-teal)]/5 border border-[var(--brand-teal)]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-teal)] uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Permissible Commercial Activities</span>
            </div>
            <ul className="text-xs text-[var(--foreground-muted)] space-y-1.5">
              <li>• Attending business meetings and commercial negotiations</li>
              <li>• Participating in corporate conferences, seminars, or trade fairs</li>
              <li>• Conducting internal technical strategy discussions</li>
              <li>• Client consultations without on-site productive implementation</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[var(--brand-ruby)]/5 border border-[var(--brand-ruby)]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-ruby)] uppercase tracking-wider">
              <XCircle className="w-4 h-4" />
              <span>Strictly Prohibited Activities</span>
            </div>
            <ul className="text-xs text-[var(--foreground-muted)] space-y-1.5">
              <li>• Performing productive, hands-on engineering for local German entities</li>
              <li>• Receiving direct remuneration or billing from a German company</li>
              <li>• Exceeding 90 days within any 180-day Schengen calculation window</li>
              <li>• Taking up permanent residency or employment in Germany</li>
            </ul>
          </div>
        </div>

        </Disclosure>

        {/* Source citation */}
        <div className="pt-3 border-t border-[var(--glass-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--foreground-subtle)]">
          <span>Official German Consular Authority: Federal Foreign Office (Auswärtiges Amt)</span>
          <a
            href="https://india.diplo.de/in-en/service/business-visa/1987516"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-teal)] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <span>German Missions in India Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Section 2: US B-1 Visitor */}
      <section id="us-b1" className="glass-panel p-5 sm:p-7 space-y-5 border border-[var(--glass-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-indigo)]">
              United States of America
            </span>
            <h2 className="text-2xl font-serif font-semibold text-[var(--foreground)]">
              US B-1 Temporary Business Visitor
            </h2>
          </div>
          <span className="text-xs text-[var(--foreground-subtle)] bg-[var(--canvas-bg-alt)] px-3 py-1 rounded-md border border-[var(--glass-border)]">
            Verified: {lastVerified}
          </span>
        </div>

        <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
          The B-1 nonimmigrant visa is designed for travelers visiting the United States temporarily for commercial purposes. Business travelers must demonstrate foreign residency, intent to depart at the conclusion of the temporary visit, and that all financial remuneration remains sourced from abroad.
        </p>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Statutory MRV Fee
            </span>
            <span className="text-base font-semibold text-[var(--foreground)] font-mono">
              $185 USD
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Official nonimmigrant visa application fee per travel.state.gov.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Six-Month Club Rule
            </span>
            <span className="text-base font-semibold text-[var(--foreground)]">
              Indian Passport Exempt
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Passports must be valid for intended stay; standard 6-month addition waived for India.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--canvas-bg-alt)]/50 border border-[var(--glass-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1">
              Maximum Initial Stay
            </span>
            <span className="text-base font-semibold text-[var(--foreground)] font-mono">
              Up to 6 Months
            </span>
            <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
              Determined by CBP officer at Port of Entry via Form I-94.
            </p>
          </div>
        </div>

        <Disclosure title="Permitted & prohibited activities">
        {/* Permissible vs Prohibited Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-[var(--brand-teal)]/5 border border-[var(--brand-teal)]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-teal)] uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Permissible B-1 Activities</span>
            </div>
            <ul className="text-xs text-[var(--foreground-muted)] space-y-1.5">
              <li>• Consulting with business associates, clients, and partners</li>
              <li>• Attending scientific, educational, professional, or business conventions</li>
              <li>• Negotiating contracts, leases, or purchasing agreements</li>
              <li>• Participating in short-term internal training without productive labor</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[var(--brand-ruby)]/5 border border-[var(--brand-ruby)]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-ruby)] uppercase tracking-wider">
              <XCircle className="w-4 h-4" />
              <span>Strictly Prohibited on B-1</span>
            </div>
            <ul className="text-xs text-[var(--foreground-muted)] space-y-1.5">
              <li>• Engaging in productive hands-on engineering or development for a US client</li>
              <li>• Receiving salary or payment from a US employer or entity</li>
              <li>• Functioning as staff or filling an ordinary job role in the US</li>
              <li>• Providing services for which a US worker would ordinarily be hired</li>
            </ul>
          </div>
        </div>

        </Disclosure>

        {/* Source citation */}
        <div className="pt-3 border-t border-[var(--glass-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--foreground-subtle)]">
          <span>Authority: U.S. Department of State - Bureau of Consular Affairs</span>
          <a
            href="https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-teal)] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <span>travel.state.gov B-1 Visitor Directives</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Section 3: US L-1 & H-1B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* US L-1 */}
        <section id="us-l1" className="glass-panel p-6 space-y-4 border border-[var(--glass-border)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)]">
            Corporate Relocation
          </span>
          <h3 className="text-xl font-serif font-semibold text-[var(--foreground)]">
            US L-1 Intra-Company Transferee
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
            Allows a US employer that is an affiliate or subsidiary of Harbinger Group to transfer an executive or manager (L-1A) or an employee with specialized knowledge (L-1B) from an affiliated foreign office.
          </p>
          <div className="p-3 rounded-lg bg-[var(--canvas-bg-alt)] border border-[var(--glass-border)] text-xs space-y-1">
            <span className="font-semibold block text-[var(--foreground)]">1-Year Continuous Employment Requirement:</span>
            <p className="text-[var(--foreground-muted)]">
              The employee must have been employed abroad by Harbinger Group continuously for at least 1 full year within the 3 years preceding the petition filing.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1a-intracompany-transferee-executive-or-manager"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--brand-teal)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>USCIS L-1 Classification Overview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* US H-1B */}
        <section id="us-h1b" className="glass-panel p-6 space-y-4 border border-[var(--glass-border)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)]">
            Specialty Employment
          </span>
          <h3 className="text-xl font-serif font-semibold text-[var(--foreground)]">
            US H-1B Specialty Occupation
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
            Applies to persons in a specialty occupation requiring theoretical and practical application of a body of highly specialized knowledge and a bachelor&apos;s degree or higher in the specific specialty.
          </p>
          <div className="p-3 rounded-lg bg-[var(--canvas-bg-alt)] border border-[var(--glass-border)] text-xs space-y-1">
            <span className="font-semibold block text-[var(--foreground)]">Statutory Lottery Cap & Labor Condition:</span>
            <p className="text-[var(--foreground-muted)]">
              Subject to the annual 65,000 statutory cap (+20,000 US master&apos;s exemption) and a certified LCA from the U.S. Department of Labor.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--brand-teal)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>USCIS H-1B Occupation Overview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      </div>

      {/* Bottom CTA to Navigator */}
      <div className="p-6 rounded-2xl border border-[var(--brand-teal)]/30 bg-[var(--brand-teal)]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Need tailored advice for an upcoming business trip?
          </h3>
          <p className="text-xs text-[var(--foreground-muted)]">
            Use the Visa Navigator wizard to evaluate your specific commercial itinerary.
          </p>
        </div>
        <Link
          href="/visas"
          className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[var(--brand-teal)] text-[#071426] hover:bg-[var(--brand-teal-hover)] transition-all shrink-0 inline-flex items-center gap-1.5 shadow-md"
        >
          <span>Open Visa Navigator</span>
          <Compass className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
