"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { Disclosure } from "@/components/Disclosure";
import { ArrowRight, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, RotateCcw, Sparkles } from "lucide-react";

type Destination = "GERMANY" | "USA";
type Purpose = "MEETINGS" | "CONFERENCE" | "TRANSFER" | "LOCAL_WORK" | "TOURISM";
type Duration = "SHORT_STAY" | "LONG_STAY";
type Tenure = "OVER_ONE_YEAR" | "UNDER_ONE_YEAR" | "CONTRACTOR";

function VisaNavigatorContent() {
  const searchParams = useSearchParams();
  const promptParam = searchParams.get("prompt") || searchParams.get("q") || "";

  // Wizard state
  const [destination, setDestination] = useState<Destination>("GERMANY");
  const [purpose, setPurpose] = useState<Purpose>("MEETINGS");
  const [duration, setDuration] = useState<Duration>("SHORT_STAY");
  const [tenure, setTenure] = useState<Tenure>("OVER_ONE_YEAR");
  const [analyzedPrompt, setAnalyzedPrompt] = useState<string>("");

  // Parse prompt prefill if present
  useEffect(() => {
    if (promptParam) {
      setAnalyzedPrompt(promptParam);
      const lower = promptParam.toLowerCase();
      if (/\b(u\.?s\.?a?|united states|america|new york|b-?1|h-?1b|l-?1)\b/.test(lower)) {
        setDestination("USA");
      } else if (lower.includes("germany") || lower.includes("munich") || lower.includes("frankfurt") || lower.includes("schengen")) {
        setDestination("GERMANY");
      }

      if (lower.includes("transfer") || lower.includes("relocat")) {
        setPurpose("TRANSFER");
        setDuration("LONG_STAY");
      } else if (lower.includes("work") || lower.includes("employ") || lower.includes("contract")) {
        setPurpose("LOCAL_WORK");
      } else if (lower.includes("conference") || lower.includes("summit") || lower.includes("expo")) {
        setPurpose("CONFERENCE");
      } else {
        setPurpose("MEETINGS");
      }
    }
  }, [promptParam]);

  // Deterministic evaluation engine
  const evaluateRoute = () => {
    if (destination === "GERMANY") {
      if (purpose === "LOCAL_WORK" || duration === "LONG_STAY") {
        return {
          category: "German National Employment Visa (Type D)",
          typeKey: "GERMAN_D_VISA",
          isPermittedUnderBusiness: false,
          summary: "Local employment or stays exceeding 90 days in Germany require a National D Visa authorized by the German Federal Employment Agency (Bundesagentur für Arbeit). A short-stay Schengen C visa does not permit local labor.",
          authority: "Federal Foreign Office (Auswärtiges Amt) / German Missions in India",
          fee: "€75 (National Visa statutory consular fee)",
          passportRule: "Passport must be issued within the last 10 years and have at least 1 year validity remaining for long-term stay.",
          officialSource: "https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals",
          officialSourceName: "Make it in Germany (Federal Government Portal)",
          lastVerified: "October 2026",
          checklist: [
            "Recognized university degree or vocational qualification",
            "Concrete employment contract or binding job offer in Germany",
            "Approval from Bundesagentur für Arbeit (or Blue Card salary threshold)",
            "Declaration on the employment relationship (Erklärung zum Beschäftigungsverhältnis)",
            "Proof of statutory or recognized private health insurance"
          ],
          interviewEligible: false,
          warning: "Schengen C Business visas do NOT allow productive on-site work or local contracting."
        };
      }

      return {
        category: "Schengen Business Visa (Type C - Short Stay)",
        typeKey: "SCHENGEN_BUSINESS",
        isPermittedUnderBusiness: true,
        summary: "Authorized for commercial negotiations, business consultations, attending corporate client meetings, and short-term technical strategy sessions up to 90 days in any 180-day window.",
        authority: "German Federal Foreign Office / German Missions in India (via VFS Global)",
        fee: "€90 (Standard EU Schengen fee per Regulation (EU) 2024/1415)",
        passportRule: "Passport must be issued within the previous 10 years and valid for at least 3 months beyond intended departure date from the Schengen territory (Article 12 Schengen Visa Code). Minimum 2 blank pages.",
        officialSource: "https://india.diplo.de/in-en/service/business-visa/1987516",
        officialSourceName: "German Missions in India (Official Consular Portal)",
        lastVerified: "October 2026",
        checklist: [
          "Original Passport conforming to 3-month post-trip validity rule",
          "Official German Business Invitation Letter (Einladungsschreiben) with German commercial register (Handelsregister) extract",
          "Harbinger Group Corporate Employer Dispatch Letter confirming travel purpose and salary paid in India",
          "Travel Medical Insurance with minimum €30,000 coverage including emergency repatriation",
          "Confirmed round-trip flight booking & corporate hotel reservation"
        ],
        interviewEligible: true,
        interviewUrl: "/interview?visaType=SCHENGEN_BUSINESS"
      };
    }

    // USA evaluation
    if (purpose === "TRANSFER") {
      return {
        category: "US L-1 Intra-company transfer (L-1A / L-1B)",
        typeKey: "US_L1",
        isPermittedUnderBusiness: true,
        summary: "For intra-company transferees transferring from Harbinger Group India to an affiliated US entity in an executive, managerial (L-1A), or specialized knowledge (L-1B) capacity.",
        authority: "USCIS & U.S. Department of State - Consular Affairs",
        fee: "$205 USD MRV Application Fee + USCIS Petition & Fraud Prevention Fees",
        passportRule: "Indian passports are exempt from 6-month rule under Six-Month Club; must be valid for intended period of stay.",
        officialSource: "https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1a-intracompany-transferee-executive-or-manager",
        officialSourceName: "USCIS Official Portal",
        lastVerified: "October 2026",
        checklist: [
          "Approved Form I-797 (Notice of Action) or Form I-129S for Blanket L petitions",
          "Form DS-160 Confirmation Barcode",
          "Verification of 1 continuous year of qualifying employment abroad within the preceding 3 years",
          "Corporate relationship documentation between Indian and US entities",
          "Detailed role specification detailing specialized knowledge or managerial scope"
        ],
        interviewEligible: true,
        interviewUrl: "/interview?visaType=US_L1"
      };
    }

    if (purpose === "LOCAL_WORK" || duration === "LONG_STAY") {
      return {
        category: "US H-1B Specialty Occupation Visa",
        typeKey: "US_H1B",
        isPermittedUnderBusiness: false,
        summary: "Direct productive employment or extended client-site delivery in the United States requires an employer-sponsored specialty occupation petition approved by USCIS under statutory annual caps.",
        authority: "USCIS & U.S. Department of State",
        fee: "$205 USD MRV Application Fee + USCIS Petition Fees",
        passportRule: "Passport must remain valid for intended stay; Six-Month Club exempt for Indian passport holders.",
        officialSource: "https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations",
        officialSourceName: "USCIS Official Portal",
        lastVerified: "October 2026",
        checklist: [
          "Approved Form I-797 Petition for Nonimmigrant Worker",
          "Form DS-160 Confirmation",
          "Certified Labor Condition Application (LCA Form ETA-9035)",
          "Educational degree evaluation matching specialty occupation criteria",
          "Original Passport with validity covering proposed petition period"
        ],
        interviewEligible: false,
        warning: "B-1 Visitor visas strictly forbid productive labor, billing US clients directly, or receiving US compensation."
      };
    }

    // Default US Business
    return {
      category: "US B-1 Temporary Business Visitor Visa",
      typeKey: "US_B1",
      isPermittedUnderBusiness: true,
      summary: "Permits short-term travel to the United States to consult with business associates, attend corporate scientific, educational, or professional conventions, negotiate contracts, and participate in short-term business training.",
      authority: "U.S. Department of State - Bureau of Consular Affairs",
      fee: "$185 USD (MRV Application Fee per travel.state.gov)",
      passportRule: "Under the Six-Month Club Agreement, Indian passport holders need passports valid only for the duration of intended stay (though 6 months remaining validity is recommended).",
      officialSource: "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html",
      officialSourceName: "U.S. Department of State - Bureau of Consular Affairs",
      lastVerified: "October 2026",
      checklist: [
        "Online DS-160 Nonimmigrant Visa Application confirmation barcode",
        "Valid Passport with at least one blank page for consular visa foil",
        "Formal Business Invitation Letter from US corporate host or client entity",
        "Harbinger Group Deputation / Employer Support Letter confirming continued Indian payroll",
        "Appointment Confirmation Letter from US Visa Service Desk / VFS"
      ],
      interviewEligible: true,
      interviewUrl: "/interview?visaType=US_B1"
    };
  };

  const evaluation = evaluateRoute();

  return (
    <div className="page-shell">
      <div className="space-y-6">
        <PageHeading eyebrow="Visa preparation" title="Find the right visa route" description="Tell us about your business trip to Germany or the United States. See the suggested category and what to prepare next." />

      {/* Prompt Banner if user came from Landing prompt box */}
      {analyzedPrompt && (
        <div className="p-4 rounded-xl border border-[var(--brand-teal)]/30 bg-[var(--brand-teal)]/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--brand-teal)] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Prefilled from query:</p>
              <p className="text-xs text-[var(--foreground-muted)] italic line-clamp-1">&ldquo;{analyzedPrompt}&rdquo;</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnalyzedPrompt("")}
            className="text-xs text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Grid: Inputs (Left) and Evaluation Output (Right) Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Wizard Controls */}
        <div className="lg:col-span-5 glass-panel p-5 sm:p-6 space-y-6 border border-[var(--glass-border)]">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                <span>Your trip details</span>
              </h2>
            <button
              type="button"
              onClick={() => {
                setDestination("GERMANY");
                setPurpose("MEETINGS");
                setDuration("SHORT_STAY");
                setTenure("OVER_ONE_YEAR");
              }}
              className="text-xs text-[var(--foreground-subtle)] hover:text-[var(--brand-teal)] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* 1. Destination */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Destination
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="dest-germany-btn"
                onClick={() => setDestination("GERMANY")}
                aria-pressed={destination === "GERMANY"}
                className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                  destination === "GERMANY"
                    ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)] ring-1 ring-[var(--brand-teal)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                }`}
              >
                <div className="font-semibold text-sm mb-0.5">Germany</div>
                <div className="text-[11px] text-[var(--foreground-subtle)]">Schengen Area (Munich, Frankfurt)</div>
              </button>
              <button
                type="button"
                id="dest-usa-btn"
                onClick={() => setDestination("USA")}
                aria-pressed={destination === "USA"}
                className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                  destination === "USA"
                    ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)] ring-1 ring-[var(--brand-teal)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                }`}
              >
                <div className="font-semibold text-sm mb-0.5">United States</div>
                <div className="text-[11px] text-[var(--foreground-subtle)]">NYC, Silicon Valley, Client Sites</div>
              </button>
            </div>
          </div>

          {/* 2. Primary Commercial Purpose */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Purpose of travel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {[
                { key: "MEETINGS", label: "Client meetings", desc: "Non-productive business discussions and contracts" },
                { key: "CONFERENCE", label: "Conference or event", desc: "Attending professional seminars or exhibitions" },
                { key: "TRANSFER", label: "Intra-Company Transferee", desc: "Move to an affiliated office" },
                { key: "LOCAL_WORK", label: "Hands-on work", desc: "Billable client engineering or local payroll" }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  id={`purpose-${item.key.toLowerCase()}-btn`}
                  onClick={() => setPurpose(item.key as Purpose)}
                  aria-pressed={purpose === item.key}
                  className={`w-full p-3 rounded-lg border text-left text-xs transition-all ${
                    purpose === item.key
                      ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)] ring-1 ring-[var(--brand-teal)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                  }`}
                >
                  <div className="font-medium text-sm mb-0.5">{item.label}</div>
                  <div className="text-[11px] text-[var(--foreground-subtle)]">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Duration of Stay */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Duration of stay
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="duration-short-btn"
                onClick={() => setDuration("SHORT_STAY")}
                aria-pressed={duration === "SHORT_STAY"}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  duration === "SHORT_STAY"
                    ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)] ring-1 ring-[var(--brand-teal)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                }`}
              >
                <div className="font-medium mb-0.5">&le; 90 Days</div>
                <div className="text-[11px] text-[var(--foreground-subtle)]">Short-Stay Business</div>
              </button>
              <button
                type="button"
                id="duration-long-btn"
                onClick={() => setDuration("LONG_STAY")}
                aria-pressed={duration === "LONG_STAY"}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  duration === "LONG_STAY"
                    ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)] ring-1 ring-[var(--brand-teal)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                }`}
              >
                <div className="font-medium mb-0.5">&gt; 90 Days</div>
                <div className="text-[11px] text-[var(--foreground-subtle)]">Long-term Assignment</div>
              </button>
            </div>
          </div>

          {destination === "USA" && purpose === "TRANSFER" && (<>
          {/* 4. Company Tenure */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Time with Harbinger
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "OVER_ONE_YEAR", label: ">= 1 Year" },
                { key: "UNDER_ONE_YEAR", label: "< 1 Year" },
                { key: "CONTRACTOR", label: "Contractor" }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTenure(t.key as Tenure)}
                  aria-pressed={tenure === t.key}
                  className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-all ${
                    tenure === t.key
                      ? "border-[var(--brand-teal)] bg-[var(--brand-teal)]/15 text-[var(--foreground)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          </>)}
          </div>
        </div>

        {/* Right Column: Deterministic Evaluation Results */}
        <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
          <div className="glass-panel p-5 sm:p-7 space-y-5 border border-[var(--glass-border)] relative">
            {/* Category Badge & Title */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-teal)]/15 text-[var(--brand-teal)] border border-[var(--brand-teal)]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Suggested visa route</span>
                </span>
                <span className="text-[11px] text-[var(--foreground-subtle)]">
                  Last verified: {evaluation.lastVerified}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)] font-serif" id="evaluation-category-heading">
                {evaluation.category}
              </h2>
            </div>

            {/* Warning if non-permitted labor */}
            {evaluation.warning && (
              <div className="p-4 rounded-xl border border-[var(--brand-ruby)]/40 bg-[var(--brand-ruby)]/10 text-sm text-red-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Regulatory Compliance Notice:</span>
                  <p className="leading-relaxed">{evaluation.warning}</p>
                </div>
              </div>
            )}

            {/* Factual Summary */}
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
              {evaluation.summary}
            </p>

            {/* Action CTA */}
            {(
              <div className="pt-4">
                <Link
                  href={"/applications/new?" + new URLSearchParams({ visaType: evaluation.typeKey, purpose: analyzedPrompt || `${purpose.replaceAll("_", " ").toLowerCase()} in ${destination === "GERMANY" ? "Germany" : "the United States"}` }).toString()}
                  className="primary-button w-full"
                >
                  <span>{evaluation.interviewEligible ? "Start pre-screening" : "Start specialist intake"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
            {/* Statutory Consular Specs Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-lg border border-[var(--glass-border)] bg-[var(--canvas-bg-alt)]/40 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                  Issuing authority
                </div>
                <div className="text-xs font-medium text-[var(--foreground)]">
                  {evaluation.authority}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-[var(--glass-border)] bg-[var(--canvas-bg-alt)]/40 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                  Application fee
                </div>
                <div className="text-xs font-medium text-[var(--foreground)]">
                  {evaluation.fee}
                </div>
              </div>
            </div>

            {/* Passport Validity Statutory Rule */}
            <div className="p-4 rounded-lg border border-[var(--brand-indigo)]/30 bg-[var(--brand-indigo)]/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-indigo)] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Passport validity</span>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                {evaluation.passportRule}
              </p>
            </div>

            <Disclosure key={evaluation.typeKey} title={`Documents to prepare (${evaluation.checklist.length})`}>
              <ul className="space-y-2 text-xs text-[var(--foreground-muted)]">
                {evaluation.checklist.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{doc}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>

            {/* Official Source Link Citation */}
            <div className="pt-4 border-t border-[var(--glass-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <a
                href={evaluation.officialSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--brand-teal)] hover:underline font-medium"
              >
                <span>View official guidance</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

            </div>

          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h2 className="text-sm font-semibold text-slate-100">Need more guidance?</h2><p className="mt-1 text-xs text-slate-400">Explore the full visa directory or check your passport requirements.</p></div>
        <div className="flex flex-wrap gap-3"><Link href="/visas/info" className="secondary-button">Visa guides <ArrowRight className="h-4 w-4" /></Link><Link href="/passport" className="secondary-button">Passport guide <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
      </div>
    </div>
  );
}

export default function VisasPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-[var(--foreground-muted)]">
        Loading Visa Navigator...
      </div>
    }>
      <VisaNavigatorContent />
    </Suspense>
  );
}
