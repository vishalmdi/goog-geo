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

import { chromium } from 'playwright';
import https from 'node:https';
import http from 'node:http';

function fetchText(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', () => resolve(null));
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
    req.on('error', () => resolve(null));
    req.end();
  });
}

function parseRobotsTxt(text, bots) {
  if (!text) return Object.fromEntries(bots.map((b) => [b, 'unknown']));
  const lines = text.split('\n').map((l) => l.trim());
  const result = Object.fromEntries(bots.map((b) => [b, 'allowed']));
  let currentAgents = [];

  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      const agent = line.replace(/^user-agent:\s*/i, '').trim();
      if (agent === '*') {
        currentAgents = [...bots];
      } else {
        currentAgents = bots.filter((b) => b.toLowerCase() === agent.toLowerCase());
      }
    } else if (/^disallow:/i.test(line)) {
      const path = line.replace(/^disallow:\s*/i, '').trim();
      if (path === '/' || path === '') {
        for (const a of currentAgents) {
          if (path === '/') result[a] = 'blocked';
        }
      }
    } else if (/^allow:/i.test(line)) {
      const path = line.replace(/^allow:\s*/i, '').trim();
      if (path === '/') {
        for (const a of currentAgents) {
          result[a] = 'allowed';
        }
      }
    }
  }
  return result;
}

async function collect(url) {
  const parsed = new URL(url);
  const domain = parsed.hostname;
  const robotsUrl = `${parsed.protocol}//${domain}/robots.txt`;

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

  const botAccess = parseRobotsTxt(robotsContent, bots);

  const sitemapUrl =
    robotsContent?.match(/^Sitemap:\s*(\S+)/mi)?.[1] ?? null;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let navStatus = null;
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    navStatus = response?.status() ?? null;
  } catch {
    navStatus = 'timeout';
  }

  const dom = await page.evaluate(() => ({
    title: document.title,
    titleLen: document.title.length,
    metaDesc: document.querySelector('meta[name=description]')?.content ?? null,
    metaDescLen: document.querySelector('meta[name=description]')?.content?.length ?? 0,
    metaRobots: document.querySelector('meta[name=robots]')?.content ?? null,
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
  }));

  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
      try {
        return { raw: s.textContent, parsed: JSON.parse(s.textContent), valid: true };
      } catch {
        return { raw: s.textContent, parsed: null, valid: false };
      }
    })
  );

  const snapshot = await page.accessibility.snapshot();
  const snapshotText = JSON.stringify(snapshot ?? {});

  await browser.close();

  return {
    url,
    domain,
    timestamp: new Date().toISOString(),
    http: {
      pageStatus: navStatus ?? pageHeaders?.status,
      xRobotsTag: pageHeaders?.xRobotsTag ?? null,
    },
    robotsTxt: {
      accessible: robotsAccessible,
      bodyPreview: robotsContent?.substring(0, 2000) ?? null,
      botAccess,
    },
    sitemap: sitemapUrl,
    dom,
    schemas,
    snapshotWordCount: snapshotText.split(/\s+/).length,
  };
}

const url = process.argv[2];
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
