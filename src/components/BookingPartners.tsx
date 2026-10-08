"use client";

import { ArrowUpRight } from "lucide-react";
import { Disclosure } from "@/components/Disclosure";

export interface BookingPartner {
  id: string;
  name: string;
  url: string;
  description: string;
  features: string[];
}

export function BookingPartners<T extends BookingPartner>({ partners, category, onChoose, disabled }: {
  partners: T[];
  category: "flights" | "hotels";
  onChoose: (partner: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4 border-t border-white/10 pt-6">
      <div><h3 className="text-sm font-semibold text-slate-100">Continue with a booking partner</h3><p className="mt-1 text-xs leading-5 text-slate-400">Opens the partner’s site. Enter your trip details there to see live prices and availability.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        {partners.map((partner, index) => <button key={partner.id} type="button" id={`search-${category}-${partner.id}-btn`} onClick={() => onChoose(partner)} disabled={disabled} className={`${index === 0 ? "primary-button" : "secondary-button"} !justify-between !text-left disabled:opacity-40`}><span>{partner.name}</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></button>)}
      </div>
      <Disclosure title="Compare booking partners">
        <div className="grid gap-6 md:grid-cols-3">{partners.map(partner => <div key={partner.id}><h4 className="font-semibold text-slate-100">{partner.name}</h4><p className="mt-2 text-sm">{partner.description}</p><ul className="mt-3 list-disc space-y-1 pl-4 text-xs">{partner.features.map(feature => <li key={feature}>{feature}</li>)}</ul></div>)}</div>
      </Disclosure>
    </div>
  );
}
