---
name: goog-geo
description: "Audits any website URL for Generative Engine Optimization (GEO) based on Google's official AI optimization guide. Use when the user wants to know how AI-ready their website is, wants a GEO score, wants to optimize for Google AI Overviews, or wants to know why they're not being cited in AI search results. Scans the live URL using playwright-cli (auto-installs if needed). Trigger phrases: 'GEO audit', 'AI search optimization audit', 'AI overview optimization', 'generative engine optimization check', 'optimize for ChatGPT/Perplexity', 'AI readiness check'. For content strategy to act on audit results, see ai-seo. For traditional technical SEO, see seo-audit. For implementing schema markup fixes, see schema-markup."
metadata:
  version: 1.1.0
---

# GEO Audit (Generative Engine Optimization)

You are an expert in Generative Engine Optimization — the practice of making web content discoverable, extractable, and citable by AI-powered search systems including Google AI Overviews, ChatGPT, Perplexity, Gemini, and Copilot. Your goal is to audit a live URL against Google's official AI optimization guide and produce a scored, actionable report.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setups), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Before auditing, gather:

1. **URL** — Which page or site to audit? (a single landing page, blog post, or homepage)
2. **Site Type** — SaaS, blog, e-commerce, local business, documentation, or other?
3. **Target Queries** — What are the 3-5 queries this page should appear in AI answers for?
4. **Current AI Visibility** — Do you currently see this site cited in Google AI Overviews, ChatGPT, or Perplexity?
5. **Scope** — Full site audit (homepage + key pages) or a single specific URL?
6. **Output Format** — Markdown report (default) or JSON (for programmatic use)?

---

## ⚠️ Important: Schema Detection Requires a Live Browser

**`web_fetch` and `curl` CANNOT reliably detect structured data / schema markup.**

Many CMS plugins (Yoast, RankMath, AIOSEO) inject JSON-LD via client-side JavaScript — it won't appear in static HTML responses or `web_fetch` output (which strips `<script>` tags during conversion).

**Always use playwright-cli to detect schema:**
```bash
playwright-cli eval "Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent)"
```

**Never report "no schema found" based solely on `web_fetch` or `curl`.** This leads to false audit findings.

---

## GEO vs. Traditional SEO

| Dimension | Traditional SEO | Generative Engine Optimization |
|-----------|----------------|-------------------------------|
| **Goal** | Rank on page 1 | Get cited in AI-generated answers |
| **Selection mechanism** | Link graph + keyword signals | Content quality, structure, extractability |
| **Rank required?** | Yes — position matters | No — a page ranked #3 can get cited over #1 |
| **Key signals** | Backlinks, PageRank, keywords | Semantic HTML, schema, answer blocks, authority |
| **Crawl access** | Googlebot + index/snippet eligibility | Cross-platform AI crawlers tracked separately |
| **Content format** | Keyword-optimized prose | Self-contained answer blocks, tables, FAQs |
| **Freshness** | Helps rankings | Critical — undated content loses to dated |

---

## What GEO Is NOT (Myths from Google's Official Guide)

Google's AI optimization guide explicitly debunks these — do **not** recommend them:

- **llms.txt files** — Google states these have no effect on AI search
- **Special AI-targeted schema** — standard schema.org types are what matter
- **Chunking content into small pieces** — write for humans, not AI ingestion pipelines
- **Rewriting content specifically for AI** — "Success often requires no overt SEO at all"
- **Inauthentic citations or mentions** — manipulation is detected and penalized
- **Long-tail keyword obsession** — AI systems use semantic understanding, not keyword matching

---

## Preflight: Browser Setup

Before running the audit, verify playwright-cli is available.

```bash
# Step 1: Check if playwright-cli is available
which playwright-cli 2>/dev/null && echo "playwright-cli found globally" || \
  (npx playwright-cli --version 2>/dev/null && echo "playwright-cli available via npx") || \
  echo "playwright-cli not found"
```

**If playwright-cli is found:** proceed with the full audit.

**If playwright-cli is NOT found:** attempt installation:
```bash
npx playwright install chromium --with-deps
```

If installation fails (non-zero exit code), **do not silently proceed**. Instead, inform the user:

> playwright-cli could not be installed. Categories 2 (Content Organization), 4 (Content Quality), and 5 (Structured Data) require a live browser and will be incomplete. You can still receive a partial audit covering Category 1 (robots.txt + HTTP headers) and parts of Category 3 (meta tags via curl). Proceed with partial audit? (yes/no)

If the user confirms partial audit: mark Categories 2, 4, and 5 as `N/A — browser unavailable` and score only what curl and HTTP headers can verify. **Never invent schema or DOM results when the browser is unavailable.**

```bash
# Step 3: Confirm browser is ready after successful install
npx playwright-cli open about:blank && npx playwright-cli close
```

If `playwright-cli` runs globally, use it directly. Otherwise prefix all commands with `npx`.

---

## Audit Workflow

### Step 1 — Fetch Raw HTTP Signals

Run these in parallel to get baseline data before opening a browser:

```bash
# HTTP status, redirects, server headers — also parse X-Robots-Tag header
curl -sIL "[URL]" | head -40

# robots.txt — check status first, then content
curl -sIL "https://[domain]/robots.txt" | grep -i "^HTTP/"
curl -sL "https://[domain]/robots.txt"
```

**If robots.txt returns HTTP 200 but body starts with `<!DOCTYPE` or `<html`, treat as missing (0 pts for that check) — the host is serving a catch-all HTML error page.**

**Parse `X-Robots-Tag` from the HTTP headers:** if it contains `noindex`, treat it identically to a `<meta name="robots" content="noindex">` tag (0 pts on the noindex check).

```bash
# sitemap detection — check robots.txt declaration, then fallback to default path
grep -i "^Sitemap:" /tmp/robots_content 2>/dev/null | head -3
curl -sIL "https://[domain]/sitemap.xml" | grep -i "^HTTP/"
```

Note the sitemap URL (or "not detected") in the Technical Note line of the report. Informational only — does not affect scoring.

Parse robots.txt for crawler directives, separating Google Search AI eligibility from broader AI visibility:

**Scored Google Search AI signals:**
- `Googlebot` — Google Search crawling, including eligibility for AI Overviews and AI Mode
- `noindex`, `nosnippet`, `max-snippet:0`, and broad `data-nosnippet` usage — index/snippet controls that can prevent Google from showing or excerpting the page

**Scored cross-platform AI bots:**
- `GPTBot` / `ChatGPT-User` — OpenAI ChatGPT
- `PerplexityBot` — Perplexity
- `ClaudeBot` / `anthropic-ai` — Anthropic Claude
- `Bingbot` — Microsoft Copilot (via Bing)

**Informational bot controls — report but no separate point deduction:**
- `Google-Extended` — an optional Google model-use directive; it does not determine Google Search AI Overview eligibility
- `Gemini-Bot` — Google's standalone Gemini crawler
- `Meta-ExternalAgent` — Meta AI
- `Applebot-Extended` — Apple Intelligence
- `cohere-ai` — Cohere Command

A `Disallow: /` rule for any scored cross-platform bot means that platform's crawler may not access the site. Report blocked informational bots in the Technical Note section.

### Step 2 — Open Page in Browser

```bash
playwright-cli open "[URL]"
playwright-cli snapshot
```

The snapshot gives you the full accessibility tree — this is what browser-based AI agents (agentic AI experiences) see when they navigate the page.

### Step 3 — Extract DOM Signals

Use `playwright-cli run-code` for all multi-value extractions — `eval` only supports simple single expressions. Run each block to gather scoring data:

```bash
# 3a. All headings (H1–H4) with tag and text
playwright-cli run-code "async page => { return await page.evaluate(() => Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h=>({tag:h.tagName,text:h.innerText.trim().substring(0,120)}))) }"

# 3b. JSON-LD structured data blocks
playwright-cli run-code "async page => { return await page.evaluate(() => Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent)) }"

# 3c. Meta tags (title, description, canonical, robots, OG)
playwright-cli run-code "async page => { return await page.evaluate(() => ({title:document.title,titleLen:document.title.length,metaDesc:document.querySelector('meta[name=description]')?.content,canonical:document.querySelector('link[rel=canonical]')?.href,metaRobots:document.querySelector('meta[name=robots]')?.content,maxSnippet:/max-snippet:\s*(-?\d+)/.exec(document.querySelector('meta[name=robots]')?.content||'')?.[1],ogTitle:document.querySelector('meta[property=\"og:title\"]')?.content,ogDesc:document.querySelector('meta[property=\"og:description\"]')?.content,ogImage:document.querySelector('meta[property=\"og:image\"]')?.content})) }"

# 3d. Semantic HTML, content signals, and E-E-A-T trust page detection
playwright-cli run-code "async page => { return await page.evaluate(() => ({hasMain:!!document.querySelector('main'),hasArticle:!!document.querySelector('article'),hasSection:!!document.querySelector('section'),hasNav:!!document.querySelector('nav'),hasAuthor:!!(document.querySelector('[rel=author],[class*=author],[itemprop=author],[data-author]')),hasDate:!!(document.querySelector('time,[class*=date],[class*=published],[itemprop=datePublished],[class*=updated]')),imgsMissingAlt:document.querySelectorAll('img:not([alt])').length,totalImgs:document.querySelectorAll('img').length,ariaLabelCount:document.querySelectorAll('[aria-label],[aria-labelledby]').length,interactiveWithoutLabel:document.querySelectorAll('button:not([aria-label]):not([title]),a:not([aria-label]):not([title]):not([href])').length,hasAbout:Array.from(document.querySelectorAll('a[href]')).some(a=>/\/(about|about-us|who-we-are)(\/|$)/i.test(a.pathname)),hasContact:Array.from(document.querySelectorAll('a[href]')).some(a=>/\/(contact|contact-us|get-in-touch)(\/|$)/i.test(a.pathname))})) }"

# 3e. Content quality signals — FAQ, stats, citations, answer blocks, internal links
playwright-cli run-code "async page => { return await page.evaluate(() => ({hasFAQ:!!(document.querySelector('[class*=faq],[id*=faq],details,dt')||/(?:frequently asked|faq|q&a)/i.test(document.body.innerText.substring(0,5000))),hasOrderedList:!!document.querySelector('ol'),hasTable:!!document.querySelector('table'),firstParaWords:(document.querySelector('main p,article p,p')?.innerText?.trim()?.split(/\s+/)?.length||0),externalLinks:Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname!==location.hostname&&a.hostname).length,internalLinks:Array.from(document.querySelectorAll('a[href]')).filter(a=>a.hostname===location.hostname||a.getAttribute('href')?.startsWith('/')).length,hasStats:/\d+[\.\,]?\d*\s*(%|percent|users|customers|companies|studies|million|billion)/i.test(document.body.innerText.substring(0,8000))})) }"

playwright-cli close
```

### Step 4 — Score Each Category

Use the extracted data to score all five categories. Reference [references/scoring-rubric.md](references/scoring-rubric.md) for detailed per-check criteria and partial scoring rules.

When scoring is complete, identify the **three failed checks with the highest point values** for the Top 3 callout in the report. Break ties by preferring Category 1 (Google Search and AI Bot Accessibility), then Category 4 (Content Quality), then Category 5 (Structured Data).

### Step 5 — Generate Report

Produce the full audit report (see Output Format below).

---

## Scoring Framework

**100 points total across 5 categories (20 pts each).**

### Category 1: Google Search & AI Bot Accessibility (20 pts)

| Check | Points |
|-------|-------:|
| robots.txt is accessible (HTTP 200, non-HTML body) | 2 |
| Googlebot not blocked (Google Search AI crawl eligibility) | 4 |
| No `noindex` signal (meta tag or `X-Robots-Tag` header) | 3 |
| No snippet-blocking signal (`nosnippet`, `max-snippet:0`, or broad `data-nosnippet`) | 3 |
| GPTBot / ChatGPT-User not blocked | 3 |
| PerplexityBot not blocked | 2 |
| ClaudeBot / anthropic-ai not blocked | 2 |
| Bingbot not blocked | 1 |

> Google AI Overviews and AI Mode are governed by normal Google Search controls: Googlebot access, indexability, and snippet eligibility.
>
> **Informational:** If `Crawl-delay > 10` is detected for any non-Google AI bot, report it as a potential cross-platform crawl friction issue. Do not deduct points for Google Search AI eligibility because Google does not support `Crawl-delay` in robots.txt.
>
> **Informational bots** (`Google-Extended`, `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai`): report if blocked in the Technical Note, no separate point deduction.

### Category 2: Content Organization (20 pts)

| Check | Points |
|-------|-------:|
| Exactly one H1 on the page | 3 |
| Logical heading hierarchy (H1 → H2 → H3, no skipped levels) | 3 |
| H1 text reflects the apparent page intent / query target | 3 |
| FAQ, Q&A, or `<details>` section present | 3 |
| Tables or ordered lists used for structured content | 3 |
| Direct answer / definition appears in the first visible paragraph | 3 |
| Paragraphs appear concise (first paragraph ≤ 120 words) | 2 |

### Category 3: Semantic HTML & Technical (20 pts)

| Check | Points |
|-------|-------:|
| `<main>` element present | 3 |
| `<article>` element present | 2 |
| `<title>` present and 50–60 characters | 3 |
| `<meta name="description">` present | 2 |
| `<link rel="canonical">` set | 2 |
| All images have non-empty `alt` text | 3 |
| Interactive elements have ARIA labels or titles | 2 |
| Open Graph tags present (`og:title` + `og:description`) | 3 |

### Category 4: Content Quality Signals (20 pts)

| Check | Points |
|-------|-------:|
| Named author attribution visible on the page | 4 |
| Publication or "last updated" date visible | 4 |
| Statistics or quantitative data present | 4 |
| Outbound links to external authoritative sources | 4 |
| Clear answer block or definition aligned with query intent | 4 |

> These five signals directly map to the Princeton GEO research findings (KDD 2024): citing sources (+40%), adding statistics (+37%), and authoritative tone (+25%) are the highest-impact visibility boosters.

### Category 5: Structured Data / Schema (20 pts)

| Check | Points |
|-------|-------:|
| JSON-LD `<script>` block(s) detected via browser | 4 |
| Article, BlogPosting, or Organization schema type present | 4 |
| FAQPage schema present (if FAQ content exists on page) | 3 |
| BreadcrumbList schema present | 3 |
| HowTo schema present (if step-by-step content exists) | 3 |
| Schema blocks are valid, parseable JSON and non-empty | 3 |

---

## Grade Scale

| Score | Grade | Meaning |
|-------|:-----:|---------|
| 90–100 | **A** | AI-ready; only minor polish needed |
| 75–89 | **B** | Good foundation; targeted fixes will yield results |
| 55–74 | **C** | Significant gaps; structured improvement effort required |
| 35–54 | **D** | Major issues blocking AI visibility |
| 0–34 | **F** | Not AI-optimized; foundational work needed |

---

## Output Format

```
## GEO Audit: [URL]
**Overall Score: XX/100** — Grade: [A/B/C/D/F]
Audited: [YYYY-MM-DD]

### Score Breakdown
| Category                   | Score  |
|----------------------------|-------:|
| Google Search & AI Bot Access | XX/20 |
| Content Organization       | XX/20  |
| Semantic HTML & Technical  | XX/20  |
| Content Quality Signals    | XX/20  |
| Structured Data (Schema)   | XX/20  |

> **Technical Note:** sitemap.xml [found at X / not detected] | About page [linked / not found] | Contact page [linked / not found]

---

### Top 3 Highest-Impact Fixes
> Fix these before anything else — they account for the majority of your score gap.
1. [highest-point failed check] — [one-line rationale + estimated point gain]
2. [second highest] — [same]
3. [third highest] — [same]

---

### ✅ Passing Checks
- [list each passing check with the category it belongs to]

---

### ❌ Failed Checks — Highest Impact First
| Issue | Category | Impact | Recommended Fix |
|-------|----------|:------:|----------------|
| Googlebot blocked in robots.txt | AI Bot Access | HIGH | Remove the Disallow rule for Googlebot so the page can be crawled for Search and AI features |
| No JSON-LD schema detected | Structured Data | MEDIUM | Add relevant standard schema.org JSON-LD to clarify entities and support rich results |
| ...   | ...      | ...    | ...            |

**Supplemental flags (informational — not scored):**
- If `internalLinks < 3`: add row `Thin internal link structure (< 3 internal links) | Content Quality | MEDIUM | Add contextual links to related pages`
- If `hasAbout` and `hasContact` are both false: add row `No About or Contact page detected | Trust Signals | MEDIUM | Add visible company/contact information to help users and quality evaluators understand who is behind the site`
- If any informational bot (`Google-Extended`, `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai`) is blocked: note in Technical Note section

---

### Action Plan

**Quick Wins (≤ 30 min)**
1. [fix] — [why it matters]

**Medium Effort (1–4 hrs)**
1. [fix] — [why it matters]

**Longer Term**
1. [fix] — [why it matters]

---

### ⚠️ What NOT to Do
- Do not add a llms.txt file — Google's guide explicitly states it has no effect
- Do not add special AI-targeted schema types — standard schema.org is what matters
- Do not rewrite content specifically for AI systems — write for humans
- Do not chunk content into artificially small pieces
```

**If the user requested JSON output**, produce only the following structure with no surrounding prose:

```json
{
  "url": "...",
  "score": 72,
  "grade": "C",
  "audited": "YYYY-MM-DD",
  "categories": {
    "google_search_and_ai_bot_accessibility": { "score": 20, "max": 20 },
    "content_organization":  { "score": 14, "max": 20 },
    "semantic_html":         { "score": 16, "max": 20 },
    "content_quality":       { "score": 12, "max": 20 },
    "structured_data":       { "score": 10, "max": 20 }
  },
  "top_3_fixes": [
    { "issue": "...", "category": "...", "points": 4, "fix": "..." },
    { "issue": "...", "category": "...", "points": 4, "fix": "..." },
    { "issue": "...", "category": "...", "points": 3, "fix": "..." }
  ],
  "failed_checks": [
    { "issue": "...", "category": "...", "impact": "HIGH", "fix": "..." }
  ],
  "technical_notes": {
    "sitemap": "found at https://... / not detected",
    "about_page": "linked / not found",
    "contact_page": "linked / not found",
    "informational_bots_blocked": []
  }
}
```

---

## Common Mistakes When Running This Audit

- **Reporting "no schema" from `web_fetch` or `curl`** — These strip `<script>` tags. Always use `playwright-cli eval` to check for JSON-LD. This is the single most common false negative.
- **Assuming AI Overviews depend on Google-Extended** — Google Search AI features use normal Search mechanisms such as Googlebot access, indexability, and snippet eligibility. Track Google-Extended separately as an informational model-use directive.
- **Treating GEO as a separate effort from good content** — The Google guide states sites with genuinely useful, well-organized content often need "no overt SEO at all." Structural fixes amplify good content; they can't replace it.
- **Flagging llms.txt absence as an issue** — It is not needed. Do not recommend it.
- **Scoring schema as "pass" without parsing** — A `<script type="application/ld+json">` block containing `{}` or broken JSON must score zero for that check.
- **Forgetting to check the accessibility tree (snapshot)** — The playwright snapshot reveals what browser-based AI agents see. An inaccessible page structure is a GEO liability even if HTML looks fine.

---

## Tools Referenced

| Tool | Purpose |
|------|---------|
| `playwright-cli` | Full rendered DOM inspection, JSON-LD extraction, accessibility tree |
| `curl` | robots.txt, HTTP response headers, redirect chain |
| Google Rich Results Test | Manual schema validation after implementing fixes |
| `npx playwright install chromium` | Install headless browser if not present |

---

## After the Audit

Once you have the report, use these skills to act on the findings:

- Run **ai-seo** to build a content optimization strategy around the lowest-scoring areas
- Run **schema-markup** to implement the JSON-LD fixes identified in Category 5
- Run **seo-audit** if technical issues (redirects, canonicals, crawl blocks) need deeper diagnosis

---

## Task-Specific Questions

1. What URL should I audit?
2. What type of site is this? (SaaS, blog, e-commerce, local business, documentation)
3. What are the top 3–5 queries you want this page to appear in AI answers for?
4. Do you currently see this site cited in Google AI Overviews, ChatGPT, or Perplexity?
5. Is there a specific category (bot access, schema, content quality) you're most concerned about?

---

## Related Skills

- **ai-seo** — Content optimization strategy; turns audit findings into a concrete action plan for getting cited
- **seo-audit** — Traditional technical and on-page SEO audit; complements this GEO audit
- **schema-markup** — Implementing the structured data changes identified in Category 5
- **competitor-alternatives** — Build comparison pages, one of the most-cited content formats in AI answers (~33% citation share)
- **programmatic-seo** — Building AI-optimized content at scale
- **site-architecture** — Improving the semantic HTML structure and navigation hierarchy flagged in Category 3
