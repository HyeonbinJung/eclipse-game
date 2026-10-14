// 2인 E2E: 회원가입 → 캐릭터 생성 → 맵 → PvP 매칭/대전 → 레이팅
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = process.argv[2] || 'e2e'; fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: [] });
const errors = [];
const W = `__game.scene.getScene('World')`;
const suffix = Date.now().toString(36).slice(-4);
const clk = (pg, sel) => pg.waitForFunction((q) => !!document.querySelector(q), sel, { timeout: 30000 }).then(() => pg.evaluate((q) => document.querySelector(q).click(), sel));
const fill = (pg, sel, v) => pg.evaluate(([q, val]) => { document.querySelector(q).value = val; }, [sel, v]);
async function player(name, cls, outfitIdx, tintIdx) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message} ${(e.stack || '').split('\n')[1] || ''}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(URL + '?debug', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await clk(page, '[data-a="open:login"]'); await page.waitForTimeout(200);
  await clk(page, '[data-a="loginMode:register"]'); await page.waitForTimeout(200);
  await fill(page, '#f-user', name); await fill(page, '#f-pass', 'pass1234'); await fill(page, '#f-pass2', 'pass1234');
  await clk(page, '[data-a="doRegister"]'); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-1-slots.png` });
  await clk(page, '[data-a="newChar:0"]'); await page.waitForTimeout(400);
  await clk(page, `[data-a="ccClass:${cls}"]`); await page.waitForTimeout(150);
  await page.evaluate((i) => document.querySelectorAll('.opick')[i].click(), outfitIdx); await page.waitForTimeout(100);
  await page.evaluate((i) => document.querySelectorAll('.tpick')[i].click(), tintIdx); await page.waitForTimeout(100);
  await fill(page, '#f-name', name.slice(0, 8) + '용사');
  await page.screenshot({ path: `${OUT}/${name}-2-create.png` });
  await clk(page, '[data-a="ccCreate"]'); await page.waitForTimeout(2000);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(100); }
  return { ctx, page };
}
const A = await player('alice' + suffix, 'ranger', 10, 2);
const B = await player('bob' + suffix, 'lancer', 2, 1);
await A.page.screenshot({ path: `${OUT}/a-town1.png` });
// 서버 저장 확인
const tokenA = await A.page.evaluate(() => localStorage.getItem('eclipse_token'));
await A.page.waitForTimeout(2500);
const chars = await (await fetch(URL + 'api/chars', { headers: { Authorization: 'Bearer ' + tokenA } })).json();
console.log('server chars A:', JSON.stringify(chars.chars.map((c) => [c.slot, c.name, c.classId, c.level])));
// 레벨업 후 저장 반영 확인
await A.page.evaluate(() => { for (let i = 0; i < 11; i++) __dbg.st.debugLevelUp(); __dbg.st.persist(); });
await A.page.waitForTimeout(3000);
const chars2 = await (await fetch(URL + 'api/chars', { headers: { Authorization: 'Bearer ' + tokenA } })).json();
console.log('after levelup server level:', chars2.chars[0]?.level);
// 맵 둘러보기 (챕터별 마을/필드)
for (const ch of [1, 2, 3, 4, 5]) {
  await A.page.evaluate(`${W}.travel({mode:'town',ch:${ch}})`); await A.page.waitForTimeout(1700);
  for (let i = 0; i < 4; i++) { await A.page.keyboard.press('Space'); await A.page.waitForTimeout(80); }
  await A.page.screenshot({ path: `${OUT}/map-town${ch}.png` });
  await A.page.evaluate(`${W}.travel({mode:'field',ch:${ch}})`); await A.page.waitForTimeout(1900);
  await A.page.evaluate(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive&&e.die) {e.noLoot=true; e.die();} })()`);
  await A.page.waitForTimeout(500);
  await A.page.evaluate(`(()=>{const w=${W}; w.cameras.main.stopFollow(); w.cameras.main.setZoom(0.42); w.cameras.main.centerOn(w.terrain.cols*24, w.terrain.rows*24);})()`); await A.page.waitForTimeout(400);
  await A.page.screenshot({ path: `${OUT}/map-field${ch}.png` });
}
await A.page.evaluate(`${W}.travel({mode:'dungeon',ch:3,dungeon:1})`); await A.page.waitForTimeout(1900);
await A.page.evaluate(`(()=>{const w=${W}; w.cameras.main.stopFollow(); w.cameras.main.setZoom(0.3); w.cameras.main.centerOn(w.terrain.cols*24, w.terrain.rows*24);})()`); await A.page.waitForTimeout(400);
await A.page.screenshot({ path: `${OUT}/map-dungeon.png` });
// 던전 방 진입 → 문 잠김 확인
await A.page.evaluate(`(()=>{const w=${W}; w.cameras.main.setZoom(1); w.cameras.main.startFollow(w.player.spr); const r=w.rooms[1]; const c=w.terrain.center(r.x+3,r.y+3); w.player.x=c.x; w.player.y=c.y;})()`); await A.page.waitForTimeout(800);
console.log('room1 state', await A.page.evaluate(`${W}.rooms[1].state`), 'enemies', await A.page.evaluate(`${W}.enemies.filter(e=>e.alive).length`));
await A.page.screenshot({ path: `${OUT}/dungeon-room.png` });
await A.page.evaluate(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive&&e.die) e.die();})()`); await A.page.waitForTimeout(600);
await A.page.evaluate(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive&&e.die) e.die();})()`); await A.page.waitForTimeout(600);
console.log('room1 after clear', await A.page.evaluate(`${W}.rooms[1].state`));
// PvP: 둘 다 마을에서 투기장 → 방 코드로 매칭
await A.page.evaluate(`${W}.travel({mode:'town',ch:1})`); await A.page.waitForTimeout(1500);
for (const P of [A, B]) { await P.page.evaluate(() => { __dbg.UI.close(true); __dbg.UI.open('arena'); }); await P.page.waitForTimeout(800); }
await clk(A.page, '[data-a="pvpRoom"]'); await A.page.waitForTimeout(800);
const code = (await A.page.textContent('.code'))?.trim(); console.log('room code', code);
await A.page.screenshot({ path: `${OUT}/arena-lobby.png` });
await fill(B.page, '#f-code', code); await clk(B.page, '[data-a="pvpJoin"]'); await B.page.waitForTimeout(2500);
await A.page.screenshot({ path: `${OUT}/pvp-countdown.png` });
await A.page.waitForTimeout(2500);
// A가 B를 향해 이동 + 공격
for (let i = 0; i < 40; i++) {
  const st = await A.page.evaluate(`(()=>{const w=${W}; if(!w.remote) return null; const c=w.cameras.main; return {x:w.remote.x-c.worldView.x, y:w.remote.y-c.worldView.y-16, d:Math.hypot(w.remote.x-w.player.x,w.remote.y-w.player.y), rhp:w.remote.hp}})()`);
  if (!st) break;
  await A.page.mouse.move(st.x, st.y);
  if (st.d > 200) { await A.page.keyboard.down(st.x > 640 ? 'd' : 'a'); await A.page.waitForTimeout(200); await A.page.keyboard.up(st.x > 640 ? 'd' : 'a'); }
  else { await A.page.mouse.click(st.x, st.y); await A.page.waitForTimeout(250); }
  if (i === 20) { await A.page.screenshot({ path: `${OUT}/pvp-A.png` }); await B.page.screenshot({ path: `${OUT}/pvp-B.png` }); }
}
const bView = await B.page.evaluate(`(()=>{const w=${W}; return w.player ? {hp:w.player.hp, max:w.player.maxHp} : null})()`);
const aView = await A.page.evaluate(`(()=>{const w=${W}; return w.remote ? {rhp:w.remote.hp, rmax:w.remote.maxHp} : null})()`);
console.log('B own hp', JSON.stringify(bView), '| A sees B', JSON.stringify(aView));
// B 기권 → 결과
await B.page.evaluate(() => { __dbg.UI.open('menu'); }); await B.page.waitForTimeout(300); await clk(B.page, '[data-a="leave"]'); await B.page.waitForTimeout(1500);
await A.page.screenshot({ path: `${OUT}/pvp-result.png` });
const lb = await (await fetch(URL + 'api/leaderboard')).json();
console.log('leaderboard', JSON.stringify(lb.pvp.slice(0, 4)));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 20)) console.log(e);
await browser.close();
