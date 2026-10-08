import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, caseInclude, caseView, refreshCase } from "@/lib/case-service";
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
  const input = z
    .object({
      decisionType: z.enum(["VERIFIED", "MORE_INFO_REQUESTED", "ESCALATED"]),
      notes: z
        .string()
        .trim()
        .min(5, "Enter a clear message for the employee.")
        .max(5000),
      internalNote: z.string().trim().max(5000).optional(),
    })
    .safeParse(await req.json());
  if (!input.success)
    return NextResponse.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );
  const { id } = await params;
  const { decisionType, notes, internalNote } = input.data;
  const result = await prisma.$transaction(async (db) => {
    const record = await db.application.findUnique({
      where: { id },
      include: caseInclude,
    });
    if (!record) return { error: "Application not found.", status: 404 };
    if (!REVIEWABLE_STATUSES.includes(record.status))
      return {
        error:
          "Start with a submitted application. This case is not ready for a review decision.",
        status: 409,
      };
    if (record.assignedCsrId !== session.userId && session.role !== "ADMIN")
      return {
        error:
          "Assign this case to yourself before recording a decision. Another reviewer may already own it.",
        status: 409,
      };
    const view = await caseView(record, db);
    if (
      decisionType === "VERIFIED" &&
      (!view.progress.canSubmit ||
        view.progress.criticalFlags > 0 ||
        view.progress.verified !== view.progress.totalDocuments)
    )
      return {
        error:
          "Verify every required document and resolve critical flags before marking this case ready for filing.",
        status: 422,
      };
    const decision = await db.caseDecision.create({
      data: {
        applicationId: id,
        actorId: session.userId,
        action: decisionType,
        notes,
        previousStatus: record.status,
        newStatus: decisionType,
      },
    });
    await db.application.update({
      where: { id },
      data: {
        status: decisionType,
        assignedCsrId: decisionType === "ESCALATED" ? null : session.userId,
      },
    });
    if (internalNote)
      await db.caseNote.create({
        data: {
          applicationId: id,
          authorId: session.userId,
          content: internalNote,
          isInternal: true,
        },
      });
    const titles = {
      VERIFIED: "Documents approved: book your flight",
      MORE_INFO_REQUESTED: "Action needed: update your application",
      ESCALATED: "Application sent for specialist review",
    };
    await db.notification.create({
      data: {
        userId: record.userId,
        title: titles[decisionType],
        message: notes,
        linkUrl: `/applications/${id}${decisionType === "VERIFIED" ? "#booking" : ""}`,
      },
    });
    if (decisionType === "ESCALATED") {
      const specialists = await db.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });
      await db.notification.createMany({
        data: specialists.map((user) => ({
          userId: user.id,
          title: "Specialist review requested",
          message: `${record.caseNumber} needs specialist review.`,
          linkUrl: `/review/${id}`,
        })),
      });
    }
    await audit(db, session.userId, id, "REVIEW_DECISION_RECORDED", {
      decisionId: decision.id,
      decisionType,
    });
    return { application: await refreshCase(id, db), decision };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json({ success: true, ...result });
}
