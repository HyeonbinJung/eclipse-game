// 헤드리스 스모크 테스트: 콘솔 오류 수집 + 주요 화면 스크린샷
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || 'shots';
const URL = process.argv[3] || 'http://localhost:4317/';
import fs from 'node:fs';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
await page.goto(URL); await wait(2500); await shot('01-title');
await page.click('text=새 게임'); await wait(400); await shot('02-class');
const cls = process.env.CLS || 'blade';
await page.click(`[data-a="pickClass:${cls}"]`); await wait(1500); await shot('03-town-dialog');
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await wait(150); }
await wait(500); await shot('04-town');
// 이동 + 공격
await page.keyboard.down('d'); await wait(800); await page.keyboard.up('d');
await page.mouse.click(900, 360); await wait(200); await page.mouse.click(900, 360); await wait(200); await page.mouse.click(900, 360, { button: 'right' }); await wait(500);
await shot('05-town-attack');
const ev = (code) => page.evaluate(code);
// 필드
await ev(`(()=>{const w=__game.scene.getScene('World'); w.travel({mode:'field',ch:1});})()`); await wait(2000);
await page.keyboard.down('d'); await wait(1500); await page.keyboard.up('d');
for (let i = 0; i < 6; i++) { await page.mouse.click(800, 360); await wait(120); }
await shot('06-field');
await page.keyboard.press('i'); await wait(400); await shot('07-inventory'); await page.keyboard.press('Escape'); await wait(200);
const bosses = (process.env.BOSSES || 'forest_predator,root_guardian,fallen_king,frost_queen,immortal_avatar,rift_lord').split(',');
for (const [i, b] of bosses.entries()) {
  await ev(`(()=>{const w=__game.scene.getScene('World'); const B=${JSON.stringify(b)}; const ch={forest_predator:1,root_guardian:1,black_captain:2,fallen_king:2,frost_hunter:3,frost_queen:3,lava_predator:4,immortal_avatar:4,void_executor:5,rift_lord:5}[B]; w.travel({mode:'boss',ch,bossId:B});})()`);
  await wait(2500);
  await ev(`(()=>{const w=__game.scene.getScene('World'); w.player.invulnUntil=1e12;})()`);
  // 보스를 빠르게 깎아 페이즈 전환까지 관찰
  for (let k = 0; k < 10; k++) {
    await page.mouse.click(640, 200); await wait(450);
    if (k === 4) await ev(`(()=>{const w=__game.scene.getScene('World'); w.boss.hp=Math.floor(w.boss.maxHp*0.6);})()`);
    if (k === 8) await ev(`(()=>{const w=__game.scene.getScene('World'); w.boss.hp=Math.floor(w.boss.maxHp*0.12);})()`);
  }
  await shot(`10-boss-${i}-${b}`);
  await wait(2500); await shot(`11-boss-${i}-${b}-later`);
}
// 보스 처치 → 결과 화면
await ev(`(()=>{const w=__game.scene.getScene('World'); w.boss.invuln=0; w.boss.fsm='RECOVERY'; w.boss.B.phases.length=0; w.boss.hp=1; })()`);
await page.mouse.click(640, 200); await wait(300); await page.mouse.click(640, 200);
await ev(`(()=>{const w=__game.scene.getScene('World'); if(w.boss.alive){ w.boss.die(); }})()`);
await wait(3500); await shot('20-results');
const sw = await ev(`navigator.serviceWorker.getRegistration().then(r=>!!r && (r.active||r.installing||r.waiting) ? 'registered' : 'none')`);
console.log('SW:', sw);
console.log('ERRORS:', errors.length); for (const e of errors.slice(0, 30)) console.log(e);
await browser.close();
