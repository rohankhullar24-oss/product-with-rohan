#!/usr/bin/env node
/**
 * Run history: the evidence base for the advisor stage.
 *
 * Without this the advisor is just free-associating about what "could be better."
 * With it, it can say something falsifiable: "the em-dash check has failed 4 of the
 * last 5 runs, so the drafting instruction isn't landing — propose a prompt fix."
 * Improvement suggestions grounded in a trend beat improvement suggestions grounded
 * in vibes, and this file is the difference between the two.
 *
 * Usage:
 *   node history.mjs append --file <record.json>
 *   node history.mjs summary [--last N]
 *
 * Record shape (all fields optional except date):
 *   {
 *     "date": "2026-08-16",
 *     "stages": { "question": "ok", "news": "ok", "blog": "ok",
 *                 "linkedin": "ok", "substack": "ok", "digest": "skipped", "health": "ok" },
 *     "checkFailures": [ { "stage": "blog", "check": "style-emdash", "count": 3 } ],
 *     "retries": { "blog": 1 },
 *     "produced": { "questionType": "product_sense", "newsItems": 3, "blogSlug": "..." },
 *     "notes": "free text"
 *   }
 */

import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = join(HERE, '..', 'run-history.jsonl');

function argOf(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || !process.argv[i + 1] ? fallback : process.argv[i + 1];
}

function load() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function append() {
  const file = argOf('file');
  if (!file || !existsSync(file)) {
    console.error('append needs --file <record.json>');
    process.exit(2);
  }
  const rec = JSON.parse(readFileSync(file, 'utf8'));
  if (!rec.date) {
    console.error('record must have a "date"');
    process.exit(2);
  }
  appendFileSync(LOG, JSON.stringify(rec) + '\n', 'utf8');
  console.log(`appended run ${rec.date} (${load().length} runs on record)`);
}

function summary() {
  const n = parseInt(argOf('last', '8'), 10);
  const all = load();
  const runs = all.slice(-n);

  if (!runs.length) {
    console.log('No run history yet. This is the first tracked run.');
    return;
  }

  console.log(`\n=== Run history: last ${runs.length} of ${all.length} run(s) ===\n`);

  // Stage reliability -------------------------------------------------------
  const stageStats = {};
  for (const r of runs) {
    for (const [stage, status] of Object.entries(r.stages || {})) {
      stageStats[stage] ??= { ok: 0, failed: 0, skipped: 0 };
      if (status === 'ok') stageStats[stage].ok++;
      else if (status === 'skipped') stageStats[stage].skipped++;
      else stageStats[stage].failed++;
    }
  }
  console.log('Stage reliability:');
  for (const [stage, s] of Object.entries(stageStats)) {
    const total = s.ok + s.failed + s.skipped;
    const flag = s.failed >= 2 ? '  <-- recurring failure, worth a proposal' : '';
    console.log(`  ${stage.padEnd(10)} ok:${s.ok}/${total}  failed:${s.failed}  skipped:${s.skipped}${flag}`);
  }

  // Recurring check failures ------------------------------------------------
  const checkCounts = {};
  for (const r of runs) {
    for (const f of r.checkFailures || []) {
      const key = `${f.stage}/${f.check}`;
      checkCounts[key] = (checkCounts[key] || 0) + 1;
    }
  }
  const recurring = Object.entries(checkCounts).sort((a, b) => b[1] - a[1]);
  console.log('\nCheck failures (a check failing repeatedly means the instruction is wrong,');
  console.log('not that the writer got unlucky — that is a prompt bug, propose a fix):');
  if (!recurring.length) console.log('  none recorded');
  // Needs a real sample before calling anything systemic: with 1-2 runs on record,
  // a single failure would otherwise always trip the threshold and cry wolf.
  const MIN_RUNS_FOR_TREND = 3;
  for (const [key, count] of recurring) {
    const systemic = runs.length >= MIN_RUNS_FOR_TREND && count >= Math.ceil(runs.length / 2);
    console.log(`  ${key.padEnd(28)} ${count}/${runs.length} runs${systemic ? '  <-- systemic' : ''}`);
  }
  if (runs.length < MIN_RUNS_FOR_TREND)
    console.log(`  (only ${runs.length} run(s) on record — too few to call any trend yet)`);

  // Content mix -------------------------------------------------------------
  const types = {};
  for (const r of runs) {
    const t = r.produced?.questionType;
    if (t) types[t] = (types[t] || 0) + 1;
  }
  if (Object.keys(types).length) {
    console.log('\nQuestion types covered in this window:');
    console.log('  ' + Object.entries(types).map(([t, c]) => `${t}:${c}`).join('  '));
  }

  const totalRetries = runs.reduce(
    (acc, r) => acc + Object.values(r.retries || {}).reduce((a, b) => a + b, 0),
    0
  );
  console.log(`\nTotal retries across window: ${totalRetries}`);
  if (totalRetries > runs.length)
    console.log('  (more than one retry per run on average — something is consistently off)');

  console.log('');
}

const cmd = process.argv[2];
if (cmd === 'append') append();
else if (cmd === 'summary') summary();
else {
  console.error('Usage: node history.mjs <append|summary> [args]');
  process.exit(2);
}
