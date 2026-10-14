// 플레이 흐름 테스트: 퀘스트 → 필드 실전 → 던전 → 직업별 스킬
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = process.argv[2] || 'shots2'; fs.mkdirSync(OUT, { recursive: true });
const CLS = process.env.CLS || 'blade';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
const wait = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const W = `__game.scene.getScene('World')`;
const log = (...a) => console.log(...a);
await page.goto('http://localhost:4317/?debug'); await wait(2500);
await page.evaluate(() => localStorage.clear());
await page.reload(); await wait(2500);
await page.click('text=새 게임'); await wait(300); await page.click(`[data-a="pickClass:${CLS}"]`); await wait(1200);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await wait(120); }
// 1) 퀘스트 수락 → 필드 표식
await ev(() => { __dbg.st.acceptMain(); }); await ev(`${W}.travel({mode:'field',ch:1})`); await wait(1800);
const objs = await ev(`${W}.interacts.filter(i=>i.obj).length`); log('field objectives', objs);
for (let i = 0; i < 3; i++) { await ev(`(()=>{const w=${W}; const o=w.interacts.find(i=>i.obj&&!i.done); if(o){w.player.x=o.x; w.player.y=o.y;}})()`); await wait(400); }
log('main progress', await ev(() => __dbg.st.S.questStates.mainProgress));
// 2) 실전: 몬스터 무리 옆으로 이동해 가만히 있기
await ev(`(()=>{const w=${W}; const e=w.enemies.find(e=>e.alive&&e.d); w.player.x=e.x-60; w.player.y=e.y;})()`);
const hp0 = await ev(`${W}.player.hp`); await wait(5000); const hp1 = await ev(`${W}.player.hp`);
log('player hp idle near mobs', hp0, '->', hp1);
await page.screenshot({ path: `${OUT}/a-field-fight.png` });
// 공격 연타 (가장 가까운 적 조준)
let kills0 = await ev(`${W}.run.kills`);
for (let i = 0; i < 40; i++) {
  const p = await ev(`(()=>{const w=${W}; const P=w.player; if(!P.alive) return null; const e=w.nearestEnemy(P.x,P.y,500); if(!e) return null; const c=w.cameras.main; return {x:e.x-c.worldView.x, y:e.y-c.worldView.y-16, hp:P.hp};})()`);
  if (!p) break;
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y, { button: i % 4 === 3 ? 'right' : 'left' }); await wait(220);
  if (i === 20) await page.screenshot({ path: `${OUT}/b-field-attack.png` });
}
log('kills', kills0, '->', await ev(`${W}.run.kills`), 'hp', await ev(`${W}.player.hp`), 'alive', await ev(`${W}.player.alive`), 'lvl', await ev(() => __dbg.st.S.level));
await wait(1500); await page.screenshot({ path: `${OUT}/c-after.png` });
// 마을 보고
await ev(`${W}.travel({mode:'town',ch:1})`); await wait(1500);
for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await wait(100); }
log('turnIn', JSON.stringify(await ev(() => { const r = __dbg.st.turnInMain(); return r ? r.rew : null; })), 'quest#', await ev(() => __dbg.st.S.questStates.main));
// 3) 던전 진행
await ev(() => { for (let i = 0; i < 9; i++) __dbg.st.debugLevelUp(); });
await ev(`${W}.travel({mode:'dungeon',ch:1,dungeon:1,room:0})`); await wait(1800);
for (let r = 0; r < 5; r++) {
  const info = await ev(`(()=>{const w=${W}; return {room:w.d.room, type:w.dungeon.rooms[w.d.room||0], mode:w.mode, enemies:w.enemies.filter(e=>e.alive).length}})()`);
  log('room', JSON.stringify(info));
  if (info.mode !== 'dungeon') break;
  if (info.type === 'p') {
    for (let n = 1; n <= 4; n++) { await ev(`(()=>{const w=${W}; const p=w.puzzle.plates.find(p=>p.n===${n}); w.player.x=p.x; w.player.y=p.y;})()`); await wait(250); }
    await page.screenshot({ path: `${OUT}/d-puzzle.png` });
  }
  await ev(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive && e.die) e.die();})()`); await wait(900);
  await ev(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive && e.die) e.die();})()`); await wait(900);
  const door = await ev(`!!${W}.exitDoor`); log(' door', door);
  if (!door) { await page.screenshot({ path: `${OUT}/e-stuck-${r}.png` }); break; }
  await ev(`(()=>{const w=${W}; w.player.x=w.exitDoor.x; w.player.y=w.exitDoor.y;})()`); await wait(100); await page.keyboard.press('g'); await wait(1800);
}
log('mode now', await ev(`${W}.mode`), await ev(`${W}.boss && ${W}.boss.B.name`));
await wait(3000);
await page.screenshot({ path: `${OUT}/f-boss.png` });
// 4) 보스 실전 20초 (무적 아님): 대시/패링/공격 섞기
for (let i = 0; i < 70; i++) {
  const p = await ev(`(()=>{const w=${W}; const P=w.player; if(!P.alive||!w.boss) return null; const c=w.cameras.main; return {x:w.boss.x-c.worldView.x, y:w.boss.y-c.worldView.y-20};})()`);
  if (!p) break;
  await page.mouse.move(p.x, p.y);
  if (i % 7 === 0) await page.keyboard.press('Space'); else if (i % 5 === 0) await page.keyboard.press('f'); else if (i % 9 === 0) await page.keyboard.press('q'); else if (i % 11 === 0) await page.keyboard.press('e'); else await page.mouse.click(p.x, p.y);
  await wait(250);
  if (i === 35) await page.screenshot({ path: `${OUT}/g-boss-mid.png` });
}
log('boss hp', await ev(`${W}.boss && ${W}.boss.hp`), 'player', await ev(`${W}.player.hp`), 'alive', await ev(`${W}.player.alive`), 'parries', await ev(`${W}.run.parries`));
await wait(1500); await page.screenshot({ path: `${OUT}/h-end.png` });
log('ERRORS', errors.length); for (const e of errors.slice(0, 20)) log(e);
await browser.close();
