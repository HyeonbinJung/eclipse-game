// ECLIPSE 게임 서버: 정적 파일(dist) + 계정/세이브 REST API + PvP WebSocket
// 실행: node server/index.mjs  (PORT 환경변수, 기본 4173)
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(ROOT, '..', 'dist');
const PORT = +(process.env.PORT || 4173);
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });

// ---------------- DB ----------------
const db = new DatabaseSync(path.join(ROOT, 'data', 'eclipse.db'));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at INTEGER NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS chars (
  user_id INTEGER NOT NULL, slot INTEGER NOT NULL, name TEXT, class_id TEXT, level INTEGER, data TEXT NOT NULL, updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, slot)
);
CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, a INTEGER, b INTEGER, winner INTEGER, reason TEXT, at INTEGER);
`);
const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT id, username, rating, wins, losses, created_at FROM users WHERE id = ?'),
  addUser: db.prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)'),
  addSession: db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)'),
  session: db.prepare('SELECT user_id, expires FROM sessions WHERE token = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  chars: db.prepare('SELECT slot, name, class_id AS classId, level, updated_at AS updatedAt FROM chars WHERE user_id = ? ORDER BY slot'),
  char: db.prepare('SELECT data, updated_at AS updatedAt FROM chars WHERE user_id = ? AND slot = ?'),
  putChar: db.prepare(`INSERT INTO chars (user_id, slot, name, class_id, level, data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, slot) DO UPDATE SET name = excluded.name, class_id = excluded.class_id, level = excluded.level, data = excluded.data, updated_at = excluded.updated_at`),
  delChar: db.prepare('DELETE FROM chars WHERE user_id = ? AND slot = ?'),
  setRating: db.prepare('UPDATE users SET rating = ?, wins = wins + ?, losses = losses + ? WHERE id = ?'),
  addMatch: db.prepare('INSERT INTO matches (a, b, winner, reason, at) VALUES (?, ?, ?, ?, ?)'),
  topPvp: db.prepare('SELECT username, rating, wins, losses FROM users WHERE wins + losses > 0 ORDER BY rating DESC LIMIT 20'),
  topLevel: db.prepare('SELECT u.username, c.name, c.class_id AS classId, c.level FROM chars c JOIN users u ON u.id = c.user_id ORDER BY c.level DESC, c.updated_at ASC LIMIT 20'),
};

const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function newSession(uid) { const token = crypto.randomBytes(32).toString('hex'); q.addSession.run(token, uid, Date.now() + 30 * 864e5); return token; }
function auth(token) {
  if (!token) return null; const s = q.session.get(token);
  if (!s || s.expires < Date.now()) return null; return q.userById.get(s.user_id);
}

// ---------------- HTTP ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };
const hits = new Map(); // 간단한 IP 기준 요청 제한
function limited(ip, key, max, winMs) {
  const k = ip + key, now = Date.now(); const h = hits.get(k) || { n: 0, t: now };
  if (now - h.t > winMs) { h.n = 0; h.t = now; } h.n++; hits.set(k, h); return h.n > max;
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function body(req, max = 600_000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('bad json')); } });
  });
}
const USER_RE = /^[0-9A-Za-z가-힣_]{2,16}$/;

async function api(req, res, url) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const p = url.pathname;
  try {
    if (p === '/api/register' && req.method === 'POST') {
      if (limited(ip, 'reg', 10, 3600_000)) return send(res, 429, { error: '잠시 후 다시 시도하세요.' });
      const { username, password } = await body(req, 2000);
      if (!USER_RE.test(username || '')) return send(res, 400, { error: '아이디는 2~16자의 한글/영문/숫자/_ 만 가능합니다.' });
      if (typeof password !== 'string' || password.length < 6 || password.length > 64) return send(res, 400, { error: '비밀번호는 6~64자여야 합니다.' });
      if (q.userByName.get(username)) return send(res, 409, { error: '이미 사용 중인 아이디입니다.' });
      const salt = crypto.randomBytes(16).toString('hex');
      const r = q.addUser.run(username, hash(password, salt), salt, Date.now());
      const uid = Number(r.lastInsertRowid);
      return send(res, 200, { token: newSession(uid), user: q.userById.get(uid) });
    }
    if (p === '/api/login' && req.method === 'POST') {
      if (limited(ip, 'login', 20, 600_000)) return send(res, 429, { error: '로그인 시도가 너무 많습니다. 10분 후 다시 시도하세요.' });
      const { username, password } = await body(req, 2000);
      const u = q.userByName.get(String(username || ''));
      if (!u || !crypto.timingSafeEqual(Buffer.from(hash(String(password || ''), u.salt), 'hex'), Buffer.from(u.pass_hash, 'hex'))) return send(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return send(res, 200, { token: newSession(u.id), user: q.userById.get(u.id) });
    }
    if (p === '/api/leaderboard') return send(res, 200, { pvp: q.topPvp.all(), level: q.topLevel.all() });
    const user = auth(token);
    if (!user) return send(res, 401, { error: '로그인이 필요합니다.' });
    if (p === '/api/logout' && req.method === 'POST') { q.delSession.run(token); return send(res, 200, { ok: true }); }
    if (p === '/api/me') return send(res, 200, { user });
    if (p === '/api/chars' && req.method === 'GET') return send(res, 200, { chars: q.chars.all(user.id) });
    const m = p.match(/^\/api\/chars\/([0-2])$/);
    if (m) {
      const slot = +m[1];
      if (req.method === 'GET') { const c = q.char.get(user.id, slot); return c ? send(res, 200, { data: JSON.parse(c.data), updatedAt: c.updatedAt }) : send(res, 404, { error: '빈 슬롯' }); }
      if (req.method === 'DELETE') { q.delChar.run(user.id, slot); return send(res, 200, { ok: true }); }
      if (req.method === 'PUT') {
        if (limited(ip + user.id, 'save', 120, 60_000)) return send(res, 429, { error: 'too many saves' });
        const { data } = await body(req);
        if (!data || typeof data !== 'object' || !data.classId) return send(res, 400, { error: '잘못된 세이브' });
        const level = Math.max(1, Math.min(50, data.level | 0));
        const name = String(data.name || '').slice(0, 16);
        const prev = q.char.get(user.id, slot);
        if (prev && (data.lastSavedAt || 0) < prev.updatedAt - 1000) return send(res, 409, { error: '서버에 더 최신 세이브가 있습니다.', updatedAt: prev.updatedAt });
        const at = Math.max(Date.now(), data.lastSavedAt || 0);
        q.putChar.run(user.id, slot, name, String(data.classId).slice(0, 12), level, JSON.stringify(data), at);
        return send(res, 200, { ok: true, updatedAt: at });
      }
    }
    return send(res, 404, { error: 'not found' });
  } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
}

const server = http.createServer(async (req, res) => {
  let url, fp;
  try { url = new URL(req.url, 'http://x'); fp = path.join(DIST, decodeURIComponent(url.pathname)); } catch { res.writeHead(400); return res.end(); }
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  // 정적 파일 (SPA)
  if (!fp.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) fp = path.join(DIST, 'index.html');
  if (!fs.existsSync(fp)) { res.writeHead(500); return res.end('dist 폴더가 없습니다. 먼저 npm run build 를 실행하세요.'); }
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' || fp.endsWith('sw.js') ? 'no-cache' : 'public, max-age=31536000, immutable' });
  fs.createReadStream(fp).on('error', () => res.end()).pipe(res);
});
process.on('uncaughtException', (e) => console.error('[uncaught]', e));
process.on('unhandledRejection', (e) => console.error('[unhandled]', e));

// ---------------- PvP ----------------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32_000 });
const queue = []; const rooms = new Map(); const matches = new Map(); let MID = 1;
const L = (x) => Math.max(1, Math.min(50, x | 0));
function clampSnap(s, user) {
  const lv = L(s.level);
  const atkB = 18 + 2.1 * (lv - 1) + 0.045 * (lv - 1) ** 2, hpB = 120 + 18 * (lv - 1) + 0.28 * (lv - 1) ** 2, defB = 4 + 0.95 * lv;
  return {
    name: String(s.name || user.username).slice(0, 16), user: user.username, rating: user.rating, classId: String(s.classId || 'blade').slice(0, 10),
    look: { frame: (s.look?.frame | 0) % 132, tint: (s.look?.tint >>> 0) & 0xffffff, ...(typeof s.look?.char === 'string' ? { char: s.look.char.replace(/[^a-z0-9_]/g, '').slice(0, 24) } : {}) }, level: lv,
    atk: Math.min(Math.max(1, s.atk | 0), Math.round(atkB * 2.6 + 40)), def: Math.min(Math.max(0, s.def | 0), Math.round(defB * 2.6 + 60)), maxHp: Math.min(Math.max(50, s.maxHp | 0), Math.round(hpB * 2.2 + 300)),
  };
}
const sendWs = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
function leaveQueue(ws) { const i = queue.indexOf(ws); if (i >= 0) queue.splice(i, 1); for (const [c, r] of rooms) if (r === ws) rooms.delete(c); }
function startMatch(a, b) {
  leaveQueue(a); leaveQueue(b);
  const id = MID++; const arena = Math.floor(Math.random() * 5) + 1;
  const m = { id, p: [a, b], hp: [1, 1], started: Date.now() + 3000, ends: Date.now() + 3000 + 120_000, done: false };
  matches.set(id, m); a.match = m; b.match = m; a.side = 0; b.side = 1;
  sendWs(a, { t: 'match', id, side: 0, opp: b.snap, me: a.snap, arena, startIn: 3000, duration: 120_000 });
  sendWs(b, { t: 'match', id, side: 1, opp: a.snap, me: b.snap, arena, startIn: 3000, duration: 120_000 });
  m.timer = setTimeout(() => endMatch(m, m.hp[0] === m.hp[1] ? -1 : m.hp[0] > m.hp[1] ? 0 : 1, 'timeout'), 3000 + 120_000 + 500);
}
function endMatch(m, winner, reason) {
  if (m.done) return; m.done = true; clearTimeout(m.timer); matches.delete(m.id);
  const [a, b] = m.p; const ua = q.userById.get(a.user.id), ub = q.userById.get(b.user.id);
  const ea = 1 / (1 + 10 ** ((ub.rating - ua.rating) / 400)); const sa = winner === -1 ? 0.5 : winner === 0 ? 1 : 0; const K = 32;
  const da = Math.round(K * (sa - ea)), db2 = -da;
  if (a.user.id !== b.user.id) {
    q.setRating.run(ua.rating + da, winner === 0 ? 1 : 0, winner === 1 ? 1 : 0, ua.id);
    q.setRating.run(ub.rating + db2, winner === 1 ? 1 : 0, winner === 0 ? 1 : 0, ub.id);
  }
  q.addMatch.run(ua.id, ub.id, winner === -1 ? null : winner === 0 ? ua.id : ub.id, reason, Date.now());
  for (const [i, ws] of m.p.entries()) {
    const d = i === 0 ? da : db2; ws.match = null;
    sendWs(ws, { t: 'result', win: winner === i, draw: winner === -1, reason, delta: a.user.id === b.user.id ? 0 : d, rating: (i === 0 ? ua.rating : ub.rating) + (a.user.id === b.user.id ? 0 : d) });
  }
}
wss.on('connection', (ws, req) => {
  ws.user = null; ws.match = null; ws.msgs = 0; ws.win = Date.now(); ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  ws.on('message', (raw) => {
    const now = Date.now(); if (now - ws.win > 1000) { ws.win = now; ws.msgs = 0; } if (++ws.msgs > 90) return; // 초당 메시지 제한
    let o; try { o = JSON.parse(raw); } catch { return; }
    if (!ws.user) {
      if (o.t === 'auth') { const u = auth(o.token); if (!u) return sendWs(ws, { t: 'error', msg: '로그인이 필요합니다.' }); ws.user = u; sendWs(ws, { t: 'authed', user: u }); }
      return;
    }
    switch (o.t) {
      case 'queue': {
        if (ws.match) return; ws.snap = clampSnap(o.snap || {}, q.userById.get(ws.user.id));
        leaveQueue(ws);
        const other = queue.find((x) => x !== ws && x.readyState === 1 && x.user.id !== ws.user.id) || null;
        if (other) startMatch(other, ws); else { queue.push(ws); sendWs(ws, { t: 'queued', n: queue.length }); }
        break;
      }
      case 'room:create': {
        if (ws.match) return; ws.snap = clampSnap(o.snap || {}, q.userById.get(ws.user.id)); leaveQueue(ws);
        let code; do { code = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); } while (rooms.has(code));
        rooms.set(code, ws); sendWs(ws, { t: 'room', code }); break;
      }
      case 'room:join': {
        if (ws.match) return; ws.snap = clampSnap(o.snap || {}, q.userById.get(ws.user.id));
        const host = rooms.get(String(o.code || '').toUpperCase());
        if (!host || host.readyState !== 1) return sendWs(ws, { t: 'error', msg: '방을 찾을 수 없습니다.' });
        if (host === ws) return;
        rooms.delete(String(o.code).toUpperCase()); startMatch(host, ws); break;
      }
      case 'cancel': leaveQueue(ws); sendWs(ws, { t: 'cancelled' }); break;
      case 'r': { // 경기 중 중계
        const m = ws.match; if (!m || m.done || !o.d || typeof o.d !== 'object') return;
        const d = o.d;
        if (d.t === 'atk' && d.info) { d.info.coef = Math.min(12, Math.max(0, +d.info.coef || 0)); }
        if (d.t === 'hp' && typeof d.hp === 'number' && d.mhp > 0) m.hp[ws.side] = Math.max(0, d.hp / d.mhp);
        sendWs(m.p[1 - ws.side], { t: 'r', d });
        break;
      }
      case 'dead': { const m = ws.match; if (m && !m.done) { m.hp[ws.side] = 0; endMatch(m, 1 - ws.side, 'ko'); } break; }
      case 'leave': { const m = ws.match; if (m && !m.done) endMatch(m, 1 - ws.side, 'forfeit'); leaveQueue(ws); break; }
    }
  });
  ws.on('close', () => { leaveQueue(ws); const m = ws.match; if (m && !m.done) endMatch(m, 1 - ws.side, 'disconnect'); });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 15000);

// 같은 와이파이의 다른 기기가 접속할 수 있도록 모든 인터페이스에서 대기하고, 접속 주소를 안내한다
server.listen(PORT, () => { // 호스트 미지정 = IPv4·IPv6 모든 인터페이스
  const lan = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
  console.log(`ECLIPSE 서버 실행 중\n  이 컴퓨터:      http://localhost:${PORT}`);
  for (const ip of lan) console.log(`  같은 와이파이:  http://${ip}:${PORT}`);
  if (!lan.length) console.log('  (네트워크 연결을 찾지 못했습니다 — 와이파이 연결을 확인하세요)');
});
