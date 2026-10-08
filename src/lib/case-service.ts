import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  calculateReadinessScore,
  REQUIRED_DOCUMENTS,
  evaluateAnswerFlag,
} from "./prescreening-rules";
import { EDITABLE_STATUSES, type CaseView } from "./workflow";
import { bookingView } from "./booking";

export const caseInclude = {
  booking: true,
  user: { select: { id: true, name: true, email: true } },
  assignedCsr: { select: { id: true, name: true } },
  interviewSessions: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { answers: true },
  },
  documents: { orderBy: { createdAt: "desc" as const } },
  flags: true,
  decisions: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { name: true } } },
  },
  auditLogs: {
    orderBy: { createdAt: "desc" as const },
    take: 30,
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  },
} satisfies Prisma.ApplicationInclude;
export type CaseRecord = Prisma.ApplicationGetPayload<{
  include: typeof caseInclude;
}>;
type Database = Prisma.TransactionClient;

export async function caseView(
  record: CaseRecord,
  db: Database = prisma,
): Promise<CaseView> {
  const questions = await db.question.findMany({
    where: {
      visaType: { in: [record.visaType, "ALL"] },
      isActive: true,
      approvalStatus: "APPROVED",
    },
    orderBy: [{ orderIndex: "asc" }, { key: "asc" }],
  });
  let requirements = await db.documentRequirement.findMany({
    where: { visaType: record.visaType },
    orderBy: { orderIndex: "asc" },
  });
  if (!requirements.length)
    requirements = await db.documentRequirement.findMany({
      where: { visaType: "DEFAULT" },
      orderBy: { orderIndex: "asc" },
    });
  const fallback =
    REQUIRED_DOCUMENTS[record.visaType] || REQUIRED_DOCUMENTS.DEFAULT;
  const required = requirements.length
    ? requirements
    : fallback.map((doc) => ({
        documentType: doc.type,
        label: doc.label,
        description: doc.description,
        isMandatory: true,
      }));
  const answers = record.interviewSessions[0]?.answers ?? [];
  const mandatoryQuestions = questions.filter((q) => q.isMandatory);
  const mandatoryDocs = required.filter((doc) => doc.isMandatory);
  const missingQuestions = mandatoryQuestions
    .filter(
      (q) =>
        !answers.some((a) => a.questionId === q.id && a.answerValue.trim()),
    )
    .map((q) => q.questionText);
  const missingDocuments = mandatoryDocs
    .filter(
      (req) =>
        !record.documents.some(
          (doc) =>
            doc.documentType === req.documentType &&
            ["UPLOADED", "VERIFIED"].includes(doc.status),
        ),
    )
    .map((req) => req.label);
  const missingTripDetails = [
    !record.departureAirportName && "Departure airport name",
    !record.departureAirportCode && "Departure airport IATA code",
    !record.destinationAirportName && "Destination airport name",
    !record.destinationAirportCode && "Destination airport IATA code",
    !record.destinationCity && "Destination city",
    !record.travelPurpose.trim() && "Travel purpose",
    !record.departureDate && "Departure date",
    !record.returnDate && "Return date",
    record.departureDate &&
      record.returnDate &&
      record.returnDate < record.departureDate &&
      "Valid travel dates",
  ].filter(Boolean) as string[];
  const activeFlags = record.flags.filter((flag) => !flag.resolved);
  const criticalFlags = activeFlags.filter(
    (flag) => flag.severity === "CRITICAL",
  ).length;
  const readiness = calculateReadinessScore(
    mandatoryQuestions.length,
    mandatoryQuestions.length - missingQuestions.length,
    mandatoryDocs.length,
    mandatoryDocs.length - missingDocuments.length,
    criticalFlags,
    activeFlags.filter((flag) => flag.severity === "WARNING").length,
  );
  return JSON.parse(
    JSON.stringify({
      id: record.id,
      caseNumber: record.caseNumber,
      visaType: record.visaType,
      destinationCountry: record.destinationCountry,
      travelPurpose: record.travelPurpose,
      departureDate: record.departureDate,
      returnDate: record.returnDate,
      departureAirportName: record.departureAirportName,
      departureAirportCode: record.departureAirportCode,
      destinationAirportName: record.destinationAirportName,
      destinationAirportCode: record.destinationAirportCode,
      destinationCity: record.destinationCity,
      itineraryRevision: record.itineraryRevision,
      booking: bookingView(record, record.booking),
      status: record.status,
      readinessScore: readiness.score,
      updatedAt: record.updatedAt,
      user: record.user,
      assignedCsr: record.assignedCsr,
      answers,
      questions,
      documents: record.documents.map(
        ({
          id,
          documentType,
          originalFilename,
          fileSizeBytes,
          status,
          rejectionReason,
          createdAt,
        }) => ({
          id,
          documentType,
          originalFilename,
          fileSizeBytes,
          status,
          rejectionReason,
          createdAt,
        }),
      ),
      requirements: required,
      flags: record.flags,
      decisions: record.decisions,
      activity: record.auditLogs,
      progress: {
        answered: mandatoryQuestions.length - missingQuestions.length,
        totalQuestions: mandatoryQuestions.length,
        uploaded: mandatoryDocs.length - missingDocuments.length,
        totalDocuments: mandatoryDocs.length,
        verified: mandatoryDocs.filter((req) =>
          record.documents.some(
            (doc) =>
              doc.documentType === req.documentType &&
              doc.status === "VERIFIED",
          ),
        ).length,
        missingQuestions,
        missingDocuments,
        missingTripDetails,
        canSubmit:
          questions.length > 0 &&
          !missingQuestions.length &&
          !missingDocuments.length &&
          !missingTripDetails.length,
        editable: EDITABLE_STATUSES.includes(record.status),
        criticalFlags,
      },
    }),
  );
}

export async function refreshCase(id: string, db: Database = prisma) {
  const record = await db.application.findUniqueOrThrow({
    where: { id },
    include: caseInclude,
  });
  const view = await caseView(record, db);
  await db.application.update({
    where: { id },
    data: {
      readinessScore: view.readinessScore,
      readinessDetails: JSON.stringify(view.progress),
    },
  });
  return view;
}

// Re-evaluate every saved answer together so corrections resolve stale flags.
export async function refreshAnswerFlags(id: string, db: Database = prisma) {
  const record = await db.application.findUniqueOrThrow({
    where: { id },
    include: {
      interviewSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { answers: true },
      },
    },
  });
  const evaluations =
    record.interviewSessions[0]?.answers
      .map((answer) =>
        evaluateAnswerFlag(
          answer.questionKey,
          answer.answerValue,
          record.departureDate,
          record.returnDate,
          record.visaType,
        ),
      )
      .filter((result) => result.hasFlag) ?? [];
  const activeCodes = evaluations.flatMap((result) =>
    result.code ? [result.code] : [],
  );
  await db.caseFlag.updateMany({
    where: {
      applicationId: id,
      flagType: "STATUTORY_RULE",
      code: { notIn: activeCodes },
    },
    data: { resolved: true, resolvedAt: new Date() },
  });
  for (const result of evaluations) {
    if (!result.code || !result.severity || !result.message) continue;
    await db.caseFlag.upsert({
      where: { applicationId_code: { applicationId: id, code: result.code } },
      create: {
        applicationId: id,
        sessionId: record.interviewSessions[0]?.id,
        code: result.code,
        severity: result.severity,
        message: result.message,
        flagType: "STATUTORY_RULE",
      },
      update: {
        severity: result.severity,
        message: result.message,
        resolved: false,
        resolvedAt: null,
        resolvedByUserId: null,
      },
    });
  }
}

export function audit(
  db: Database,
  actorId: string,
  applicationId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  return db.auditLog.create({
    data: {
      actorId,
      applicationId,
      action,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
