import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { REQUIRED_DOCUMENTS } from "../src/lib/prescreening-rules";

const prisma = new PrismaClient();
async function main() {
  if (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    for (const [role, prefix, fallback] of [
      [Role.CUSTOMER, "CUSTOMER", "DemoCustomer2026!"],
      [Role.CSR, "CSR", "DemoCSR2026!"],
      [Role.ADMIN, "ADMIN", "DemoAdmin2026!"],
    ] as const) {
      const email = (
        process.env[`DEMO_${prefix}_EMAIL`] ||
        `${role.toLowerCase()}@harbingergroup.com`
      ).toLowerCase();
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: `Demo ${role === "CSR" ? "Reviewer" : role[0] + role.slice(1).toLowerCase()}`,
          role,
          passwordHash: await bcrypt.hash(
            process.env[`DEMO_${prefix}_PASSWORD`] || fallback,
            10,
          ),
        },
      });
    }
    console.log(
      "Local demo accounts are available. Existing accounts and passwords were preserved.",
    );
  } else if (
    !(await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } }))
  ) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (
      !email ||
      !/^[^@\s]+@harbingergroup\.com$/.test(email) ||
      !password ||
      password.length < 12 ||
      Buffer.byteLength(password) > 72
    ) {
      throw new Error(
        "For a non-demo installation, set ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD before setup.",
      );
    }
    await prisma.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME || "TravelDesk Administrator",
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
      },
    });
    console.log(
      "Initial administrator created; a password change is required at first sign-in.",
    );
  }
  const questions = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "src/data/question-bank.json"),
      "utf8",
    ),
  );
  for (const q of questions) {
    await prisma.question.upsert({
      where: { key: q.key },
      update: {},
      create: {
        key: q.key,
        visaType: q.visaType,
        stepCategory: q.stepCategory,
        orderIndex: q.orderIndex,
        questionText: q.questionText,
        helpText: q.helpText ?? null,
        responseType: q.responseType,
        options: q.options ?? null,
        isMandatory: q.isMandatory ?? true,
        flagTriggerRule: q.flagTriggerRule ?? null,
      },
    });
  }
  for (const [visaType, documents] of Object.entries(REQUIRED_DOCUMENTS)) {
    for (const [index, doc] of documents.entries()) {
      await prisma.documentRequirement.upsert({
        where: { visaType_documentType: { visaType, documentType: doc.type } },
        update: {},
        create: {
          visaType,
          documentType: doc.type,
          label: doc.label,
          description: doc.description,
          isMandatory: true,
          orderIndex: index,
        },
      });
    }
  }
  for (const provider of [
    { id: "skyscanner", name: "Skyscanner", category: "flight" },
    { id: "booking", name: "Booking.com", category: "hotel" },
  ]) {
    await prisma.bookingProvider.upsert({
      where: { id: provider.id },
      update: {},
      create: {
        ...provider,
        enabled: true,
        verifiedAt: new Date("2026-10-08T00:00:00.000Z"),
      },
    });
  }
  console.log(
    "Question bank, document requirements and booking providers are ready.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
