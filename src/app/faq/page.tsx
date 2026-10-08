import Link from "next/link";
import { faqs } from "@/data/faqs";
import { PageHeading } from "@/components/PageHeading";
import { Disclosure } from "@/components/Disclosure";
import { Compass, Mail } from "lucide-react";

export default function FAQPage() {
  return (
    <div className="page-shell !max-w-[960px] space-y-8">
      <PageHeading eyebrow="Travel support" title="How can we help?" description="Answers to common questions about visa preparation, documents, and business travel." />

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {faqs.map(faq => (
          <Disclosure key={faq.question} title={faq.question} open={!!faq.isWarning} className={faq.isWarning ? "!border-amber-300/25" : ""}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-teal-200">{faq.category}{faq.isWarning && " · Mandatory compliance rule"}</p>
            <p>{faq.answer}</p>
          </Disclosure>
        ))}
      </div>

      {/* Contact Corporate Travel Desk */}
      <div className="glass-panel p-5 sm:p-7 border border-[var(--glass-border)] text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2 justify-center sm:justify-start">
            <Mail className="w-4 h-4 text-[var(--brand-teal)]" />
            <span>Still have questions regarding your travel?</span>
          </h3>
          <p className="text-xs text-[var(--foreground-muted)]">
            Our corporate travel operations team is available Monday through Friday (09:00 - 18:00 IST).
          </p>
          <a href="mailto:travel-desk@harbingergroup.com" className="inline-block break-all text-sm text-teal-200 hover:underline">travel-desk@harbingergroup.com</a>
        </div>

        <Link
          href="/visas"
          className="primary-button shrink-0"
        >
          <span>Launch Visa Navigator</span>
          <Compass className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
