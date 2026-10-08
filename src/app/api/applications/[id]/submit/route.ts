import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, caseInclude, caseView, refreshCase } from "@/lib/case-service";
import { EDITABLE_STATUSES } from "@/lib/workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const result = await prisma.$transaction(async (db) => {
    const record = await db.application.findUnique({
      where: { id },
      include: caseInclude,
    });
    if (!record) return { error: "Application not found.", status: 404 };
    if (record.userId !== session.userId)
      return {
        error: "Only the employee can submit their application.",
        status: 403,
      };
    if (!EDITABLE_STATUSES.includes(record.status))
      return {
        error: "This application has already been submitted.",
        status: 409,
      };
    const view = await caseView(record, db);
    if (!view.progress.canSubmit)
      return {
        error:
          "Complete the required answers, documents, and trip details before submitting.",
        status: 422,
        progress: view.progress,
      };
    await db.application.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
    await db.interviewSession.updateMany({
      where: { applicationId: id },
      data: { isCompleted: true, completedAt: new Date() },
    });
    await db.notification.create({
      data: {
        userId: record.userId,
        title: "Application submitted",
        message: `${record.caseNumber} has been received. Your travel coordinator will review your answers and documents.`,
        linkUrl: `/applications/${id}`,
      },
    });
    const reviewers = await db.user.findMany({
      where: { role: { in: ["CSR", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    for (const reviewer of reviewers)
      await db.notification.create({
        data: {
          userId: reviewer.id,
          title:
            record.status === "MORE_INFO_REQUESTED"
              ? "Application resubmitted"
              : "New application to review",
          message: `${record.caseNumber} · ${record.user.name} · ${record.destinationCountry}`,
          linkUrl: `/review?caseId=${id}`,
        },
      });
    await audit(
      db,
      session.userId,
      id,
      record.status === "MORE_INFO_REQUESTED"
        ? "APPLICATION_RESUBMITTED"
        : "APPLICATION_SUBMITTED",
    );
    return { application: await refreshCase(id, db) };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json({ success: true, ...result });
}
