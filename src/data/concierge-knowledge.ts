import { faqs } from "./faqs";
import { REQUIRED_DOCUMENTS } from "@/lib/prescreening-rules";
import { VISA_ROUTES } from "@/lib/workflow";

// Curated portal reference, not a claim of current legal verification.
export const portalGuidance = {
  workflow: "Choose a visa route, create a trip, save questionnaire answers, upload required documents, and submit the completed package. A travel coordinator verifies documents and resolves flags. Requested changes unlock corrections and resubmission. Ready for filing is an internal package check, not visa approval. Work visa routes require specialist intake.",
  booking: "Final coordinator approval unlocks flight searches. Record an externally purchased flight and destination arrival/departure dates to unlock hotels. Hotel stays must fit within the confirmed destination stay. Reservations and payments happen with external providers. TravelDesk does not verify purchases, live fares, inventory, or automatically cancel reservations. Requesting an itinerary change returns the case for renewed review and preserves prior confirmations in history.",
  passport: "Portal guidance for Indian passport holders: Germany/Schengen generally requires validity for three months after departure, issue within the previous ten years, and two blank visa pages. The portal describes a US Six-Month Club exemption for Indian passports and recommends six months remaining validity as corporate practice. Confirm current requirements with official consular guidance and the travel team; this reference is not a legal eligibility determination.",
  visa: "The portal distinguishes Schengen short-stay business visits and US B-1 business visits from employment routes: German Type D, US L-1, and US H-1B. Business meetings and conferences differ from productive work. Do not infer permission to work or eligibility from the trip description; ask a travel specialist to confirm the correct route. The portal references a Schengen 90-days-in-180-days limit, which requires complete travel history to assess.",
};

export const conciergeKnowledge = [
  { id: "workflow", title: "Application workflow", href: "/interview", text: portalGuidance.workflow },
  { id: "booking", title: "Approval-based bookings", href: "/flights", text: portalGuidance.booking },
  { id: "passport", title: "Passport preparation", href: "/passport", text: portalGuidance.passport },
  { id: "visa", title: "Visa route guidance", href: "/visas/info", text: portalGuidance.visa },
  ...faqs.map((faq, index) => ({ id: `faq-${index + 1}`, title: faq.question, href: "/faq", text: faq.answer })),
  ...Object.entries(VISA_ROUTES).map(([type, route]) => ({
    id: `documents-${type}`, title: `${route.label}: documents`, href: "/visas",
    text: JSON.stringify(REQUIRED_DOCUMENTS[type] ?? REQUIRED_DOCUMENTS.DEFAULT),
  })),
];

export const conciergeNavigation = [
  { id: "visas", title: "Visa Navigator", href: "/visas" },
  { id: "interview", title: "Pre-screening", href: "/interview" },
  { id: "dashboard", title: "My applications", href: "/dashboard" },
  { id: "passport", title: "Passport guidance", href: "/passport" },
  { id: "faq", title: "Travel FAQs", href: "/faq" },
  { id: "flights", title: "Flight bookings", href: "/flights" },
  { id: "hotels", title: "Hotel bookings", href: "/hotels" },
];
