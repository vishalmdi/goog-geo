# GEO Scoring Rubric — Detailed Criteria

Detailed per-check criteria for the 5-category, 100-point scoring framework. Use this when a check result is ambiguous or a site has partial compliance.

Total: **25 + 25 + 20 + 15 + 15 = 100 pts**

---

## Category 1: Google Search AI Eligibility (25 pts)

This category captures the three hard gates that determine whether Google can crawl, index, and excerpt the page for AI Overviews and AI Mode. A page blocked by any of these checks cannot appear in Google's AI features regardless of content quality.

### How to check robots.txt

```bash
# Step 1: HTTP status
curl -sIL "https://[domain]/robots.txt" | grep -i "^HTTP/"

# Step 2: Content
curl -sL "https://[domain]/robots.txt"
```

Look for any `User-agent:` block followed by a `Disallow:` rule covering the audited page. A `Disallow: /` blocks the entire site.

Also check `X-Robots-Tag` HTTP response header from the page URL:
```bash
curl -sIL "[page-url]" | grep -i "x-robots-tag"
```

If it contains `noindex` or `nosnippet`, treat it identically to the meta tag equivalent.

Check robots.txt body: if the HTTP 200 response body begins with `<!DOCTYPE` or `<html`, the host is serving an HTML error page — treat as missing.

**Crawl-delay note:** Google ignores `Crawl-delay`. Report it as informational for non-Google bots only; do not deduct points.

---

### Scoring Rules

**robots.txt accessible (2 pts)**
- 2 pts: HTTP 200 with plain-text body
- 1 pt: HTTP 200 but file is empty (no blocks, still accessible)
- 0 pts: HTTP 404, connection error, or HTTP 200 with HTML body (host serving an error page)

**Googlebot not blocked (6 pts)** — primary gate for all Google Search AI features

```bash
curl -sL "https://[domain]/robots.txt" | grep -i -A5 "user-agent: googlebot\|user-agent: \*"
```

- 6 pts: No `User-agent: Googlebot` or `User-agent: *` disallow rule covering the target page
- 3 pts: Googlebot blocked on some sections but not the audited URL
- 0 pts: `Disallow: /` under `User-agent: Googlebot` or `User-agent: *` covering the page

> This is the highest-weighted single check (6 pts) because blocking Googlebot is the most impactful mistake a site can make for AI search eligibility — it prevents all Google features from seeing the page.

**HTTP 200 response (2 pts)**

Check from the curl headers captured in Step 1 of the audit workflow.
- 2 pts: Page returns HTTP 200 (not a redirect or error)
- 1 pt: Page redirects but ultimately resolves to a 200 (redirect chain adds crawl friction)
- 0 pts: Page returns 3xx without resolution, 4xx, or 5xx

**No `noindex` signal (7 pts)** — prevents the page from appearing in any Google Search result

Check both sources:
1. Meta tag (via browser): `playwright-cli eval "document.querySelector('meta[name=robots]')?.content"`
2. HTTP header: `curl -sIL "[page-url]" | grep -i "x-robots-tag"`

Apply the most restrictive signal found across either source:
- 7 pts: No robots directives, OR permissive `index,follow`
- 5 pts: `noarchive` only (cache blocked but indexing allowed — minor impact)
- 0 pts: `noindex` in meta tag OR `X-Robots-Tag` header — page cannot be indexed or cited

> Weighted highest at 7 pts because `noindex` is a hard technical block: a page marked `noindex` is completely invisible to all Google AI features. This is often set accidentally.

**No snippet-blocking signal (6 pts)** — prevents the AI from excerpting content even when indexed

Check meta robots content and `X-Robots-Tag` header for snippet directives. Also check for `data-nosnippet` attributes wrapping the core answer content.

```bash
playwright-cli eval "document.querySelector('meta[name=robots]')?.content"
playwright-cli eval "document.querySelectorAll('[data-nosnippet]').length"
```

- 6 pts: No snippet restrictions, OR `max-snippet:-1` (unlimited)
- 4 pts: Narrow `data-nosnippet` appears outside the core answer content (ads, footers)
- 2 pts: `max-snippet` set to a positive value (e.g., `max-snippet:160`) — limits but doesn't eliminate excerpts
- 0 pts: `nosnippet`, `max-snippet:0`, or `data-nosnippet` wrapping the core answer content

> AI Overviews pull page excerpts as the primary content signal. A page with `nosnippet` or `max-snippet:0` cannot be excerpted even if indexed, effectively blocking it from AI citation.

**Canonical set and self-referencing (2 pts)**

```bash
playwright-cli eval "document.querySelector('link[rel=canonical]')?.href"
```

- 2 pts: Canonical present and points to the current page URL (self-referencing)
- 1 pt: Canonical missing OR points to a different URL (may be intentional — note it; no full penalty if consistent with site strategy)
- 0 pts: Canonical points to a completely different domain (likely an error)

---

### Informational Bots (not scored in Category 1)

Check for these in robots.txt and report findings in a Technical Note — but do not score or penalize:
- `Google-Extended` — model training/grounding directive; does NOT affect Google AI Overviews
- `Gemini-Bot` — Vertex AI grounding, not Search AI Overviews
- `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai` — third-party AI products

Cross-platform AI bots (GPTBot, PerplexityBot, ClaudeBot, Bingbot) are scored in Category 5.

---

## Category 2: Helpful Non-Commodity Content (25 pts)

This is the only category scored by the auditor's judgment rather than DOM extraction. It captures what Google identifies as the highest-leverage long-term factor: uniquely valuable, people-first, non-commodity content.

**How to evaluate:** Read the first 800 words of visible text from the playwright snapshot. Score each check based on the evidence in that content. If a page is short, read the full content.

Ask the user "Does this page reflect first-hand expertise or original research?" if the content is ambiguous. Score conservatively when evidence is mixed.

### Why this category is 25 pts

Google's AI optimization guide states explicitly: "Success often requires no overt SEO at all." The single most impactful factor for long-term AI citation is having content that is genuinely more useful than what a generic AI summary would produce. DOM signals and schema cannot measure this — human judgment is required.

---

### Scoring Rules

**Unique perspective or first-hand expertise (8 pts)**

Does this content reflect direct experience, original research, or expert judgment — or is it a rewrite of what any generic AI summary would produce?

Evidence to look for:
- Named author with domain credentials
- Specific examples, anecdotes, or case studies from the author's experience
- Data or findings collected by the author's organization
- Opinions stated with reasoning ("We've found that X, because...")
- Jargon and nuance that only comes from deep domain practice

Scoring tiers:
- 8 pts: Strong first-hand signals throughout — named expert author, original examples or data, opinions with specific reasoning
- 6 pts: Some first-hand signals — author named, a few original examples, but mostly synthesizes secondary sources
- 4 pts: Competent but generic — well-organized summary of publicly available information, no original contribution
- 2 pts: Shallow overview — list of facts any LLM would produce, no author perspective
- 0 pts: Clearly AI-generated filler, duplicate content, or content that adds no informational value over a Wikipedia article

**Content satisfies visitor intent without leaving them to search again (7 pts)**

After reading this page, would a user have their question fully answered — or would they need another search?

Evidence to look for:
- Specific, actionable recommendations (not "it depends" without elaboration)
- Addresses follow-up questions the visitor would naturally have
- Includes examples, comparisons, or step-by-step guidance where relevant
- Doesn't end abruptly after a surface-level overview

Scoring tiers:
- 7 pts: Complete answer — covers the core question plus the 2–3 natural follow-up questions; user has no reason to search again
- 5 pts: Mostly satisfying — core question answered but follow-ups addressed only superficially
- 3 pts: Partial answer — addresses the topic but requires the user to seek clarification elsewhere for key details
- 1 pt: Thin content — mentions the topic but doesn't meaningfully answer the implied query
- 0 pts: Content doesn't answer the query at all (wrong page, navigation page, empty section)

**Depth beyond commodity: specific details, examples, or expert judgment (6 pts)**

Does the content include things that could only come from direct knowledge — exact numbers, named tools, honest trade-off comparisons, failure modes, or hard-won nuance?

Evidence to look for:
- Specific product names, version numbers, pricing tiers mentioned from experience
- Named real-world examples (not hypothetical scenarios)
- Explicit trade-off discussion ("X is better for A, but worse for B")
- Warnings, caveats, or failure modes that synthetic content tends to omit
- Structured depth: the page covers sub-topics at a level that shows domain mastery

Scoring tiers:
- 6 pts: Rich depth — multiple specific details, real examples, explicit trade-offs, or failure-mode awareness
- 4 pts: Some depth — one or two specific details or real examples, but the rest is generic
- 2 pts: Minimal depth — mostly general claims without supporting specifics
- 0 pts: No depth — generic overview that any summary model would produce

**AI-generated content quality, if present (4 pts)**

If there is no indication of AI-generated content, award 4 pts by default — this check penalizes AI use only when it produces filler.

If AI-generated content is suspected or disclosed:
- 4 pts: AI content is clearly useful, original in framing, and accurate — indistinguishable in quality from human expert writing
- 3 pts: AI content is accurate and readable but feels generic or impersonal
- 1 pt: AI content adds length but not value — padded, repetitive, or off-topic sections
- 0 pts: AI-generated filler content that reduces the page's overall usefulness: keyword stuffing, nonsensical elaborations, or factually incorrect AI hallucinations

> If the user discloses AI-assisted writing that is high quality, award full marks. This check targets low-quality AI abuse, not AI assistance.

---

## Category 3: Content Organization & Extractability (20 pts)

This category measures whether AI systems can extract direct answers, find structured content, and verify that the page covers the topic in depth. Both technical signals and query intent coverage are scored here.

### Scoring Rules

**Single H1 matching query intent (3 pts)**

```bash
playwright-cli eval "JSON.stringify(document.querySelectorAll('h1').length + ':' + document.querySelector('h1')?.innerText?.trim()?.substring(0,120))"
```

- 3 pts: Exactly one H1 that clearly matches the page's implied query intent
- 2 pts: One H1 but it's generic or doesn't reflect the target query
- 1 pt: Zero H1 elements (content present but no H1)
- 0 pts: Two or more H1 elements (heading hierarchy broken)

Compare H1 text to the URL slug, `<title>`, and user-stated target queries. An H1 of "Best CRM Software for Small Business" on a URL of `/best-crm-software` = full marks.

**Logical heading hierarchy (2 pts)**

```bash
playwright-cli eval "JSON.stringify(Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h=>({tag:h.tagName,text:h.innerText.trim().substring(0,80)})))"
```

- 2 pts: Correct H1 → H2 → H3 sequence with no skipped levels
- 1 pt: Mostly logical with one skipped level (e.g., H1 → H3 in one section)
- 0 pts: Chaotic hierarchy, multiple skipped levels, or headings used as styling only

**Direct answer in first paragraph (4 pts)**

The first paragraph should function as a standalone answer block — AI systems extract the first substantial paragraph as a definition or summary.

Read the first visible paragraph from the playwright snapshot.
- 4 pts: First paragraph (≤ 80 words) directly and completely answers the implied query
- 3 pts: First paragraph relevant and concise but addresses the topic rather than answering the question directly
- 2 pts: First paragraph is relevant but wordy (80–150 words) or buried under introductory fluff
- 1 pt: First paragraph addresses the topic but requires more context to answer the query
- 0 pts: First paragraph is navigation text, a cookie notice, or completely off-topic

**FAQ or structured Q&A section (3 pts)**

```bash
playwright-cli eval "!!(document.querySelector('[class*=faq],[id*=faq],details,dt')||/(?:frequently asked|faq|q&a|questions)/i.test(document.body.innerText.substring(0,5000)))"
```

- 3 pts: Dedicated FAQ section with ≥3 question-answer pairs, OR `<details>` accordion elements, OR a `<dl>` Q&A list
- 2 pts: A couple of inline Q&A pairs but no dedicated section
- 1 pt: Questions posed in headings but not answered in a structured block
- 0 pts: No question-answer structure anywhere on the page

**Tables or ordered lists for structured content (2 pts)**

```bash
playwright-cli eval "({hasTables:!!document.querySelector('table'),hasOrderedLists:!!document.querySelector('ol')})"
```

- 2 pts: Both tables and ordered lists present on the page
- 1 pt: One of the two present
- 0 pts: Pure prose with no structured formatting (unordered lists alone score 0 here — they indicate structure but not the higher-extractability formats)

**Internal links ≥ 3 (3 pts)**

```bash
playwright-cli eval "Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname===location.hostname||a.getAttribute('href')?.startsWith('/')).length"
```

- 3 pts: 3 or more internal links present (page is woven into the site graph)
- 2 pts: 1–2 internal links
- 0 pts: No internal links (page is isolated — related content is harder for AI to discover)

**Query fan-out coverage (3 pts)**

This check requires the auditor to reason from the target queries. Google generates sub-queries from the original query and seeks pages that collectively cover them. A page that naturally addresses multiple sub-topics is more likely to be cited.

Steps:
1. Take the 3–5 target queries provided in Initial Assessment
2. Generate 6–10 likely sub-queries (e.g., "best CRM" → "CRM pricing," "CRM for small business," "CRM integrations with email," "CRM vs spreadsheet")
3. Check whether each sub-topic appears naturally in H2/H3 headings or in body copy
4. Count how many sub-topics are present

Scoring:
- 3 pts: 3 or more sub-topics present naturally as headings or substantive body sections
- 2 pts: 2 sub-topics present
- 1 pt: 1 sub-topic present
- 0 pts: Page is focused on the primary query only; no sub-topic coverage

---

## Category 4: Technical Structure & Page Experience (15 pts)

Semantic HTML and technical signals that help AI systems (and users) identify and navigate content. These checks are necessary but not sufficient — a technically clean page with shallow content will still underperform.

### Scoring Rules

**`<main>` element present (3 pts)**

```bash
playwright-cli eval "!!document.querySelector('main')"
```

- 3 pts: `<main>` present and wraps the primary content area
- 0 pts: No `<main>` element — content lives in `<div>` soup

> `<main>` is the primary signal to browser-based AI agents for identifying where the page content begins and ends.

**`<article>` element or semantic sectioning (2 pts)**

```bash
playwright-cli eval "({hasArticle:!!document.querySelector('article'),hasSections:document.querySelectorAll('section').length})"
```

- 2 pts: `<article>` present wrapping a self-contained piece of content
- 1 pt: `<section>` elements used but no `<article>`
- 0 pts: No semantic sectioning elements at all

**`<title>` 50–60 chars + `<meta name="description">` present (3 pts)**

```bash
playwright-cli eval "({title:document.title,titleLen:document.title.length,metaDesc:document.querySelector('meta[name=description]')?.content,metaDescLen:document.querySelector('meta[name=description]')?.content?.length})"
```

- 3 pts: Title is 50–60 characters AND meta description is present (120–160 chars ideal)
- 2 pts: Title is present (any length) AND meta description is present, but one is out of range
- 1 pt: Title present but no meta description, OR title is very short (< 20 chars) or very long (> 80 chars)
- 0 pts: No title, title is the domain name only, AND no meta description

**All images have non-empty `alt` text (3 pts)**

```bash
playwright-cli eval "({total:document.querySelectorAll('img').length,missingAlt:document.querySelectorAll('img:not([alt])').length})"
```

- 3 pts: All images have non-empty `alt` attributes, OR zero images on the page
- 2 pts: ≤ 20% of images missing `alt` text
- 1 pt: 21–50% missing `alt` text
- 0 pts: > 50% missing, or `alt=""` on non-decorative images

**Interactive elements have ARIA labels (2 pts)**

```bash
playwright-cli eval "({unlabeledButtons:document.querySelectorAll('button:not([aria-label]):not([title])').length,unlabeledLinks:document.querySelectorAll('a:not([aria-label]):not([title]):not([href])').length})"
```

- 2 pts: All buttons and ambiguous links have ARIA labels, titles, or descriptive visible text
- 1 pt: Most labeled, a few gaps
- 0 pts: Many unlabeled interactive elements (poor accessibility tree for agentic AI)

**Open Graph tags present (2 pts)**

```bash
playwright-cli eval "({ogTitle:document.querySelector('meta[property=\"og:title\"]')?.content,ogDesc:document.querySelector('meta[property=\"og:description\"]')?.content,ogImage:document.querySelector('meta[property=\"og:image\"]')?.content})"
```

- 2 pts: `og:title`, `og:description`, and `og:image` all present
- 1 pt: `og:title` and `og:description` present (image missing)
- 0 pts: No OG tags, or only `og:title` alone

---

## Category 5: Entity & Enhancement Signals (15 pts)

These signals enhance entity clarity, improve rich-result eligibility, and control cross-platform AI access. Schema is not required for Google AI Overviews, but it does support rich results and helps AI systems understand what a page is about, who wrote it, and when.

### Scoring Rules

**JSON-LD schema present and parseable (3 pts)**

Always use playwright-cli — never web_fetch or curl:

```bash
playwright-cli eval "Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>{try{return JSON.parse(s.textContent)}catch(e){return 'PARSE_ERROR'}})"
```

- 3 pts: One or more `<script type="application/ld+json">` blocks that parse successfully and contain meaningful data
- 2 pts: Schema present but only via Microdata or RDFa (less preferred; parseable but not the recommended format)
- 1 pt: JSON-LD present but some blocks fail to parse (mixed validity) or blocks are near-empty `{}`
- 0 pts: No structured data detectable via browser eval, OR all blocks fail to parse

> Schema supports rich results (e.g., FAQ carousels, breadcrumb trails) and entity recognition. It does not gate AI Overviews eligibility but is strong SEO hygiene.

**Author attribution visible with name (3 pts)**

```bash
playwright-cli eval "!!(document.querySelector('[rel=author],[class*=author],[itemprop=author],[data-author]')||/written by|by [A-Z][a-z]+ [A-Z][a-z]+/i.test(document.body.innerText.substring(0,3000)))"
```

- 3 pts: Named author with credentials visible on the page (e.g., "By Jane Smith, Senior Analyst")
- 2 pts: Named author visible but no credentials
- 1 pt: Generic attribution only (e.g., "Staff Writer", "Admin", or company name)
- 0 pts: No author attribution

**Publication or "last updated" date visible (3 pts)**

```bash
playwright-cli eval "!!(document.querySelector('time,[class*=date],[class*=published],[itemprop=datePublished],[class*=updated]')||/(?:published|updated|last updated|posted)[\s:]+\w+\s+\d{1,2},?\s+\d{4}/i.test(document.body.innerText.substring(0,5000)))"
```

- 3 pts: Both a published date AND a "last updated" date are visible
- 2 pts: One date visible and it's within the last 12 months
- 1 pt: One date visible but it's more than 12 months old, OR date detectable in code but not visible to users
- 0 pts: No date signals anywhere

**Statistics or quantitative data with attribution (3 pts)**

```bash
playwright-cli eval "/\d+[\.\,]?\d*\s*(%|percent|users|customers|companies|studies|million|billion|x\s+(?:faster|better|more))/i.test(document.body.innerText.substring(0,8000))"
```

- 3 pts: Multiple specific statistics with source attribution (e.g., "74% of users report... (Gartner, 2024)")
- 2 pts: Statistics present but without source attribution
- 1 pt: One or two raw numbers but no percentages or cited studies
- 0 pts: No data, statistics, or quantitative claims

> The Princeton GEO study (KDD 2024) found that adding cited statistics increases AI citation visibility by 37%. Adding sources increases it by 40%.

**Cross-platform AI bots not blocked (3 pts)**

```bash
curl -sL "https://[domain]/robots.txt" | grep -iE "GPTBot|ChatGPT-User|PerplexityBot|ClaudeBot|anthropic-ai|Bingbot"
```

Check whether GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot/anthropic-ai, and Bingbot are blocked.

- 3 pts: None of the five platforms are blocked (all cross-platform AI bots have access)
- 2 pts: One platform is blocked
- 1 pt: Two platforms are blocked
- 0 pts: Three or more platforms blocked, or a wildcard `User-agent: * / Disallow: /` that blocks all bots

> Blocking these bots does not affect Google AI Overviews (which uses Googlebot), but limits citation reach on ChatGPT, Perplexity, Claude, and Microsoft Copilot.

---

## Edge Cases and Special Handling

### Single-Page Applications (SPAs)

SPAs render content via JavaScript. playwright-cli handles this correctly because it uses a real browser, but content may need time to load:

```bash
playwright-cli open "[URL]"
playwright-cli snapshot
```

If the snapshot shows empty content, the page may require authentication or have aggressive bot detection.

### Pages Behind Authentication

If the page returns a login redirect or CAPTCHA, the audit cannot be completed fully. Note this in the report. Score only what curl and HTTP headers can verify (parts of Category 1). Mark Categories 2–5 as "N/A — page not publicly accessible." Do not estimate DOM results from static source.

### Browser Unavailable

If playwright-cli installation fails, follow the partial audit path defined in SKILL.md Preflight. Score only what curl and HTTP headers can verify (parts of Category 1 and Category 4 meta tags via curl). Mark Categories 2, 3, and 5 as `N/A — browser unavailable`. A partial audit with honest gaps is more useful than a fabricated full audit.

### Sitemap Detection

Informational — no points. Check robots.txt for a Sitemap directive:
```bash
grep -i "^Sitemap:" robots.txt
```
Report in the Technical Note. A missing sitemap on a multi-page site should appear in the Action Plan as a supplemental recommendation.

### Dynamic Schema Injection

Some CMS platforms inject schema only on certain page types. If auditing a homepage, also check a representative content page (blog post, product page) — homepage schema often differs from content page schema.

### N/A Handling

When a check is genuinely N/A (e.g., Category 1 snippet-blocking when no snippet directives exist), award full points. The rubric penalizes active blocking, not absence of a signal.

---

## Scoring Shortcuts Reference

| Signal | Command |
|--------|---------|
| H1 count | `playwright-cli eval "document.querySelectorAll('h1').length"` |
| First H1 text | `playwright-cli eval "document.querySelector('h1')?.innerText?.trim()?.substring(0,120)"` |
| JSON-LD count | `playwright-cli eval "document.querySelectorAll('script[type=\"application/ld+json\"]').length"` |
| Has `<main>` | `playwright-cli eval "!!document.querySelector('main')"` |
| Has `<article>` | `playwright-cli eval "!!document.querySelector('article')"` |
| Canonical URL | `playwright-cli eval "document.querySelector('link[rel=canonical]')?.href"` |
| Meta robots | `playwright-cli eval "document.querySelector('meta[name=robots]')?.content"` |
| Max-snippet value | `playwright-cli eval "/max-snippet:\s*(-?\d+)/.exec(document.querySelector('meta[name=robots]')?.content||'')?.[1]"` |
| OG title | `playwright-cli eval "document.querySelector('meta[property=\"og:title\"]')?.content"` |
| Title + length | `playwright-cli eval "({t:document.title,l:document.title.length})"` |
| Images without alt | `playwright-cli eval "document.querySelectorAll('img:not([alt])').length"` |
| Internal link count | `playwright-cli eval "Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname===location.hostname||a.getAttribute('href')?.startsWith('/')).length"` |
| External link count | `playwright-cli eval "Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname!==location.hostname&&a.hostname).length"` |
| Has About link | `playwright-cli eval "Array.from(document.querySelectorAll('a[href]')).some(a=>/\/(about|about-us)(\/|$)/i.test(a.pathname))"` |
| X-Robots-Tag | `curl -sIL "[url]" \| grep -i "x-robots-tag"` |
| robots.txt status | `curl -sIL "https://[domain]/robots.txt" \| grep -i "^HTTP/"` |
| data-nosnippet count | `playwright-cli eval "document.querySelectorAll('[data-nosnippet]').length"` |
