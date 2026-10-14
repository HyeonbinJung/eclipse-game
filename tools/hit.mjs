import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms); const ev = (f) => page.evaluate(f);
const W = `__game.scene.getScene('World')`;
for (const cls of ['blade', 'fist', 'mage']) {
  await page.goto('http://localhost:4317/?debug'); await wait(2000); await ev(() => localStorage.clear()); await page.reload(); await wait(2200);
  await page.click('text=새 게임'); await wait(200); await page.click(`[data-a="pickClass:${cls}"]`); await wait(1000);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await wait(100); }
  await ev(() => { for (let i = 0; i < 21; i++) __dbg.st.debugLevelUp(); });
  await ev(`${W}.travel({mode:'field',ch:2})`); await wait(1800);
  await ev(`(()=>{const w=${W}; for(const e of w.enemies) if(e.alive) e.die(); w.waveT=999; const P=w.player; const {MON}={MON:null}; })()`);
  await wait(500);
  // 앞에 허수아비 적 3마리
  await ev(`(()=>{const w=${W}; const P=w.player; const proto=w.enemies; window.__tgt=[]; for(let i=0;i<3;i++){ const e=w.spawnEnemy(w.fieldMonsters()[0].map?{...window.__m}:null, 0,0,1,false); } })()`).catch(()=>{});
  const res = await ev(`(()=>{const w=${W}; const P=w.player; const out=[]; const defs=w.fieldMonsters()[0]; return defs;})()`);
  await ev(`(()=>{const w=${W}; const P=w.player; const def=w.enemies.length?null:null; })()`);
  // MON 접근: spawnGroup 사용 후 위치 이동
  await ev(`(()=>{const w=${W}; const P=w.player; const g=w.spawnGroup(false,{x:P.x+90,y:P.y}); g.forEach((e,i)=>{e.x=P.x+70; e.y=P.y-30+i*30; e.atkReady=1e12; e.state='idle'; e.homeX=e.x; e.homeY=e.y;}); window.__g=g;})()`);
  const before = await ev(`window.__g.map(e=>e.hp)`);
  const c = await ev(`(()=>{const w=${W}; const P=w.player; const cam=w.cameras.main; return {x:P.x+70-cam.worldView.x, y:P.y-cam.worldView.y-16};})()`);
  await page.mouse.move(c.x, c.y);
  for (let i = 0; i < 6; i++) { await page.mouse.click(c.x, c.y); await wait(260); }
  await page.mouse.click(c.x, c.y, { button: 'right' }); await wait(700);
  await page.keyboard.press('q'); await wait(600); await page.keyboard.press('e'); await wait(700);
  await ev(`${W}.player.ult=100`); await page.keyboard.press('r'); await wait(2200);
  const after = await ev(`window.__g.map(e=>Math.max(0,e.hp))`);
  console.log(cls, 'before', before, 'after', after, 'combo', await ev(`${W}.player.combo.best`));
  await page.screenshot({ path: `../AppData/Local/Temp/claude/C--Users-PC/e6d0cfd2-3196-49cf-8d7f-8ff1614fed30/scratchpad/hit-${cls}.png` });
}
console.log('errors', errors);
await browser.close();
