---
name: goog-geo
description: "Audits any website URL for Google AI Search readiness based on Google's official AI optimization guide. Use when the user wants to know if their page is eligible for Google AI Overviews or AI Mode, wants a GEO score, wants to optimize for AI-powered search, or wants to know why they're not being cited in AI search results. Scans the live URL using playwright-cli (auto-installs if needed). Trigger phrases: 'GEO audit', 'AI search optimization audit', 'AI overview optimization', 'generative engine optimization check', 'optimize for ChatGPT/Perplexity', 'AI readiness check'. For content strategy to act on audit results, see ai-seo. For traditional technical SEO, see seo-audit. For implementing schema markup fixes, see schema-markup."
metadata:
  version: 2.0.0
---

# Google AI Search Readiness Audit

You are an expert in Google AI Search readiness — the practice of making web content eligible for, discoverable by, and extractable by AI-powered search systems. Your primary reference is Google's official AI optimization guide and AI features documentation. Your goal is to audit a live URL and produce a scored, actionable report grounded in what Google actually says matters — not SEO blog conjecture.

**Before you start:** Read `references/google-ai-search-principles.md` for the canonical summary of Google's official guidance. This document is the truth source that prevents score regression.

---

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

## Google AI Search vs. Traditional SEO

| Dimension | Traditional SEO | Google AI Search (AI Overviews / AI Mode) |
|-----------|----------------|------------------------------------------|
| **Goal** | Rank on page 1 | Get cited in AI-generated answers |
| **Selection mechanism** | Link graph + keyword signals | Content quality, extractability, and the same core ranking systems as Search |
| **Rank required?** | Yes — position matters | No — but Google Search ranking signals still apply |
| **Hard eligibility gates** | Googlebot access, indexability | Same: Googlebot access, no `noindex`, snippet eligibility |
| **Crawl access** | Googlebot | Googlebot (Google AI features); cross-platform bots for other AI systems |
| **Content format** | Keyword-optimized prose | People-first, non-commodity, extractable answers |
| **Freshness** | Helps rankings | Critical — undated content loses to dated |

---

## What Does NOT Work (Myths from Google's Official Guide)

Google's AI optimization guide explicitly debunks these — do **not** recommend them:

- **llms.txt files** — Google states these have no effect on AI search
- **Special AI-targeted schema** — standard schema.org types are what matter; schema is not required for AI Overviews
- **Chunking content into small pieces** — write for humans, not AI ingestion pipelines
- **Rewriting content specifically for AI** — "Success often requires no overt SEO at all"
- **Inauthentic citations or mentions** — manipulation is detected and penalized
- **`Google-Extended` as an AI Overviews gate** — `Google-Extended` is a model-use directive, not an AI Overviews control; `Googlebot` + `noindex`/`nosnippet` are the real gates

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

> playwright-cli could not be installed. Categories 2 (Helpful Content), 3 (Organization & Extractability), 4 (Technical Structure), and 5 (Entity Signals) require a live browser and will be incomplete. You can still receive a partial audit covering Category 1 (Google Search AI Eligibility via robots.txt and HTTP headers). Proceed with partial audit? (yes/no)

If the user confirms partial audit: mark Categories 2–5 as `N/A — browser unavailable` and score only what curl and HTTP headers can verify. **Never invent schema or DOM results when the browser is unavailable.**

```bash
# Confirm browser is ready after successful install
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

Parse robots.txt for crawler directives:

**Scored Google Search AI signals (Category 1):**
- `Googlebot` — Google Search crawling, including eligibility for AI Overviews and AI Mode
- `noindex`, `nosnippet`, `max-snippet:0`, and broad `data-nosnippet` usage — index/snippet controls

**Scored cross-platform AI bots (Category 5):**
- `GPTBot` / `ChatGPT-User` — OpenAI ChatGPT
- `PerplexityBot` — Perplexity
- `ClaudeBot` / `anthropic-ai` — Anthropic Claude
- `Bingbot` — Microsoft Copilot (via Bing)

**Informational bot controls — report in Technical Note, no point deduction:**
- `Google-Extended` — model-use directive; does NOT control Google AI Overviews eligibility
- `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai`

A `Disallow: /` rule for any scored cross-platform bot means that platform's crawler may not access the site.

### Step 2 — Open Page in Browser

```bash
playwright-cli open "[URL]"
playwright-cli snapshot
```

The snapshot gives you the full accessibility tree — this is what browser-based AI agents see when they navigate the page. Also read the first 800 words of visible text from the snapshot for Step 3.5.

### Step 2.5 — Query Fan-Out Analysis

Based on the target queries from Initial Assessment, generate the likely sub-queries Google would expand to via query fan-out. For example, "best CRM software" fans out to "CRM pricing comparison," "CRM for small business," "CRM integrations with email," "CRM vs spreadsheet," etc.

List 6–10 expected sub-queries, then check whether each sub-topic appears naturally in the page headings or body text (from the snapshot). Record which are present and absent. This feeds directly into Category 3 scoring and the Action Plan.

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

### Step 3.5 — Evaluate Content Quality (Category 2)

Read the first 800 words of visible text from the playwright snapshot. Score Category 2 by applying these four questions:

1. Does this content reflect first-hand experience, original research, or expert judgment — or is it a rewrite of what any generic summary would say?
2. After reading this page, would a visitor have their question fully answered, or would they need to search again?
3. Does the content include specific details (exact numbers, named examples, direct quotes, or author opinions) that could only come from direct knowledge?
4. If AI-generated content is present, is it clearly useful and original — or does it add length without adding value?

Note your evidence for each question (quote or paraphrase). Score conservatively — if evidence is mixed, apply the lower tier. Consult the user if the content type is ambiguous (e.g., an "About" page vs. a product comparison page).

### Step 4 — Score Each Category

Use the extracted data and content evaluation to score all five categories. Reference [references/scoring-rubric.md](references/scoring-rubric.md) for detailed per-check criteria and partial scoring rules.

When scoring is complete, identify the **three failed checks with the highest point values** for the Top 3 callout in the report. Break ties by preferring Category 1 (eligibility blockers first — any Googlebot block or noindex/nosnippet outweighs everything else), then Category 2 (content quality).

### Step 5 — Generate Report

Produce the full audit report (see Output Format below).

---

## Scoring Framework

**100 points total across 5 categories.**

### Category 1: Google Search AI Eligibility (25 pts)

These are the hard gates. A page blocked to Googlebot or marked `noindex` cannot appear in AI Overviews regardless of content quality.

| Check | Points |
|-------|-------:|
| Googlebot not blocked in robots.txt | 6 |
| Page returns HTTP 200 (not redirect loop or error) | 2 |
| robots.txt accessible (HTTP 200, non-HTML body) | 2 |
| No `noindex` signal (meta tag or `X-Robots-Tag` header) | 7 |
| No snippet-blocking signal (`nosnippet`, `max-snippet:0`, or `data-nosnippet` over core content) | 6 |
| `<link rel="canonical">` set and pointing to this page | 2 |

> Google AI Overviews and AI Mode use normal Google Search systems — Googlebot access, indexability, and snippet eligibility. There are no additional technical requirements. `Google-Extended` is a model-use directive and does NOT control AI Overviews eligibility.

### Category 2: Helpful Non-Commodity Content (25 pts)

This is the highest-leverage category. Google's guide is explicit: the most important long-term factor is unique, people-first, non-commodity content. This category is scored by judgment from reading the page — no DOM snippet can measure it.

| Check | Points |
|-------|-------:|
| Unique perspective or first-hand expertise (not a rewrite of any generic summary) | 8 |
| Content satisfies visitor intent without leaving them needing to search again | 7 |
| Depth beyond commodity: specific details, original examples, or expert judgment | 6 |
| AI-generated content (if present) is useful and original — not filler that adds length without value | 4 |

> Score conservatively. A page that "covers the topic" but offers no unique insight scores low here. A page with clear first-hand authority, specific evidence, and complete answers scores high.

### Category 3: Content Organization & Extractability (20 pts)

| Check | Points |
|-------|-------:|
| Single H1 matching query intent | 3 |
| Logical heading hierarchy (H1 → H2 → H3, no skipped levels) | 2 |
| Direct answer in first paragraph (≤ 80 words) | 4 |
| FAQ or structured Q&A section present | 3 |
| Tables or ordered lists used for structured content | 2 |
| Internal links ≥ 3 (page is woven into site's link graph) | 3 |
| Query fan-out coverage: ≥ 3 expected sub-topics appear naturally | 3 |

> Query fan-out scoring: 3 pts if ≥ 3 sub-topics present naturally; 2 pts for 2; 1 pt for 1; 0 pts for none. Sub-topics should appear as headings or substantive body sections — not keyword mentions.

### Category 4: Technical Structure & Page Experience (15 pts)

| Check | Points |
|-------|-------:|
| `<main>` element present | 3 |
| `<article>` element (or semantic sectioning) present | 2 |
| `<title>` 50–60 chars + `<meta name="description">` present | 3 |
| All images have non-empty `alt` text | 3 |
| Interactive elements have ARIA labels or titles | 2 |
| Open Graph tags present (`og:title` + `og:description` + `og:image`) | 2 |

### Category 5: Entity & Enhancement Signals (15 pts)

Schema is described here as supporting entity clarity and rich results — it is **not** a hard requirement for AI Overviews. Cross-platform bot access is tracked here as an enhancement signal, not a Google AI eligibility gate.

| Check | Points |
|-------|-------:|
| JSON-LD schema present, parseable, and matching visible page content | 3 |
| Named author attribution visible | 3 |
| Publication or "last updated" date visible | 3 |
| Statistics or quantitative data with source attribution | 3 |
| Cross-platform AI bots not blocked (GPTBot, PerplexityBot, ClaudeBot, Bingbot) | 3 |

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
## Google AI Search Readiness Audit: [URL]
**Overall Score: XX/100** — Grade: [A/B/C/D/F]
Audited: [YYYY-MM-DD]

### Google AI Search Eligibility: [ELIGIBLE / AT RISK / BLOCKED / UNKNOWN]
- Googlebot access: [allowed / blocked]
- Indexing: [allowed / blocked by noindex]
- Snippets: [allowed / blocked by nosnippet or max-snippet:0]

> ELIGIBLE: all three green. AT RISK: one check degraded but not a hard block.
> BLOCKED: any hard block present. UNKNOWN: robots.txt inaccessible or page behind auth.

### Score Breakdown
| Category                              | Score  |
|---------------------------------------|-------:|
| Google Search AI Eligibility          | XX/25  |
| Helpful Non-Commodity Content         | XX/25  |
| Content Organization & Extractability | XX/20  |
| Technical Structure & Page Experience | XX/15  |
| Entity & Enhancement Signals          | XX/15  |

> **Technical Note:** sitemap.xml [found at X / not detected] | About page [linked / not found] | Contact page [linked / not found]

---

### Top 3 Highest-Impact Fixes
> Fix these before anything else — they account for the majority of your score gap.
1. [highest-point failed check] — [one-line rationale + estimated point gain]
2. [second highest] — [same]
3. [third highest] — [same]

---

### ✅ Passing Checks
- [list each passing check with category]

---

### ❌ Failed Checks — Highest Impact First
| Issue | Category | Impact | Recommended Fix |
|-------|----------|:------:|----------------|
| Googlebot blocked in robots.txt | Eligibility | HIGH | Remove Disallow rule for Googlebot — this blocks all Google Search AI features |
| Content is generic / commodity | Helpful Content | HIGH | Add first-hand examples, specific data, or expert opinion that a generic summary cannot replicate |
| ...   | ...      | ...    | ...            |

**Supplemental flags (informational — not scored):**
- If `internalLinks < 3`: flag `Thin internal link structure — add contextual links to related pages`
- If `hasAbout` and `hasContact` both false: flag `No About or Contact page detected — add visible company/contact information`
- If any informational bot (`Google-Extended`, `Gemini-Bot`, `Meta-ExternalAgent`, `Applebot-Extended`, `cohere-ai`) is blocked: note in Technical Note

---

### Query Fan-Out Coverage
**Target queries:** [list from Initial Assessment]
**Expected sub-topics:** [list generated in Step 2.5]
**Present:** [sub-topics found in headings or body]
**Missing:** [sub-topics absent — these are content gap opportunities]

---

### Action Plan

**Quick Wins (≤ 30 min)**
1. [fix] — [why it matters]

**Medium Effort (1–4 hrs)**
1. [fix] — [why it matters]

**Longer Term (content work)**
1. [fix] — [why it matters]

---

### ⚠️ What NOT to Do
- Do not add a llms.txt file — Google's guide explicitly states it has no effect
- Do not add special AI-targeted schema — standard schema.org is what matters; schema is not required for AI Overviews
- Do not rewrite content specifically for AI systems — write for humans
- Do not chunk content into artificially small pieces
- Do not treat Google-Extended as an AI Overviews blocker — Googlebot + noindex/nosnippet are the real gates
```

**If the user requested JSON output**, produce only the following structure with no surrounding prose:

```json
{
  "url": "...",
  "score": 72,
  "grade": "C",
  "audited": "YYYY-MM-DD",
  "eligibility": {
    "verdict": "AT RISK",
    "googlebot": "allowed",
    "indexing": "allowed",
    "snippets": "blocked by nosnippet"
  },
  "categories": {
    "google_search_ai_eligibility":       { "score": 20, "max": 25 },
    "helpful_non_commodity_content":      { "score": 14, "max": 25 },
    "content_organization_extractability":{ "score": 16, "max": 20 },
    "technical_structure":               { "score": 12, "max": 15 },
    "entity_enhancement_signals":        { "score": 10, "max": 15 }
  },
  "top_3_fixes": [
    { "issue": "...", "category": "...", "points": 6, "fix": "..." },
    { "issue": "...", "category": "...", "points": 6, "fix": "..." },
    { "issue": "...", "category": "...", "points": 4, "fix": "..." }
  ],
  "query_fanout": {
    "target_queries": [],
    "expected_subtopics": [],
    "present": [],
    "missing": []
  },
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
- **Treating Google-Extended as an AI Overviews gate** — Google Search AI features are governed by Googlebot access, indexability, and snippet eligibility. Google-Extended is a model-use directive and does not control AI Overviews. Never penalize a site for blocking Google-Extended.
- **Scoring schema as a hard AI requirement** — Schema supports entity clarity and rich results. Google is explicit: it is not required for AI Overviews or AI Mode. Note it as an enhancement, not a blocker.
- **Scoring Category 2 too generously** — The helpful-content judgment is the hardest and most consequential. A page that "covers the topic" without unique insight should score low. Only give full marks when the content clearly could not be replaced by a generic AI summary.
- **Flagging llms.txt absence as an issue** — It is not needed. Do not recommend it.
- **Scoring schema as "pass" without parsing** — A `<script type="application/ld+json">` block containing `{}` or broken JSON must score zero for that check.
- **Forgetting to check the accessibility tree (snapshot)** — The playwright snapshot reveals what browser-based AI agents see. An inaccessible page structure is a GEO liability even if HTML looks fine.

---

## Tools Referenced

| Tool | Purpose |
|------|---------|
| `playwright-cli` | Full rendered DOM inspection, JSON-LD extraction, accessibility tree |
| `scripts/audit.mjs` | Deterministic data collection script (run once, outputs JSON) |
| `curl` | robots.txt, HTTP response headers, redirect chain |
| Google Rich Results Test | Manual schema validation after implementing fixes |
| `npm run install-browser` | Install headless browser (`npx playwright install chromium`) |

---

## After the Audit

Once you have the report, use these skills to act on the findings:

- Run **ai-seo** to build a content strategy around the lowest-scoring areas
- Run **schema-markup** to implement the JSON-LD improvements identified in Category 5
- Run **seo-audit** if technical issues (redirects, canonicals, crawl blocks) need deeper diagnosis

### Measuring AI Search Impact

Google reports AI feature traffic in Search Console under the **Web search type** — there is no separate "AI Overview" report. To measure impact:
- Track impressions and clicks for the target query clusters over 90-day windows
- Compare before/after content changes (allow 4–6 weeks for re-crawl and re-evaluation)
- Use Google Analytics to track session quality (time on page, bounce rate, conversion) separately from click volume — AI-cited pages may see fewer but higher-intent clicks
- Do not expect a dedicated AI Overview performance report; use the Web search type filter

---

## Task-Specific Questions

1. What URL should I audit?
2. What type of site is this? (SaaS, blog, e-commerce, local business, documentation)
3. What are the top 3–5 queries you want this page to appear in AI answers for?
4. Do you currently see this site cited in Google AI Overviews, ChatGPT, or Perplexity?
5. Is there a specific category you're most concerned about?

---

## Agent Readiness Check (Optional — Not Scored)

If the user is concerned about AI agent experiences (Google AI Mode with web browsing, agentic AI workflows), run these additional checks beyond the 100-pt score:

- **Playwright snapshot:** does the accessibility tree expose all key content? Content hidden behind JS interactions, modals, or infinite scroll is invisible to agents.
- **Interaction paths:** can an agent click through to purchase, sign up, or find key information without being blocked by CAPTCHAs or login gates?
- **Forms and CTAs:** do they have clear `aria-label` attributes and descriptive button text?
- **Media:** do videos have visible transcripts? Are images described well enough for a text-only agent?

Report findings as a qualitative "Agent Readiness" note in the report — not a scored section.

---

## Related Skills

- **ai-seo** — Content optimization strategy; turns audit findings into a concrete action plan
- **seo-audit** — Traditional technical and on-page SEO audit; complements this readiness audit
- **schema-markup** — Implementing the structured data improvements identified in Category 5
- **competitor-alternatives** — Build comparison pages, one of the most-cited content formats in AI answers
- **programmatic-seo** — Building AI-optimized content at scale
- **site-architecture** — Improving the semantic HTML structure and navigation hierarchy
