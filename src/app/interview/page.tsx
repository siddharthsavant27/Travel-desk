import { redirect } from "next/navigation";
export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    caseId?: string;
    visaType?: string;
    purpose?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.caseId)
    redirect("/applications/" + encodeURIComponent(params.caseId));
  const query = new URLSearchParams();
  if (params.visaType) query.set("visaType", params.visaType);
  if (params.purpose) query.set("purpose", params.purpose);
  redirect("/applications/new" + (query.size ? "?" + query.toString() : ""));
}
