import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, refreshCase } from "@/lib/case-service";
import { EDITABLE_STATUSES, REVIEWABLE_STATUSES } from "@/lib/workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const { action, reason } = await req.json();
  const result = await prisma.$transaction(async (db) => {
    const document = await db.document.findUnique({
      where: { id },
      include: { application: true },
    });
    if (!document) return { error: "Document not found.", status: 404 };
    const application = document.application;
    if (["REMOVE", "RESTORE"].includes(action)) {
      if (application.userId !== session.userId)
        return {
          error: "Only the employee can remove or restore documents.",
          status: 403,
        };
      if (!EDITABLE_STATUSES.includes(application.status))
        return { error: "Documents are locked during review.", status: 409 };
      if (action === "RESTORE" && document.status !== "PENDING")
        return {
          error: "Only a removed document can be restored.",
          status: 409,
        };
      await db.document.update({
        where: { id },
        data: {
          status: action === "REMOVE" ? "PENDING" : "UPLOADED",
          verifiedAt: null,
          verifiedByUserId: null,
          rejectionReason: null,
        },
      });
    } else if (["VERIFY", "REJECT"].includes(action)) {
      if (session.role === "CUSTOMER")
        return { error: "Reviewer access is required.", status: 403 };
      if (
        !REVIEWABLE_STATUSES.includes(application.status) ||
        document.status === "PENDING"
      )
        return {
          error: "Review a submitted document before verifying it.",
          status: 409,
        };
      if (
        application.assignedCsrId !== session.userId &&
        session.role !== "ADMIN"
      )
        return {
          error:
            "Assign this application to yourself before checking documents. Another reviewer may already own it.",
          status: 409,
        };
      if (
        action === "REJECT" &&
        (typeof reason !== "string" ||
          reason.trim().length < 5 ||
          reason.length > 5000)
      )
        return {
          error: "Explain what the employee needs to correct.",
          status: 400,
        };
      await db.document.update({
        where: { id },
        data: {
          status: action === "VERIFY" ? "VERIFIED" : "REJECTED",
          verifiedByUserId: session.userId,
          verifiedAt: new Date(),
          rejectionReason: action === "REJECT" ? reason.trim() : null,
        },
      });
    } else return { error: "Unknown document action.", status: 400 };
    await audit(db, session.userId, application.id, `DOCUMENT_${action}`, {
      documentId: id,
      documentType: document.documentType,
    });
    return { application: await refreshCase(application.id, db) };
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json(result);
}
