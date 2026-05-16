# goog-geo — GEO Audit Claude Skill

A Claude Code skill that audits any website URL for **Generative Engine Optimization (GEO)** — the practice of making your content discoverable, extractable, and citable by AI-powered search systems like Google AI Overviews, ChatGPT, Perplexity, Gemini, and Copilot.

Built directly from [Google's official AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and the [Princeton GEO research (KDD 2024)](https://arxiv.org/abs/2311.09735).

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
| **Crawl bots** | Googlebot | Google-Extended, GPTBot, PerplexityBot, ClaudeBot |
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
| **AI Bot Accessibility** | 20 | robots.txt rules for Google-Extended, GPTBot, PerplexityBot, ClaudeBot, and more |
| **Content Organization** | 20 | Heading hierarchy, FAQ sections, answer blocks, concise paragraphs |
| **Semantic HTML & Technical** | 20 | `<main>`, `<article>`, title length, canonical, alt text, ARIA, Open Graph |
| **Content Quality Signals** | 20 | Author attribution, dates, statistics, external citations, answer blocks |
| **Structured Data / Schema** | 20 | JSON-LD presence, Organization/Article/FAQPage schema, BreadcrumbList |

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

# 2. Register it with Claude Code
ln -s ../../.agents/skills/goog-geo ~/.claude/skills/goog-geo
```

> **Already have `~/.agents/skills/` set up?** Just run step 1 — the symlink structure in step 2 matches how all skills are registered with Claude Code.

### First-Time Browser Setup

The skill uses a headless Chromium browser to inspect the live rendered DOM. On first run it will auto-install if needed, but you can also do it manually:

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
## GEO Audit: https://example.com
**Overall Score: 72/100** — Grade: C
Audited: 2026-05-16

### Score Breakdown
| Category                   | Score  |
|----------------------------|-------:|
| AI Bot Accessibility       | 20/20  |
| Content Organization       | 14/20  |
| Semantic HTML & Technical  | 16/20  |
| Content Quality Signals    | 12/20  |
| Structured Data (Schema)   | 10/20  |

### ✅ Passing Checks
- All AI crawlers allowed in robots.txt
- Single H1 present and matches page intent
...

### ❌ Failed Checks — Highest Impact First
| Issue | Category | Impact | Recommended Fix |
|-------|----------|:------:|----------------|
| No JSON-LD schema detected | Structured Data | HIGH | Add Organization + FAQPage schema |
...

### Quick Wins (≤ 30 min)
1. Fix page title length (currently 12 chars — expand to 50–60)
2. Add Organization JSON-LD schema block
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

### Inspired by Google's Official Guide

This skill was built from the ground up using [Google's AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) as the primary source of truth. The guide makes a clear and important point: **the same foundational signals that make content rank well in traditional search also make it citable in AI search** — with a few additional considerations around content extractability and entity structure.

The key insight from the guide is that Google's AI Overviews use the same core ranking systems as traditional Search (including RAG — Retrieval-Augmented Generation), but content selection for AI answers skews further toward:

1. **Structured, extractable content** — answer blocks, tables, and FAQs that AI can pull as self-contained passages
2. **Semantic clarity** — semantic HTML (`<main>`, `<article>`, proper heading hierarchy) that helps AI systems identify what the main content actually is
3. **Entity recognition** — structured data (JSON-LD schema) that tells AI systems exactly what a page is about, who wrote it, and when
4. **Crawler access** — distinct bots for each AI platform (`Google-Extended`, `GPTBot`, `PerplexityBot`, `ClaudeBot`) that must not be blocked

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
- Complex DOM extractions use `playwright-cli run-code` (not `eval`) for multi-value object/array returns

### Scoring Design

The 5-category / 100-point framework was designed to:
- Weight **AI bot accessibility** and **structured data** heavily, since these are binary blockers (a site blocked in robots.txt or with no schema gets zero for those checks regardless of content quality)
- Treat **N/A checks** generously (FAQPage and HowTo schema are auto-awarded if the content type doesn't apply, avoiding penalizing pages for not having content types they don't need)
- Keep partial scoring possible at every check, since most real-world pages are somewhere in the middle

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
├── SKILL.md                    # Main skill — loaded by Claude Code
└── references/
    └── scoring-rubric.md       # Detailed per-check scoring criteria and edge cases
```

---

## References

- [Google Search Central: AI Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Princeton GEO Research — Aggarwal et al., KDD 2024](https://arxiv.org/abs/2311.09735)
- [Google E-E-A-T Guidelines](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Schema.org](https://schema.org)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## License

MIT
