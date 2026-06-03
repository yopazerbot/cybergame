import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Breach! — static SPA host + cross-session scoreboard persisted to a Railway volume.
//
// Persistence: scores are written to ${DATA_DIR}/scores.json. On Railway, mount a
// volume and set DATA_DIR to its mount path (e.g. /data) so the board survives
// deploys/restarts. Falls back to ./data locally.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const MAX_STORED = 1000;
const TOP_N = 25;

fs.mkdirSync(DATA_DIR, { recursive: true });

function readScores() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Serialise writes so concurrent submits don't clobber the file.
let writeQueue = Promise.resolve();
function writeScores(scores) {
  writeQueue = writeQueue
    .catch(() => {})
    .then(() => fs.promises.writeFile(SCORES_FILE, JSON.stringify(scores)));
  return writeQueue;
}

const sanitizeName = (n) =>
  String(n ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .trim()
    .slice(0, 24) || 'Anonymous';

const clampNum = (v, lo, hi, dflt) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : dflt;
};

const byScore = (a, b) => b.score - a.score || a.ts - b.ts;

const app = express();
app.use(express.json({ limit: '16kb' }));

// Optional ?mode=with|without filters to one recommendations bucket. Legacy
// entries without the field count as "without" (they were unassisted).
const inBucket = (s, mode) =>
  mode === 'with' ? Boolean(s.recommended) : mode === 'without' ? !s.recommended : true;

app.get('/api/scores', (req, res) => {
  const mode = req.query.mode;
  const scores = readScores()
    .filter((s) => inBucket(s, mode))
    .sort(byScore)
    .slice(0, TOP_N);
  res.json({ scores });
});

app.post('/api/scores', async (req, res) => {
  const b = req.body || {};
  const entry = {
    name: sanitizeName(b.name),
    score: clampNum(b.score, -100000, 1000000, 0),
    ending: String(b.ending ?? '').slice(0, 40),
    difficulty: ['easy', 'normal', 'hard'].includes(b.difficulty) ? b.difficulty : 'normal',
    hoursLeft: clampNum(b.hoursLeft, 0, 10000, 0),
    compliance: clampNum(b.compliance, 0, 100, 0),
    reputation: clampNum(b.reputation, 0, 100, 0),
    recommended: Boolean(b.recommended),
    ts: Date.now(),
  };

  const scores = readScores();
  scores.push(entry);
  scores.sort(byScore);
  const trimmed = scores.slice(0, MAX_STORED);
  await writeScores(trimmed);

  // Rank the player within their own bucket and return that board, so the
  // debrief compares like-for-like (assisted vs unassisted runs don't mix).
  const bucket = trimmed.filter((s) => Boolean(s.recommended) === entry.recommended);
  const rank = bucket.findIndex((s) => s.ts === entry.ts && s.name === entry.name) + 1;
  res.json({ ok: true, rank: rank || null, total: bucket.length, entry, scores: bucket.slice(0, TOP_N) });
});

// Static SPA + history fallback.
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Breach! listening on :${PORT}  (data dir: ${DATA_DIR})`);
});
