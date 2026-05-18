#!/usr/bin/env node
/**
 * GEO Audit Data Collector
 *
 * Usage: node scripts/audit.mjs <url>
 * Output: JSON with all signals needed for scoring Categories 1, 3, 4, and 5.
 *         Category 2 (Helpful Non-Commodity Content) requires auditor judgment — not collected here.
 *
 * Requires: npm install (playwright listed in package.json)
 * First run: npm run install-browser
 */

import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export function parseRobotsDirectives(value) {
  const directives = String(value ?? '')
    .toLowerCase()
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  const maxSnippetDirective = directives.find((d) => d.startsWith('max-snippet:'));
  const maxSnippet = maxSnippetDirective
    ? Number.parseInt(maxSnippetDirective.split(':')[1], 10)
    : null;

  return {
    raw: value ?? null,
    directives,
    noindex: directives.includes('noindex'),
    nosnippet: directives.includes('nosnippet'),
    maxSnippet: Number.isNaN(maxSnippet) ? null : maxSnippet,
    snippetBlocked:
      directives.includes('nosnippet') ||
      (!Number.isNaN(maxSnippet) && maxSnippet === 0),
  };
}

function stripRobotsComment(line) {
  return line.replace(/#.*/, '').trim();
}

function robotsRuleToRegex(rulePath) {
  const escaped = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const suffix = escaped.endsWith('$') ? '' : '.*';
  const source = escaped.endsWith('$') ? escaped.slice(0, -1) + '$' : escaped + suffix;
  return new RegExp(`^${source}`);
}

function parseRobotsRecords(text) {
  if (!text) return [];

  const records = [];
  let current = null;
  let sawRules = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripRobotsComment(rawLine);
    if (!line) continue;

    const match = /^([^:]+):\s*(.*)$/i.exec(line);
    if (!match) continue;

    const field = match[1].toLowerCase();
    const value = match[2].trim();

    if (field === 'user-agent') {
      if (!current || sawRules) {
        current = { agents: [], rules: [] };
        records.push(current);
        sawRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if ((field === 'allow' || field === 'disallow') && current) {
      sawRules = true;
      current.rules.push({
        type: field,
        path: value,
        length: value.replace(/\*/g, '').replace(/\$$/, '').length,
      });
    }
  }

  return records;
}

function agentMatches(bot, agent) {
  const normalizedBot = bot.toLowerCase();
  const normalizedAgent = agent.toLowerCase();
  return normalizedAgent === '*' || normalizedBot.includes(normalizedAgent);
}

function specificityFor(bot, agent) {
  return agent === '*' ? 0 : agentMatches(bot, agent) ? agent.length : -1;
}

export function getRobotAccess(text, bot, targetPath = '/') {
  if (!text) {
    return {
      status: 'unknown',
      allowed: null,
      matchedRule: null,
      matchedAgent: null,
    };
  }

  const records = parseRobotsRecords(text);
  let bestAgentSpecificity = -1;
  let candidateRules = [];
  let matchedAgent = null;

  for (const record of records) {
    const matchingAgents = record.agents
      .map((agent) => ({ agent, specificity: specificityFor(bot, agent) }))
      .filter((match) => match.specificity >= 0)
      .sort((a, b) => b.specificity - a.specificity);

    if (!matchingAgents.length) continue;

    const best = matchingAgents[0];
    if (best.specificity > bestAgentSpecificity) {
      bestAgentSpecificity = best.specificity;
      candidateRules = record.rules;
      matchedAgent = best.agent;
    } else if (best.specificity === bestAgentSpecificity) {
      candidateRules = candidateRules.concat(record.rules);
    }
  }

  if (bestAgentSpecificity < 0) {
    return {
      status: 'allowed',
      allowed: true,
      matchedRule: null,
      matchedAgent: null,
    };
  }

  const matchingRules = candidateRules
    .filter((rule) => rule.path !== '')
    .filter((rule) => robotsRuleToRegex(rule.path).test(targetPath))
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      if (a.type === b.type) return 0;
      return a.type === 'allow' ? -1 : 1;
    });

  const matchedRule = matchingRules[0] ?? null;
  const allowed = !matchedRule || matchedRule.type === 'allow';

  return {
    status: allowed ? 'allowed' : 'blocked',
    allowed,
    matchedRule,
    matchedAgent,
  };
}

export function parseRobotsTxt(text, bots, targetPath = '/') {
  return Object.fromEntries(
    bots.map((bot) => [bot, getRobotAccess(text, bot, targetPath).status])
  );
}

export function summarizeSchemas(schemas) {
  return schemas.map((schema, index) => {
    const parsed = schema.parsed;
    const type = parsed?.['@type'] ??
      parsed?.['@graph']?.map((item) => item?.['@type']).filter(Boolean) ??
      null;

    return {
      index,
      valid: schema.valid,
      type,
      rawLength: schema.raw?.length ?? 0,
    };
  });
}

function fetchText(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

function fetchHeaders(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve({
        status: res.statusCode,
        xRobotsTag: res.headers['x-robots-tag'] ?? null,
        location: res.headers['location'] ?? null,
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

export async function collect(url) {
  const { chromium } = await import('playwright');
  const parsed = new URL(url);
  const domain = parsed.hostname;
  const robotsUrl = `${parsed.protocol}//${domain}/robots.txt`;
  const targetPath = `${parsed.pathname || '/'}${parsed.search || ''}`;

  const [pageHeaders, robotsResult] = await Promise.all([
    fetchHeaders(url),
    fetchText(robotsUrl),
  ]);

  const robotsAccessible =
    robotsResult &&
    robotsResult.status === 200 &&
    !robotsResult.body.trimStart().startsWith('<');

  const robotsContent = robotsAccessible ? robotsResult.body : null;

  const bots = [
    'Googlebot',
    'GPTBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'anthropic-ai',
    'Bingbot',
    'Google-Extended',
    'Gemini-Bot',
    'Meta-ExternalAgent',
    'Applebot-Extended',
    'cohere-ai',
  ];

  const botEvidence = Object.fromEntries(
    bots.map((bot) => [bot, getRobotAccess(robotsContent, bot, targetPath)])
  );
  const botAccess = Object.fromEntries(
    Object.entries(botEvidence).map(([bot, result]) => [bot, result.status])
  );

  const sitemapUrl =
    robotsContent?.match(/^Sitemap:\s*(\S+)/mi)?.[1] ?? null;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let navStatus = null;
  let finalUrl = url;
  let navError = null;
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    navStatus = response?.status() ?? null;
    finalUrl = page.url();
  } catch (error) {
    navStatus = 'timeout';
    finalUrl = page.url();
    navError = error.message;
  }

  let dom;
  let schemas;
  let snapshotText = '';
  try {
    dom = await page.evaluate(() => {
      const metaRobots = document.querySelector('meta[name=robots]')?.content ?? null;
      const firstMainNosnippet = document.querySelector('main [data-nosnippet], article [data-nosnippet]');
      return {
        title: document.title,
        titleLen: document.title.length,
        metaDesc: document.querySelector('meta[name=description]')?.content ?? null,
        metaDescLen: document.querySelector('meta[name=description]')?.content?.length ?? 0,
        metaRobots,
        canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
        ogTitle: document.querySelector('meta[property="og:title"]')?.content ?? null,
        ogDesc: document.querySelector('meta[property="og:description"]')?.content ?? null,
        ogImage: document.querySelector('meta[property="og:image"]')?.content ?? null,
        hasMain: !!document.querySelector('main'),
        hasArticle: !!document.querySelector('article'),
        sectionCount: document.querySelectorAll('section').length,
        hasNav: !!document.querySelector('nav'),
        hasAuthor: !!(
          document.querySelector('[rel=author],[class*=author],[itemprop=author],[data-author]') ||
          /written by|by [A-Z][a-z]+ [A-Z][a-z]+/i.test(document.body.innerText.substring(0, 3000))
        ),
        hasDate: !!(
          document.querySelector('time,[class*=date],[class*=published],[itemprop=datePublished],[class*=updated]') ||
          /(?:published|updated|last updated|posted)[\s:]+\w+\s+\d{1,2},?\s+\d{4}/i.test(document.body.innerText.substring(0, 5000))
        ),
        hasUpdatedDate: !!(
          document.querySelector('[class*=updated],[itemprop=dateModified]') ||
          /(?:last updated|updated on)[\s:]+\w+\s+\d{1,2},?\s+\d{4}/i.test(document.body.innerText.substring(0, 5000))
        ),
        imgTotal: document.querySelectorAll('img').length,
        imgsMissingAlt: document.querySelectorAll('img:not([alt])').length,
        ariaLabelCount: document.querySelectorAll('[aria-label],[aria-labelledby]').length,
        unlabeledButtons: document.querySelectorAll('button:not([aria-label]):not([title])').length,
        unlabeledLinks: document.querySelectorAll('a:not([aria-label]):not([title]):not([href])').length,
        h1Count: document.querySelectorAll('h1').length,
        h1Text: document.querySelector('h1')?.innerText?.trim()?.substring(0, 120) ?? null,
        headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map((h) => ({
          tag: h.tagName,
          text: h.innerText.trim().substring(0, 120),
        })),
        hasFAQ: !!(
          document.querySelector('[class*=faq],[id*=faq],details,dt') ||
          /(?:frequently asked|faq|q&a|questions)/i.test(document.body.innerText.substring(0, 5000))
        ),
        hasTable: !!document.querySelector('table'),
        hasOrderedList: !!document.querySelector('ol'),
        firstParaWords: (document.querySelector('main p, article p, p')?.innerText?.trim()?.split(/\s+/)?.length ?? 0),
        firstParaText: document.querySelector('main p, article p, p')?.innerText?.trim()?.substring(0, 300) ?? null,
        visibleTextPreview: document.body.innerText.trim().replace(/\s+/g, ' ').substring(0, 2000),
        internalLinks: Array.from(document.querySelectorAll('a[href]')).filter(
          (a) => a.hostname === location.hostname || a.getAttribute('href')?.startsWith('/')
        ).length,
        externalLinks: Array.from(document.querySelectorAll('a[href]')).filter(
          (a) => a.hostname !== location.hostname && a.hostname
        ).length,
        hasStats: /\d+[\.\,]?\d*\s*(%|percent|users|customers|companies|studies|million|billion|x\s+(?:faster|better|more))/i.test(
          document.body.innerText.substring(0, 8000)
        ),
        hasAboutLink: Array.from(document.querySelectorAll('a[href]')).some(
          (a) => /\/(about|about-us|who-we-are)(\/|$)/i.test(a.pathname)
        ),
        hasContactLink: Array.from(document.querySelectorAll('a[href]')).some(
          (a) => /\/(contact|contact-us|get-in-touch)(\/|$)/i.test(a.pathname)
        ),
        dataNosnippetCount: document.querySelectorAll('[data-nosnippet]').length,
        dataNosnippetInMainContent: !!firstMainNosnippet,
      };
    });

    schemas = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
        try {
          return { raw: s.textContent, parsed: JSON.parse(s.textContent), valid: true };
        } catch {
          return { raw: s.textContent, parsed: null, valid: false };
        }
      })
    );

    const snapshot = await page.accessibility.snapshot();
    snapshotText = JSON.stringify(snapshot ?? {});
  } finally {
    await browser.close();
  }

  const metaRobots = parseRobotsDirectives(dom.metaRobots);
  const headerRobots = parseRobotsDirectives(pageHeaders?.xRobotsTag);
  const schemaSummary = summarizeSchemas(schemas);
  const canonicalMatchesFinalUrl = dom.canonical
    ? new URL(dom.canonical).href === new URL(finalUrl).href
    : false;
  const snippetBlocked =
    metaRobots.snippetBlocked ||
    headerRobots.snippetBlocked ||
    dom.dataNosnippetInMainContent;

  return {
    requestedUrl: url,
    finalUrl,
    redirected: finalUrl !== url,
    navError,
    url,
    domain,
    timestamp: new Date().toISOString(),
    http: {
      pageStatus: navStatus ?? pageHeaders?.status,
      xRobotsTag: pageHeaders?.xRobotsTag ?? null,
      headerRobots,
    },
    robotsTxt: {
      accessible: robotsAccessible,
      status: robotsResult?.status ?? null,
      bodyPreview: robotsContent?.substring(0, 2000) ?? null,
      botAccess,
      botEvidence,
    },
    sitemap: sitemapUrl,
    dom: {
      ...dom,
      metaRobotsParsed: metaRobots,
      canonicalMatchesFinalUrl,
    },
    schemas,
    schemaSummary,
    snapshotWordCount: snapshotText.split(/\s+/).length,
    checks: {
      googlebot_access: {
        status: botAccess.Googlebot === 'blocked' ? 'fail' : botAccess.Googlebot === 'unknown' ? 'unknown' : 'pass',
        evidence: {
          source: 'robots.txt',
          robotsUrl,
          finalUrl,
          targetPath,
          crawler: 'Googlebot',
          result: botEvidence.Googlebot,
        },
        actionPlan: botAccess.Googlebot === 'blocked'
          ? 'Remove the robots.txt rule blocking Googlebot for this URL.'
          : 'No Googlebot block detected for this URL.',
      },
      rendered_page: {
        status: navStatus === 200 ? 'pass' : 'review',
        evidence: {
          source: 'rendered_chromium_dom',
          requestedUrl: url,
          finalUrl,
          navStatus,
          navError,
          renderedTitle: dom.title,
        },
        actionPlan: navStatus === 200
          ? 'No action needed.'
          : 'Review redirects, authentication, consent walls, or page errors seen by Chromium.',
      },
      indexing_allowed: {
        status: metaRobots.noindex || headerRobots.noindex ? 'fail' : 'pass',
        evidence: {
          source: 'rendered_chromium_dom + http_headers',
          metaRobots,
          headerRobots,
        },
        actionPlan: metaRobots.noindex || headerRobots.noindex
          ? 'Remove noindex from the rendered meta robots tag or X-Robots-Tag header.'
          : 'No noindex directive detected.',
      },
      snippets_allowed: {
        status: snippetBlocked ? 'fail' : 'pass',
        evidence: {
          source: 'rendered_chromium_dom + http_headers',
          metaRobots,
          headerRobots,
          dataNosnippetCount: dom.dataNosnippetCount,
          dataNosnippetInMainContent: dom.dataNosnippetInMainContent,
        },
        actionPlan: snippetBlocked
          ? 'Remove nosnippet, max-snippet:0, or data-nosnippet from the core answer content.'
          : 'No snippet-blocking directive detected.',
      },
      canonical_self_reference: {
        status: canonicalMatchesFinalUrl ? 'pass' : 'review',
        evidence: {
          source: 'rendered_chromium_dom',
          finalUrl,
          canonical: dom.canonical,
          canonicalMatchesFinalUrl,
        },
        actionPlan: canonicalMatchesFinalUrl
          ? 'No action needed.'
          : 'Confirm the canonical URL intentionally differs from the final rendered URL.',
      },
      json_ld: {
        status: schemaSummary.some((schema) => schema.valid) ? 'pass' : 'review',
        evidence: {
          source: 'rendered_chromium_dom',
          count: schemas.length,
          summary: schemaSummary,
        },
        actionPlan: schemaSummary.some((schema) => schema.valid)
          ? 'Keep structured data aligned with visible page content.'
          : 'Add valid standard schema.org JSON-LD if rich-result or entity clarity would help.',
      },
    },
  };
}

const url = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!url) {
    console.error('Usage: node scripts/audit.mjs <url>');
    process.exit(1);
  }

  collect(url)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
