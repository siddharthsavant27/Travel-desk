"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";
import { Disclosure } from "@/components/Disclosure";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Train,
  PhoneCall,
  Zap,
  Briefcase,
  ArrowRight,
} from "lucide-react";

function TravelInfoContent() {
  const searchParams = useSearchParams();
  const [selectedCity, setSelectedCity] = useState<"MUNICH" | "NEW_YORK">(searchParams.get("city") === "NEW_YORK" ? "NEW_YORK" : "MUNICH");

  return (
    <div className="page-shell space-y-6">
      <PageHeading eyebrow="Know before you go" title="Destination guides" description="Airport transfers, local essentials, and business customs for your next trip." />

      {/* Destination Tabs */}
      <div className="grid grid-cols-2 gap-3 border-b border-[var(--glass-border)] pb-4 sm:flex">
        <button
          type="button"
          id="city-munich-btn"
          onClick={() => setSelectedCity("MUNICH")}
          aria-pressed={selectedCity === "MUNICH"}
          className={`flex min-h-11 items-center justify-center gap-2 border border-transparent px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedCity === "MUNICH"
              ? "bg-[var(--brand-teal)] text-[#071426] shadow-md"
              : "border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Munich, Germany</span>
        </button>
        <button
          type="button"
          id="city-newyork-btn"
          onClick={() => setSelectedCity("NEW_YORK")}
          aria-pressed={selectedCity === "NEW_YORK"}
          className={`flex min-h-11 items-center justify-center gap-2 border border-transparent px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedCity === "NEW_YORK"
              ? "bg-[var(--brand-teal)] text-[#071426] shadow-md"
              : "border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-hover)] text-[var(--foreground-muted)]"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>New York, USA</span>
        </button>
      </div>

      {/* Munich Content */}
      {selectedCity === "MUNICH" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Banner with local asset */}
          <div className="relative rounded-2xl overflow-hidden h-56 sm:h-80 border border-[var(--glass-border)] shadow-xl">
            <Image
              src="/images/dest_munich_hd.webp"
              alt="Munich skyline with the Frauenkirche and historic red rooftops"
              fill
              sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 64px), 1136px"
              className="object-cover object-[center_40%]"
              preload
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/95 via-[#071426]/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)] bg-[var(--canvas-bg)]/80 px-2.5 py-1 rounded-md backdrop-blur-sm">
                Germany · Bavaria Region
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[var(--foreground)] mt-2">
                Your guide to Munich
              </h2>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5 text-[var(--brand-ruby)]" />
                <span>Emergency Numbers</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">112 (General) / 110 (Police)</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">EU universal emergency dispatch</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[var(--brand-amber)]" />
                <span>Electrical Standards</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">230V / 50Hz (Types C & F)</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Standard European 2-pin plug</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Train className="w-3.5 h-3.5 text-[var(--brand-teal)]" />
                <span>MUC Airport Transit</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">S-Bahn S1 / S8 (~42 mins)</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Direct connection to Hauptbahnhof</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-[var(--brand-indigo)]" />
                <span>Business Districts</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Schwabing & Arabellapark</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Primary corporate tech corridors</p>
            </div>
          </div>

          {/* Detailed Guidance Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <Disclosure title="Munich airport transfers" open>
              <ul className="text-sm text-[var(--foreground-muted)] space-y-3 leading-relaxed">
                <li>
                  <strong className="text-[var(--foreground)]">S-Bahn S1 & S8 (Suburban Rail):</strong> Trains depart every 10 minutes from Terminal 1 & 2. Journey time to Central Station (München Hbf) is ~40–45 minutes. An Airport-City-Day-Ticket (MVV Network) provides unlimited access to all zones.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Lufthansa Express Bus:</strong> Departs every 20 minutes from the airport, stopping at Munich Schwabing (Nordfriedhof) and Central Station. Journey time ~45 minutes.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Licensed Taxi / Rideshare:</strong> Fixed journey time between 35–50 minutes depending on traffic along the A9 motorway.
                </li>
              </ul>
            </Disclosure>

            <Disclosure title="Local business customs" open>
              <ul className="text-sm text-[var(--foreground-muted)] space-y-3 leading-relaxed">
                <li>
                  <strong className="text-[var(--foreground)]">Strict Punctuality:</strong> Arriving late (even by 5 minutes) is considered unprofessional in German business culture. Aim to arrive 10 minutes early.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Formal Salutations:</strong> Address colleagues and clients formally (Herr / Frau + Last Name) until explicitly invited to use first names.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Meeting Conduct:</strong> Agendas are followed strictly. Discussions are direct, analytical, and focused on facts and specifications rather than small talk.
                </li>
              </ul>
            </Disclosure>
          </div>

          {/* Consular Note */}
          <div className="p-5 rounded-xl border border-[var(--brand-teal)]/30 bg-[var(--brand-teal)]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[var(--foreground)]">Traveling to Munich for Client Meetings?</span>
              <p className="text-xs text-[var(--foreground-muted)]">Verify your Schengen Business Visa requirements and required German invitation letters.</p>
            </div>
            <Link
              href="/visas?prompt=Munich%20Germany%20client%20meetings"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-teal)] text-[#071426] hover:bg-[var(--brand-teal-hover)] transition-all shrink-0 inline-flex items-center gap-1.5 shadow-md"
            >
              <span>Check Munich Visa Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* New York City Content */}
      {selectedCity === "NEW_YORK" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Banner with local asset */}
          <div className="relative rounded-2xl overflow-hidden h-56 sm:h-80 border border-[var(--glass-border)] shadow-xl">
            <Image
              src="/images/dest_newyork_hd.webp"
              alt="New York City Manhattan skyline across the harbor"
              fill
              sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 64px), 1136px"
              className="object-cover object-[center_45%]"
              preload
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/95 via-[#071426]/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-indigo)] bg-[var(--canvas-bg)]/80 px-2.5 py-1 rounded-md backdrop-blur-sm">
                United States · New York Metro
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[var(--foreground)] mt-2">
                Your guide to New York
              </h2>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5 text-[var(--brand-ruby)]" />
                <span>Emergency Services</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">911 (Police / Fire / EMS)</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Universal US emergency number</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[var(--brand-amber)]" />
                <span>Electrical Standards</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">120V / 60Hz (Types A & B)</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Flat 2-pin / 3-pin grounded plug</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Train className="w-3.5 h-3.5 text-[var(--brand-teal)]" />
                <span>JFK / EWR Rail Transit</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">AirTrain + Subway / LIRR</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">50–60 mins to Midtown Manhattan</p>
            </div>

            <div className="glass-control p-4 rounded-xl border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] font-medium uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-[var(--brand-indigo)]" />
                <span>Primary Hubs</span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Midtown & Financial District</p>
              <p className="text-[11px] text-[var(--foreground-subtle)]">Corporate client headquarters</p>
            </div>
          </div>

          {/* Detailed Guidance Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <Disclosure title="New York airport transfers" open>
              <ul className="text-sm text-[var(--foreground-muted)] space-y-3 leading-relaxed">
                <li>
                  <strong className="text-[var(--foreground)]">John F. Kennedy (JFK):</strong> Take the JFK AirTrain to Jamaica Station, then transfer to the Long Island Rail Road (LIRR) to Grand Central or Penn Station (~35 mins total) or the E subway line (~50 mins).
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Newark Liberty (EWR):</strong> Take the EWR AirTrain to Newark Airport Rail Station, then take NJ Transit directly into New York Penn Station (~30–40 mins).
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">MTA Subway Navigation:</strong> Contactless OMNY tap-to-pay is accepted at all subway turnstiles with any credit card or smartphone.
                </li>
              </ul>
            </Disclosure>

            <Disclosure title="Local business customs" open>
              <ul className="text-sm text-[var(--foreground-muted)] space-y-3 leading-relaxed">
                <li>
                  <strong className="text-[var(--foreground)]">Direct Communication:</strong> New York corporate culture values concise, actionable communication. Get straight to the point in executive presentations.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Hospitality Tipping Norms:</strong> Tipping is customary in the United States: 18% to 20% in full-service restaurants, $2–$3 per bag for hotel bell staff, and 15–20% for taxi services.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Dress Codes:</strong> Business formal in traditional Financial District institutions; smart business casual in Midtown tech and consulting firms.
                </li>
              </ul>
            </Disclosure>
          </div>

          {/* Consular Note */}
          <div className="p-5 rounded-xl border border-[var(--brand-indigo)]/30 bg-[var(--brand-indigo)]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[var(--foreground)]">Attending meetings or conferences in NYC?</span>
              <p className="text-xs text-[var(--foreground-muted)]">Confirm that your trip adheres strictly to US B-1 nonimmigrant visitor regulations.</p>
            </div>
            <Link
              href="/visas?prompt=New%20York%20City%20corporate%20tech%20conference"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-teal)] text-[#071426] hover:bg-[var(--brand-teal-hover)] transition-all shrink-0 inline-flex items-center gap-1.5 shadow-md"
            >
              <span>Check US B-1 Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TravelInfoPage() {
  return <Suspense fallback={<div className="page-shell text-sm text-slate-400">Loading destination guide…</div>}><TravelInfoContent /></Suspense>;
}
