import { chromium } from 'playwright-core';
const t0 = Date.now(); const L = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
L('launched'); const p = await b.newPage(); L('page');
p.on('requestfinished', (r) => { const u = r.url(); if (!u.includes('/sfx/') && !u.includes('/fx/')) L('done ' + u.slice(22, 80)); });
await p.goto('http://localhost:4173/?debug', { waitUntil: 'domcontentloaded', timeout: 90000 }); L('dom');
await p.waitForSelector('[data-a="open:login"]', { timeout: 90000 }); L('title ui');
await b.close(); L('closed');
