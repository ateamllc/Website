A Team Handyman Services - Static Site
Generated: November 6, 2025

Structure:
- index.html (original homepage preserved)
- about.html, contact.html, handyman.html, painting.html, fences.html, faq.html, privacy-policy.html, blog.html
- /partials/nav.html, /partials/footer.html, /partials/hero.html
- /css/main.css
- /js/loader.js (client-side include loader)
- /js/scripts.js
- /image/ (place your real images here)

Notes:
- index.html is unchanged from the user's supplied homepage (kept intact as requested).
- Other pages include partials via the simple JS loader. This keeps them DRY without a build step.
- For production: replace placeholder images with optimized jpg/webp, set up server headers (cache-control), and consider migrating to a static site generator (Eleventy/Astro) for templating and builds.
