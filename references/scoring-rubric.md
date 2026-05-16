# GEO Scoring Rubric — Detailed Criteria

Detailed per-check criteria for the 5-category, 100-point GEO scoring framework. Use this when a check result is ambiguous or a site has partial compliance.

---

## Category 1: Google Search & AI Bot Accessibility (20 pts)

### How to check robots.txt

```bash
# Step 1: Check HTTP status
curl -sIL "https://[domain]/robots.txt" | grep -i "^HTTP/"

# Step 2: Fetch content
curl -sL "https://[domain]/robots.txt"
```

Look for any `User-agent:` block followed by a `Disallow:` rule that would block the bot from the page being audited. A `Disallow: /` blocks the entire site. A `Disallow: /blog/` would block blog pages but not the homepage.

Also grep for these bots:
- Google Search AI eligibility (scored): `Googlebot`
- Cross-platform AI access (scored): `GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `anthropic-ai`, `Bingbot`
- Informational bot controls: `Google-Extended`, `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai`

Also check for a `Crawl-delay` directive. Google does not support `Crawl-delay` in robots.txt, so it must not be scored as a Google Search AI issue. Report high delays as informational crawl friction for non-Google bots.

Also check `X-Robots-Tag` HTTP response header from the page URL: `curl -sIL "[page-url]" | grep -i "x-robots-tag"`. If it contains `noindex`, treat it identically to a noindex meta tag.

### Scoring Rules

**robots.txt accessible (2 pts)**
- 2 pts: HTTP 200 response with plain-text body
- 1 pt: HTTP 200 but file is empty (technically accessible; no blocks)
- 0 pts: HTTP 404, connection error, OR HTTP 200 but body starts with `<!DOCTYPE` or `<html` (host serving an HTML error page — treat as missing)

**Crawl-delay note:** If a `Crawl-delay` directive > 10 seconds is found for any non-Google AI bot, report it in the audit output as informational. Do not deduct points.

**Googlebot not blocked (4 pts)** — Google Search AI crawl eligibility
- 4 pts: No `User-agent: Googlebot` + `Disallow` rule covering the target page
- 2 pts: Googlebot blocked on some sections but not the audited page
- 0 pts: `User-agent: Googlebot` / `Disallow: /` or disallow covering the page

**GPTBot / ChatGPT-User not blocked (3 pts)**
- 3 pts: Neither `GPTBot` nor `ChatGPT-User` is blocked for the target page
- 1 pt: One is blocked, the other is not
- 0 pts: Both blocked covering the target page

**PerplexityBot not blocked (2 pts)**
- 2 pts: No `User-agent: PerplexityBot` + `Disallow` covering the target page
- 0 pts: PerplexityBot blocked

**ClaudeBot / anthropic-ai not blocked (2 pts)**
- 2 pts: Neither `ClaudeBot` nor `anthropic-ai` is blocked
- 1 pt: One is blocked, the other is not
- 0 pts: Both blocked

**Bingbot not blocked (1 pt)**
- 1 pt: No `User-agent: Bingbot` + `Disallow` covering the target page
- 0 pts: Bingbot blocked

**No `noindex` signal (3 pts)**

Check both sources:
1. Meta tag (via browser):
```bash
playwright-cli eval "document.querySelector('meta[name=robots]')?.content"
```
2. HTTP header (already captured in Step 1):
```bash
curl -sIL "[page-url]" | grep -i "x-robots-tag"
```

Scoring — use the most restrictive signal found across either source:
- 3 pts: No robots directives, OR permissive `index,follow`
- 1 pt: `noarchive` only (cache blocked but indexing is still allowed)
- 0 pts: `noindex` (from meta tag OR `X-Robots-Tag` header) — page will not be indexed

**No snippet-blocking signal (3 pts)**

Check meta robots, `X-Robots-Tag`, and broad `data-nosnippet` usage around the core answer content.
- 3 pts: No snippet restrictions, OR `max-snippet:-1` (unlimited snippet length)
- 2 pts: Narrow `data-nosnippet` appears outside the core answer content
- 1 pt: `max-snippet` is set to a small positive value that may limit useful excerpts
- 0 pts: `nosnippet`, `max-snippet:0`, or `data-nosnippet` wraps the core answer content

**Informational bots — no additional points:**
Check for `Google-Extended`, `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai` in robots.txt. If any are blocked, report in the Technical Note section of the audit output. Do not deduct points. `Google-Extended` does not control Google Search AI Overview eligibility.

---

## Category 2: Content Organization (20 pts)

### How to check headings

```bash
playwright-cli eval "JSON.stringify(Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h=>({tag:h.tagName,text:h.innerText.trim().substring(0,120)})))"
```

### Scoring Rules

**Exactly one H1 (3 pts)**
- 3 pts: Exactly one H1 element
- 1 pt: Zero H1 elements (page has content but no H1)
- 0 pts: Two or more H1 elements (heading hierarchy is broken)

**Logical heading hierarchy (3 pts)**
- 3 pts: H1 → H2 → H3 structure, no skipped levels (no H1 → H3 without H2)
- 2 pts: Mostly logical with one skipped level
- 0 pts: Chaotic heading structure or headings used for styling only

**H1 reflects page intent (3 pts)**

Compare the H1 text to the URL, `<title>`, and the user-stated target queries.
- 3 pts: H1 clearly matches the apparent query intent (e.g., URL is `/best-crm-software`, H1 is "Best CRM Software for Small Business")
- 2 pts: H1 is related but generic (e.g., "Welcome to Our Blog")
- 0 pts: H1 is decorative, missing, or completely unrelated to the page topic

**FAQ or Q&A section (3 pts)**

```bash
playwright-cli eval "!!(document.querySelector('[class*=faq],[id*=faq],details,dt')||/(?:frequently asked|faq|q&a|questions)/i.test(document.body.innerText.substring(0,5000)))"
```

- 3 pts: Dedicated FAQ section with at least 3 question-answer pairs, OR `<details>` elements, OR `<dl>` Q&A list
- 1 pt: A few inline questions in prose but no dedicated section
- 0 pts: No question-answer structure anywhere

**Tables or ordered lists for structured content (3 pts)**

```bash
playwright-cli eval "({hasTables:!!document.querySelector('table'),hasOrderedLists:!!document.querySelector('ol')})"
```

- 3 pts: Both tables and ordered lists present
- 2 pts: One of the two present
- 1 pt: Unordered lists only (better than nothing)
- 0 pts: Pure prose with no structured formatting

**Direct answer in first paragraph (3 pts)**

The first paragraph should function as a standalone answer to the implied query — AI systems extract the first substantial paragraph as a definition or summary block.
- 3 pts: First paragraph (≤ 80 words) directly answers the implied query intent
- 2 pts: First paragraph is relevant but wordy or buried under introductory fluff
- 1 pt: First paragraph addresses the topic but doesn't answer a query directly
- 0 pts: First paragraph is navigation, cookie notice, or completely off-topic

**Concise paragraphs (2 pts)**

```bash
playwright-cli eval "document.querySelector('main p, article p, p')?.innerText?.trim()?.split(/\s+/)?.length||0"
```

- 2 pts: First visible paragraph is ≤ 120 words (proxy for overall paragraph length)
- 1 pt: First paragraph is 121–200 words
- 0 pts: First paragraph exceeds 200 words (wall of text)

---

## Category 3: Semantic HTML & Technical (20 pts)

### Scoring Rules

**`<main>` element present (3 pts)**

```bash
playwright-cli eval "!!document.querySelector('main')"
```

- 3 pts: `<main>` present and wraps the primary content
- 0 pts: No `<main>` element (content is in `<div>` soup)

> `<main>` is the primary signal to browser-based AI agents for identifying the main content area. Missing it forces agents to guess.

**`<article>` element present (2 pts)**

```bash
playwright-cli eval "!!document.querySelector('article')"
```

- 2 pts: `<article>` wraps a self-contained piece of content
- 1 pt: `<section>` elements used but no `<article>`
- 0 pts: No semantic sectioning elements

**`<title>` present and 50–60 chars (3 pts)**

```bash
playwright-cli eval "({title:document.title,len:document.title.length})"
```

- 3 pts: Title present and 50–60 characters
- 2 pts: Title present but 40–49 or 61–70 characters (slightly off)
- 1 pt: Title present but under 40 or over 70 characters
- 0 pts: No title, or title is the domain name only (e.g., "example.com")

**`<meta name="description">` present (2 pts)**

```bash
playwright-cli eval "document.querySelector('meta[name=description]')?.content"
```

- 2 pts: Present, 120–160 characters, descriptive
- 1 pt: Present but very short (< 50 chars) or very long (> 200 chars)
- 0 pts: Missing

**`<link rel="canonical">` set (2 pts)**

```bash
playwright-cli eval "document.querySelector('link[rel=canonical]')?.href"
```

- 2 pts: Canonical present and points to the correct page URL
- 1 pt: Canonical present but points to a different URL (may be intentional — note it)
- 0 pts: No canonical link

**All images have `alt` text (3 pts)**

```bash
playwright-cli eval "({total:document.querySelectorAll('img').length,missingAlt:document.querySelectorAll('img:not([alt])').length})"
```

- 3 pts: All images have non-empty `alt` attributes (or zero images on page)
- 2 pts: ≤ 20% of images missing `alt` text
- 1 pt: 21–50% missing `alt` text
- 0 pts: > 50% missing, or `alt=""` on all non-decorative images

**Interactive elements have ARIA labels (2 pts)**

```bash
playwright-cli eval "({labeled:document.querySelectorAll('[aria-label],[aria-labelledby],[title]').length,unlabeledButtons:document.querySelectorAll('button:not([aria-label]):not([title])').length,unlabeledLinks:document.querySelectorAll('a:not([aria-label]):not([title]):not([href])').length})"
```

- 2 pts: All buttons and ambiguous links have ARIA labels or descriptive text
- 1 pt: Most labeled, a few gaps
- 0 pts: Many unlabeled interactive elements (poor accessibility tree for agentic AI)

**Open Graph tags present (3 pts)**

```bash
playwright-cli eval "({ogTitle:document.querySelector('meta[property=\"og:title\"]')?.content,ogDesc:document.querySelector('meta[property=\"og:description\"]')?.content,ogImage:document.querySelector('meta[property=\"og:image\"]')?.content})"
```

- 3 pts: `og:title`, `og:description`, and `og:image` all present
- 2 pts: `og:title` and `og:description` present (image missing)
- 1 pt: Only `og:title` present
- 0 pts: No OG tags

---

## Category 4: Content Quality Signals (20 pts)

These signals are drawn directly from the Princeton GEO research (KDD 2024) and Google's E-E-A-T guidelines.

### Scoring Rules

**Named author attribution visible (4 pts)**

```bash
playwright-cli eval "!!(document.querySelector('[rel=author],[class*=author],[itemprop=author],[data-author]')||/written by|by [A-Z][a-z]+ [A-Z][a-z]+/i.test(document.body.innerText.substring(0,3000)))"
```

- 4 pts: Named author with credentials (e.g., "By Jane Smith, Senior SEO Analyst")
- 3 pts: Named author visible but no credentials
- 1 pt: Generic attribution only (e.g., "Staff Writer", "Admin", or site name)
- 0 pts: No author attribution

**Publication or "last updated" date visible (4 pts)**

```bash
playwright-cli eval "!!(document.querySelector('time,[class*=date],[class*=published],[itemprop=datePublished],[class*=updated]')||/(?:published|updated|last updated|posted)[\s:]+\w+\s+\d{1,2},?\s+\d{4}/i.test(document.body.innerText.substring(0,5000)))"
```

- 4 pts: Both published date AND "last updated" date visible
- 3 pts: One date visible and it's within the last 12 months
- 2 pts: One date visible but it's more than 12 months ago
- 1 pt: Date detectable in code but not visible to users
- 0 pts: No date signals anywhere

> Undated content almost always loses to dated content in AI citation. Freshness is one of Google's core signals for AI Overviews.

**Statistics or quantitative data present (4 pts)**

```bash
playwright-cli eval "/\d+[\.\,]?\d*\s*(%|percent|users|customers|companies|studies|million|billion|x\s+(?:faster|better|more))/i.test(document.body.innerText.substring(0,8000))"
```

- 4 pts: Multiple specific statistics with sources (e.g., "74% of users report... (Gartner, 2024)")
- 3 pts: Statistics present but without source attribution
- 2 pts: One or two numbers but no percentages or studies
- 1 pt: Vague quantitative language (e.g., "thousands of users")
- 0 pts: No data or statistics

**Outbound links to external authoritative sources (4 pts)**

```bash
playwright-cli eval "Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname!==location.hostname&&a.hostname&&!['twitter.com','facebook.com','instagram.com','linkedin.com'].includes(a.hostname)).length"
```

- 4 pts: 3 or more external links to authoritative sources (research papers, government sites, established publishers)
- 3 pts: 1–2 external links to authoritative sources
- 2 pts: External links present but to low-authority or promotional sources only
- 1 pt: External links only to social profiles
- 0 pts: No external links at all

**Internal link count — informational (no points):** `internalLinks` is captured in step 3e. If < 3 internal links are found, add a supplemental flag: "Page appears isolated — low internal link count may make related content harder to discover." No points deducted.

**Trust pages — informational (no points):** `hasAbout` and `hasContact` are captured in step 3d. If neither is linked from the audited page, add a supplemental flag: "No About or Contact page detected — users and quality evaluators may have less context about who is behind the site." No points deducted.

**Clear answer block aligned with query intent (4 pts)**

This requires human judgment based on the target queries provided. Read the first 500 words of content:
- 4 pts: Content opens with a clear, direct answer to the implied query (definition block, direct statement, or summary box)
- 3 pts: Answer is present in the first 3 paragraphs but not in the first paragraph
- 2 pts: Answer is buried in the body of the content
- 1 pt: Content is related to the query but doesn't directly answer it
- 0 pts: Content doesn't address the query intent at all

---

## Category 5: Structured Data / Schema (20 pts)

### How to check schema

Always use playwright-cli, never web_fetch or curl:

```bash
playwright-cli eval "JSON.stringify(Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent))"
```

Then parse each block to identify `@type` values.

### Scoring Rules

**JSON-LD block(s) detected (4 pts)**
- 4 pts: One or more `<script type="application/ld+json">` blocks detected with non-empty content
- 2 pts: Schema present but only via Microdata or RDFa (less preferred formats)
- 0 pts: No structured data detected via browser eval

**Article, BlogPosting, or Organization schema (4 pts)**
- 4 pts: `Article`, `BlogPosting`, `NewsArticle`, or `Organization` schema present with required properties
  - Article minimum: `headline`, `image`, `datePublished`, `author`
  - Organization minimum: `name`, `url`
- 2 pts: Schema type present but missing required properties
- 0 pts: Schema type absent

**FAQPage schema (3 pts)**

Only score this check if a FAQ section was confirmed in Category 2.
- 3 pts: `FAQPage` schema present with `mainEntity` array and at least 3 Q&A pairs
- 1 pt: FAQPage schema present but with fewer than 3 pairs or invalid structure
- 0 pts: FAQ content exists on page but no FAQPage schema, OR no FAQ on page (skip — mark N/A and redistribute 3 pts to partial credit elsewhere)
- N/A: If no FAQ section found, award 3 pts automatically (not penalized for content type)

**BreadcrumbList schema (3 pts)**
- 3 pts: `BreadcrumbList` schema present with `itemListElement` array showing the page hierarchy
- 1 pt: Breadcrumb visible in HTML but no schema markup
- 0 pts: No breadcrumb schema (and site has multiple levels of navigation)
- N/A (3 pts): Single-page sites or sites with flat structure where breadcrumbs aren't applicable

**HowTo schema (3 pts)**

Only score if step-by-step instructional content was detected.
- 3 pts: `HowTo` schema with `name` and `step` array present
- 1 pt: HowTo schema present but steps are incomplete
- 0 pts: How-to content exists but no HowTo schema
- N/A (3 pts): Page doesn't contain step-by-step content

**Schema is parseable and non-empty (3 pts)**

After extracting JSON-LD blocks, attempt to parse them:
```bash
playwright-cli eval "Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>{try{return JSON.parse(s.textContent)}catch(e){return 'PARSE_ERROR'}})"
```

- 3 pts: All schema blocks parse successfully and contain meaningful data
- 1 pt: Some blocks parse, others fail (mixed validity)
- 0 pts: All blocks fail to parse, OR all blocks are `{}` or near-empty

---

## Edge Cases and Special Handling

### Single-Page Applications (SPAs)

SPAs (React, Vue, Angular) render content via JavaScript. playwright-cli handles this correctly because it uses a real browser, but you may need to wait for content to load:

```bash
playwright-cli open "[URL]"
# Wait a moment for JS to render, then snapshot
playwright-cli snapshot
```

If the snapshot shows empty content, the page may require authentication or have aggressive bot detection.

### Pages Behind Authentication

If the page returns a login redirect or CAPTCHA, the audit cannot be completed with playwright-cli. Note this in the report and score Category 1 based on what can be checked (robots.txt, headers) and leave other categories as "N/A — page not publicly accessible."

### Browser Unavailable (playwright-cli cannot be installed)

If playwright-cli installation fails, follow the partial audit path defined in SKILL.md Preflight. Score only what curl and HTTP headers can verify (parts of Category 1 and Category 3 meta tags). Mark Categories 2, 4, and 5 as `N/A — browser unavailable`. Do not estimate schema or DOM results from static source — a partial audit with honest gaps is more useful than a fabricated full audit.

### Sitemap Detection

Sitemap presence is informational — do not add or deduct points. Report in the audit's Technical Note section. A missing sitemap on a site with > 10 pages should be included in the Action Plan as a supplemental recommendation because sitemaps can help crawlers discover canonical content URLs.

### Dynamic Schema Injection

Some CMS platforms inject schema only on specific page types. If running a homepage audit, check a representative content page (blog post, product page) too, as the homepage often has different schema than content pages.

### Multilingual Sites

For multilingual sites, check `hreflang` tags as a bonus signal (not scored, but note in the report):
```bash
playwright-cli eval "Array.from(document.querySelectorAll('link[rel=alternate][hreflang]')).map(l=>({lang:l.hreflang,href:l.href}))"
```

---

## Scoring Shortcuts Reference

| Signal | playwright-cli eval snippet |
|--------|---------------------------|
| H1 count | `document.querySelectorAll('h1').length` |
| JSON-LD present | `document.querySelectorAll('script[type="application/ld+json"]').length > 0` |
| Has `<main>` | `!!document.querySelector('main')` |
| Has `<article>` | `!!document.querySelector('article')` |
| Canonical URL | `document.querySelector('link[rel=canonical]')?.href` |
| Meta robots | `document.querySelector('meta[name=robots]')?.content` |
| Max-snippet value | `/max-snippet:\s*(-?\d+)/.exec(document.querySelector('meta[name=robots]')?.content\|\|'')?.[1]` |
| OG title | `document.querySelector('meta[property="og:title"]')?.content` |
| Title length | `document.title.length` |
| Images without alt | `document.querySelectorAll('img:not([alt])').length` |
| External links | `Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname!==location.hostname&&a.hostname).length` |
| Internal links | `Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname===location.hostname\|\|a.getAttribute('href')?.startsWith('/')).length` |
| Has About page link | `Array.from(document.querySelectorAll('a[href]')).some(a=>/\/(about\|about-us\|who-we-are)(\/\|$)/i.test(a.pathname))` |
| Has Contact page link | `Array.from(document.querySelectorAll('a[href]')).some(a=>/\/(contact\|contact-us\|get-in-touch)(\/\|$)/i.test(a.pathname))` |
| X-Robots-Tag (HTTP) | `curl -sIL "[url]" \| grep -i "x-robots-tag"` |
| robots.txt status | `curl -sIL "https://[domain]/robots.txt" \| grep -i "^HTTP/"` |
