const fs = require('fs');
const edit = (f, pairs) => { let s = fs.readFileSync(f, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ' missing: ' + a.slice(0, 80)); s = s.replace(a, b); } fs.writeFileSync(f, s); };
edit('src/scenes/Hud.ts', [
  ["    this.portrait.setFrame(c.spr.frame);", "    this.portrait.setFrame(S.look?.frame ?? c.spr.frame).setTint(S.look?.tint ?? 0xffffff);"],
  ["    const modeName = W.mode === 'town' ? W.ch.town : W.mode === 'field' ? `${W.ch.field} (Lv${W.areaLevel})` : W.mode === 'dungeon' ? W.dungeon.name : W.boss?.B.name || '';", "    const modeName = W.mode === 'town' ? W.ch.town : W.mode === 'field' ? `${W.ch.field} (Lv${W.areaLevel})` : W.mode === 'dungeon' ? W.dungeon.name : W.mode === 'pvp' ? '투기장' : W.boss?.B.name || '';"],
  ["    this.t.lv.setText(`Lv ${S.level}`).setPosition(18, 68);", "    this.t.lv.setText(`Lv ${S.level}  ${S.name || ''}`).setPosition(18, 68);"],
  ["    if (W.mode === 'town' && W.dummyLog.length)", "    // ── PvP 상대 ──\n    const R = W.remote;\n    if (R && W.mode === 'pvp') {\n      const bw2 = 520, bx = 640 - bw2 / 2, by = 36;\n      g.fillStyle(0x0b0f1c, 0.8).fillRoundedRect(bx - 10, 6, bw2 + 20, 62, 8);\n      bar(bx, by, bw2, 18, R.hp / R.maxHp, 0xd03050, 0x2a1018);\n      this.t.boss.setText(`${R.snap.name} (${R.snap.user || ''}) · Lv${R.snap.level} · 레이팅 ${R.snap.rating ?? '-'}`).setPosition(640, 22);\n      const left = Math.max(0, (W.pvpEnd - Math.max(n, W.pvpStart)) / 1000);\n      this.t.bossPat.setText(`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`).setPosition(640, 74).setColor(left < 15 ? '#ff7080' : '#ffffff');\n    }\n    if (W.mode === 'town' && W.dummyLog.length)"],
]);
edit('src/scenes/Title.ts', [["    onInstallChange(() => { if (this.scene.isActive()) UI.open('title'); });", "    onInstallChange(() => UI.refresh());"]]);
edit('src/main.ts', [["initAudio(game);\nUI.init(game);", "initAudio(game);\nUI.init(game);\n// 저장된 로그인 세션 확인 후 타이틀 갱신\nme().then(() => UI.refresh());"], ["import { registerSW, applyUpdate } from './pwa';", "import { registerSW, applyUpdate } from './pwa';\nimport { me } from './net/api';"]]);
edit('src/pwa/sw-template.js', [["  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;", "  const u = new URL(req.url);\n  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/') || u.pathname.endsWith('/ws')) return; // API·소켓은 항상 네트워크"]]);
edit('vite.config.ts', [["  server: { port: 5173 },", "  server: { port: 5173, proxy: { '/api': 'http://localhost:4173', '/ws': { target: 'ws://localhost:4173', ws: true } } },"]]);
const pk = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pk.scripts = { dev: 'vite', build: 'vite build', start: 'node server/index.mjs', serve: 'vite build && node server/index.mjs', preview: 'vite preview --port 4173' };
fs.writeFileSync('package.json', JSON.stringify(pk, null, 2) + '\n');
fs.appendFileSync('src/ui/style.css', `
/* 계정 · 캐릭터 · 투기장 */
.acct { font-size: 14px; color: #c8e8ff; padding: 6px; }
.form { display: flex; flex-direction: column; gap: 10px; min-width: 380px; }
.form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dim); }
input { font-family: inherit; font-size: 14px; color: var(--text); background: #0d1226; border: 1px solid #4a557f; border-radius: 6px; padding: 8px 10px; user-select: text; }
input:focus { outline: none; border-color: var(--accent); }
.slots { display: flex; gap: 14px; }
.slotcard { width: 240px; min-height: 230px; background: #121830; border: 2px solid #343c64; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.slotcard.empty { justify-content: center; cursor: pointer; color: var(--dim); } .slotcard.empty:hover { border-color: var(--accent); color: var(--text); }
.slotcard .plus { font-size: 48px; } .sprw { height: 80px; display: grid; place-items: center; }
img.pix { image-rendering: pixelated; }
.cc { display: flex; gap: 18px; } .cc-l { width: 330px; } .cc-r { width: 560px; }
.preview { height: 170px; display: grid; place-items: center; background: radial-gradient(#2a3260, #121830 70%); border-radius: 8px; }
label.nm { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dim); margin: 10px 0; }
.sub2 { font-size: 12px; color: var(--dim); margin: 8px 0 4px; }
.outfits { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; } .opick { background: #0d1226; border: 1px solid #2e3558; border-radius: 6px; display: grid; place-items: center; height: 50px; cursor: pointer; }
.opick.on, .tpick.on { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.tints { display: flex; gap: 6px; } .tpick { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #2e3558; cursor: pointer; }
.classes.small { flex-wrap: wrap; gap: 8px; } .ccard.mini { width: 176px; padding: 8px; } .ccard.mini.on { border-color: var(--gold); background: #2a2410; }
.cbig.sm { height: 60px; } .ccard.mini .cname { font-size: 15px; margin: 4px 0 0; } .ccard.mini .crole { font-size: 10px; }
button.big { width: 100%; padding: 12px; font-size: 16px; margin-top: 8px; }
.code { font-size: 22px; letter-spacing: 4px; color: var(--gold); }
.spin { display: inline-block; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
`);
console.log('ok');
