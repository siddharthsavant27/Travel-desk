import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, logAuditEvent } from "@/lib/auth";
import { Role, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.CSR)) {
      return NextResponse.json({ error: "Forbidden: Admin or CSR access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const visaType = searchParams.get("visaType");

    const where: Prisma.QuestionWhereInput = {};
    if (visaType && visaType !== "ALL") {
      where.visaType = visaType;
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: [{ visaType: "asc" }, { orderIndex: "asc" }],
    });

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Error fetching questions:", err);
    return NextResponse.json({ error: "Failed to fetch question bank" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      key,
      visaType,
      stepCategory,
      orderIndex,
      questionText,
      helpText,
      responseType,
      options,
      isMandatory = true,
      followUpLogic,
      flagTriggerRule,
    } = body;

    if (!key || !visaType || !stepCategory || !questionText || !responseType) {
      return NextResponse.json(
        { error: "Key, visaType, stepCategory, questionText, and responseType are required." },
        { status: 400 }
      );
    }

    const newQuestion = await prisma.question.create({
      data: {
        key: key.trim(),
        visaType,
        stepCategory,
        orderIndex: Number(orderIndex) || 1,
        questionText,
        helpText,
        responseType,
        options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
        isMandatory: Boolean(isMandatory),
        followUpLogic: followUpLogic ? JSON.stringify(followUpLogic) : null,
        flagTriggerRule: flagTriggerRule ? JSON.stringify(flagTriggerRule) : null,
        isActive: true,
      },
    });

    await logAuditEvent({
      actorId: session.userId,
      action: "ADMIN_QUESTION_CREATED",
      details: { questionId: newQuestion.id, key: newQuestion.key, visaType },
    });

    return NextResponse.json({ success: true, question: newQuestion }, { status: 201 });
  } catch (err) {
    console.error("Error creating question bank item:", err);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive, orderIndex, questionText, helpText, isMandatory } = body;

    if (!id) {
      return NextResponse.json({ error: "Question ID is required." }, { status: 400 });
    }

    const updateData: Prisma.QuestionUpdateInput = {};
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex);
    if (questionText !== undefined) updateData.questionText = questionText;
    if (helpText !== undefined) updateData.helpText = helpText;
    if (isMandatory !== undefined) updateData.isMandatory = Boolean(isMandatory);

    const updated = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      actorId: session.userId,
      action: "ADMIN_QUESTION_UPDATED",
      details: { questionId: id, updates: updateData },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (err) {
    console.error("Error updating question bank item:", err);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}
