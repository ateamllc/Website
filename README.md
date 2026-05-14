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
- Project images live in `image/`; the large handyman gallery uses `image/handyman-photos/manifest.json`.

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

All autoscrolling landing-page carousels should use the same movement speed. When changing carousel speed, update the shared expectation here and apply it consistently across every lander instead of tuning pages one by one.

### Forms

Forms sitewide currently cannot support file or image uploads because the site does not have a W3Forms Pro subscription. Do not add upload fields unless the form provider/account is upgraded and the implementation is tested end to end.

All forms should redirect to the actual A Team thank-you page after submission:

```text
/pages/thank-you.html
```

Preserve that redirect when creating or editing forms.

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

## Page Notes

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

- Static hero with a real painting/project image background.
- Early carousel with painting project images.
- "What we paint" list focused on interiors and durable finishes.
- Process section with prep, prime/paint, cleanup/walkthrough.
- Final CTA for quote requests.

Strategic notes:

- The page sells cleanliness, prep discipline, finish quality, and low hassle.
- The headline "Crisp lines, smooth walls, zero mess" is intentionally outcome-based rather than a generic "Painting Services" headline.
- The process section exists to reduce buyer anxiety. Painting customers care about protection, masking, furniture/floor handling, cleanup, and walkthroughs.
- If this page is upgraded to the newer landing system, preserve the same customer concerns: prep, surface repair, clean lines, sheen/product fit, cleanup, and quote clarity.
- Add review proof, stronger local/service-area signals, and an estimate form if making this a priority SEO or paid-traffic lander.

### Property Maintenance for Landlords Lander

File: `pages/landing/property-maintenance-landlords.html`

Purpose:

- Convert landlords or property owners who need ongoing rental maintenance, turnover repairs, seasonal upkeep, and tenant coordination.

Current structure:

- Static hero with landlord/rental-maintenance positioning.
- Early carousel with maintenance-oriented project images.
- "What we cover" list focused on recurring walkthroughs, filter changes, caulking, weatherproofing, drywall/paint/trim, doors/windows/locks, and exterior touch-ups.
- "Management made easy" grid with scheduled visits, tenant-friendly work, and clear reporting.
- Final CTA asking for portfolio size and priorities.

Strategic notes:

- This page is about operational reliability, not one-off repair excitement.
- The buyer is likely responsible for multiple properties and cares about communication, documentation, tenant coordination, scheduling, and preventing bigger issues.
- Copy should emphasize proactive maintenance, photo updates, clear reporting, and owner visibility.
- Avoid making the page sound like general handyman work only. The landlord angle is the differentiator.
- If upgraded, add stronger form fields around number of units/properties, recurring maintenance cadence, emergency expectations, and tenant access coordination.

## Creating New Landers

For new priority landers, start from `pages/landing/handyman.html` and adjust:

- Page title and meta description.
- Hero image, eyebrow, headline, subtitle, and CTAs.
- JSON-LD service type and FAQ schema.
- Trust, problem, review, what-we-do, scope, and FAQ data files.
- Carousel images and labels.
- Estimate form subject and tracking label.
- Service-specific scope limits and qualification language.

For lower-priority/simple landers, the older static pattern used by `painting.html` and `property-maintenance-landlords.html` is acceptable, but avoid duplicating that pattern for pages that need strong SEO, paid traffic, or lead qualification.

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
