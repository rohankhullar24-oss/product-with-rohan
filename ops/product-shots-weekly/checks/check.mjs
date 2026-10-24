#!/usr/bin/env node
/**
 * Deterministic pre-publish checks for the Product Shots weekly content pipeline.
 *
 * Every check here is mechanical: string matching, regex, arithmetic, HTTP status.
 * Nothing in this file asks a model for a judgment. That is the point — these are
 * the failure modes that have actually bitten this pipeline before (a disposable
 * address killing a whole send, a Handbook mention surviving into a published post,
 * Substack reporting PENDING for a post that was already live), and every one of
 * them is catchable without inference.
 *
 * Usage:
 *   node check.mjs blog        --file <post.md> --blogdir <dir> [--date YYYY-MM-DD]
 *   node check.mjs social      --platform substack|linkedin --file <text.txt> --ctalog <log.md>
 *                              [--blogurl <url>] [--noanswer <answer_markdown.txt>]
 *   node check.mjs recipients  --file <payload.json>
 *   node check.mjs news        --file <items.json> --existing <urls.json>
 *   node check.mjs published   --url <url> --expect "<substring>"
 *   node check.mjs teardown    --file <entry.json> --tsfile <path/to/teardowns.ts> [--date YYYY-MM-DD]
 *
 * Exit code 0 = all checks passed. 1 = at least one FAIL. 2 = bad invocation.
 * WARN lines never affect the exit code; they are advisory.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

// ---------------------------------------------------------------------------
// tiny result collector
// ---------------------------------------------------------------------------

const results = [];
const fail = (check, msg) => results.push({ level: 'FAIL', check, msg });
const warn = (check, msg) => results.push({ level: 'WARN', check, msg });
const pass = (check, msg = '') => results.push({ level: 'PASS', check, msg });

function report(stage) {
  const failures = results.filter((r) => r.level === 'FAIL');
  const warnings = results.filter((r) => r.level === 'WARN');
  const passes = results.filter((r) => r.level === 'PASS');

  console.log(`\n=== ${stage} checks ===`);
  for (const r of results) {
    if (r.level === 'PASS') continue;
    console.log(`  [${r.level}] ${r.check}: ${r.msg}`);
  }
  console.log(
    `\n  ${passes.length} passed, ${warnings.length} warning(s), ${failures.length} failure(s)`
  );
  if (failures.length) {
    console.log(`\n  RESULT: BLOCKED — do not publish. Fix the failures above and re-run.`);
    process.exit(1);
  }
  console.log(`\n  RESULT: OK to publish.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// shared constants
// ---------------------------------------------------------------------------

// Handbook mentions are allowed again everywhere except LinkedIn (reversed 2026-09-20).
// checkBanned() is only called with these substrings from the LinkedIn branch of
// checkSocial(); blog/teardown/digest no longer call checkBanned() for this reason.
const BANNED_SUBSTRINGS = [/handbook/i];

// Disposable / temp-mail domains. The 2026-07-11 incident (ezimb.com) silently killed
// an entire bcc'd digest, so this list is a hard blocker, not a warning.
const DISPOSABLE_EXACT = new Set([
  'ezimb.com',
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'sharklasers.com',
  'getnada.com',
  'maildrop.cc',
  'tempmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'dispostable.com',
  'mohmal.com',
  'moakt.com',
  'emailondeck.com',
  'mailnesia.com',
]);
const DISPOSABLE_PATTERNS = [/temp/i, /trash/i, /fake/i, /disposable/i, /throwaway/i, /minutemail/i];
const TEST_DOMAINS = [/(^|\.)example\.(com|org|net)$/i, /(^|\.)test$/i, /(^|\.)invalid$/i, /(^|\.)localhost$/i];

const REQUIRED_URLS = {
  shots: 'https://productwithrohan.online/productshot/dashboard',
  unsubscribe: 'https://productwithrohan.online/unsubscribe',
};

const LIMITS = { substack: 500, linkedin: 3000 };

const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','to','of','in','on','for','with','at','by','from','is','are',
  'it','its','this','that','you','your','i','we','our','as','be','been','was','were','so','than',
  'then','there','here','what','how','why','when','who','which','not','no','yes','do','does','did',
  'have','has','had','can','could','would','should','will','just','about','into','out','up','down',
]);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function argOf(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (required) {
      console.error(`Missing required argument --${name}`);
      process.exit(2);
    }
    return null;
  }
  return process.argv[i + 1];
}

function readOrDie(path) {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(2);
  }
  return readFileSync(path, 'utf8');
}

function tokenize(s) {
  return new Set(
    s
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

async function urlStatus(url, timeoutMs = 12000) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ProductShotsLinkCheck/1.0)' },
      });
      return { ok: res.ok, status: res.status, res };
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    const head = await attempt('HEAD');
    // Plenty of servers (and most CDNs fronting news sites) reject HEAD outright.
    // A 4xx/5xx on HEAD is not proof the page is dead, so re-check with GET.
    if (head.status === 405 || head.status === 403 || head.status >= 500) return await attempt('GET');
    return head;
  } catch {
    try {
      return await attempt('GET');
    } catch (e) {
      return { ok: false, status: 0, error: String(e?.message || e) };
    }
  }
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: null, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: raw.slice(m[0].length), rawFm: m[1] };
}

const unquote = (s) => (s || '').replace(/^["']|["']$/g, '');

function checkBanned(text, label) {
  for (const re of BANNED_SUBSTRINGS) {
    const hit = text.match(re);
    if (hit) fail('banned-content', `${label} mentions "${hit[0]}" (discontinued — must never be published)`);
  }
  if (!results.some((r) => r.check === 'banned-content' && r.level === 'FAIL')) {
    pass('banned-content');
  }
}

// ---------------------------------------------------------------------------
// blog
// ---------------------------------------------------------------------------

async function checkBlog() {
  const file = argOf('file');
  const blogdir = argOf('blogdir');
  const expectDate = argOf('date', false);
  const raw = readOrDie(file);
  const slug = basename(file).replace(/\.md$/, '');

  const { fm, body } = parseFrontmatter(raw);

  // --- frontmatter shape -------------------------------------------------
  if (!fm) {
    fail('frontmatter', 'no YAML frontmatter block found');
  } else {
    for (const key of ['title', 'description', 'date']) {
      if (!fm[key]) fail('frontmatter', `missing required field: ${key}`);
      else if (!/^".*"$/.test(fm[key]))
        fail('frontmatter', `${key} must be wrapped in double quotes (got: ${fm[key].slice(0, 40)})`);
    }
    const date = unquote(fm.date);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
      fail('frontmatter', `date must be YYYY-MM-DD (got: ${date})`);
    if (expectDate && date && date !== expectDate)
      fail('frontmatter', `date is ${date} but this run's date is ${expectDate}`);
    if (unquote(fm.title || '').includes('"'))
      fail('frontmatter', 'title contains an unescaped double quote — will break the YAML parse');
    if (!results.some((r) => r.check === 'frontmatter' && r.level === 'FAIL')) pass('frontmatter');
  }

  // --- slug collision ----------------------------------------------------
  if (existsSync(blogdir)) {
    const siblings = readdirSync(blogdir).filter((f) => f.endsWith('.md') && f !== basename(file));
    if (siblings.includes(`${slug}.md`)) fail('slug-collision', `${slug}.md already exists in ${blogdir}`);
    else pass('slug-collision');

    // --- internal links must point at posts that exist -------------------
    const internal = [...body.matchAll(/https:\/\/productwithrohan\.online\/blogs\/([a-z0-9-]+)/g)];
    const known = new Set(siblings.map((f) => f.replace(/\.md$/, '')).concat(slug));
    let badInternal = 0;
    for (const [, target] of internal) {
      if (!known.has(target)) {
        fail('internal-links', `links to /blogs/${target} but no such post exists`);
        badInternal++;
      }
    }
    if (!badInternal) pass('internal-links', `${internal.length} internal link(s) resolve`);
    if (internal.length === 0) warn('internal-links', 'no interlinks to existing posts (SEO opportunity missed)');
  } else {
    warn('slug-collision', `blogdir ${blogdir} not readable — skipped collision + internal link checks`);
  }

  // Handbook ban lifted for blog 2026-09-20 (LinkedIn-only now, see checkSocial).
  pass('banned-content', 'Handbook restriction no longer applies to blog');

  // --- house style (the humanizer rules that are mechanically checkable) --
  const emDashes = (body.match(/[—–]/g) || []).length;
  if (emDashes > 0) fail('style-emdash', `${emDashes} em/en dash(es) found — house style bans them`);
  else pass('style-emdash');

  // Explicit escapes: literal smart-quote characters in this regex get normalized
  // to ASCII by some editors, which turns the check into a false positive on every
  // ordinary apostrophe.
  const curly = (body.match(/[“”‘’]/g) || []).length;
  if (curly > 0) warn('style-quotes', `${curly} curly quote(s) — prefer straight quotes`);
  else pass('style-quotes');

  const emoji = body.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  if (emoji) fail('style-emoji', `emoji found in body (${emoji.slice(0, 3).join(' ')}) — not house style`);
  else pass('style-emoji');

  // --- length ------------------------------------------------------------
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 1200) fail('length', `${words} words — below the 1200 floor`);
  else if (words > 4000) warn('length', `${words} words — unusually long, check it isn't padded`);
  else pass('length', `${words} words`);

  // --- structure ---------------------------------------------------------
  const headers = (body.match(/^##\s+/gm) || []).length;
  if (headers < 3) fail('structure', `only ${headers} section header(s) — needs at least 3`);
  else pass('structure', `${headers} sections`);

  // --- markdown link syntax ---------------------------------------------
  const dangling = body.match(/\]\([^)]*\s[^)]*\)/g);
  if (dangling) warn('link-syntax', `${dangling.length} markdown link(s) contain a space in the URL`);

  // --- raw HTML tags instead of markdown syntax --------------------------
  // Every prior post uses [text](url) links; a model occasionally writes
  // <a href="...">text</a> instead, which the renderer may not treat as a
  // clickable link. Catch any raw HTML tag in the body, not just <a>, since
  // the same mistake could show up as <b>, <div>, etc.
  const rawHtml = body.match(/<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?>/gi);
  if (rawHtml) fail('raw-html', `${rawHtml.length} raw HTML tag(s) found in body (e.g. ${rawHtml[0]}) — use markdown syntax instead, e.g. [text](url) for links`);
  else pass('raw-html');

  // --- external links resolve -------------------------------------------
  const urls = [
    ...new Set(
      [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1])
    ),
  ].filter((u) => !u.includes('productwithrohan.online'));

  if (!urls.length) {
    warn('external-links', 'no external sources cited');
  } else {
    const checked = await Promise.all(urls.map(async (u) => ({ u, ...(await urlStatus(u)) })));
    const dead = checked.filter((c) => c.status === 404 || c.status === 410);
    const unreachable = checked.filter((c) => c.status === 0);
    for (const d of dead) fail('external-links', `${d.u} returned ${d.status}`);
    for (const u of unreachable) warn('external-links', `${u.u} unreachable (${u.error || 'timeout'}) — verify manually`);
    if (!dead.length) pass('external-links', `${checked.length} link(s) checked, none dead`);
  }

  // --- embedded images (e.g. a teardown infographic) must resolve 200 ----
  // Markdown image syntax is `![alt](url)`, distinct from a link `[text](url)`
  // by the leading `!`. A broken infographic upload is a hard fail, not a
  // warn, because an image is the entire point of a teardown post.
  const imageUrls = [
    ...new Set([...body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1])),
  ];
  if (imageUrls.length) {
    const checkedImgs = await Promise.all(imageUrls.map(async (u) => ({ u, ...(await urlStatus(u)) })));
    const broken = checkedImgs.filter((c) => c.status !== 200);
    for (const b of broken) fail('image-urls', `${b.u} did not return 200 (got ${b.status || b.error || 'no response'})`);
    if (!broken.length) pass('image-urls', `${checkedImgs.length} embedded image(s), all resolve 200`);
  }

  report('blog');
}

// ---------------------------------------------------------------------------
// teardown (infographic-only entry in src/content/teardowns.ts, 2026-08-15)
// ---------------------------------------------------------------------------
// Teardowns stopped being blog articles: as of 2026-08-15 a teardown is one
// entry appended to the `teardowns` array in src/content/teardowns.ts plus a
// PNG in Supabase Storage. There is no markdown body to run the `blog` check
// against, so this is a dedicated, much smaller gate for the entry object
// itself: shape, slug collision, and the image actually resolving 200.
async function checkTeardown() {
  const file = argOf('file'); // JSON: {slug, company, eyebrow, headline, dek, image, publishedDate}
  const tsfile = argOf('tsfile');
  const expectDate = argOf('date', false);
  const entry = JSON.parse(readOrDie(file));

  const REQUIRED_FIELDS = ['slug', 'company', 'eyebrow', 'headline', 'dek', 'image', 'publishedDate'];
  const missing = REQUIRED_FIELDS.filter((k) => !entry[k]);
  if (missing.length) fail('shape', `entry missing field(s): ${missing.join(', ')}`);
  else pass('shape', 'all required fields present');

  if (entry.slug && !/^[a-z0-9-]+$/.test(entry.slug))
    fail('shape', `slug "${entry.slug}" must be lowercase kebab-case`);

  if (entry.publishedDate && !/^\d{4}-\d{2}-\d{2}$/.test(entry.publishedDate))
    fail('shape', `publishedDate must be YYYY-MM-DD (got: ${entry.publishedDate})`);
  else if (expectDate && entry.publishedDate && entry.publishedDate !== expectDate)
    fail('shape', `publishedDate is ${entry.publishedDate} but this run's date is ${expectDate}`);

  // --- slug collision against teardowns.ts --------------------------------
  if (existsSync(tsfile)) {
    const tsRaw = readFileSync(tsfile, 'utf8');
    const slugs = [...tsRaw.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
    if (entry.slug && slugs.includes(entry.slug))
      fail('slug-collision', `slug "${entry.slug}" already exists in ${tsfile}`);
    else pass('slug-collision');
  } else {
    warn('slug-collision', `${tsfile} not readable — collision not verified`);
  }

  // Handbook ban lifted for teardown 2026-09-20 (LinkedIn-only now, see checkSocial).
  pass('banned-content', 'Handbook restriction no longer applies to teardown');

  // --- house style on the two prose-ish fields ------------------------------
  const prose = [entry.headline, entry.dek].filter(Boolean).join('\n');
  const emDashes = (prose.match(/[—–]/g) || []).length;
  if (emDashes > 0) fail('style-emdash', `${emDashes} em/en dash(es) in headline/dek`);
  else pass('style-emdash');

  // --- infographic must actually resolve 200 --------------------------------
  // The whole deliverable is the image; a broken link here is the equivalent
  // of the blog check's image-urls gate, just against a single known field
  // instead of scanning markdown for `![...]()`.
  if (entry.image) {
    const r = await urlStatus(entry.image);
    if (r.status !== 200) fail('image-url', `${entry.image} did not return 200 (got ${r.status || r.error || 'no response'})`);
    else pass('image-url', 'infographic resolves 200');
  }

  report('teardown');
}

// ---------------------------------------------------------------------------
// social (substack note / linkedin post)
// ---------------------------------------------------------------------------

function checkSocial() {
  const platform = argOf('platform');
  const file = argOf('file');
  const ctalog = argOf('ctalog', false);
  const blogUrl = argOf('blogurl', false);
  const noAnswerFile = argOf('noanswer', false); // e.g. Note 2: the Shots teaser must never leak answer_markdown
  const text = readOrDie(file).trim();

  if (!LIMITS[platform]) {
    console.error(`--platform must be one of: ${Object.keys(LIMITS).join(', ')}`);
    process.exit(2);
  }

  // --- hard character limit ---------------------------------------------
  // Substack rejects >500 outright and posts nothing, so this is a blocker.
  const len = [...text].length;
  if (len > LIMITS[platform]) fail('length', `${len} chars exceeds the ${platform} limit of ${LIMITS[platform]}`);
  else if (platform === 'substack' && len > 490) warn('length', `${len} chars — very close to the 500 ceiling`);
  else pass('length', `${len}/${LIMITS[platform]} chars`);

  // --- required URLs present verbatim -----------------------------------
  if (!text.includes(REQUIRED_URLS.shots)) fail('required-urls', `missing the Product Shots URL (${REQUIRED_URLS.shots})`);
  else pass('required-urls', 'Product Shots link present');

  if (blogUrl) {
    if (!text.includes(blogUrl)) fail('required-urls', `missing this run's blog URL (${blogUrl})`);
    else pass('required-urls', 'blog link present');
  }

  // --- banned content ------------------------------------------------------
  // Handbook is allowed again everywhere except LinkedIn (reversed 2026-09-20) — this
  // is now the ONLY surface still gated on it.
  if (platform === 'linkedin') checkBanned(text, `${platform} post`);
  else pass('banned-content', `Handbook restriction only applies to linkedin, not ${platform}`);

  // --- answer leak guard (Note 2: Shots teaser must never contain the answer) --
  // Deterministic stand-in for "did we accidentally give the answer away":
  // split the answer into sentences and fail on any near-verbatim (normalized,
  // >=40 char) sentence appearing in the note text. Not semantic, but it
  // reliably catches copy-pasting from answer_markdown, which is the actual
  // failure mode here.
  if (noAnswerFile && existsSync(noAnswerFile)) {
    const answer = readFileSync(noAnswerFile, 'utf8');
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
    const noteNorm = norm(text);
    const sentences = answer.split(/(?<=[.!?])\s+|\r?\n+/).map((s) => s.trim()).filter((s) => s.length >= 40);
    const leaked = sentences.filter((s) => noteNorm.includes(norm(s)));
    if (leaked.length) fail('answer-leak', `note contains ${leaked.length} sentence(s) from answer_markdown — the answer must only ever live on the website`);
    else pass('answer-leak', 'no answer_markdown sentence found in the note');
  } else if (noAnswerFile) {
    warn('answer-leak', `${noAnswerFile} not readable — leak not verified`);
  }

  // --- platform conventions ---------------------------------------------
  const tags = (text.match(/#\w+/g) || []).length;
  if (platform === 'substack' && tags > 0) fail('hashtags', `${tags} hashtag(s) — Substack notes must have none`);
  else if (platform === 'linkedin' && (tags < 3 || tags > 5)) fail('hashtags', `${tags} hashtag(s) — LinkedIn wants 3 to 5`);
  else pass('hashtags');

  const emDashes = (text.match(/[—–]/g) || []).length;
  if (emDashes > 0) fail('style-emdash', `${emDashes} em/en dash(es) — the clearest AI tell on social`);
  else pass('style-emdash');

  // --- CTA novelty vs the log -------------------------------------------
  // Deterministic stand-in for "is this phrasing too similar": token-overlap
  // against recent logged CTA lines. Not semantic, but it reliably catches the
  // actual failure mode, which is near-verbatim reuse.
  if (ctalog && existsSync(ctalog)) {
    const recent = readFileSync(ctalog, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith('- 20'))
      .slice(0, 3);
    const mine = tokenize(text);
    let worst = 0;
    let worstLine = '';
    for (const line of recent) {
      const score = jaccard(mine, tokenize(line));
      if (score > worst) {
        worst = score;
        worstLine = line;
      }
    }
    if (worst >= 0.6)
      fail('cta-novelty', `${(worst * 100).toFixed(0)}% token overlap with a recent CTA: "${worstLine.slice(0, 90)}"`);
    else if (worst >= 0.45)
      warn('cta-novelty', `${(worst * 100).toFixed(0)}% overlap with a recent CTA — consider a fresher angle`);
    else pass('cta-novelty', `max ${(worst * 100).toFixed(0)}% overlap with last ${recent.length} entries`);
  } else {
    warn('cta-novelty', 'no CTA log supplied — novelty not verified');
  }

  report(platform);
}

// ---------------------------------------------------------------------------
// recipients (the highest-stakes check in the pipeline)
// ---------------------------------------------------------------------------

function checkRecipients() {
  const file = argOf('file');
  const payload = JSON.parse(readOrDie(file));
  const { recipients = [], unsubscribes = [], batches = [], warmupStart, today, body = '', headers = {} } = payload;

  const norm = (e) => String(e || '').trim().toLowerCase();
  const domainOf = (e) => norm(e).split('@')[1] || '';

  const recips = recipients.map(norm).filter(Boolean);
  const unsubs = new Set(unsubscribes.map(norm).filter(Boolean));

  // --- unsubscribe exclusion (compliance line — never soften this) -------
  const leaked = recips.filter((r) => unsubs.has(r));
  if (leaked.length) fail('unsubscribe-exclusion', `${leaked.length} unsubscribed address(es) in the send list — HARD STOP`);
  else pass('unsubscribe-exclusion', `${recips.length} recipients, zero overlap with ${unsubs.size} unsubscribes`);

  // --- disposable domains -----------------------------------------------
  const disposable = recips.filter((r) => {
    const d = domainOf(r);
    return DISPOSABLE_EXACT.has(d) || DISPOSABLE_PATTERNS.some((p) => p.test(d));
  });
  if (disposable.length)
    fail(
      'disposable-domains',
      `${disposable.length} disposable address(es) present (${disposable.map(domainOf).join(', ')}) — one of these silently killed the 2026-07-11 send`
    );
  else pass('disposable-domains');

  // --- test / fixture accounts ------------------------------------------
  const testAccounts = recips.filter((r) => TEST_DOMAINS.some((p) => p.test(domainOf(r))));
  if (testAccounts.length) fail('test-accounts', `${testAccounts.length} test/fixture address(es) present`);
  else pass('test-accounts');

  // --- malformed addresses ----------------------------------------------
  const malformed = recips.filter((r) => !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(r));
  if (malformed.length) fail('address-format', `${malformed.length} malformed address(es): ${malformed.slice(0, 3).join(', ')}`);
  else pass('address-format');

  // --- duplicates --------------------------------------------------------
  const dupes = recips.length - new Set(recips).size;
  if (dupes > 0) fail('duplicates', `${dupes} duplicate address(es) — someone would get the digest twice`);
  else pass('duplicates');

  // --- batching matches the warm-up ramp --------------------------------
  if (warmupStart && today) {
    const days = Math.floor((new Date(today) - new Date(warmupStart)) / 86400000);
    const ramp =
      days <= 6 ? { size: 5, gap: 180 }
      : days <= 13 ? { size: 10, gap: 120 }
      : days <= 20 ? { size: 20, gap: 90 }
      : days <= 27 ? { size: 30, gap: 60 }
      : { size: 40, gap: 45 };

    if (days > 45) warn('warmup', `${days} days since last reset — if sends lapsed 30+ days, reset warmup_start_date first`);

    const oversized = batches.filter((b) => b.length > ramp.size);
    if (oversized.length)
      fail('batch-size', `${oversized.length} batch(es) exceed the day-${days} cap of ${ramp.size}`);
    else pass('batch-size', `day ${days}: cap ${ramp.size}/send, ${batches.length} batch(es)`);

    const batched = batches.flat().map(norm);
    const missing = recips.filter((r) => !batched.includes(r));
    const extra = batched.filter((b) => !recips.includes(b));
    if (missing.length) fail('batch-coverage', `${missing.length} recipient(s) not in any batch`);
    if (extra.length) fail('batch-coverage', `${extra.length} address(es) in batches but not in the recipient list`);
    if (!missing.length && !extra.length) pass('batch-coverage', 'every recipient batched exactly once');

    console.log(`  (expected gap between batches: ${ramp.gap} minutes)`);
  } else {
    warn('batch-size', 'warmupStart/today not supplied — ramp not verified');
  }

  // --- body + headers ----------------------------------------------------
  if (!body.includes(REQUIRED_URLS.unsubscribe)) fail('unsubscribe-link', 'email body has no unsubscribe link');
  else pass('unsubscribe-link');

  const lu = headers['List-Unsubscribe'] || '';
  const lup = headers['List-Unsubscribe-Post'] || '';
  if (!lu.includes(REQUIRED_URLS.unsubscribe)) fail('list-unsubscribe-header', 'List-Unsubscribe header missing or wrong');
  else if (!/One-Click/i.test(lup)) fail('list-unsubscribe-header', 'List-Unsubscribe-Post one-click header missing');
  else pass('list-unsubscribe-header');

  // Handbook ban lifted for digest email 2026-09-20 (LinkedIn-only now, see checkSocial).
  pass('banned-content', 'Handbook restriction no longer applies to digest email');

  report('recipients');
}

// ---------------------------------------------------------------------------
// news
// ---------------------------------------------------------------------------

async function checkNews() {
  const file = argOf('file');
  const existingFile = argOf('existing', false);
  const items = JSON.parse(readOrDie(file));
  const existing = new Set(existingFile ? JSON.parse(readOrDie(existingFile)) : []);

  const VALID = new Set(['ai', 'corporate', 'jobs']);

  // Staleness thresholds, in days. `jobs` gets a longer window than `ai`/`corporate`:
  // on a weekly cadence a fresh layoff/hiring story often does not exist in any given
  // 7-day slice, while a hiring trend stays relevant far longer than a model release.
  const MAX_AGE = { ai: 7, corporate: 7, jobs: 14 };
  const overrideAll = argOf('maxage', false);
  const overrideJobs = argOf('maxage-jobs', false);
  if (overrideAll) for (const k of Object.keys(MAX_AGE)) MAX_AGE[k] = parseInt(overrideAll, 10);
  if (overrideJobs) MAX_AGE.jobs = parseInt(overrideJobs, 10);
  const today = new Date(argOf('today', false) || new Date().toISOString().slice(0, 10));

  if (!Array.isArray(items) || items.length < 3) fail('count', `${items?.length ?? 0} items — need at least 3`);
  else pass('count', `${items.length} items`);

  const seen = new Set();
  for (const [i, it] of items.entries()) {
    const tag = `item[${i}]`;
    if (!VALID.has(it.category)) fail('category', `${tag} category "${it.category}" violates the DB check constraint`);
    if (!it.title || !it.summary || !it.source_url) fail('required-fields', `${tag} missing title/summary/source_url`);
    if (existing.has(it.source_url)) fail('url-collision', `${tag} ${it.source_url} is already in news_items`);
    if (seen.has(it.source_url)) fail('url-collision', `${tag} duplicate URL within this batch`);
    seen.add(it.source_url);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.published_date || '')) {
      fail('date-format', `${tag} published_date must be YYYY-MM-DD`);
    } else {
      // Format alone proved insufficient: on 2026-08-08 three stories (Coinbase, Nike,
      // a PM hiring report) surfaced under "August 2026" searches while actually dating
      // from April-June. Aggregators and layoff trackers routinely present months-old
      // news as current, and only a real date comparison catches that.
      const ageDays = Math.floor((today - new Date(it.published_date)) / 86400000);
      const limit = MAX_AGE[it.category] ?? 7;
      if (ageDays > limit)
        fail('staleness', `${tag} is ${ageDays} days old (${it.published_date}); limit for "${it.category}" is ${limit}`);
      else if (ageDays < 0)
        fail('staleness', `${tag} published_date ${it.published_date} is in the future`);
    }
    if (it.summary && it.summary.split(/\s+/).length < 25) warn('summary-depth', `${tag} summary is very short`);
    if (it.title && it.title.length > 160) warn('title-length', `${tag} title is unusually long`);
  }

  const cats = new Set(items.map((i) => i.category));
  if (cats.size < 2) warn('category-mix', `all items are "${[...cats][0]}" — the brief asks for a spread`);
  else pass('category-mix', `${cats.size} categories represented`);

  // Live URL check — the one thing that catches a fabricated source.
  const statuses = await Promise.all(items.map(async (it) => ({ it, ...(await urlStatus(it.source_url)) })));
  for (const s of statuses) {
    if (s.status === 404 || s.status === 410) fail('url-live', `${s.it.source_url} returned ${s.status} — dead or invented`);
    else if (s.status === 0) warn('url-live', `${s.it.source_url} unreachable — verify manually before insert`);
  }
  if (!results.some((r) => r.check === 'url-live' && r.level === 'FAIL')) pass('url-live');
  if (!results.some((r) => r.check === 'staleness' && r.level === 'FAIL'))
    pass('staleness', `all within limits (ai/corporate ${MAX_AGE.ai}d, jobs ${MAX_AGE.jobs}d)`);

  if (!items.some((i) => i.positive === true))
    warn('positivity', 'no item flagged positive:true — the brief requires at least one genuinely good-news story');

  report('news');
}

// ---------------------------------------------------------------------------
// published (post-publish render verification)
// ---------------------------------------------------------------------------

async function checkPublished() {
  const url = argOf('url');
  const expect = argOf('expect');

  const r = await urlStatus(url, 20000);
  if (!r.ok) {
    fail('reachable', `${url} returned ${r.status || 'no response'}${r.error ? ` (${r.error})` : ''}`);
    report('published');
    return;
  }
  pass('reachable', `${url} → ${r.status}`);

  let html = '';
  try {
    html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  } catch (e) {
    fail('render', `could not read body: ${e.message}`);
    report('published');
    return;
  }

  // A 200 is not proof of a render — Next.js will happily serve a 200 shell for a
  // route that failed to build its content. Assert the actual title is in the HTML.
  const needle = expect.toLowerCase();
  const hay = html.toLowerCase().replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  if (!hay.includes(needle)) fail('render', `page loaded but "${expect.slice(0, 60)}" is not in the HTML`);
  else pass('render', 'expected title found in served HTML');

  if (/404|not found|page could not be found/i.test(html.slice(0, 4000)) && !hay.includes(needle))
    fail('render', 'page looks like a 404 shell');

  if (html.length < 2000) fail('render', `served HTML is only ${html.length} bytes — likely an error page`);
  else pass('render-size', `${(html.length / 1024).toFixed(0)}kb served`);

  report('published');
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

const stage = process.argv[2];
const table = {
  blog: checkBlog,
  social: checkSocial,
  recipients: checkRecipients,
  news: checkNews,
  published: checkPublished,
  teardown: checkTeardown,
};

if (!table[stage]) {
  console.error(`Usage: node check.mjs <${Object.keys(table).join('|')}> [args]`);
  process.exit(2);
}
await table[stage]();
