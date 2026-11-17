---
name: astro-seo-performance
description: Patterns for Astro static site generation, SEO optimization, Core Web Vitals, metadata, Open Graph, schema.org structured data, and selective React hydration in CueCraft. Use when building pages, articles, or tuning web performance.
---

# Astro SEO and Performance Guidelines

CueCraft demands exceptional web performance and SEO indexing for educational snooker articles while providing seamless transitions into the gameplay experience.

## Technical Rules

1. **Static Rendering Default**:
   - All marketing pages (`/`, `/about`) and educational content (`/learn`, `/learn/[slug]`, `/lessons`) must be statically generated (SSG).
   - Content articles must be fully readable and indexed with JavaScript completely disabled.

2. **Islands Hydration Directives**:
   - Use `client:idle` for interactive demonstration widgets below the fold.
   - Use `client:visible` for heavy interactive canvas previews that only activate on viewport entry.
   - Use `client:load` ONLY for the primary interactive game shell at `/play` or critical hero controls.
   - Never hydrate static text or purely visual layout containers.

3. **Metadata and Open Graph**:
   - Every page must render canonical URLs, optimized title tags (`<Title> | CueCraft`), descriptive meta tags, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`), and Twitter card metadata.
   - Articles in `/learn/[slug]` must include JSON-LD structured data (`Article` / `HowTo` schema) detailing author, published date, and snooker topic keywords.

4. **Asset Optimization**:
   - Use Astro's `<Image />` component with explicit `width`, `height`, and modern formats (`webp`, `avif`).
   - SVG icons should be inlined via Lucide or lightweight icon components rather than large client icon bundles.
   - Fonts: Self-host or use Google Fonts with `font-display: swap` and preconnect links.

## Workflow

1. Scaffold page in `src/pages/` using `src/layouts/BaseLayout.astro`.
2. Populate frontmatter metadata and Open Graph schema props.
3. Keep layout semantic (`<main>`, `<article>`, `<header>`, `<nav>`, `<footer>`).
4. Embed interactive React islands strictly with targeted `client:*` directives.
5. Validate with Lighthouse or local audit tools for Core Web Vitals (LCP < 2.0s, CLS < 0.05, FID/INP < 100ms).

## Checklist

- [ ] Does the page render readable HTML without client JavaScript execution?
- [ ] Are all image elements given explicit dimensions to prevent layout shifts (CLS)?
- [ ] Is JSON-LD structured data valid on educational pages?
- [ ] Are client components lazy-loaded or island-isolated?
