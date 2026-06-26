# United Medical Waste New Frontend: Limitations & Backend Connection Plan

**Status:** Static frontend built and deployable. No backend connections are active. Supabase, Pipedrive, the Cloudflare Worker for contact, and the chatbot are all intentionally disconnected.

**Audience:** Internal team / PM / technical lead.

**Last reviewed against codebase:** 2026-06-26

---

## 1. Limitations of the New Frontend (as it stands today)

The new site is a static build (HTML, CSS, vanilla JS). It is structurally ready for the backend but currently runs fully disconnected. All backend calls are centralized in `js/api.js` and gated by a single flag in `js/config.js`. Until connection, the following are true:

**All lead capture is dormant — including contact.**

- All three form paths (Contact, Full Quote, Quick Start Quote) are in stub mode. They validate and show a success message to the user, but nothing is sent and no records are created anywhere.
- The Contact form stub is caused by `CONTACT_ENDPOINT` still being set to `"https://PLACEHOLDER-worker-url/contact"` in `config.js`. The `isPlaceholder()` check in `api.js` catches this and returns a fake success before any network call is made.
- The Cloudflare Worker code (`cloudflare-worker/contact-worker.js`) is fully written and correct — CORS handling, input validation, honeypot check, Resend integration, HTML escaping — but it has not been deployed, and its URL has not been filled into `config.js`. Deploying the Worker and updating `CONTACT_ENDPOINT` is the only step needed to make contact live.
- The Full Quote and Quick Start Quote forms are gated by `BACKEND_ENABLED: false`. They validate and show a mock reference (`QUOTE-MOCK`) but do not create deals, do not run the quote-matcher, and do not reach Pipedrive.
- Net effect: zero revenue-generating or lead-capture function is active.

**Chatbot is a placeholder.**

- The widget is functional UI but returns two canned replies only: pricing questions are routed to the quote form; everything else receives a generic services summary.
- No Gemini grounding, no page-content answers, no lead capture into Pipedrive until `BACKEND_ENABLED` is flipped and `SUPABASE_URL` / `SUPABASE_ANON_KEY` are filled in.

**Backend-only features are absent until connected.**

- Quick Start instant pricing (Compliance Publishing widget), discovery wizard, unsubscribe page, customer portal data, spam/vendor-pitch filtering, reply classification, suppression list, and the lead digest all live in the backend and are not present in the static build.

**Operational and SEO maintenance is manual.**

- No blog editor or CMS. New insights posts are hand-built HTML files.
- The sitemap (`sitemap.xml`) is maintained by hand; new pages require a manual entry.
- No analytics are wired. GA4 must be added before launch.

**Migration-specific risks.**

- URL parity: if new paths differ from the live site, rankings can drop without 301 redirects. This site previously lost ~98% of clicks to URL cannibalization, so redirect mapping is not optional.
- Security surface: the Supabase anon key ships in the client by design. That is safe only if Row-Level Security is airtight on every public table. RLS becomes the sole data-protection layer once the frontend connects. See Section 3.

**Asset-quality risks.**

- All icons in `assets/icons/` are AI-generated PNG files. They cannot be recolored via CSS, are heavier than SVG, and can drift in style across the set.
- AI-rendered images (truck, staff, location imagery) in `assets/images/ai-new/` require manual QA for logo accuracy before launch.

---

## 2. How We Connect the Frontend to the Existing Backend

The frontend was built so the connection is a configuration change, not a rebuild. All backend calls are centralized in `js/api.js`, and all endpoints and flags live in `js/config.js`.

**Step 1. Configure.** In `config.js`, fill in:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon key
- `CONTACT_ENDPOINT` — the deployed Cloudflare Worker URL (e.g., `https://your-worker.workers.dev/contact`)

The edge function paths (`submit-quote`, `submit-contact`, `site-chat`) are already set correctly and do not need to change.

**Step 2. Deploy the Cloudflare Worker.** The Worker code is ready in `cloudflare-worker/contact-worker.js`. Deploy it to Cloudflare Workers and set the following environment variables on the Worker:

- `RESEND_API_KEY`
- `CONTACT_TO` — the receiving email address
- `CONTACT_FROM` — the verified sender address in Resend
- `ALLOWED_ORIGIN` — set to `https://unitedmedwaste.com` for production

Once deployed, paste the Worker URL into `CONTACT_ENDPOINT` in `config.js`. This makes the contact form live independently of the Supabase backend.

**Step 3. Flip the switch.** Set `BACKEND_ENABLED = true` in `config.js`. Each function in `api.js` already contains a written real-call branch beside its stub, so this single flag activates live Supabase calls for the quote forms and chatbot everywhere at once.

**Step 4. Wire each path.**

- Quote and Quick Start forms point at `submit-quote`. Confirm deal creation, quote-matcher pricing, and Sales Action field writes in Pipedrive.
- Chatbot points `sendChatMessage` at `site-chat` in public mode (no pricing tools, isolation enforced server-side).
- Contact form is already handled by the Cloudflare Worker (Step 2). Optionally re-route through `submit-contact` later for full Pipedrive parity.
- Quick Start instant pricing: embed the CP widget in step 2 of the Quick Start flow, or rely on `submit-quote` if the widget is retired.

**Step 5. Add GA4.** Add the GA4 script block to the `<head>` of `index.html` and replicate to all other page templates. No analytics are currently wired.

**Step 6. Verify with the existing smoke test.** Submit a test quote and confirm the deal lands at Hot Lead with Monthly Price, Per-Pickup Price, Quote Reference, and Product Name populated and the auto-quote email fires. Submit a contact form and confirm the Lead Source field is written. Confirm the public chatbot cannot return a price.

**Step 7. SEO cutover.** Map every old URL to its new path, add 301 redirects, submit the new sitemap, and watch Google Search Console for cannibalization.

**Rollback:** setting `BACKEND_ENABLED = false` reverts the quote forms and chatbot to stubs instantly. The contact form reverts by removing or blanking `CONTACT_ENDPOINT`.

---

## 3. The Prerequisite That Gates Everything: Supabase RLS Audit

Do not flip `BACKEND_ENABLED` until this passes. Because the anon key ships in the client by design, Row-Level Security becomes the sole data-protection layer once the frontend connects. There is no React build process obscuring the key anymore. Going static makes the key more visible, so the policies that were always doing the real work simply become more exposed if they have gaps.

**The honest framing:** RLS is already the protection layer in the current React build. The difference is that React's build process obscures the anon key slightly. Going static just makes it more visible. If RLS is correctly configured now, the risk delta is actually minimal. This audit confirms it is correct before that exposure increases.

### Audit Checklist (complete every item before connecting)

**Table-level checks:**

- RLS is enabled on every public table, not just defined. A policy that exists but RLS is off on the table does nothing. Check both.
- No policy accidentally allows `SELECT *` for the anon role without a row-level filter. Open each policy and confirm the `USING` clause restricts rows, not just grants blanket access.
- `quick_quotes` is service-role only. Anon should not be able to read or write it under any condition.
- `rate_limit_log` is service-role only. Anon reading this table reveals IP-based throttle state.
- `profiles` are locked down. The handoff doc flags this explicitly. Confirm select and delete are restricted.
- `user_roles` is the source of truth for authorization. Confirm anon cannot read it. Role-checking logic calls `has_role()` server-side; the client should never need to read this table directly.
- `suppressed_emails` is not readable by anon under any condition. Exposing this table reveals who has unsubscribed or bounced, which is a privacy issue.
- No table has RLS disabled "temporarily" and forgotten. Search for any table where `rowsecurity = false` in your schema and confirm it is intentional.

**Policy logic checks:**

- Every policy that touches deal, contact, or org data filters by `auth.uid()` or restricts to service-role. Confirm there is no wildcard anon read on these.
- The `contact_submissions` table stores raw form payloads including spam. Confirm anon cannot read classified submissions.
- `deal_reply_events`, `deal_audit_log`, `quote_feedback`, and `email_send_log` are admin-only. Confirm policies match.

### Safeguards to Add Before Connecting

**Run the built-in scan first.** In the Supabase dashboard go to Advisors (or Security Advisor in some versions). It automatically flags weak or missing RLS policies across your schema. Resolve every flag it surfaces before connecting the frontend. This takes ten minutes and catches the easy misses.

**Make the policy review recurring, not one-time.** Set a reminder in Pipedrive or your task system to review Supabase Auth Policies whenever a new table is added to the schema. New tables default to RLS off. Every new migration should include a policy block as standard practice, not an afterthought.

**Edge function independence.** Never call any edge function from the static frontend that does not validate the request independently of RLS. The edge functions (`submit-quote`, `submit-contact`, `site-chat`) already run their own validation (Zod schemas, honeypot checks, rate limiting) before touching the database. Confirm that none of them skip validation and trust the client payload blindly. RLS and edge-function validation are two separate layers and both need to hold.

### Summary

The risk here is real but bounded. The anon key being in the client is not a design flaw; it is how Supabase is built to work. The anon key alone cannot do anything RLS policies do not allow. The question is whether those policies are correct. Run the audit, fix the flags, make the review recurring, and the risk delta of going static is genuinely minimal.
