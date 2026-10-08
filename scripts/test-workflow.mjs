import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const root = process.cwd(),
  testRoot = path.resolve(root, ".workflow-tests");
fs.mkdirSync(testRoot, { recursive: true });
const runDir = fs.mkdtempSync(path.join(testRoot, "run-"));
const port = Number(process.env.WORKFLOW_TEST_PORT || 3011),
  origin = "http://127.0.0.1:" + port;
const env = {
  ...process.env,
  DATABASE_URL: "file:" + path.join(runDir, "test.db").replaceAll("\\", "/"),
  DOCUMENT_STORAGE_PATH: path.join(runDir, "documents"),
  SESSION_SECRET: randomBytes(48).toString("hex"),
  NEXT_PUBLIC_APP_URL: origin,
  NEXT_PUBLIC_DEMO_MODE: "true",
  TRAVELDESK_TEST_RUN: "true",
  NEXT_TELEMETRY_DISABLED: "1",
};
fs.closeSync(fs.openSync(path.join(runDir, "test.db"), "wx"));
let server,
  db,
  output = "",
  passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("PASS " + name);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function client() {
  let cookie = "";
  return {
    async request(url, body, expected = 200, method = "POST", headers = {}) {
      const options = {
        method,
        redirect: "manual",
        headers: { ...headers, ...(cookie ? { cookie } : {}) },
      };
      if (body instanceof FormData) options.body = body;
      else if (body !== undefined) {
        options.body = JSON.stringify(body);
        options.headers["Content-Type"] = "application/json";
      }
      const res = await fetch(origin + url, options);
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
      assert.equal(
        res.status,
        expected,
        url + " returned " + res.status + ": " + text.slice(0, 500),
      );
      return data;
    },
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
  };
}
async function upload(
  c,
  id,
  type,
  name = "fixture.pdf",
  content = "%PDF-1.7\nWorkflow test document\n%%EOF",
) {
  const form = new FormData();
  form.set("documentType", type);
  form.set("file", new Blob([content], { type: "application/pdf" }), name);
  return c.request("/api/applications/" + id + "/documents", form, 200);
}
try {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
    { cwd: root, env, stdio: "pipe" },
  );
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
    { cwd: root, env, stdio: "pipe" },
  );
  db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
    {
      cwd: root,
      env: { ...env, NEXT_PUBLIC_DEMO_MODE: "false" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw new Error("Test server exited: " + output);
    try {
      const r = await fetch(origin + "/login");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  assert.ok(ready, "Test server did not start: " + output);
  const employee = client(),
    reviewer = client(),
    admin = client(),
    anon = client(),
    other = client();
  const login = (c, email, password, from) =>
    c.request("/api/auth/login", { email, password, from });
  await check(
    "anonymous protection, company domain, safe redirects, and disabled demo endpoint",
    async () => {
      await anon.request("/api/applications", undefined, 401, "GET");
      await anon.request(
        "/api/auth/login",
        { email: "test@example.com", password: "invalid" },
        400,
      );
      await anon.request("/api/auth/demo-login", { role: "ADMIN" }, 403);
      const d = await login(
        employee,
        "customer@harbingergroup.com",
        "DemoCustomer2026!",
        "//evil.example",
      );
      assert.equal(d.redirectUrl, "/dashboard");
      await login(reviewer, "csr@harbingergroup.com", "DemoCSR2026!");
      await login(admin, "admin@harbingergroup.com", "DemoAdmin2026!");
      await employee.request("/api/admin/users", undefined, 403, "GET");
    },
  );
  let secondUser;
  await check(
    "admin provisioning, mandatory password change, and preserved route",
    async () => {
      const created = await admin.request(
        "/api/admin/users",
        {
          name: "Second Employee",
          email: "second@harbingergroup.com",
          role: "CUSTOMER",
        },
        201,
      );
      secondUser = created.user;
      const next = "/applications/new?visaType=US_B1";
      const d = await login(
        other,
        secondUser.email,
        created.tempPassword,
        next,
      );
      assert.ok(d.redirectUrl.startsWith("/change-password"));
      await other.request("/api/applications", undefined, 403, "GET");
      await other.request(
        "/api/auth/change-password",
        { newPassword: "SecondEmployee2026!" },
        400,
      );
      const changed = await other.request("/api/auth/change-password", {
        currentPassword: created.tempPassword,
        newPassword: "SecondEmployee2026!",
        from: next,
      });
      assert.equal(changed.redirectUrl, next);
      await other.request("/api/applications", undefined, 200, "GET");
    },
  );
  let application, id;
  await check("trip validation and draft creation", async () => {
    await employee.request(
      "/api/applications",
      { visaType: "INVALID", travelPurpose: "Meetings" },
      400,
    );
    await employee.request(
      "/api/applications",
      {
        visaType: "SCHENGEN_BUSINESS",
        travelPurpose: "Meetings",
        departureDate: "2027-04-20",
        returnDate: "2027-04-10",
      },
      400,
    );
    application = (
      await employee.request(
        "/api/applications",
        {
          visaType: "SCHENGEN_BUSINESS",
          travelPurpose: "Client meetings in Munich",
          departureAirportName: "Mumbai International",
          departureAirportCode: "BOM",
          destinationAirportName: "Munich Airport",
          destinationAirportCode: "MUC",
          destinationCity: "Munich",
          departureDate: "2027-04-10",
          returnDate: "2027-04-20",
        },
        201,
      )
    ).application;
    id = application.id;
    assert.equal(application.status, "DRAFT");
    assert.ok(application.questions.length >= 5);
    await other.request("/api/applications/" + id, undefined, 403, "GET");
    const list = await other.request(
      "/api/applications",
      undefined,
      200,
      "GET",
    );
    assert.equal(list.applications.length, 0);
  });
  await check(
    "incomplete submission and invalid answers are blocked",
    async () => {
      await employee.request("/api/applications/" + id + "/submit", {}, 422);
      const q = application.questions.find(
        (q) => q.responseType === "SINGLE_CHOICE",
      );
      await employee.request(
        "/api/applications/" + id + "/interview/answer",
        { questionId: q.id, answerValue: "invented" },
        400,
      );
      await employee.request(
        "/api/applications/" + id + "/interview/answer",
        { questionId: "another-case-question", answerValue: "yes" },
        400,
      );
    },
  );
  await check(
    "saved answers resume without duplicates and stale flags clear",
    async () => {
      const answer = async (q, value) => {
        application = (
          await employee.request(
            "/api/applications/" + id + "/interview/answer",
            { questionId: q.id, answerValue: value },
          )
        ).application;
      };
      const purpose = application.questions.find(
        (q) => q.key === "schengen_purpose",
      );
      await answer(purpose, "local_employment");
      assert.ok(application.progress.criticalFlags > 0);
      await answer(purpose, "client_meetings");
      assert.equal(application.progress.criticalFlags, 0);
      for (const q of application.questions) {
        const value =
          q.key === "schengen_purpose"
            ? "client_meetings"
            : q.key === "schengen_duration_days"
              ? "10"
              : q.key === "passport_expiry_date"
                ? "2030-10-10"
                : q.key === "passport_issue_date"
                  ? "2024-01-01"
                  : q.responseType === "BOOLEAN"
                    ? "false"
                    : "Test answer";
        await answer(q, value);
      }
      const persisted = (
        await employee.request("/api/applications/" + id, undefined, 200, "GET")
      ).application;
      assert.equal(
        persisted.progress.answered,
        persisted.progress.totalQuestions,
      );
      assert.equal(persisted.answers.length, persisted.questions.length);
    },
  );
  await check(
    "document content validation, replacement, remove/restore, and ownership",
    async () => {
      const type = application.requirements[0].documentType;
      const bad = new FormData();
      bad.set("documentType", type);
      bad.set("file", new Blob(["not a PDF"]), "fake.pdf");
      await employee.request(
        "/api/applications/" + id + "/documents",
        bad,
        400,
      );
      application = (await upload(employee, id, type, "original.pdf"))
        .application;
      const first = application.documents[0].id;
      application = (await upload(employee, id, type, "replacement.pdf"))
        .application;
      assert.equal(application.documents.length, 1);
      assert.equal(application.documents[0].id, first);
      assert.equal(
        application.documents[0].originalFilename,
        "replacement.pdf",
      );
      application = (
        await employee.request(
          "/api/documents/" + first,
          { action: "REMOVE" },
          200,
          "PATCH",
        )
      ).application;
      assert.ok(application.progress.missingDocuments.length > 0);
      application = (
        await employee.request(
          "/api/documents/" + first,
          { action: "RESTORE" },
          200,
          "PATCH",
        )
      ).application;
      await employee.request(
        "/api/documents/" + first,
        { action: "RESTORE" },
        409,
        "PATCH",
      );
      await other.request(
        "/api/documents/" + first + "/download",
        undefined,
        403,
        "GET",
      );
      for (const req of application.requirements.slice(1))
        application = (await upload(employee, id, req.documentType))
          .application;
      assert.ok(application.progress.canSubmit);
    },
  );
  await check("submission locks edits and claims persist", async () => {
    application = (
      await employee.request("/api/applications/" + id + "/submit", {})
    ).application;
    assert.equal(application.status, "SUBMITTED");
    await reviewer.request(
      "/api/documents/" + application.documents[0].id,
      { action: "VERIFY" },
      409,
      "PATCH",
    );
    await employee.request("/api/applications/" + id + "/submit", {}, 409);
    await employee.request(
      "/api/applications/" + id + "/interview/answer",
      {
        questionId: application.questions[0].id,
        answerValue: "client_meetings",
      },
      409,
    );
    await employee.request(
      "/api/applications/" + id + "/decision",
      { decisionType: "VERIFIED", notes: "Employee must not approve" },
      403,
    );
    application = (
      await reviewer.request("/api/applications/" + id + "/review", {})
    ).application;
    assert.equal(application.status, "IN_REVIEW");
    assert.ok(application.assignedCsr);
    await reviewer.request(
      "/api/applications/" + id + "/decision",
      { decisionType: "VERIFIED", notes: "All checks completed" },
      422,
    );
  });
  await check(
    "reviewer ownership, flag resolution evidence, and specialist handoff",
    async () => {
      const seededReviewer = await db.user.findUniqueOrThrow({
        where: { email: "csr@harbingergroup.com" },
      });
      await db.user.create({
        data: {
          name: "Another Reviewer",
          email: "another-reviewer@harbingergroup.com",
          passwordHash: seededReviewer.passwordHash,
          role: "CSR",
        },
      });
      const peer = client();
      await login(peer, "another-reviewer@harbingergroup.com", "DemoCSR2026!");
      await peer.request("/api/applications/" + id + "/review", {}, 409);
      await peer.request(
        "/api/documents/" + application.documents[0].id,
        { action: "VERIFY" },
        409,
        "PATCH",
      );
      const flag = await db.caseFlag.upsert({
        where: {
          applicationId_code: { applicationId: id, code: "TEST_REVIEW_CHECK" },
        },
        create: {
          applicationId: id,
          code: "TEST_REVIEW_CHECK",
          severity: "CRITICAL",
          message: "Fixture: evidence needs review",
          flagType: "STATUTORY_RULE",
        },
        update: { resolved: false },
      });
      await peer.request(
        "/api/applications/" + id + "/flags/" + flag.id,
        { reason: "Reviewed evidence for this test flag" },
        409,
        "PATCH",
      );
      await reviewer.request(
        "/api/applications/" + id + "/flags/" + flag.id,
        { reason: "short" },
        400,
        "PATCH",
      );
      application = (
        await reviewer.request(
          "/api/applications/" + id + "/flags/" + flag.id,
          {
            reason:
              "Supporting evidence inspected and confirmed by coordinator.",
          },
          200,
          "PATCH",
        )
      ).application;
      assert.ok(application.flags.find((f) => f.id === flag.id).resolved);
      application = (
        await reviewer.request("/api/applications/" + id + "/decision", {
          decisionType: "ESCALATED",
          notes: "Specialist review requested for this package.",
        })
      ).application;
      assert.equal(application.status, "ESCALATED");
      assert.equal(application.assignedCsr, null);
      const messages = await admin.request(
        "/api/notifications",
        undefined,
        200,
        "GET",
      );
      assert.ok(
        messages.notifications.some(
          (n) => n.title === "Specialist review requested",
        ),
      );
      await peer.request("/api/applications/" + id + "/review", {});
      await reviewer.request("/api/applications/" + id + "/review", {}, 409);
      await admin.request("/api/applications/" + id + "/decision", {
        decisionType: "ESCALATED",
        notes: "Return to unassigned specialist queue for the next reviewer.",
      });
      application = (
        await reviewer.request("/api/applications/" + id + "/review", {})
      ).application;
    },
  );
  await check(
    "request changes, internal-note privacy, replacement, and resubmission",
    async () => {
      const doc = application.documents[0];
      await reviewer.request(
        "/api/documents/" + doc.id,
        {
          action: "REJECT",
          reason: "Please upload a legible scan of this document.",
        },
        200,
        "PATCH",
      );
      await reviewer.request("/api/applications/" + id + "/decision", {
        decisionType: "MORE_INFO_REQUESTED",
        notes: "Replace the unreadable scan, then resubmit.",
        internalNote: "INTERNAL PRIVATE REVIEW NOTE",
      });
      const view = await employee.request(
        "/api/applications/" + id,
        undefined,
        200,
        "GET",
      );
      assert.equal(view.application.status, "MORE_INFO_REQUESTED");
      assert.ok(!JSON.stringify(view).includes("INTERNAL PRIVATE"));
      application = (
        await upload(employee, id, doc.documentType, "legible-scan.pdf")
      ).application;
      assert.equal(
        application.documents.find((d) => d.id === doc.id).status,
        "UPLOADED",
      );
      application = (
        await employee.request("/api/applications/" + id + "/submit", {})
      ).application;
      assert.equal(application.status, "SUBMITTED");
    },
  );
  await check(
    "document verification and filing-ready decision notify the employee",
    async () => {
      await reviewer.request("/api/applications/" + id + "/review", {});
      for (const doc of application.documents)
        await reviewer.request(
          "/api/documents/" + doc.id,
          { action: "VERIFY" },
          200,
          "PATCH",
        );
      application = (
        await reviewer.request("/api/applications/" + id + "/decision", {
          decisionType: "VERIFIED",
          notes:
            "Package checked. Coordinate the filing appointment with the travel team.",
        })
      ).application;
      assert.equal(application.status, "VERIFIED");
      const notifications = await employee.request(
        "/api/notifications",
        undefined,
        200,
        "GET",
      );
      assert.ok(
        notifications.notifications.some((n) =>
          n.title.includes("Documents approved"),
        ),
      );
      const staff = await reviewer.request(
        "/api/applications/" + id,
        undefined,
        200,
        "GET",
      );
      assert.ok(
        staff.internalNotes.some((n) => n.content.includes("INTERNAL PRIVATE")),
      );
    },
  );

  const bookingBase = "/api/applications/" + id + "/booking";
  await check("approval and ownership gates protect booking APIs", async () => {
    await anon.request(bookingBase, undefined, 401, "GET");
    await other.request(bookingBase, undefined, 403, "GET");
    await reviewer.request(
      bookingBase,
      {
        action: "PREFERENCES",
        itineraryRevision: 1,
        preferences: { travellers: 1, cabin: "economy" },
      },
      403,
      "PATCH",
    );
    await other.request(
      bookingBase + "/search",
      { providerId: "skyscanner", itineraryRevision: 1 },
      403,
    );
    const view = await employee.request(bookingBase, undefined, 200, "GET");
    assert.equal(view.booking.eligible, true);
    assert.equal(view.booking.hotelEligible, false);
    await employee.request(
      bookingBase + "/search",
      { providerId: "booking", itineraryRevision: 1 },
      409,
    );
    await employee.request(
      bookingBase + "/search",
      { providerId: "skyscanner", itineraryRevision: 1 },
      422,
    );
    await employee.request(
      bookingBase,
      {
        action: "PREFERENCES",
        itineraryRevision: 1,
        preferences: { rooms: 1, guests: 1 },
      },
      409,
      "PATCH",
    );
    await employee.request(
      bookingBase,
      {
        action: "CONFIRM_HOTEL",
        itineraryRevision: 1,
        providerId: "booking",
        reference: "HOTEL-TEST",
        checkIn: "2027-04-11",
        checkOut: "2027-04-19",
      },
      409,
      "PATCH",
    );
  });
  await check(
    "dynamic flight search and overnight arrival unlock persisted hotel dates",
    async () => {
      await employee.request(
        bookingBase,
        {
          action: "PREFERENCES",
          itineraryRevision: 1,
          preferences: { travellers: 1, cabin: "invalid" },
        },
        400,
        "PATCH",
      );
      await employee.request(
        bookingBase,
        {
          action: "PREFERENCES",
          itineraryRevision: 1,
          preferences: { travellers: 1, cabin: "economy" },
        },
        200,
        "PATCH",
      );
      const search = await employee.request(bookingBase + "/search", {
        providerId: "skyscanner",
        itineraryRevision: 1,
      });
      const url = new URL(search.url);
      assert.equal(url.searchParams.get("origin"), "BOM");
      assert.equal(url.searchParams.get("destination"), "MUC");
      assert.equal(url.searchParams.get("outboundDate"), "2027-04-10");
      assert.equal(url.searchParams.get("inboundDate"), "2027-04-20");
      assert.ok(!search.url.includes(id));
      assert.ok(!search.url.includes("harbingergroup"));
      assert.equal(
        (await employee.request(bookingBase, undefined, 200, "GET")).booking
          .flight,
        null,
        "A search is not a booking.",
      );
      const confirm = {
        action: "CONFIRM_FLIGHT",
        itineraryRevision: 1,
        providerId: "skyscanner",
        reference: "FLIGHT-TEST",
        arrivalDate: "2027-04-11",
        destinationDepartureDate: "2027-04-19",
      };
      await employee.request(
        bookingBase,
        { ...confirm, arrivalDate: "2027-04-09" },
        422,
        "PATCH",
      );
      await employee.request(
        bookingBase,
        { ...confirm, destinationDepartureDate: "2027-04-21" },
        422,
        "PATCH",
      );
      const saved = await employee.request(bookingBase, confirm, 200, "PATCH");
      assert.equal(saved.booking.hotelEligible, true);
      const loaded = await employee.request(bookingBase, undefined, 200, "GET");
      assert.equal(loaded.booking.preferences.checkIn, "2027-04-11");
      assert.equal(loaded.booking.preferences.checkOut, "2027-04-19");
    },
  );
  await check(
    "hotel dates, occupancy and confirmations follow the purchased flight",
    async () => {
      const prefs = {
        action: "PREFERENCES",
        itineraryRevision: 1,
        preferences: {
          rooms: 1,
          guests: 1,
          checkIn: "2027-04-12",
          checkOut: "2027-04-18",
        },
      };
      await employee.request(
        bookingBase,
        {
          ...prefs,
          preferences: { ...prefs.preferences, checkIn: "2027-04-10" },
        },
        422,
        "PATCH",
      );
      await employee.request(
        bookingBase,
        { ...prefs, preferences: { ...prefs.preferences, rooms: 2 } },
        422,
        "PATCH",
      );
      await employee.request(bookingBase, prefs, 200, "PATCH");
      const search = await employee.request(bookingBase + "/search", {
        providerId: "booking",
        itineraryRevision: 1,
      });
      const url = new URL(search.url);
      assert.equal(url.searchParams.get("ss"), "Munich, Germany");
      assert.equal(url.searchParams.get("checkin"), "2027-04-12");
      assert.equal(url.searchParams.get("checkout"), "2027-04-18");
      assert.equal(url.searchParams.get("no_rooms"), "1");
      assert.equal(url.searchParams.get("group_adults"), "1");
      assert.ok(!search.url.includes("FLIGHT-TEST"));
      const saved = await employee.request(
        bookingBase,
        {
          action: "CONFIRM_HOTEL",
          itineraryRevision: 1,
          providerId: "booking",
          reference: "HOTEL-TEST",
          checkIn: "2027-04-12",
          checkOut: "2027-04-18",
        },
        200,
        "PATCH",
      );
      assert.equal(saved.booking.progress, "COMPLETE");
      assert.equal(
        (await reviewer.request(bookingBase, undefined, 200, "GET")).booking
          .hotel.reference,
        "HOTEL-TEST",
      );
    },
  );
  await check(
    "administrator provider controls and confirmation history",
    async () => {
      await employee.request(
        "/api/admin/booking-providers",
        undefined,
        403,
        "GET",
      );
      await admin.request(
        "/api/admin/booking-providers",
        { id: "skyscanner", name: "Skyscanner", enabled: false },
        200,
        "PATCH",
      );
      await employee.request(
        bookingBase + "/search",
        { providerId: "skyscanner", itineraryRevision: 1 },
        409,
      );
      await admin.request(
        "/api/admin/booking-providers",
        { id: "skyscanner", name: "Skyscanner", enabled: true },
        200,
        "PATCH",
      );
      const update = await employee.request(
        bookingBase,
        {
          action: "CONFIRM_FLIGHT",
          itineraryRevision: 1,
          providerId: "skyscanner",
          reference: "FLIGHT-UPDATED",
          arrivalDate: "2027-04-12",
          destinationDepartureDate: "2027-04-19",
        },
        200,
        "PATCH",
      );
      assert.equal(update.booking.hotel, null);
      const saved = await employee.request(bookingBase, undefined, 200, "GET");
      assert.ok(JSON.stringify(saved.history).includes("HOTEL-TEST"));
    },
  );
  await check(
    "separate itineraries have independent search values, expired and legacy trips stay locked",
    async () => {
      const second = (
        await employee.request(
          "/api/applications",
          {
            visaType: "US_B1",
            travelPurpose: "New York business meetings",
            departureDate: "2027-06-04",
            returnDate: "2027-06-15",
            departureAirportName: "Bengaluru International",
            departureAirportCode: "BLR",
            destinationAirportName: "John F Kennedy",
            destinationAirportCode: "JFK",
            destinationCity: "New York",
          },
          201,
        )
      ).application;
      const endpoint = "/api/applications/" + second.id + "/booking";
      await employee.request(
        endpoint + "/search",
        { providerId: "skyscanner", itineraryRevision: 1 },
        409,
      );
      // This independent fixture isolates booking eligibility from the full review flow exercised above.
      await db.application.update({
        where: { id: second.id },
        data: { status: "VERIFIED" },
      });
      await employee.request(
        endpoint,
        {
          action: "PREFERENCES",
          itineraryRevision: 1,
          preferences: { travellers: 2, cabin: "business" },
        },
        200,
        "PATCH",
      );
      const url = new URL(
        (
          await employee.request(endpoint + "/search", {
            providerId: "skyscanner",
            itineraryRevision: 1,
          })
        ).url,
      );
      assert.equal(url.searchParams.get("origin"), "BLR");
      assert.equal(url.searchParams.get("destination"), "JFK");
      assert.equal(url.searchParams.get("outboundDate"), "2027-06-04");
      assert.equal(url.searchParams.get("adultsv2"), "2");
      await db.application.update({
        where: { id: second.id },
        data: { destinationCity: null },
      });
      assert.equal(
        (await employee.request(endpoint, undefined, 200, "GET")).booking
          .eligible,
        false,
      );
      await employee.request(
        endpoint + "/search",
        { providerId: "skyscanner", itineraryRevision: 1 },
        409,
      );
      await db.application.update({
        where: { id: second.id },
        data: {
          destinationCity: "New York",
          departureDate: new Date("2020-01-01"),
          returnDate: new Date("2020-01-10"),
        },
      });
      await employee.request(
        endpoint + "/search",
        { providerId: "skyscanner", itineraryRevision: 1 },
        409,
      );
      assert.equal(
        (await employee.request(bookingBase, undefined, 200, "GET")).booking
          .flight.reference,
        "FLIGHT-UPDATED",
      );
    },
  );
  await check(
    "itinerary changes preserve bookings and require renewed review",
    async () => {
      await employee.request(
        "/api/applications/" + id,
        {
          travelPurpose: application.travelPurpose,
          departureDate: "2027-05-10",
          returnDate: "2027-05-20",
        },
        409,
        "PATCH",
      );
      await other.request(
        "/api/applications/" + id + "/itinerary-change",
        { itineraryRevision: 1 },
        403,
      );
      application = (
        await employee.request(
          "/api/applications/" + id + "/itinerary-change",
          { itineraryRevision: 1 },
        )
      ).application;
      assert.equal(application.status, "MORE_INFO_REQUESTED");
      assert.equal(application.itineraryRevision, 2);
      assert.equal(application.booking.eligible, false);
      await employee.request(
        bookingBase + "/search",
        { providerId: "skyscanner", itineraryRevision: 1 },
        409,
      );
      assert.ok(
        JSON.stringify(
          (await employee.request(bookingBase, undefined, 200, "GET")).history,
        ).includes("FLIGHT-UPDATED"),
      );
      await employee.request(
        "/api/applications/" + id,
        {
          travelPurpose: application.travelPurpose,
          departureDate: "2027-05-10",
          returnDate: "2027-05-20",
          destinationAirportCode: "FRA",
          destinationAirportName: "Frankfurt International",
          destinationCity: "Frankfurt",
        },
        200,
        "PATCH",
      );
      await employee.request(
        "/api/applications/" + id,
        { travelPurpose: application.travelPurpose, destinationCity: "" },
        200,
        "PATCH",
      );
      await employee.request("/api/applications/" + id + "/submit", {}, 422);
      await employee.request(
        "/api/applications/" + id,
        {
          travelPurpose: application.travelPurpose,
          destinationCity: "Frankfurt",
        },
        200,
        "PATCH",
      );
      await employee.request("/api/applications/" + id + "/submit", {});
      await reviewer.request("/api/applications/" + id + "/review", {});
      application = (
        await reviewer.request("/api/applications/" + id + "/decision", {
          decisionType: "VERIFIED",
          notes: "Updated itinerary checked and approved.",
        })
      ).application;
      assert.equal(application.booking.eligible, true);
      assert.equal(application.booking.flight, null);
      await employee.request(
        bookingBase,
        {
          action: "PREFERENCES",
          itineraryRevision: 1,
          preferences: { travellers: 1, cabin: "economy" },
        },
        409,
        "PATCH",
      );
    },
  );

  await check(
    "public access requests require admin identity verification and force password change",
    async () => {
      await anon.request("/api/access-requests", {
        name: "Access Employee",
        email: "access@harbingergroup.com",
        type: "NEW_ACCOUNT",
      });
      const queue = await admin.request(
          "/api/admin/access-requests",
          undefined,
          200,
          "GET",
        ),
        req = queue.requests.find(
          (r) => r.email === "access@harbingergroup.com",
        );
      await admin.request(
        "/api/admin/access-requests",
        { id: req.id, action: "APPROVE" },
        400,
        "PATCH",
      );
      const d = await admin.request(
        "/api/admin/access-requests",
        { id: req.id, action: "APPROVE", identityVerified: true },
        200,
        "PATCH",
      );
      assert.ok(d.tempPassword);
      const fresh = client();
      const signed = await login(fresh, d.email, d.tempPassword);
      assert.ok(signed.user.mustChangePassword);
      await anon.request("/api/access-requests", {
        name: "Reset Employee",
        email: secondUser.email,
        type: "PASSWORD_RESET",
      });
      const resetQueue = await admin.request(
          "/api/admin/access-requests",
          undefined,
          200,
          "GET",
        ),
        reset = resetQueue.requests.find((r) => r.email === secondUser.email);
      await admin.request(
        "/api/admin/access-requests",
        { id: reset.id, action: "APPROVE", identityVerified: true },
        200,
        "PATCH",
      );
      await other.request("/api/applications", undefined, 401, "GET");
    },
  );
  await check(
    "deactivation and role changes revoke existing sessions",
    async () => {
      const user = await db.user.findUniqueOrThrow({
        where: { email: "customer@harbingergroup.com" },
      });
      await admin.request(
        "/api/admin/users/" + user.id,
        { action: "TOGGLE_ACTIVE", isActive: false },
        200,
        "PATCH",
      );
      await employee.request("/api/applications", undefined, 401, "GET");
      await admin.request(
        "/api/admin/users/" + user.id,
        { action: "TOGGLE_ACTIVE", isActive: true },
        200,
        "PATCH",
      );
      await login(employee, "customer@harbingergroup.com", "DemoCustomer2026!");
      await admin.request(
        "/api/admin/users/" + user.id,
        { action: "CHANGE_ROLE", role: "CSR" },
        200,
        "PATCH",
      );
      await employee.request("/api/applications", undefined, 401, "GET");
    },
  );
  await check(
    "lockout recovery and administrator self-protection",
    async () => {
      const created = await admin.request(
        "/api/admin/users",
        {
          name: "Lockout Test",
          email: "locked@harbingergroup.com",
          role: "CUSTOMER",
        },
        201,
      );
      const locked = client();
      for (let attempt = 1; attempt <= 5; attempt++)
        await locked.request(
          "/api/auth/login",
          { email: created.user.email, password: "wrong-password" },
          attempt === 5 ? 423 : 401,
        );
      const reset = await admin.request(
        "/api/admin/users/" + created.user.id,
        { action: "RESET_PASSWORD" },
        200,
        "PATCH",
      );
      await login(locked, created.user.email, reset.tempPassword);
      const currentAdmin = await db.user.findUniqueOrThrow({
        where: { email: "admin@harbingergroup.com" },
      });
      await admin.request(
        "/api/admin/users/" + currentAdmin.id,
        { action: "CHANGE_ROLE", role: "CUSTOMER" },
        400,
        "PATCH",
      );
      await admin.request(
        "/api/admin/users/" + currentAdmin.id,
        { action: "TOGGLE_ACTIVE", isActive: false },
        400,
        "PATCH",
      );
      await admin.request(
        "/api/admin/users/" + currentAdmin.id,
        { action: "RESET_PASSWORD" },
        400,
        "PATCH",
      );
    },
  );
  await check(
    "idle sessions, tampered cookies, origin protection, and logout revocation",
    async () => {
      const user = await db.user.findUniqueOrThrow({
        where: { email: "csr@harbingergroup.com" },
      });
      const { SignJWT } = await import("jose");
      const passiveExpiresAt = Date.now() + 60 * 60 * 1000;
      const passiveToken = await new SignJWT({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: user.sessionVersion,
        lastActive: Date.now() - 2 * 60 * 1000,
        expiresAt: passiveExpiresAt,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(env.SESSION_SECRET));
      const passive = client();
      passive.cookie = "traveldesk_session=" + passiveToken;
      await passive.request("/api/notifications", undefined, 200, "GET");
      assert.equal(
        passive.cookie,
        "traveldesk_session=" + passiveToken,
        "Notification polling must not renew idle activity.",
      );
      await passive.request("/review", undefined, 200, "GET", {
        "next-router-prefetch": "1",
      });
      assert.equal(
        passive.cookie,
        "traveldesk_session=" + passiveToken,
        "Prefetch must not renew idle activity.",
      );
      await passive.request("/api/applications", undefined, 200, "GET");
      assert.notEqual(
        passive.cookie,
        "traveldesk_session=" + passiveToken,
        "A user action should refresh activity.",
      );
      const { decodeJwt } = await import("jose");
      assert.equal(
        decodeJwt(passive.cookie.split("=")[1]).expiresAt,
        passiveExpiresAt,
        "Activity renewal must preserve absolute expiry.",
      );

      const expired = await new SignJWT({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: user.sessionVersion,
        lastActive: Date.now() - 31 * 60 * 1000,
        expiresAt: Date.now() + 60 * 60 * 1000,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(env.SESSION_SECRET));
      const stale = client();
      stale.cookie = "traveldesk_session=" + expired;
      await stale.request("/api/applications", undefined, 401, "GET");
      stale.cookie = "traveldesk_session=invalid.signature";
      await stale.request("/api/applications", undefined, 401, "GET");
      await admin.request(
        "/api/admin/users",
        { name: "Forged", email: "forged@harbingergroup.com" },
        403,
        "POST",
        { origin: "https://evil.example" },
      );
      const clone = client();
      clone.cookie = reviewer.cookie;
      await clone.request("/api/applications", undefined, 200, "GET");
      await reviewer.request("/api/auth/logout", {});
      await clone.request("/api/applications", undefined, 401, "GET");
    },
  );
  console.log(
    "\n" +
      passed +
      " workflow integration checks passed. Isolated data: " +
      runDir,
  );
} catch (error) {
  console.error(error);
  console.error("\nRecent server output:\n" + output.slice(-5000));
  process.exitCode = 1;
} finally {
  if (server?.pid) {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } catch {}
    } else {
      server.kill("SIGTERM");
    }
  }
  await db?.$disconnect();
  // Only this test's freshly created directory can be removed.
  if (
    runDir.startsWith(testRoot + path.sep) &&
    path.basename(runDir).startsWith("run-")
  )
    fs.rmSync(runDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 300,
    });
}
