import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export function WorkflowShell({
  title,
  description,
  eyebrow = "TravelDesk",
  back,
  action,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="wf">
      {back && (
        <Link className="back-link mb-6" href={back.href}>
          <ArrowLeft aria-hidden="true" /> {back.label}
        </Link>
      )}
      <header className="wf-head">
        <div>
          <p className="wf-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="wf-muted max-w-2xl">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
