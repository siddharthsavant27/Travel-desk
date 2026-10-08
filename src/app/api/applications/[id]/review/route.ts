import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, refreshCase } from "@/lib/case-service";
import { REVIEWABLE_STATUSES } from "@/lib/workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role === "CUSTOMER")
    return NextResponse.json(
      { error: "Reviewer access is required." },
      { status: 403 },
    );
  const { id } = await params;
  const result = await prisma.$transaction(async (db) => {
    const record = await db.application.findUnique({ where: { id } });
    if (!record) return { error: "Application not found.", status: 404 };
    if (!REVIEWABLE_STATUSES.includes(record.status))
      return {
        error: "This application is not available for review.",
        status: 409,
      };
    if (
      record.assignedCsrId &&
      record.assignedCsrId !== session.userId &&
      session.role !== "ADMIN"
    )
      return {
        error: "Another reviewer is assigned to this case.",
        status: 409,
      };
    await db.application.update({
      where: { id },
      data: {
        assignedCsrId: session.userId,
        status: record.status === "SUBMITTED" ? "IN_REVIEW" : record.status,
      },
    });
    await audit(db, session.userId, id, "REVIEW_STARTED");
    return { application: await refreshCase(id, db) };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json(result);
}
