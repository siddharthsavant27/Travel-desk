export type DocumentType = 
  | "PASSPORT"
  | "EMPLOYER_LETTER"
  | "INVITATION_LETTER"
  | "PROOF_OF_ACCOMMODATION"
  | "FLIGHT_RESERVATION"
  | "TRAVEL_INSURANCE"
  | "FINANCIAL_PROOF"
  | "EMPLOYER_SUPPORT_LETTER" // legacy alias
  | "FLIGHT_ITINERARY" // legacy alias
  | "HOTEL_BOOKING" // legacy alias
  | "OTHER";

export type FlagSeverity = "CRITICAL" | "WARNING" | "INFO";

// 1. Magic Bytes Validation
export function validateMagicBytes(buffer: Buffer | Uint8Array): {
  valid: boolean;
  detectedType?: "application/pdf" | "image/png" | "image/jpeg";
  error?: string;
} {
  if (buffer.length < 8) {
    return { valid: false, error: "File too small or corrupted." };
  }

  // PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { valid: true, detectedType: "application/pdf" };
  }

  // PNG: \x89PNG\r\n\x1a\n (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  return { 
    valid: false, 
    error: "Invalid file format. File signature does not match authorized PDF, PNG, or JPEG standards." 
  };
}

// 2. Canonical Required Document Types per Visa Category
export const REQUIRED_DOCUMENTS: Record<string, { type: DocumentType; label: string; description: string }[]> = {
  SCHENGEN_BUSINESS: [
    {
      type: "PASSPORT",
      label: "Passport bio page",
      description: "Must be valid for at least 3 months after departure from Schengen territory and issued within the previous 10 years."
    },
    {
      type: "EMPLOYER_LETTER",
      label: "Employer letter",
      description: "Company letter confirming employment status, role, and travel purpose."
    },
    {
      type: "INVITATION_LETTER",
      label: "Invitation letter from host company",
      description: "Invitation letter from host company in Munich stating meeting dates and agenda."
    },
    {
      type: "PROOF_OF_ACCOMMODATION",
      label: "Proof of accommodation",
      description: "Hotel reservation or host declaration of accommodation."
    },
    {
      type: "FLIGHT_RESERVATION",
      label: "Flight reservation",
      description: "Round-trip flight booking or itinerary reservation."
    },
    {
      type: "TRAVEL_INSURANCE",
      label: "Travel medical insurance (Schengen only)",
      description: "Minimum €30,000 emergency medical and repatriation coverage across Schengen territory."
    },
    {
      type: "FINANCIAL_PROOF",
      label: "Financial proof (bank statements)",
      description: "Recent official bank statements showing sufficient funds for travel."
    }
  ],
  US_B1: [
    {
      type: "PASSPORT",
      label: "Passport bio page",
      description: "Valid Indian passport (Six-Month Club eligible for duration of stay)."
    },
    {
      type: "EMPLOYER_LETTER",
      label: "Employer letter",
      description: "Company letter confirming employee status and business travel purpose."
    },
    {
      type: "INVITATION_LETTER",
      label: "Invitation letter from host company",
      description: "Invitation letter from host company stating meeting agenda and corporate contact details."
    },
    {
      type: "PROOF_OF_ACCOMMODATION",
      label: "Proof of accommodation",
      description: "Hotel booking or lodging documentation."
    },
    {
      type: "FLIGHT_RESERVATION",
      label: "Flight reservation",
      description: "Round-trip flight reservation."
    },
    {
      type: "FINANCIAL_PROOF",
      label: "Financial proof (bank statements)",
      description: "Recent bank statements demonstrating financial solvency."
    }
  ],
  DEFAULT: [
    {
      type: "PASSPORT",
      label: "Passport bio page",
      description: "Valid official travel document."
    },
    {
      type: "INVITATION_LETTER",
      label: "Invitation letter from host company",
      description: "Official invitation from host company."
    },
    {
      type: "EMPLOYER_LETTER",
      label: "Employer letter",
      description: "Company letter confirming employment status."
    }
  ]
};

// 3. Documented Readiness Score Formula
export function calculateReadinessScore(
  mandatoryQuestionsTotal: number,
  mandatoryQuestionsAnswered: number,
  requiredDocsTotal: number,
  requiredDocsUploaded: number,
  criticalFlagsCount: number,
  warningFlagsCount: number
): { score: number; formulaDetails: string } {
  const questionRatio = mandatoryQuestionsTotal > 0 ? (mandatoryQuestionsAnswered / mandatoryQuestionsTotal) : 1;
  const questionPoints = Math.round(questionRatio * 50);

  const docRatio = requiredDocsTotal > 0 ? (requiredDocsUploaded / requiredDocsTotal) : 0;
  const docPoints = Math.round(docRatio * 50);

  const penalty = (criticalFlagsCount * 30) + (warningFlagsCount * 10);

  const rawScore = questionPoints + docPoints - penalty;
  const score = Math.max(0, Math.min(100, rawScore));

  const formulaDetails = `Readiness Score (${score}%): Questions (${mandatoryQuestionsAnswered}/${mandatoryQuestionsTotal} answered = ${questionPoints}pts) + Documents (${requiredDocsUploaded}/${requiredDocsTotal} uploaded = ${docPoints}pts) - Penalties (${criticalFlagsCount} critical, ${warningFlagsCount} warnings = -${penalty}pts)`;

  return { score, formulaDetails };
}

// 4. Rule-based Answer Evaluation & Flag Rule Checker
export interface FlagEvaluationResult {
  hasFlag: boolean;
  code?: string;
  severity?: "CRITICAL" | "WARNING" | "INFO";
  message?: string;
}

export function evaluateAnswerFlag(
  questionKey: string,
  answerValue: string,
  departureDate?: Date | null,
  returnDate?: Date | null,
  visaType = "SCHENGEN_BUSINESS"
): FlagEvaluationResult {
  // Flag 1: Schengen local employment
  if (questionKey === "schengen_purpose" && answerValue === "local_employment") {
    return {
      hasFlag: true,
      code: "FLAG_PERMIT_MISMATCH",
      severity: "CRITICAL",
      message: "Selected purpose involves local productive labor. Schengen C visas do not permit local employment; a national work visa (D Visa) is required."
    };
  }

  // Flag 2: US B-1 employment
  if (questionKey === "usb1_purpose" && answerValue === "us_employment") {
    return {
      hasFlag: true,
      code: "FLAG_PERMIT_MISMATCH",
      severity: "CRITICAL",
      message: "Direct employment in the US cannot be undertaken on a B-1 visa. An employer-sponsored petition (H-1B, L-1, or O-1) approved by USCIS is required."
    };
  }

  // Flag 3: Schengen duration > 90 days
  if (questionKey === "schengen_duration_days") {
    const days = parseInt(answerValue, 10);
    if (!isNaN(days) && days > 90) {
      return {
        hasFlag: true,
        code: "FLAG_EXCESSIVE_DURATION_SCHENGEN",
        severity: "CRITICAL",
        message: "Requested stay exceeds 90 days. Short-stay Schengen visas are strictly capped at 90 days per 180-day period. Long-stay national visa (D) is required."
      };
    }
  }

  // Flag 4: Prior refusal
  if (questionKey === "has_prior_refusal" && (answerValue === "true" || answerValue === "yes")) {
    return {
      hasFlag: true,
      code: "FLAG_PRIOR_REFUSAL",
      severity: "WARNING",
      message: "Applicant reported previous visa refusal. Official consular refusal notice and explanation letter must be submitted for CSR review."
    };
  }

  // Flag 5: Passport expiry check (Schengen 3-month rule)
  if (questionKey === "passport_expiry_date" && answerValue) {
    const expiry = new Date(answerValue);
    if (!isNaN(expiry.getTime())) {
      const today = new Date();
      const benchmarkDate = returnDate ? new Date(returnDate) : new Date(today);
      const minSchengenExpiry = new Date(benchmarkDate);
      minSchengenExpiry.setMonth(minSchengenExpiry.getMonth() + 3);

      if (expiry <= today) {
        return {
          hasFlag: true,
          code: "FLAG_PASSPORT_EXPIRED",
          severity: "CRITICAL",
          message: "Passport has expired. Urgent passport renewal via Passport Seva is mandatory before scheduling visa appointments."
        };
      }

      if (visaType.startsWith("US") && returnDate && expiry < returnDate) {
        return { hasFlag: true, code: "FLAG_PASSPORT_EXPIRING", severity: "CRITICAL", message: "Passport expires before the planned return date. Ask your travel coordinator to review passport validity before filing." };
      }
      if (visaType === "SCHENGEN_BUSINESS" && expiry < minSchengenExpiry) {
        return {
          hasFlag: true,
          code: "FLAG_PASSPORT_EXPIRING",
          severity: "CRITICAL",
          message: "Passport expires within 3 months of intended stay. Article 12 of the Schengen Visa Code mandates at least 3 months validity beyond intended departure date."
        };
      }
    }
  }

  // Flag 6: Passport 10-year rule check
  if (questionKey === "passport_issue_date" && answerValue && !visaType.startsWith("US")) {
    const issueDate = new Date(answerValue);
    if (!isNaN(issueDate.getTime())) {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      if (issueDate < tenYearsAgo) {
        return {
          hasFlag: true,
          code: "FLAG_PASSPORT_10YR_RULE",
          severity: "CRITICAL",
          message: "Passport was issued over 10 years ago. European Union Visa Code Article 12 strictly requires passports to be issued within the last 10 years."
        };
      }
    }
  }

  return { hasFlag: false };
}
