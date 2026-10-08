# TravelDesk

A working employee travel-preparation and review app built with Next.js, React, Prisma, and SQLite. PostgreSQL is not used.

## Run locally

Use Node.js 22.16 or newer.

```sh
npm install
npm run setup
npm run dev
```

Setup creates a local `.env` with a random session secret if configuration is missing, initializes SQLite, and adds the question bank and document requirements. Existing accounts, passwords, questions, and cases are preserved. Migration stops if existing duplicate answers or documents require review; it does not delete them.

Development runs at http://localhost:3001. If Docker already occupies that port, use `npx next dev -p 3002`.

When `NEXT_PUBLIC_DEMO_MODE=true` in development, sign-in offers Employee, Reviewer, and Admin demo accounts. The seeded passwords are `DemoCustomer2026!`, `DemoCSR2026!`, and `DemoAdmin2026!`, respectively. Emails are `customer@harbingergroup.com`, `csr@harbingergroup.com`, and `admin@harbingergroup.com`. Demo login and role switching are disabled in production, regardless of that flag. Use a separate database for a real installation.

## Account access

- Employees request a new account or password reset at `/access-help`.
- Administrators review requests at `/admin/access`, verify the employee through a company channel, and create or reset access.
- Temporary credentials are displayed once for the administrator to share securely. First sign-in requires the employee to change the password.
- New requests create employee accounts. Administrators manage reviewer/admin roles, deactivation, and password resets under `/admin`.
- Password changes, resets, role changes, deactivation, and sign-out revoke existing sessions. Sessions have an eight-hour maximum lifetime and a 30-minute idle limit.
- A sign-in return path preserves the selected visa route and trip purpose.
- Notifications are in-app. Email delivery and company SSO are not connected.

## Application workflow

1. Choose a visa route and create a trip under `/applications/new`. Matching drafts are offered explicitly.
2. Save each questionnaire answer. Reopen the application to resume.
3. Upload supporting documents. PDF, PNG, and JPEG are accepted after file-signature checks, with a 10 MB limit. Files are stored outside the public directory.
4. Replace, remove, or restore a document while the application is editable. Replacement resets verification. Removed files remain recoverable.
5. Review the checklist and submit. Required trip details, answers, and documents must be present.
6. A coordinator claims the case under `/review`, inspects documents, records flag resolutions with evidence, and makes a decision.
7. Requested changes unlock the employee workspace. The employee corrects the package and resubmits.
8. Escalation releases the case for another reviewer and notifies administrators. Filing readiness requires verified mandatory documents and resolved critical flags.

| Status | Employee action | Travel team action |
| --- | --- | --- |
| Draft / In progress | Edit, upload, save, submit | Read only |
| Submitted / Under review | View locked package | Claim, verify, request changes, escalate |
| Action needed | Correct and resubmit | Wait for resubmission |
| Specialist review | View locked package | Claim and review |
| Ready for filing | View checked package | View decision history |

Employee messages and internal reviewer notes are stored separately. Employees cannot read internal notes. API authorization checks ownership and roles independently of the UI. Documents use protected download/preview endpoints, and workflow actions are recorded in the audit log.

“Ready for filing” is an internal package check, not a visa approval. The existing rule set and document lists are preparation checks; the coordinator confirms current filing requirements. Work visa routes begin a specialist intake.

## Docker

```sh
docker compose up -d --build
```

The app runs at http://localhost:3001. Configure these in the ignored local `.env` first:

- `SESSION_SECRET`: a unique random value of at least 32 characters.
- `ADMIN_EMAIL`: a `@harbingergroup.com` address for the first administrator.
- `ADMIN_PASSWORD`: a strong bootstrap password of at least 12 characters.
- `ADMIN_NAME`: optional administrator display name.
- `NEXT_PUBLIC_APP_URL`: the external app origin. Set an HTTPS origin when serving behind HTTPS so cookies are secure.

A first administrator is created only when the database has no active administrator, and must change the bootstrap password at first sign-in. Updating `ADMIN_PASSWORD` later does not reset an existing account.

SQLite and documents persist in the existing named volumes `traveldesk_sqlite_data` and `traveldesk_documents_storage`. SQLite is mounted at `/app/data`; schema and seed code stay in the image so an old data volume cannot mask updates. Startup initializes the database before accepting requests. The image excludes local secrets, databases, uploads, and test artifacts. Do not remove volumes to update the app.

## Validation

```sh
npm run lint
npm run build
npm run test:workflow
```

Workflow integration tests run a separate server on port 3011 with a disposable SQLite database and upload directory. They exercise authentication, mandatory password changes, ownership, draft persistence, answer validation, document replacement and recovery, submission locks, reviewer decisions, correction/resubmission, access provisioning, and session revocation. Test data is removed afterward. Existing Playwright browser tests remain under `e2e`; older selectors may need updating for the new workspace.

The Prisma configuration dependency uses an explicit `deepmerge-ts` 8.0.0 override for [CVE-2026-40345](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). Setup and workflow checks exercise this override.

## Approval-based bookings

Applications now capture airport names, IATA codes, destination city and travel dates before submission. Final coordinator approval unlocks `/flights?applicationId=…`. Search values come only from that application and explicitly selected traveller/cabin preferences. After purchasing externally, the employee records the flight reference and local destination arrival/departure dates; hotels unlock with those dates prefilled. Hotel stays can be shorter, but must fit within the confirmed destination stay. Employees explicitly choose rooms and adult guests.

Skyscanner and Booking.com prefilled searches were browser-verified on 8 October 2026. Setup adds these providers once; subsequent setup runs preserve administrator enable/disable settings and names. Manage them at `/admin/booking-providers`. Adapters fix trusted HTTPS destinations; arbitrary redirect URLs are not accepted. No live fare, hotel inventory, payment or purchase verification is performed by TravelDesk. Confirmations are employee-reported.

Requesting an itinerary change preserves prior confirmations in history, clears active booking progress, and returns the case to correction/resubmission for renewed review. External reservations are never automatically cancelled. Existing approved cases missing airport/city details must use this change flow; no itinerary is invented during migration. Version one supports a single destination, round-trip travel and adult occupancy.

Booking APIs: `GET/PATCH /api/applications/[id]/booking`, `POST /api/applications/[id]/booking/search`, `POST /api/applications/[id]/itinerary-change`, and administrator-only `GET/PATCH /api/admin/booking-providers`. Mutations require the current itinerary revision and enforce ownership, approval and flight-before-hotel prerequisites on the server. Provider URLs contain search details only.

## Groq concierge

The floating concierge now answers conversational questions using `openai/gpt-oss-120b` through Groq. It uses curated portal references with source links and can explain a signed-in employee's explicitly selected application checklist. It cannot change records, approve a visa, access other employees' cases (including from staff accounts), browse, execute code, or make bookings.

Run `npm run setup` to add the quota/lease tables without removing existing records. Setup appends missing concierge settings to an existing `.env` and preserves all existing values. On Windows, stop the development server before regenerating Prisma if its native DLL is locked; `npm run setup -- --skip-generate` can apply the schema when the client has already been regenerated.

Restart a development server after regenerating Prisma: hot reload can retain the old generated client without the new quota/lease models.

Set `GROQ_API_KEY` securely in the ignored `.env`, enable both `openai/gpt-oss-120b` and `openai/gpt-oss-safeguard-20b` in your Groq project, and restart the app (or recreate the Docker container). Never put the key in a `NEXT_PUBLIC_` variable. A missing key or invalid configuration leaves guidance navigation available and disables chat. Docker passes secrets at runtime and excludes local environment files from the image.

| Server setting | Default | Allowed range |
| --- | --- | --- |
| `AI_CONCIERGE_ENABLED` | `true` | `true` / `false`; disabling is the kill switch |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | This model only |
| `GROQ_GUARD_MODEL` | `openai/gpt-oss-safeguard-20b` | This model only |
| `AI_CONCIERGE_TIMEOUT_MS` | `45000` | 1,000–60,000 ms for the entire turn |
| `AI_CONCIERGE_MAX_COMPLETION_TOKENS` | `2048` | 256–4,096; each safety call separately caps at 1,024 |
| `AI_CONCIERGE_USER_TURNS_PER_MINUTE` | `10` | 1–30 |
| `AI_CONCIERGE_USER_TURNS_PER_DAY` | `100` | 1–500 |
| `AI_CONCIERGE_SITE_TURNS_PER_DAY` | `1000` | 1–10,000 |

Minute/day quotas use UTC fixed windows, are shared through SQLite, and count valid authenticated attempts before safety checks/provider calls, including blocked requests. Malformed requests and exhausted-limit rejections do not consume additional quota. One active turn per user and eight site-wide are allowed; expired leases recover crashed workers. Each successful turn uses three provider calls: input moderation, generation, and output moderation. No automatic retries occur. Counters cap requests, not currency: also configure a Groq project spend limit and alerts in the console.

Check the actual per-model limits in [Groq's console](https://console.groq.com/settings/limits). Low safeguard limits can prevent normal follow-ups even when application quotas allow them; each turn consumes two safeguard requests. A project with 3 requests/minute and 2,000 tokens/minute on the safeguard model needs higher provider limits for regular use. Generation receives the complete curated corpus; output moderation receives the cited entries and fresh case context. Oversized or rate-limited provider requests fail closed with a specific message.

Chat requires an active session, a completed temporary-password change, same-origin JSON requests, and bounded request/response sizes. Case context contains only route, destination country, dates, status, and checklist progress; files, raw answers, names, emails, internal notes, and booking references are excluded. Recognized sensitive identifiers and credentials are blocked locally, and model input/output safety checks fail closed. Responses use strict structured generation plus server-side validation and server-resolved source/navigation links. The UI renders escaped text; no model-supplied HTML or URLs are rendered.

Conversation state stays in tab memory, with signed history bound to the account, session version, and selected case. It expires after 30 minutes and retains at most six exchanges/12,000 serialized characters, with an additional 16,000-byte history cap so Unicode messages fit the request limit. Refresh, clearing chat, changing case, or changing account clears local history. Requests reload case context; prior answers are not authoritative current status. The app stores aggregate quotas and expiring leases, not transcripts. Turn logs include only request ID, outcome, duration and provider token usage. No prompts, answers, secrets, or case content are logged by the concierge.

Questions, curated references, and limited case context are still sent to Groq. Configure [Zero Data Retention in Groq's data controls](https://console.groq.com/docs/your-data) according to your organization's requirements; application environment variables cannot enforce provider retention. Input/output moderation and identifier detection are imperfect. Server authorization and absence of model tools enforce the capability boundary.

Production pages use per-request script nonces and CSP. Inline styles remain permitted for existing React/animation styling; inline scripts and eval are not permitted in production. Browser headers restrict framing to the same origin, MIME sniffing, device permissions, and referrer disclosure. Same-origin document previews and external booking navigation remain supported. Set `NEXT_PUBLIC_APP_URL` to the exact external origin; HTTPS enables secure cookies and HSTS. Local HTTP development remains supported.

Validation: `npm run test:concierge` uses a disposable SQLite database and mocked Groq responses. `npm run test:concierge:browser` runs focused browser checks against a separate production server and disposable database after `npm run build`. `npm run test:workflow` covers existing authentication, protected documents, and booking workflow. Once the real key is configured, `npm run smoke:concierge` makes a real, non-personal guidance request through all three provider stages and reports validation/usage without printing secrets.
