"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Disclosure } from "@/components/Disclosure";
import { homepageFaqs } from "@/data/faqs";
import { ArrowRight, Search, ShieldCheck, Plane, Building2, Compass, FileCheck2, MapPin } from "lucide-react";

const services = [
  { title: "Visa pre-screening", description: "Find your visa route and prepare your documents for review.", href: "/visas", action: "Find my visa route", icon: ShieldCheck },
  { title: "Flights", description: "Plan your itinerary and compare flights on partner sites.", href: "/flights", action: "Search flights", icon: Plane },
  { title: "Hotels", description: "Choose your destination and check your nightly allowance.", href: "/hotels", action: "Find a stay", icon: Building2 },
  { title: "Travel essentials", description: "Get passport guidance and practical destination information.", href: "/travel-info", action: "Explore travel guides", icon: Compass },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    if (/\bflights?\b/i.test(query)) router.push("/flights");
    else if (/\bhotels?\b/i.test(query)) router.push("/hotels");
    else router.push(`/visas?prompt=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <section className="relative isolate -mt-[72px] overflow-hidden border-b border-white/10">
        <Image src="/images/flight_aircraft_sunset.webp" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071426] via-[#071426]/85 to-[#071426]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent to-[#071426]/30" />
        <div className="page-shell relative grid gap-10 !pt-[128px] !pb-14 sm:!pt-[152px] sm:!pb-20 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-16">
          <div>
            <p className="page-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Harbinger Group · Business travel</p>
            <h1 className="font-serif text-[40px] leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[58px]">Your next business trip,<br /><span className="text-teal-200">a little simpler.</span></h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">From visa preparation to flights and stays. Everything you need to get your journey moving, in one place.</p>
            <form onSubmit={handleSearchSubmit} className="mt-7 flex items-center gap-2 rounded-xl border border-white/20 bg-[#0b1c30]/95 p-2 shadow-xl">
              <Search className="ml-2 hidden h-5 w-5 shrink-0 text-teal-200 sm:block" aria-hidden="true" />
              <label htmlFor="global-search-input" className="sr-only">Describe your business trip</label>
              <input id="global-search-input" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Where are you travelling?" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none" required />
              <button type="submit" className="primary-button shrink-0 !px-4" aria-label="Submit travel query to Visa Navigator"><span className="hidden sm:inline">Find my route</span><ArrowRight className="h-4 w-4" /></button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300"><span className="text-slate-400">Try:</span><Link href="/visas?prompt=Munich%20client%20meetings" className="py-1 underline decoration-white/30 underline-offset-4 hover:text-teal-200">Munich client meetings</Link><Link href="/visas?prompt=US%20B-1%20conference" className="py-1 underline decoration-white/30 underline-offset-4 hover:text-teal-200">US business conference</Link></div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-[#0b1c30]/80 p-6 backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200"><FileCheck2 className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-white">Travel with a clear next step</p><p className="text-xs text-slate-400">For Indian passport holders</p></div></div>
            <ol className="space-y-5">{[["Find your visa route", "Tell us where you’re going and why."], ["Prepare your application", "Complete the interview and upload documents."], ["Get a human review", "Your travel coordinator checks your case."]].map(([title, description], index) => <li key={title} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] text-teal-200">{index + 1}</span><div><p className="text-sm font-medium text-slate-100">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div></li>)}</ol>
            <Link href="/visas" className="primary-button mt-6 w-full">Start visa pre-screening <ArrowRight className="h-4 w-4" /></Link>
            <p className="mt-3 text-center text-[11px] text-slate-400">Pre-screening helps you prepare; it is not a visa approval.</p>
          </div>
        </div>
      </section>
      <section className="page-shell !pb-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="page-eyebrow">Plan your journey</p><h2 className="font-serif text-3xl text-slate-100">What would you like to do?</h2></div><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-teal-200 hover:underline">My applications <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map(({ title, description, href, action, icon: Icon }) => <Link key={href} href={href} className="group flex flex-col rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 transition-colors hover:border-teal-300/40 hover:bg-[#14263b]"><Icon className="mb-5 h-6 w-6 text-teal-200" aria-hidden="true" /><h3 className="font-serif text-xl text-slate-100">{title}</h3><p className="mb-6 mt-2 text-sm leading-6 text-slate-400">{description}</p><span className="mt-auto flex items-center justify-between gap-2 text-xs font-semibold text-teal-200">{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</div>
      </section>
      <section className="page-shell !pt-6 !pb-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl text-slate-100">Know before you go</h2><Link href="/faq" className="inline-flex min-h-11 items-center gap-2 text-sm text-teal-200 hover:underline">Questions? Visit the help centre <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[{ title: "Munich", detail: "Getting around & business essentials", src: "/images/dest_munich_hd.webp", href: "/travel-info?city=MUNICH" }, { title: "New York", detail: "Airport transfers & local guidance", src: "/images/dest_newyork_hd.webp", href: "/travel-info?city=NEW_YORK" }].map(city => <Link key={city.title} href={city.href} className="group relative flex min-h-44 items-end overflow-hidden rounded-2xl border border-white/10 p-5"><Image src={city.src} alt="" fill sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1200px) 33vw, 368px" className="object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/40 to-transparent" /><div className="relative flex w-full items-end justify-between gap-2"><div><h3 className="flex items-center gap-1.5 font-serif text-xl text-white"><MapPin className="h-4 w-4 text-teal-200" />{city.title}</h3><p className="mt-1 text-xs text-slate-300">{city.detail}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-teal-200" /></div></Link>)}
          <Link href="/passport" className="flex min-h-44 flex-col justify-center rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 hover:border-teal-300/40"><FileCheck2 className="mb-3 h-5 w-5 text-teal-200" /><h3 className="font-serif text-xl text-white">Is your passport ready?</h3><p className="mt-2 text-xs leading-5 text-slate-400">Check destination validity requirements before you apply.</p><span className="mt-4 flex items-center gap-2 text-xs font-semibold text-teal-200">View passport guide <ArrowRight className="h-4 w-4" /></span></Link>
        </div>
      </section>
      <section className="page-shell !pt-6" aria-labelledby="home-faq-heading">
        <div className="grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <p className="page-eyebrow">A little guidance</p>
            <h2 id="home-faq-heading" className="font-serif text-3xl text-slate-100">Before you get started</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">A few answers to help you prepare your documents and know what happens next.</p>
            <Link href="/faq" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-teal-200 hover:text-teal-100">View all FAQs <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="space-y-3">
            {homepageFaqs.map(faq => (
              <Disclosure key={faq.question} title={faq.question}>
                <p>{faq.answer}</p>
              </Disclosure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
