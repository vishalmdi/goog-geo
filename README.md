# goog-geo — Google AI Search Readiness Audit Skill

A Claude Code skill that audits any website URL for **Google AI Search readiness** — whether your content can be crawled, indexed, excerpted, and cited by AI-powered search systems including Google AI Overviews, ChatGPT, Perplexity, Gemini, and Copilot.

Built directly from [Google's official AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Google's AI features documentation](https://developers.google.com/search/docs/appearance/ai-features), and the [Princeton GEO research (KDD 2024)](https://arxiv.org/abs/2311.09735).

---

## What Is GEO?

Traditional SEO gets you ranked. **GEO gets you cited.**

In traditional search, you need to appear on page 1. In AI search, a well-structured page can get cited in an AI-generated answer even if it ranks third — because AI systems select sources based on content quality, structure, and extractability, not just PageRank.

| Dimension | Traditional SEO | Generative Engine Optimization |
|-----------|----------------|-------------------------------|
| **Goal** | Rank on page 1 | Get cited in AI-generated answers |
| **Selection signal** | Link graph + keywords | Content quality, structure, extractability |
| **Rank required?** | Yes | No — a #3 page can be cited over #1 |
| **Key signals** | Backlinks, PageRank | Semantic HTML, schema, answer blocks, authority |
| **Crawl access** | Googlebot + index/snippet eligibility | Cross-platform AI crawlers tracked separately |
| **Content format** | Keyword-optimized prose | Self-contained answer blocks, tables, FAQs |
| **Freshness** | Helps rankings | Critical — undated content loses to dated |

---

## What This Skill Does

Runs a live browser audit of any URL and produces a **100-point scored GEO report** with:

- A letter grade (A–F)
- Per-category scores across 5 dimensions
- A pass/fail checklist of 28 specific checks
- A prioritized action plan (quick wins → medium effort → longer term)
- An explicit list of things **not** to do (common GEO myths debunked by Google)

### The 5 Scoring Categories

| Category | Points | What It Checks |
|----------|:------:|----------------|
| **Google Search AI Eligibility** | 25 | Googlebot access, HTTP 200, noindex/nosnippet signals, canonical — the three hard gates for Google AI features |
| **Helpful Non-Commodity Content** | 25 | First-hand expertise, intent satisfaction, depth beyond commodity, AI content quality — scored by auditor judgment |
| **Content Organization & Extractability** | 20 | Heading hierarchy, direct answer block, FAQ sections, internal links, query fan-out coverage |
| **Technical Structure & Page Experience** | 15 | `<main>`, `<article>`, title/description, alt text, ARIA, Open Graph |
| **Entity & Enhancement Signals** | 15 | JSON-LD schema, author, publication date, statistics, cross-platform AI bot access |

### Grade Scale

| Score | Grade | Meaning |
|-------|:-----:|---------|
| 90–100 | A | AI-ready; only minor polish needed |
| 75–89 | B | Good foundation; targeted fixes will yield results |
| 55–74 | C | Significant gaps; structured improvement effort required |
| 35–54 | D | Major issues blocking AI visibility |
| 0–34 | F | Not AI-optimized; foundational work needed |

---

## Installation

### Requirements

- [Claude Code](https://claude.ai/code) (CLI or desktop app)
- `playwright-cli` available via `npx` (installed automatically if missing)

### Install the Skill

```bash
# 1. Clone the repo into your skills directory
git clone https://github.com/vishalmdi/goog-geo ~/.agents/skills/goog-geo

# 2. Install dependencies (required for scripts/audit.mjs)
cd ~/.agents/skills/goog-geo && npm install

# 3. Register it with Claude Code
ln -s ../../.agents/skills/goog-geo ~/.claude/skills/goog-geo
```

> **Already have `~/.agents/skills/` set up?** Just run steps 1 and 2 — the symlink structure in step 3 matches how all skills are registered with Claude Code.

### First-Time Browser Setup

The skill uses a headless Chromium browser to inspect the live rendered DOM. Install it via npm:

```bash
cd ~/.agents/skills/goog-geo
npm run install-browser
```

Or manually:

```bash
npx playwright install chromium --with-deps
```

---

## Usage

In any Claude Code session, type:

```
/goog-geo
```

Claude will ask for a URL (or you can pass it directly):

```
/goog-geo https://yoursite.com/your-page
```

Claude will then:
1. Fetch `robots.txt` and HTTP headers
2. Open the URL in a headless browser
3. Extract headings, JSON-LD schema, meta tags, semantic HTML, and content signals
4. Score all 5 categories
5. Return a full GEO report with action plan

### Example Output

```
## Google AI Search Readiness Audit: https://example.com
**Overall Score: 72/100** — Grade: C
Audited: 2026-05-16

### Google AI Search Eligibility: ELIGIBLE
- Googlebot: allowed
- Indexing: allowed
- Snippets: allowed (no blocking directives)

### Score Breakdown
| Category                              | Score  |
|---------------------------------------|-------:|
| Google Search AI Eligibility          | 25/25  |
| Helpful Non-Commodity Content         | 14/25  |
| Content Organization & Extractability | 14/20  |
| Technical Structure & Page Experience | 11/15  |
| Entity & Enhancement Signals          |  8/15  |

### ✅ Passing Checks
- Googlebot not blocked in robots.txt
- Page returns HTTP 200
- No noindex or nosnippet directives
- Single H1 present and matches page intent
...

### ❌ Failed Checks — Highest Impact First
| Issue | Category | Impact | Recommended Fix |
|-------|----------|:------:|----------------|
| Content lacks first-hand expertise signals | Helpful Content | HIGH | Add named author with credentials; include original examples or data |
| No JSON-LD schema detected | Entity Signals | MEDIUM | Add Article + FAQPage schema via JSON-LD |
...

### Quick Wins (≤ 30 min)
1. Add named author attribution with credentials
2. Add publication and last-updated dates
3. Add JSON-LD Article schema
```

---

## What NOT to Do (GEO Myths)

Google's AI optimization guide explicitly debunks these. The skill flags them and will tell you not to do them:

| Myth | Reality |
|------|---------|
| Add a `llms.txt` file | Google states this has no effect on AI search |
| Add special AI-targeted schema | Standard schema.org types are what matter |
| Chunk content into small pieces | Write for humans, not AI ingestion pipelines |
| Rewrite content specifically for AI | "Success often requires no overt SEO at all" |
| Build inauthentic citations | Manipulation is detected and penalized |
| Obsess over long-tail keywords | AI uses semantic understanding, not keyword matching |

---

## How This Was Built

### Grounded in Google's Official Guide

This skill was built from Google's official documentation as the primary source of truth. A key principle from the guide: **the same foundational signals that make content rank well in traditional search also make it citable in AI search.** There is no separate technical path.

Google's AI Overviews and AI Mode use the same crawl, indexing, and ranking systems as traditional Search — with RAG (Retrieval-Augmented Generation) applied on top. The eligibility gates are:

1. **Googlebot access** — the only bot that matters for Google AI features; blocking it blocks all Google AI citation
2. **Indexability** — no `noindex` in meta tags or `X-Robots-Tag` HTTP headers
3. **Snippet eligibility** — no `nosnippet` or `max-snippet:0`; AI Overviews work by excerpting content

Beyond eligibility, content selection skews toward:

4. **Unique, people-first content** — genuinely helpful, non-commodity; "success often requires no overt SEO at all"
5. **Structured, extractable content** — answer blocks, tables, FAQs that AI can pull as self-contained passages
6. **Entity recognition** — schema, author attribution, and dates that help AI systems understand what a page is, who wrote it, and when

### The Princeton GEO Research

The content quality scoring (Category 4) is grounded in the [Princeton GEO research paper](https://arxiv.org/abs/2311.09735) (Aggarwal et al., KDD 2024), which studied visibility across Perplexity.ai and identified the highest-impact optimization methods:

| Method | Visibility Boost |
|--------|:---------------:|
| Cite sources | +40% |
| Add statistics | +37% |
| Add expert quotations | +30% |
| Authoritative tone | +25% |
| Improve clarity | +20% |
| Technical terminology | +18% |
| Keyword stuffing | **−10%** |

The key finding: **low-authority sites benefit most** — adding citations and statistics to a low-ranking page can increase AI visibility by up to 115%.

### Technical Implementation

The skill uses **`playwright-cli`** (the headless browser CLI bundled with Playwright) to inspect the live rendered DOM. This is intentional and important:

- `curl` and `web_fetch` strip `<script>` tags, making them unable to detect JSON-LD schema injected by CMS plugins (Yoast, RankMath, AIOSEO)
- `playwright-cli` loads the full page in a real browser, exposing the complete accessibility tree — which is also what browser-based AI agents see when navigating your site

For automated data collection, the skill also ships `scripts/audit.mjs` — a deterministic Node.js script using the Playwright Node API that collects all DOM signals in a single browser session and outputs JSON. Claude then interprets the JSON and applies the scoring rubric.

### Scoring Design

The 5-category / 100-point framework (25/25/20/15/15) was designed to:
- **Weight the three hard gates highest** (Category 1, 25 pts): Googlebot access, noindex, and nosnippet together can completely prevent Google AI citation; they are weighted accordingly
- **Weight helpful content second** (Category 2, 25 pts): Google explicitly identifies unique, people-first content as the highest-leverage factor; this category requires auditor judgment, not DOM extraction
- **Treat schema as an enhancement, not a gate**: Schema supports rich results and entity clarity but is not required for AI Overviews; framing it as a blocker would be factually incorrect
- **Keep partial scoring at every check**: most real-world pages are somewhere in the middle

---

## Related Skills

If you're using Claude Code with the full skill ecosystem:

| Skill | Use After This Audit |
|-------|---------------------|
| `ai-seo` | Build a content strategy around the audit findings |
| `seo-audit` | Complement with a traditional technical SEO audit |
| `schema-markup` | Implement the JSON-LD fixes from Category 5 |
| `competitor-alternatives` | Build comparison pages (highest-cited content type in AI answers) |
| `programmatic-seo` | Build AI-optimized content at scale |

---

## File Structure

```
goog-geo/
├── SKILL.md                                    # Main skill — loaded by Claude Code
├── package.json                                # Playwright dependency declaration
├── scripts/
│   └── audit.mjs                               # Deterministic data-collection script (outputs JSON)
└── references/
    ├── scoring-rubric.md                       # Detailed per-check scoring criteria and edge cases
    └── google-ai-search-principles.md          # Official guide summary — truth source for scoring
```

---

## References

- [Google Search Central: AI Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Princeton GEO Research — Aggarwal et al., KDD 2024](https://arxiv.org/abs/2311.09735)
- [Google E-E-A-T Guidelines](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Schema.org](https://schema.org)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-05-16 | Repositioned as Google AI Search readiness auditor; corrected factual error (Google-Extended does not gate AI Overviews — Googlebot + noindex/nosnippet do); new 25/25/20/15/15 scoring model reflecting actual Google AI eligibility hierarchy; Category 2 adds qualitative helpful-content judgment; Category 3 adds query fan-out coverage; new `scripts/audit.mjs` for deterministic data collection; new `references/google-ai-search-principles.md` as truth source; eligibility verdict added to report header (ELIGIBLE / AT RISK / BLOCKED / UNKNOWN); schema reframed as enhancement signal, not requirement |
| 1.1.0 | 2026-05-16 | Corrected Google Search AI readiness scoring around Googlebot, indexability, and snippets; added informational bot notes for Google-Extended, Gemini-Bot, Meta-ExternalAgent, Applebot-Extended, and cohere-ai; added robots.txt HTML-body false-positive handling, X-Robots-Tag checks, max-snippet scoring, Top 3 Highest-Impact Fixes, sitemap detection, internal link and trust-page flags, JSON output mode, and preflight fallback warning |
| 1.0.0 | 2026-05-16 | Initial release |

---

## License

MIT
