# A Team Website Site Notes

This repository is a static website for A Team Property Improvement. This README is the durable, repo-only reference for humans and AI assistants working on the site. It is not linked from the website navigation and should not be treated as public webpage content.

## Development Rule

When a change affects page strategy, landing-page structure, reusable partials, conversion flow, SEO intent, analytics, image strategy, or service positioning, update this README in the same development pass.

Use this document to preserve why pages are built the way they are, not just what files exist. Future AI-built pages should read this before changing or creating landers.

## Site Architecture

- HTML pages live in `pages/`, with service landers in `pages/landing/`.
- Shared HTML fragments live in `pages/partials/`.
- Landing-specific shared fragments live in `pages/partials/landing/`.
- Shared CSS is imported through `css/main.css`, which imports partial and component CSS.
- Global behavior lives mostly in `js/scripts.js`.
- Client-side includes are handled by `js/loader.js` through `data-include`.
- Landing content data lives in `data/landing/` when a page uses JSON-backed snippets.
- Project images live in `image/`; brand marks live in `image/brand/`; large service galleries use `manifest.json` files inside their photo folders.
- Repo-only reference material lives in `docs/reference/`; design/source artifacts that are not served directly belong in `docs/design/`.
- Maintenance scripts live in `scripts/`, including `scripts/generate-sitemap.js`.

The site is static. Avoid adding build tooling unless there is a clear reason. Existing pages rely on browser-side `fetch`, so local testing should use a server rather than directly opening HTML files when checking partials or JSON-backed sections.

## Shared Patterns

### Includes

Reusable page sections are inserted with:

```html
<div data-include="/pages/partials/nav.html"></div>
```

The include loader fetches the fragment and injects it into the element. Landing snippets then initialize after insertion through mutation observers in `js/scripts.js`.

Use absolute include paths from the site root for predictable behavior on nested pages.

### Landing Snippets

The newer landing-page system is attribute driven:

- `data-landing-hero` initializes `pages/partials/landing/hero.html`.
- `data-trust-src` initializes the trust strip from JSON.
- `data-problem-solution` initializes problem-to-solution lists from JSON.
- `data-estimate-form` initializes the lead form section.
- `data-review-section` initializes review carousel content from JSON.
- `data-what-we-do-section`, `data-scope-section`, and `data-faq-section` initialize scoped list sections.
- `data-final-cta` initializes the final call-to-action section.

Prefer this pattern for new high-value landers because it keeps repeated layout and behavior in one place while allowing page-specific copy through attributes and JSON.

### Carousel

Carousels use `pages/partials/carousel.html` plus `data-carousel-*` attributes. They can be inline image lists through `data-carousel-images` or folder-backed galleries through `data-carousel-folder` and `manifest.json`.

Use real project photos where possible. The photo carousel is part proof, part trust builder, and should appear early enough that visitors see credible work before deep copy.

All autoscrolling landing-page image carousels should use the handyman lander carousel as the reference speed: `data-carousel-speed="160s"`. The shared JavaScript and CSS fallback speed should also remain `160s`, so new autoscrolling lander carousels move consistently even when the attribute is omitted. When changing carousel speed, update this shared expectation and apply it consistently across every lander instead of tuning pages one by one.

Review carousels should be ordered for the specific service lander. Put the most relevant reviews for that service in the first cards, and avoid showing reviews for less relevant services in the first couple of review cards. General trust reviews can follow service-specific reviews, and unrelated-but-positive reviews should be pushed later in the carousel.

### Forms

Forms sitewide currently cannot support file or image uploads because the site does not have a W3Forms Pro subscription. Do not add upload fields unless the form provider/account is upgraded and the implementation is tested end to end.

Customer-facing lead, estimate, offer, and application forms submit through Web3Forms:

```text
https://api.web3forms.com/submit
```

Use lowercase `snake_case` for every submitted `name=""` value. Do not use spaces, punctuation, uppercase letters, or full customer-facing questions as backend field names.

Every Web3Forms form must include these hidden fields:

- `access_key`
- `subject`
- `from_name`
- `form_id`
- `form_name`
- `form_source`
- `page_url`
- `redirect` when the form already redirects
- `botcheck` honeypot when spam protection is present or easy to add

Forms should include `lead_source` as a stable snake_case routing value.

Web3Forms routes delivery through the configured `access_key`. Do not add destination email addresses to form HTML, hidden fields, JSON-LD, scripts, or visible page content. To change the inbox that receives submissions, update the Web3Forms access key configuration or replace the access key with one configured for the desired inbox.

Use this subject format for lead automation:

```text
A Team Lead | {Form Name}
```

Careers uses a separate subject namespace:

```text
A Team Careers | New Job Applicant
```

Approved `service_category` values:

- `General Construction`
- `Fences, Gates & Outdoor Structures`
- `Interior/Exterior Painting`
- `Drywall Repair & Finish Work`
- `Fixture Installs & Replacements`
- `Property Management & Maintenance`
- `Other`
- `N/A`
- `Unspecified`

Use `N/A` when the form is not service-specific, such as careers, door knocking, or a door hanger offer claim. Use `Unspecified` when the form is a general customer estimate request that has not collected or inferred a service category, such as the home or contact page forms. Service landing pages should submit the mapped category for that lander.

Preferred backend field names include `first_name`, `last_name`, `company_name`, `phone`, `email`, `project_address`, `project_city`, `project_state`, `project_zip`, `property_type`, `service_category`, `discount_code`, `offer_detail`, `offer_terms`, `project_description`, `measurements_notes`, `urgency`, `preferred_timeline`, `budget_range`, `preferred_contact_method`, `preferred_contact_time`, `lead_source`, `role_applied_for`, `applicant_city`, `applicant_experience_example`, `consent_to_contact`, `employee_name`, `assigned_to`, `photos_taken`, `form_source`, `form_id`, `form_name`, `page_url`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, and `submitted_at`.

Contact validation rules:

- The home page estimate form requires `phone`.
- Other non-careers lead forms should use `data-require-contact` and the shared validator in `js/scripts.js` to require at least one of `phone`, `email`, or `project_address`.
- Do not put native `required` on `phone`, `email`, or `project_address` for forms using `data-require-contact`; otherwise the browser will require that exact field instead of allowing any one communication method.
- The shared validation message should remain `Please add at least one communication method`.
- Careers is a separate application workflow and should not use the lead-form communication-method validator.

Current approved `discount_code` values:

- `HANGER100`: $100 off first >$500 job

Discount code metadata is managed in `data/offers/discount-codes.json`. For any form that submits a `discount_code`, submit matching `offer_detail` and `offer_terms`. Door hanger submissions auto-tag `HANGER100`. Door knocking submissions populate discount options and matching offer fields from the shared discount code data; blank discount keeps `offer_detail` and `offer_terms` blank.

Current `lead_source` values:

- `website_home_page`
- `website_contact_page`
- `website_landing_page`
- `website_careers_page`
- `door_hanger`
- `door_knocking`

Form reference spreadsheets live in `docs/reference/`:

- `docs/reference/form-field-matrix.csv` lists every website form as a column and the submitted backend field names under each form.
- `docs/reference/form-subjects.csv` lists each form, page path, `form_id`, and standardized subject line.

These CSV files are manual repo references, not generated dynamically. Update them in the same commit whenever a form field, `form_id`, page path, or subject line changes.

Avoid duplicate field names for different meanings. Keep visible labels customer-friendly, but keep submitted names stable for Google Contacts, QuickBooks Online, Trello, Gmail filters, Zapier, and other automation.

Automation setup notes:

- Route lead emails primarily by `subject`, then use `form_id` and `lead_source` for exact workflow branching.
- Treat `A Team Careers | New Job Applicant` as a separate careers workflow, not a customer lead workflow.
- Treat `service_category=Unspecified` as a customer estimate where the service is not yet known.
- Treat `service_category=N/A` as a non-service-specific workflow such as careers, door knocking intake, or door hanger offer claim.
- Door knocking intentionally redirects to `/pages/knocking-submitted.html`; other public Web3Forms forms should use `/pages/thank-you.html`.
- If `discount_code` is present, read the paired `offer_detail` and `offer_terms` fields before creating the estimate, Trello card, or QBO note.
- The admin login form is not a Web3Forms lead form and should be ignored by external lead automations.

All forms should redirect to the actual A Team thank-you page after submission:

```text
https://ateamutah.com/pages/thank-you.html
```

Preserve that redirect when creating or editing forms, except for internal workflows that intentionally use a different success page such as the door knocking lead form redirecting to `/pages/knocking-submitted.html`.

### Tracking

Clickable elements can send analytics through `data-track-event`, `data-track-category`, and `data-track-label`. Estimate forms use `data-track-form` and trigger start/submit events in `js/scripts.js`.

Preserve tracking attributes when changing CTAs, especially on landing-page hero buttons and estimate forms.

## Design System Notes

- Primary brand colors currently center on navy (`#182741`, `#0f172a`) and amber (`#f59e0b`, `#fbbf24`).
- Body copy uses Open Sans. Headings commonly use Oswald.
- Landers use strong hero image backgrounds, dark overlays, concise headline copy, and direct CTAs.
- Buttons use `.btn`, `.btn-primary`, and `.btn-outline`.
- Generic sections use `.content-section`, `.text-block`, `.section-inner`, `.light-grey`, `.cta-section`, and related helpers.
- Keep landing pages practical and service-focused. Avoid marketing fluff, oversized decorative layouts, or generic stock-style imagery.
- Cards should support scannable information. Do not add cards just to decorate a page.
- Mobile behavior matters: CTAs need short labels where space is tight, and content should stay readable without overlap.

## Landing Page Strategy

High-value service landers should answer these questions quickly:

1. What service is this?
2. Where is it offered?
3. What jobs are a good fit?
4. What proof shows the team can do it?
5. What should the visitor do next?
6. What work is out of scope or should be referred out?

Good landers should make the next step obvious: call, text photos, or request an estimate. Copy should sound operational and specific, not broad and generic.

For landing pages, the visible hero title must match the SEO page title before the brand suffix. In practice, the `<title>` should use the pattern `Service in Provo and Utah County | A Team Property Improvement`, and the `data-hero-title` or visible hero `<h1>` should use the exact same `Service in Provo and Utah County` text.

Most secondary service landers in `pages/landing/` were generated by AI to match the newer landing-page structure and SEO direction. Treat them as solid draft landers, not final human-polished pages: future human review should tighten copy, verify service scope, adjust proof order, and tune images or examples before they become priority pages.

## Page Notes

### Home Page

File: `index.html`

Current structure:

- Hero with real project background, owner/contact CTAs, inline Google review proof, and the main estimate form.
- CTA strip for call/text conversion, followed by a compact proof strip for schedule, license, response, and service-area trust.
- Property manager bar immediately after the proof strip. This is a slim B2B pathway to `pages/landing/property-manager-portal.html` and should stay visually distinct from the homeowner service flow.
- Classic Google review carousel immediately below the property manager bar. It uses `pages/partials/landing/review-carousel.html`, `data-review-section`, and `data/landing/handyman-reviews.json`.
- Popular services section with the four current spotlight cards: handyman, painting, fences, and custom projects.
- Detailed services list, social follow, email prompt, hiring banner, and footer.

Strategic notes:

- The home page is the broad homeowner entry point, so it should quickly establish trust, conversion options, and the main service categories before deeper service lists.
- The property manager bar should remain a short routing element, not a full section, because the dedicated lander carries the B2B qualification work.
- Review proof now appears before service spotlights so visitors see customer trust before comparing service categories.

### Handyman Lander

File: `pages/landing/handyman.html`

This is the most advanced landing-page model in the repo and should be the reference for future priority landers.

Purpose:

- Rank and convert for Provo, Orem, and Utah County handyman searches.
- Capture small repair lists, rental turns, punch lists, drywall patches, trim repairs, door/fixture work, caulking, and similar jobs.
- Make it easy to send photos and get a free estimate.

Structural logic:

- Uses JSON-LD for local business, service, and FAQ schema.
- Uses the reusable landing hero partial with service area, headline, short hero copy, estimate CTA, call CTA, and text CTA.
- Shows a trust strip immediately after the hero.
- Uses a large two-row autoscrolling real-project carousel from `image/handyman-photos/manifest.json`.
- Uses a problem-to-solution section to map customer pain to jobs the team handles.
- Places the estimate form before deeper education so interested visitors can convert early.
- Shows Google review highlights before detailed scope sections.
- Includes "What we do", "What we don't do", FAQ, and final CTA sections.

Strategic notes:

- This page is intentionally more complete than older simple landers.
- The page qualifies fit as much as it sells. The scope-clarity section protects the business from jobs outside licensing, structure, major plumbing/electrical, roof diagnosis, and permit-heavy work.
- Photo proof and review proof are central. Do not bury them below long text.
- Future major landers should copy this structure unless there is a specific reason to stay simpler.

### Painting Lander

File: `pages/landing/painting.html`

Purpose:

- Convert visitors looking for interior painting, trim/cabinet/door refinishing, ceiling work, texture matching, and room refreshes.

Current structure:

- Uses the newer reusable landing-page system modeled after `pages/landing/handyman.html`.
- Uses JSON-LD for local business, service, and FAQ schema.
- Uses the reusable landing hero partial with service area, estimate CTA, call CTA, and text-photo CTA.
- Uses `image/painting-photos/CB26CFFF-F28D-4819-A3EE-A40617070C4C.webp` as the current hero and estimate-section background image.
- Shows a trust strip immediately after the hero.
- Uses a two-row autoscrolling painting project carousel from `image/painting-photos/manifest.json`, with the standard autoscroll speed of `160s`.
- Uses problem-solution, estimate form, review carousel, what-we-do, scope-clarity, FAQ, final CTA, social follow, and mobile sticky CTA sections.

Strategic notes:

- The page sells cleanliness, prep discipline, finish quality, and low hassle.
- The hero title follows the landing-page rule and matches the SEO page title: "Painting Services in Provo and Utah County". Outcome copy belongs in the subtitle, section headings, or supporting copy.
- The page is now a priority-style lander and should stay close to the handyman/fence lander structure.
- Painting customers care about protection, masking, furniture/floor handling, surface repair, cleanup, and walkthroughs. Keep those concerns visible in estimate copy, scope clarity, and FAQs.
- Preserve scope clarity around water damage, mold, lead-paint concerns, specialty coatings, cabinet/trim finish expectations, exterior access, and major substrate repairs.
- Photo proof and review proof should stay high on the page. Use real images from `image/painting-photos/` and keep the manifest curated if low-value repeated angles are added later.

### Fences Lander

File: `pages/landing/fences.html`

Purpose:

- Convert visitors looking for fence installation and fence repair in Provo, Orem, and Utah County.
- Capture wood privacy fences, chain link fences, gates, post replacement, storm damage repairs, staining, sealing, and practical outdoor boundary projects.
- Make it easy for homeowners and property owners to call, text photos, or request a free fence estimate.

Current structure:

- Uses the newer reusable landing-page system modeled after `pages/landing/handyman.html`.
- Uses JSON-LD for local business, service, and FAQ schema.
- Uses the reusable landing hero partial with service area, estimate CTA, call CTA, and text-photo CTA.
- Uses `image/fence-photos/IMG_5190_result.webp` as the current hero and estimate-section background image.
- Shows a trust strip immediately after the hero.
- Uses a two-row autoscrolling fence project carousel from `image/fence-photos/manifest.json`, with the standard autoscroll speed of `160s`.
- The fence carousel manifest is curated from real fence project photos and should favor informative progress and finished work over repeated angles.
- Uses problem-solution, estimate form, review carousel, what-we-do, scope-clarity, FAQ, final CTA, social follow, and mobile sticky CTA sections.
- The review carousel is ordered with fence-specific feedback first, followed by broader trust reviews.

Strategic notes:

- This page is a priority service lander and should stay closer to the handyman lander structure than the older static landers.
- Photo proof is central. Keep real fence photos high on the page and avoid generic stock-style imagery.
- Copy should emphasize practical fence outcomes: privacy, security, pets, gates, rentals, weather damage, clean lines, and durable repairs.
- Keep fence-needs links pointed to valid supporting pages rather than back to this same lander.
- Preserve scope clarity around property lines, utilities, HOA/city requirements, access, slope, old fence removal, haul-away, material choices, and permit-heavy work.

### Property Manager Portal Lander

File: `pages/landing/property-manager-portal.html`

Purpose:

- Convert Utah County property managers, owners, and operators who need recurring, on-call, or contract-style maintenance support across multiple properties.
- Position A Team as a maintenance relationship for approved accounts, not just a one-off handyman vendor.
- Qualify account fit before promising preferred pricing, on-call response, or recurring terms.

Current structure:

- Uses the reusable landing hero partial with a B2B/account-review CTA, call CTA, and text CTA.
- Uses JSON-LD for local business, service, and FAQ schema.
- Shows a trust strip immediately after the hero.
- Uses an operator-focused overview section before the carousel to explain multi-property fit, account options, and owner clarity.
- Uses the handyman image carousel as visual proof, with the standard autoscroll speed of `160s`.
- Uses problem-solution, estimate/account application, what-we-do, scope-clarity, FAQ, final CTA, and mobile sticky CTA sections.
- Does not currently use a review carousel; this is acceptable because the page is more B2B-facing and the stronger proof points are operational fit, communication, scope boundaries, and account process.

Strategic notes:

- This page is about operational reliability, not one-off repair excitement.
- The buyer likely manages multiple properties and cares about communication, documentation, tenant coordination, scheduling, predictable approvals, and avoiding vendor churn.
- Copy should emphasize recurring maintenance, photo updates, clear reporting, account review, owner visibility, and practical boundaries.
- Avoid making the page sound like general handyman work only. The property manager/account relationship is the differentiator.
- Keep preferred pricing and on-call language conditional on account approval, property count, work type, access, and payment process.
- If reviews are added later, order them around recurring reliability, communication, tenant-friendly work, punch lists, and multi-job trust before showing unrelated service reviews.

## Door Hanger and Knocking Pages

`door.html` is the door hanger QR landing page. It should stay noindex, preserve the $100-off offer language, and submit through Web3Forms with `form_id="door_hanger_offer"` and subject `A Team Lead | Door Hanger Offer`.

`pages/knocking-rules.html` is the internal door knocking process and lead-entry page. It should stay noindex, preserve the internal follow-up instructions, and submit through Web3Forms with `form_id="door_knocking_lead"` and subject `A Team Lead | Door Knocking Lead`. Its success path is intentionally `pages/knocking-submitted.html` instead of the public thank-you page.

For both pages, keep the customer/process purpose intact and only change form fields when needed for backend parsing.

## Creating New Landers

For new priority landers, start from `pages/landing/handyman.html` and adjust:

- Page title and meta description.
- Hero image, eyebrow, headline, subtitle, and CTAs.
- JSON-LD service type and FAQ schema.
- Trust, problem, review, what-we-do, scope, and FAQ data files.
- Carousel images and labels.
- Estimate form subject and tracking label.
- Service-specific scope limits and qualification language.

For lower-priority/simple landers, the older static pattern used by `painting.html` is acceptable, but avoid duplicating that pattern for pages that need strong SEO, paid traffic, or lead qualification.

Before adding a new lander, define:

- Primary audience.
- Service area.
- Main job types.
- Jobs that are not a fit.
- Proof assets available.
- Primary conversion action.
- Any qualification questions needed before scheduling.

## Content Rules

- Be specific about actual work performed.
- Use service-area language where it helps local search and customer clarity.
- Prefer real project photos over generic imagery.
- Keep CTAs direct: call, text photos, request estimate, schedule walkthrough.
- Mention exclusions when they reduce bad-fit leads.
- Do not overpromise licensed trade work, structural work, roof diagnosis, major plumbing/electrical, or permit-heavy work unless the business has explicitly decided to offer it.
- Use customer language: punch list, rental turn, drywall patch, trim repair, fresh coat, walkthrough, quote, photos.

## Maintenance Checklist

Update this README when:

- A landing page gets a new structure or conversion strategy.
- A reusable partial changes behavior or required attributes.
- A new JSON-backed section is added.
- CTA strategy, tracking, or estimate form behavior changes.
- A page's target audience, service area, or scope boundaries change.
- Image sourcing or carousel behavior changes.
- SEO schema strategy changes.

Also keep `sitemap.xml` in sync when adding, removing, or renaming public pages.

## Local Workflow

Use a local server for testing pages that load partials or JSON:

```sh
python3 -m http.server
```

Then visit the relevant path, such as:

```text
http://localhost:8000/pages/landing/handyman.html
```

The git hook in `githooks/pre-commit` updates carousel manifests before commit when manifest files exist.
