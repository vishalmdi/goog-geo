# Google AI Search — Official Principles Reference

A summary of what Google's official documentation actually says about AI Overviews, AI Mode, and content eligibility. This document is the truth source for the scoring model. Before changing any check weight or adding a new check, verify it against these principles.

**Primary sources:**
- [Google Search Central: AI Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search Central: AI Features and Your Website](https://developers.google.com/search/docs/appearance/ai-features)

---

## 1. How Google AI Overviews and AI Mode Work

Google AI Overviews and AI Mode do **not** use a separate technical pipeline from traditional Google Search. They use:

- The same Googlebot crawl
- The same indexing systems
- The same ranking signals (quality, relevance, authority)
- RAG (Retrieval-Augmented Generation) applied on top of the standard ranking results
- Query fan-out: Google generates related sub-queries to find pages that collectively answer the original query

**Implication for scoring:** Any factor that helps a page rank well in traditional Google Search also helps it appear in AI Overviews. There is no hidden AI-specific technical path to optimize for separately.

---

## 2. What Controls Google AI Search Eligibility

Three conditions must all be true for a page to be eligible for Google AI features:

1. **Googlebot can crawl the page** — No `Disallow` rule in robots.txt covering the page for `Googlebot` or `*`. Googlebot is the only bot that matters for Google's own AI features.

2. **The page is indexable** — No `noindex` directive in the `<meta name="robots">` tag or the `X-Robots-Tag` HTTP header. A `noindex` page is invisible to all Google features including AI Overviews.

3. **Snippets are allowed** — No `nosnippet`, `max-snippet:0`, or broad `data-nosnippet` attribute covering the core content. AI Overviews work by excerpting content — blocking snippets prevents citation even when the page is indexed.

If any of these three conditions fails, the page cannot appear in Google AI features regardless of content quality, schema, or any other signal.

---

## 3. What `Google-Extended` Actually Controls

`Google-Extended` is a **model training and grounding directive**, not a Google Search AI eligibility gate.

- Blocking `Google-Extended` in robots.txt may limit how Google uses site content for training Gemini models or for grounding responses in Vertex AI products.
- It does **not** affect whether a page appears in Google AI Overviews or AI Mode in Search.
- The Google AI optimization guide does not recommend adding a `Google-Extended` disallow rule to improve or harm AI search performance.

**Audit handling:** Report `Google-Extended` blocking as informational. Do not score it as a Search AI eligibility signal.

---

## 4. What Schema Does (and Does Not Do)

Schema.org structured data (JSON-LD) serves two purposes:

1. **Rich results eligibility** — Certain schema types (Article, FAQPage, HowTo, BreadcrumbList, Product, etc.) enable enhanced SERP features like FAQ carousels, breadcrumb trails, and rich snippets.

2. **Entity clarity** — Schema helps Google understand what a page is about, who wrote it, when it was published, and how it relates to other entities.

**What schema does NOT do:** Google's documentation does not state that structured data is required for AI Overviews or AI Mode eligibility. It is strong SEO hygiene and supports rich results, but the absence of schema does not prevent a high-quality page from being cited.

**Audit handling:** Score schema as an enhancement signal, not a gate. Language such as "no schema blocks AI visibility" is factually incorrect. Correct framing: "Schema supports rich results and entity clarity; adding it improves the page's eligibility for enhanced SERP features."

---

## 5. The Highest-Leverage Factor

Google's official guide is explicit:

> "Success often requires no overt SEO at all."

The single most impactful long-term factor for AI citation is content that is:
- **Uniquely valuable** — not a rewrite of what any generic AI summary would produce
- **People-first** — written to answer human questions thoroughly, not to satisfy a crawler
- **Non-commodity** — reflects first-hand expertise, original research, or expert judgment

Structural fixes (semantic HTML, schema, internal links) amplify good content but cannot substitute for it. A technically clean page with shallow content will underperform a technically rough page with unique, authoritative content.

---

## 6. Query Fan-Out

When a user submits a query, Google's AI systems generate related sub-queries to find pages that collectively answer the full information need. For example:

- "best project management software" fans out to "PM software pricing," "PM software for teams," "PM software integrations," "Asana vs Monday," etc.

Pages that naturally cover multiple related sub-topics (through H2/H3 sections and body copy) are more likely to be cited across a wider range of AI-generated answers. This is a content organization signal, not a keyword-stuffing opportunity.

---

## 7. What Does NOT Work (Google's Explicit Debunking)

Google's AI optimization guide explicitly states these do not affect AI search eligibility:

| Tactic | Why it doesn't work |
|--------|---------------------|
| `llms.txt` files | Google has stated this has no effect on AI Search |
| Special AI-targeted schema types | Standard schema.org types are what Google uses |
| Chunking content into small pieces | Content should be written for humans, not AI ingestion pipelines |
| Rewriting content specifically for AI | "Success often requires no overt SEO at all" |
| Inauthentic citations or mentions | Manipulation is detected and penalized |
| Long-tail keyword obsession | AI uses semantic understanding, not keyword matching |
| Blocking `Google-Extended` to improve AI performance | Does not affect Search AI features |

---

## 8. Measuring AI Search Impact

Google reports AI feature traffic under the **Web search type** in Search Console. There is no separate "AI Overview" performance report.

To measure impact after making GEO improvements:
- Track impressions and clicks for target query clusters over 90-day windows
- Allow 4–6 weeks after content changes for re-crawl and re-evaluation
- Use Google Analytics to track session quality (time on page, conversion) separately from click volume — AI-cited pages may see fewer but higher-intent clicks
- Compare before/after using Search Console → Performance → Web search type

---

## 9. Cross-Platform AI Bot Access

For citation on non-Google AI platforms (ChatGPT, Perplexity, Claude, Microsoft Copilot), the respective bots must not be blocked in robots.txt:

| Bot | Platform |
|-----|---------|
| `GPTBot`, `ChatGPT-User` | OpenAI ChatGPT |
| `PerplexityBot` | Perplexity |
| `ClaudeBot`, `anthropic-ai` | Anthropic Claude |
| `Bingbot` | Microsoft Copilot (via Bing) |

These are separate from Google's AI eligibility and are scored as an enhancement signal (Category 5), not a Google AI gate.
