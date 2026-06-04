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
const SCORES_TMP = path.join(DATA_DIR, 'scores.json.tmp');
const MAX_STORED = 1000;
const TOP_N = 25;

fs.mkdirSync(DATA_DIR, { recursive: true });

function readScores() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // ENOENT is normal on first run; anything else (e.g. a truncated/corrupt
    // file) is surfaced so a silent "board is empty" doesn't look like data loss.
    if (err && err.code !== 'ENOENT') {
      console.error(`[scores] could not read ${SCORES_FILE}:`, err.message);
    }
    return [];
  }
}

// Serialise writes so concurrent submits don't clobber the file, and write
// atomically (temp file + rename) so a crash mid-write can't truncate the board.
let writeQueue = Promise.resolve();
function writeScores(scores) {
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await fs.promises.writeFile(SCORES_TMP, JSON.stringify(scores));
      await fs.promises.rename(SCORES_TMP, SCORES_FILE);
    })
    .catch((err) => {
      // A failing write is the whole bug ("scores don't persist") — never swallow it.
      console.error(`[scores] FAILED to write ${SCORES_FILE}:`, err.message);
    });
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

// Score-model version: only entries from the current model appear, which cleanly
// resets the boards when scoring changed (legacy unbounded scores are hidden).
const SCORE_V = 2;

const app = express();
app.use(express.json({ limit: '16kb' }));

// Boards are split by recommendations bucket (?rec=with|without) AND by campaign
// (?campaign=defender|attacker), and only show the current score model.
const matches = (s, rec, campaign) =>
  s.v === SCORE_V &&
  (!rec || (rec === 'with' ? Boolean(s.recommended) : !s.recommended)) &&
  (!campaign || (s.campaign || 'defender') === campaign);

app.get('/api/scores', (req, res) => {
  const { rec, campaign } = req.query;
  const scores = readScores()
    .filter((s) => matches(s, rec, campaign))
    .sort(byScore)
    .slice(0, TOP_N);
  res.json({ scores });
});

app.post('/api/scores', async (req, res) => {
  const b = req.body || {};
  const entry = {
    name: sanitizeName(b.name),
    score: clampNum(b.score, 0, 100, 0),
    grade: String(b.grade ?? '').slice(0, 2),
    headline: String(b.headline ?? '').slice(0, 24),
    campaign: b.campaign === 'attacker' ? 'attacker' : 'defender',
    ending: String(b.ending ?? '').slice(0, 40),
    difficulty: ['easy', 'normal', 'hard'].includes(b.difficulty) ? b.difficulty : 'normal',
    hoursLeft: clampNum(b.hoursLeft, 0, 10000, 0),
    compliance: clampNum(b.compliance, 0, 100, 0),
    reputation: clampNum(b.reputation, 0, 100, 0),
    recommended: Boolean(b.recommended),
    v: SCORE_V,
    ts: Date.now(),
  };

  const scores = readScores();
  scores.push(entry);
  scores.sort(byScore);
  const trimmed = scores.slice(0, MAX_STORED);
  await writeScores(trimmed);

  // Rank the player within their own board (same campaign + recommendations bucket).
  const bucket = trimmed.filter((s) => matches(s, entry.recommended ? 'with' : 'without', entry.campaign));
  const rank = bucket.findIndex((s) => s.ts === entry.ts && s.name === entry.name) + 1;
  res.json({ ok: true, rank: rank || null, total: bucket.length, entry, scores: bucket.slice(0, TOP_N) });
});

// Diagnostics: confirm where data lives and whether it is actually writable +
// persisting. Hit /api/health after a redeploy — if `count` keeps growing across
// deploys, the volume is mounted correctly; if it resets to 0, DATA_DIR is NOT on
// a persistent volume (check the Railway volume's mount path == DATA_DIR).
app.get('/api/health', (_req, res) => {
  let writable = false;
  try {
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    scoresFile: SCORES_FILE,
    scoresFileExists: fs.existsSync(SCORES_FILE),
    writable,
    count: readScores().length,
    scoreVersion: SCORE_V,
    usingDefaultDir: !process.env.DATA_DIR,
  });
});

// Static SPA + history fallback.
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  let writable = false;
  try {
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }
  console.log(`Breach! listening on :${PORT}`);
  console.log(
    `[scores] dataDir=${DATA_DIR} writable=${writable} ` +
      `existingScores=${readScores().length} usingDefaultDir=${!process.env.DATA_DIR}`,
  );
  if (!process.env.DATA_DIR) {
    console.warn(
      '[scores] DATA_DIR is not set — using a NON-persistent local dir. ' +
        'On Railway, set DATA_DIR to your volume mount path (e.g. /data).',
    );
  }
});
