import { chromium } from 'playwright-core';
const t0 = Date.now(); const L = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => L('PAGEERROR ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
p.on('console', (m) => { if (m.type() !== 'log') L('console.' + m.type() + ' ' + m.text().slice(0, 200)); });
p.on('requestfinished', (r) => { if (r.url().includes('/api/')) L('api ' + r.method() + ' ' + r.url().slice(21)); });
await p.goto('http://localhost:4173/?debug', { waitUntil: 'domcontentloaded' }); L('dom');
const ev = (f, a) => p.evaluate(f, a);
const click = (sel) => ev((q) => document.querySelector(q).click(), sel);
await p.waitForFunction(() => !!document.querySelector('[data-a="open:login"]')); L('title');
await click('[data-a="open:login"]'); await click('[data-a="loginMode:register"]'); L('register form');
const name = 'dbg' + Date.now().toString(36).slice(-5);
await ev((n) => { document.querySelector('#f-user').value = n; document.querySelector('#f-pass').value = 'pass1234'; document.querySelector('#f-pass2').value = 'pass1234'; }, name);
await click('[data-a="doRegister"]'); L('clicked register');
for (let i = 0; i < 10; i++) { await p.waitForTimeout(1000); L('panel=' + (await ev(() => document.querySelector('#panel').className)) + ' text=' + (await ev(() => document.querySelector('#panel').innerText.slice(0, 60).replace(/\n/g, ' ')))); }
await b.close();
