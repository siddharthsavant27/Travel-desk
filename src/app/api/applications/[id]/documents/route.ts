import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { validateMagicBytes, UPLOAD_DIR } from "@/lib/prescreening";
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
  const record = await prisma.application.findUnique({
    where: { id },
    include: caseInclude,
  });
  if (!record)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (record.userId !== session.userId)
    return NextResponse.json(
      { error: "Only the employee can upload their documents." },
      { status: 403 },
    );
  if (!EDITABLE_STATUSES.includes(record.status))
    return NextResponse.json(
      { error: "Documents are locked while the application is under review." },
      { status: 409 },
    );
  const form = await req.formData();
  const file = form.get("file");
  const documentType = form.get("documentType");
  if (!(file instanceof File) || typeof documentType !== "string")
    return NextResponse.json(
      { error: "Choose a file and document category." },
      { status: 400 },
    );
  const view = await caseView(record);
  if (
    !view.requirements.some(
      (requirement) => requirement.documentType === documentType,
    )
  )
    return NextResponse.json(
      { error: "This document category is not required for the application." },
      { status: 400 },
    );
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    return NextResponse.json(
      { error: "Upload a non-empty PDF, PNG, or JPEG no larger than 10 MB." },
      { status: 400 },
    );
  const buffer = Buffer.from(await file.arrayBuffer());
  const inspected = validateMagicBytes(buffer);
  if (!inspected.valid || !inspected.detectedType)
    return NextResponse.json({ error: inspected.error }, { status: 400 });
  const extension = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
  }[inspected.detectedType];
  const root = path.resolve(UPLOAD_DIR);
  const directory = path.resolve(root, id);
  if (!directory.startsWith(root + path.sep))
    return NextResponse.json(
      { error: "Invalid application storage path." },
      { status: 400 },
    );
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(
    /*turbopackIgnore: true*/ directory,
    `${randomUUID()}.${extension}`,
  );
  await fs.writeFile(filePath, buffer, { flag: "wx" });
  try {
    const result = await prisma.$transaction(async (db) => {
      const current = await db.application.findUniqueOrThrow({ where: { id } });
      if (!EDITABLE_STATUSES.includes(current.status))
        throw new Error(
          "Application was submitted while uploading. Reload and try again.",
        );
      await db.document.upsert({
        where: {
          applicationId_documentType: { applicationId: id, documentType },
        },
        create: {
          applicationId: id,
          documentType,
          originalFilename: file.name.slice(0, 255),
          sanitizedFilename: path.basename(filePath),
          filePath,
          fileSizeBytes: file.size,
          mimeType: inspected.detectedType!,
          status: "UPLOADED",
        },
        update: {
          originalFilename: file.name.slice(0, 255),
          sanitizedFilename: path.basename(filePath),
          filePath,
          fileSizeBytes: file.size,
          mimeType: inspected.detectedType!,
          status: "UPLOADED",
          verifiedAt: null,
          verifiedByUserId: null,
          rejectionReason: null,
        },
      });
      await audit(db, session.userId, id, "DOCUMENT_UPLOADED", {
        documentType,
      });
      return refreshCase(id, db);
    });
    return NextResponse.json({ success: true, application: result });
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed. Please try again.",
      },
      { status: 409 },
    );
  }
}
