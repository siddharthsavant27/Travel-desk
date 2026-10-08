import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, refreshCase } from "@/lib/case-service";
import { REVIEWABLE_STATUSES } from "@/lib/workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; flagId: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role === "CUSTOMER")
    return NextResponse.json(
      { error: "Reviewer access is required." },
      { status: 403 },
    );
  const { id, flagId } = await params;
  const { reason } = await req.json();
  if (
    typeof reason !== "string" ||
    reason.trim().length < 10 ||
    reason.length > 5000
  )
    return NextResponse.json(
      { error: "Explain how this flag was resolved (at least 10 characters)." },
      { status: 400 },
    );
  const result = await prisma.$transaction(async (db) => {
    const flag = await db.caseFlag.findFirst({
      where: { id: flagId, applicationId: id },
      include: { application: true },
    });
    if (!flag) return { error: "Flag not found.", status: 404 };
    if (!REVIEWABLE_STATUSES.includes(flag.application.status))
      return {
        error: "Flags can be resolved while reviewing a submitted case.",
        status: 409,
      };
    if (
      flag.application.assignedCsrId !== session.userId &&
      session.role !== "ADMIN"
    )
      return {
        error:
          "Assign this application to yourself before resolving flags. Another reviewer may already own it.",
        status: 409,
      };
    await db.caseFlag.update({
      where: { id: flagId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: session.userId,
      },
    });
    await db.caseNote.create({
      data: {
        applicationId: id,
        authorId: session.userId,
        content: `${flag.code}: ${reason.trim()}`,
        isInternal: true,
      },
    });
    await audit(db, session.userId, id, "FLAG_RESOLVED", {
      code: flag.code,
      reason: reason.trim(),
    });
    return { application: await refreshCase(id, db) };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json(result);
}
