import { prisma } from "@/lib/prisma";
import { REQUIRED_DOCUMENTS } from "@/lib/prescreening-rules";
import { VISA_ROUTES, STATUS_LABELS, type VisaType } from "@/lib/workflow";
import { ConciergeError } from "./protocol";

export async function ownApplicationChoices(userId: string) {
  return prisma.application.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" }, take: 50,
    select: { id: true, caseNumber: true, visaType: true, status: true },
  });
}

export async function applicationContext(userId: string, id: string | null) {
  if (!id) return null;
  // Never select file paths, names, answers, notes, free-text trip purpose, or booking records.
  const record = await prisma.application.findFirst({
    where: { id, userId },
    select: {
      visaType: true, status: true, departureDate: true, returnDate: true,
      departureAirportCode: true, destinationAirportCode: true,
      documents: { select: { documentType: true, status: true } },
      interviewSessions: { orderBy: { createdAt: "desc" }, take: 1, select: {
        answers: { where: { isSkipped: false, answerValue: { not: "" } }, select: { questionId: true } },
      } },
    },
  });
  if (!record) throw new ConciergeError(404, "The selected application is unavailable.");
  const route = VISA_ROUTES[record.visaType as VisaType];
  if (!route) throw new ConciergeError(400, "Please ask the travel team about this application route.");
  const questions = await prisma.question.findMany({
    where: { visaType: { in: [record.visaType, "ALL"] }, isActive: true, approvalStatus: "APPROVED", isMandatory: true },
    select: { id: true },
  });
  let requirements = await prisma.documentRequirement.findMany({
    where: { visaType: record.visaType }, select: { documentType: true, isMandatory: true },
  });
  if (!requirements.length) requirements = await prisma.documentRequirement.findMany({
    where: { visaType: "DEFAULT" }, select: { documentType: true, isMandatory: true },
  });
  const canonical = REQUIRED_DOCUMENTS[record.visaType] ?? REQUIRED_DOCUMENTS.DEFAULT;
  const requiredTypes = requirements.length ? requirements.filter((r) => r.isMandatory).map((r) => r.documentType) : canonical.map((r) => r.type);
  const hasDestination = await prisma.application.count({ where: { id, userId, destinationCity: { not: "" }, NOT: { destinationCity: null } } });
  const hasPurpose = await prisma.application.count({ where: { id, userId, travelPurpose: { not: "" } } });
  const present = (type: string) => record.documents.some((d) => d.documentType === type && ["UPLOADED", "VERIFIED"].includes(d.status));
  const answered = questions.filter((q) => record.interviewSessions[0]?.answers.some((a) => a.questionId === q.id)).length;
  return {
    visaRoute: route.label, destination: route.country, specialistIntake: route.specialist,
    status: STATUS_LABELS[record.status],
    departureDate: record.departureDate?.toISOString().slice(0, 10) ?? null,
    returnDate: record.returnDate?.toISOString().slice(0, 10) ?? null,
    checklist: {
      requiredQuestions: questions.length, answeredQuestions: answered,
      missingQuestionCount: questions.length - answered,
      requiredDocuments: requiredTypes.length,
      uploadedDocuments: requiredTypes.filter(present).length,
      verifiedDocuments: requiredTypes.filter((t) => record.documents.some((d) => d.documentType === t && d.status === "VERIFIED")).length,
      missingDocuments: requiredTypes.filter((t) => !present(t)).map((t) => canonical.find((d) => d.type === t)?.label ?? "Additional document requested by the travel team"),
      missingTripDetails: [!record.departureDate && "Departure date", !record.returnDate && "Return date", !record.departureAirportCode && "Departure airport", !record.destinationAirportCode && "Destination airport", !hasDestination && "Destination city", !hasPurpose && "Travel purpose"].filter(Boolean),
    },
  };
}
