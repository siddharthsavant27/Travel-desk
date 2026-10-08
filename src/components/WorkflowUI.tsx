import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { STATUS_LABELS } from "@/lib/workflow";

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "VERIFIED"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "MORE_INFO_REQUESTED" || status === "ESCALATED"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
        : "border-teal-300/20 bg-teal-300/10 text-teal-200";
  const Icon =
    status === "VERIFIED"
      ? CheckCircle2
      : status === "MORE_INFO_REQUESTED"
        ? AlertCircle
        : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
export function Message({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm leading-6 ${error ? "border-red-300/30 bg-red-400/10 text-red-200" : "border-teal-300/25 bg-teal-300/10 text-teal-100"}`}
    >
      {children}
    </div>
  );
}
export function ChecklistItem({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}) {
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-2 text-sm leading-6">
      <Icon
        aria-hidden="true"
        className={`mt-1 h-4 w-4 shrink-0 ${complete ? "text-teal-200" : "text-amber-200"}`}
      />
      <span>{children}</span>
    </li>
  );
}
