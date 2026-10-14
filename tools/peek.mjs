import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join('|')));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
p.on('requestfailed', (r) => errs.push('REQFAIL ' + r.url() + ' ' + r.failure()?.errorText));
try { await p.goto(process.argv[2] || 'http://localhost:4173/', { waitUntil: 'commit' }); } catch (e) { console.log('goto err', String(e.message).split('\n')[0]); }
await p.waitForTimeout(4000);
console.log('URL', p.url());
console.log('TEXT:', (await p.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 300));
console.log(errs.join('\n'));
await b.close();
