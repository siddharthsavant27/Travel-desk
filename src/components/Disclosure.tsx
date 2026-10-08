import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function Disclosure({ title, children, open = false, className = "" }: {
  title: string;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details className={`disclosure ${className}`} open={open}>
      <summary><span>{title}</span><ChevronDown className="h-4 w-4" aria-hidden="true" /></summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
