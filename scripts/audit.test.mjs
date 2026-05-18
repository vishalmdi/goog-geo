import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRobotAccess,
  parseRobotsDirectives,
  parseRobotsTxt,
  summarizeSchemas,
} from './audit.mjs';

test('robots parser blocks URL-specific disallow rules', () => {
  const robots = `
User-agent: *
Disallow: /private/
`;

  assert.equal(getRobotAccess(robots, 'Googlebot', '/private/page').status, 'blocked');
  assert.equal(getRobotAccess(robots, 'Googlebot', '/public/page').status, 'allowed');
});

test('robots parser prefers the longest matching allow rule', () => {
  const robots = `
User-agent: Googlebot
Disallow: /docs/
Allow: /docs/public/
`;

  const result = getRobotAccess(robots, 'Googlebot', '/docs/public/guide');

  assert.equal(result.status, 'allowed');
  assert.equal(result.matchedRule.type, 'allow');
  assert.equal(result.matchedRule.path, '/docs/public/');
});

test('robots parser prefers specific user-agent group over wildcard group', () => {
  const robots = `
User-agent: *
Disallow: /

User-agent: Googlebot
Allow: /
`;

  assert.equal(getRobotAccess(robots, 'Googlebot', '/').status, 'allowed');
  assert.equal(getRobotAccess(robots, 'GPTBot', '/').status, 'blocked');
});

test('parseRobotsTxt preserves legacy bot status map', () => {
  const robots = `
User-agent: *
Disallow: /blocked
`;

  assert.deepEqual(parseRobotsTxt(robots, ['Googlebot', 'GPTBot'], '/blocked'), {
    Googlebot: 'blocked',
    GPTBot: 'blocked',
  });
});

test('meta robots parser extracts noindex and snippet controls', () => {
  assert.deepEqual(parseRobotsDirectives('noindex, max-snippet:0'), {
    raw: 'noindex, max-snippet:0',
    directives: ['noindex', 'max-snippet:0'],
    noindex: true,
    nosnippet: false,
    maxSnippet: 0,
    snippetBlocked: true,
  });

  assert.equal(parseRobotsDirectives('index, max-snippet:-1').snippetBlocked, false);
  assert.equal(parseRobotsDirectives('nosnippet').snippetBlocked, true);
});

test('schema summarizer extracts top-level and graph types', () => {
  const summary = summarizeSchemas([
    { valid: true, raw: '{"@type":"Article"}', parsed: { '@type': 'Article' } },
    {
      valid: true,
      raw: '{"@graph":[{"@type":"WebPage"},{"@type":"BreadcrumbList"}]}',
      parsed: { '@graph': [{ '@type': 'WebPage' }, { '@type': 'BreadcrumbList' }] },
    },
    { valid: false, raw: '{', parsed: null },
  ]);

  assert.equal(summary[0].type, 'Article');
  assert.deepEqual(summary[1].type, ['WebPage', 'BreadcrumbList']);
  assert.equal(summary[2].valid, false);
});
