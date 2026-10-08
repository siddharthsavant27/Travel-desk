export const VISA_ROUTES = {
  SCHENGEN_BUSINESS: {
    label: "Schengen business (Type C)",
    country: "Germany",
    specialist: false,
  },
  US_B1: {
    label: "US business visitor (B-1)",
    country: "United States",
    specialist: false,
  },
  US_L1: {
    label: "US intra-company transfer (L-1)",
    country: "United States",
    specialist: true,
  },
  US_H1B: {
    label: "US specialty occupation (H-1B)",
    country: "United States",
    specialist: true,
  },
  GERMAN_D_VISA: {
    label: "German employment (Type D)",
    country: "Germany",
    specialist: true,
  },
} as const;
export type VisaType = keyof typeof VISA_ROUTES;
export const EDITABLE_STATUSES = [
  "DRAFT",
  "INTERVIEW_IN_PROGRESS",
  "MORE_INFO_REQUESTED",
];
export const REVIEWABLE_STATUSES = ["SUBMITTED", "IN_REVIEW", "ESCALATED"];
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  INTERVIEW_IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  IN_REVIEW: "Under review",
  MORE_INFO_REQUESTED: "Action needed",
  VERIFIED: "Ready for filing",
  ESCALATED: "Specialist review",
};
export function visaLabel(type: string) {
  return VISA_ROUTES[type as VisaType]?.label ?? type.replaceAll("_", " ");
}
export function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not set";
}
export type QuestionView = {
  id: string;
  key: string;
  questionText: string;
  helpText: string | null;
  responseType: string;
  stepCategory: string;
  options: string | null;
  isMandatory: boolean;
};
export type AnswerView = {
  questionId: string;
  questionKey: string;
  questionText: string;
  answerValue: string;
};
export type DocumentView = {
  id: string;
  documentType: string;
  originalFilename: string;
  fileSizeBytes: number;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};
export type FlagView = {
  id: string;
  code: string;
  severity: string;
  message: string;
  resolved: boolean;
};
export type RequirementView = {
  documentType: string;
  label: string;
  description: string;
  isMandatory: boolean;
};
export type CaseView = {
  departureAirportName: string | null;
  departureAirportCode: string | null;
  destinationAirportName: string | null;
  destinationAirportCode: string | null;
  destinationCity: string | null;
  itineraryRevision: number;
  booking: import("./booking-types").BookingView;
  id: string;
  caseNumber: string;
  visaType: string;
  destinationCountry: string;
  travelPurpose: string;
  departureDate: string | null;
  returnDate: string | null;
  status: string;
  readinessScore: number;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  assignedCsr: { id: string; name: string } | null;
  answers: AnswerView[];
  questions: QuestionView[];
  documents: DocumentView[];
  requirements: RequirementView[];
  flags: FlagView[];
  decisions: {
    id: string;
    action: string;
    notes: string;
    createdAt: string;
    actor: { name: string };
  }[];
  progress: {
    answered: number;
    totalQuestions: number;
    uploaded: number;
    totalDocuments: number;
    verified: number;
    missingQuestions: string[];
    missingDocuments: string[];
    missingTripDetails: string[];
    canSubmit: boolean;
    editable: boolean;
    criticalFlags: number;
  };
  activity: {
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string } | null;
  }[];
};
export function choiceOptions(
  question: QuestionView,
): { label: string; value: string }[] {
  try {
    const options: unknown = JSON.parse(question.options || "[]");
    if (!Array.isArray(options)) return [];
    return options.flatMap((option) =>
      typeof option === "string"
        ? [{ label: option, value: option }]
        : option &&
            typeof option.label === "string" &&
            typeof option.value === "string"
          ? [option]
          : [],
    );
  } catch {
    return [];
  }
}
export function nextAction(application: CaseView) {
  if (application.status === "VERIFIED")
    return application.booking.progress === "COMPLETE"
      ? "View bookings"
      : application.booking.progress === "HOTEL"
        ? "Book your hotel"
        : application.booking.eligible
          ? "Book your flight"
          : "Complete booking itinerary";
  if (application.status === "MORE_INFO_REQUESTED")
    return "Respond to requested changes";
  if (!application.progress.editable) return "View application";
  if (application.progress.answered < application.progress.totalQuestions)
    return "Continue questionnaire";
  if (application.progress.uploaded < application.progress.totalDocuments)
    return "Upload documents";
  return "Review and submit";
}
