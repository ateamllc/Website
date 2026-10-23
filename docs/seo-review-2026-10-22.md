# SEO refinement — October 22, 2026

## Evidence and scope

Reviewed commit 93c75d8 (homepage SEO), recent CSS/performance and sitemap exclusions, and existing uncommitted landing-page edits before editing. Preserved the short A Team title suffixes, shortened descriptions, homepage Utah County focus, canonical URLs, indexing exclusions, performance work, forms, tracking hooks, photos, reviews, and other in-progress landing-page changes. No deployment performed.

The supplied September 22–October 19 Search Console figures are historical aggregates. They precede the latest homepage commit and cannot establish its outcome. Homepage CTR is approximately 1.0%; handyman approximately 1.5%. Zero clicks on the other pages does not isolate metadata as the cause: their average positions range from 17.6 to 23.3. Query averages are not fixed rankings, and the supplied query list is not broken down by landing page.

## Intent and final titles

| Page | Primary intent | Title |
| --- | --- | --- |
| Homepage | County-wide handyman provider and service overview | Utah County Handyman Services \| A Team |
| Handyman | Provo handyman repair lists and small maintenance jobs | Handyman Services in Provo \| A Team |
| Drywall | Provo/Orem wall and ceiling patching and texture matching | Drywall Repair in Provo & Orem \| A Team |
| Painting | Utah County interior painting, including Provo/Orem | Interior Painting in Utah County \| A Team |
| Fences | Provo/Orem fence installation and replacement | Fence Installation in Provo & Orem \| A Team |

Homepage H1 is now one shared heading: “Handyman Services in Utah County.” Service H1s match their specific service/location focus. Provo handyman query exposure and drywall's position 14.3 query justify attention to those existing pages; Utah County painters supports the painting page's county framing. These are targeting decisions, not predictions of ranking gains.

## Implementation

- Preserved existing concise service descriptions; refined handyman to lead with the Provo service, examples, and an actionable photo/list estimate CTA. Final description lengths: home 153, handyman 135, drywall 138, painting 139, fences 141 characters. Length was an editorial guide.
- Inlined the existing hero template into the four reviewed service pages, retaining its classes, background images, CTA tracking attributes, call/text links, and JavaScript initialization hooks. Removed their hero `data-include` attributes, so the partial loader cannot replace their initial headings. Matching data attributes ensure initialization retains the same wording and one H1.
- Added static, visible scope summaries, estimating details, scope limitations, and contextual links using existing content as evidence. Drywall links to painting, handyman, and its repair guide; handyman links to drywall, doors, and rental maintenance. Painting and fence pages link to relevant specialist services.
- Added a direct homepage drywall link and aligned homepage summaries with documented interior painting and wood/chain link fencing scope. Retained existing service-card structure.
- Kept photos and reviews rather than inventing city-specific project details, guarantees, or new location pages.

## Verification

- Initial HTML: exactly one H1 on each reviewed page; local internal-link targets resolve.
- Headless Chrome at 390px and 1440px: all five pages render without horizontal overflow or JavaScript runtime errors. Four service heroes initialize with unchanged H1 text and no partial-loader overwrite; each estimate CTA resolves to exactly one rendered form target; project carousels load images.
- Reviewed mobile and desktop screenshots. External requests were blocked in this local rendering check to avoid sending preview analytics; live third-party integrations and form submissions were not exercised.
- All 15 existing attribution, CSS, and sitemap tests passed. `git diff --check` passed. No tracking or form implementation changed.

## Remaining issues and follow-up

- Homepage and handyman intentionally share a service topic but have different breadth and location emphasis. This is potential overlap, not evidence of harmful cannibalization. Use Search Console query-by-page results over comparable periods to see which URL receives each Provo/county query before considering consolidation or further differentiation.
- Original project photos and customer reviews remain useful evidence, but the reviewed content does not reliably tie individual jobs to verified cities, dates, and scopes. Add genuine project captions/case studies when those facts are available. The drywall page currently uses general secondary reviews rather than drywall-specific testimonials.
- Other landing pages still use JavaScript-loaded hero partials; this targeted change covers the four requested service pages.
- Shared navigation still advertises “Summer openings available”; confirm actual availability before replacing seasonal copy.
- After deployment, inspect rendered HTML in Search Console and compare query/page performance across comparable date windows, accounting for crawl timing, device mix, and position changes. Monitor leads as well as clicks. No ranking or CTR gain is guaranteed.

Guidance consulted: [Google title links](https://developers.google.com/search/docs/appearance/title-link), [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), and [crawlable internal links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
