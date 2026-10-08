import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { audit, refreshAnswerFlags, refreshCase } from "@/lib/case-service";
import { EDITABLE_STATUSES, choiceOptions } from "@/lib/workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const { questionId, answerValue } = await req.json();
  if (
    typeof questionId !== "string" ||
    typeof answerValue !== "string" ||
    !answerValue.trim() ||
    answerValue.length > 10000
  )
    return NextResponse.json(
      { error: "Choose or enter an answer before continuing." },
      { status: 400 },
    );
  const application = await prisma.application.findUnique({
    where: { id },
    include: { interviewSessions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!application)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (application.userId !== session.userId)
    return NextResponse.json(
      { error: "Only the employee can change answers." },
      { status: 403 },
    );
  if (!EDITABLE_STATUSES.includes(application.status))
    return NextResponse.json(
      { error: "Answers are locked while the application is under review." },
      { status: 409 },
    );
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      visaType: { in: [application.visaType, "ALL"] },
      isActive: true,
      approvalStatus: "APPROVED",
    },
  });
  if (!question)
    return NextResponse.json(
      { error: "This question is not part of the application." },
      { status: 400 },
    );
  const value = answerValue.trim();
  if (question.responseType === "BOOLEAN" && !["true", "false"].includes(value))
    return NextResponse.json({ error: "Select Yes or No." }, { status: 400 });
  if (
    question.responseType === "SINGLE_CHOICE" &&
    !choiceOptions(question).some((option) => option.value === value)
  )
    return NextResponse.json(
      { error: "Select one of the available choices." },
      { status: 400 },
    );
  if (
    question.responseType === "NUMBER" &&
    (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 36500)
  )
    return NextResponse.json(
      { error: "Enter a whole number from 1 to 36500." },
      { status: 400 },
    );
  if (
    question.responseType === "DATE" &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    return NextResponse.json({ error: "Enter a valid date." }, { status: 400 });
  const result = await prisma.$transaction(async (db) => {
    const current = await db.application.findUniqueOrThrow({ where: { id } });
    if (!EDITABLE_STATUSES.includes(current.status))
      return {
        error: "Answers are locked while the application is under review.",
        status: 409,
      };
    const interview =
      application.interviewSessions[0] ??
      (await db.interviewSession.create({
        data: { applicationId: id, visaType: application.visaType },
      }));
    await db.interviewAnswer.upsert({
      where: { sessionId_questionId: { sessionId: interview.id, questionId } },
      create: {
        sessionId: interview.id,
        questionId,
        questionKey: question.key,
        questionText: question.questionText,
        answerValue: value,
      },
      update: {
        answerValue: value,
        questionText: question.questionText,
        isSkipped: false,
      },
    });
    await db.application.update({
      where: { id },
      data: {
        status:
          current.status === "DRAFT" ? "INTERVIEW_IN_PROGRESS" : current.status,
      },
    });
    await refreshAnswerFlags(id, db);
    await audit(db, session.userId, id, "ANSWER_SAVED", {
      questionKey: question.key,
    });
    return refreshCase(id, db);
  });
  if ("error" in result)
    return NextResponse.json(result, { status: result.status });
  return NextResponse.json({
    success: true,
    application: result,
    readinessScore: result.readinessScore,
  });
}
