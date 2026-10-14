const fs = require('fs');
const edit = (f, pairs) => { let s = fs.readFileSync(f, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ' missing: ' + a.slice(0, 80)); s = s.replace(a, b); } fs.writeFileSync(f, s); };
edit('src/ui/ui.ts', [
  ["import { canInstall, promptInstall, isStandalone } from '../pwa';", "import { canInstall, promptInstall, isStandalone } from '../pwa';\nimport { renderTitle as accTitle, renderLogin, renderCharSelect, renderCharCreate, renderArena, renderPvpResult, renderRank, accountAction, leaveToTitle, Ctx } from './account';\nimport { pvp } from '../net/pvp';"],
  ["current !== 'ending' && current !== 'classSelect') UI.close();", "current !== 'ending' && current !== 'pvpResult') UI.close();"],
  ["    if (!S && name !== 'title' && name !== 'classSelect' && name !== 'settings' && name !== 'help') return;", "    if (!S && !['title', 'settings', 'help', 'login', 'charSelect', 'charCreate', 'rank'].includes(name)) return;\n    if (current === 'arena' && name !== 'arena') { if (pvp.status === 'queued' || pvp.status === 'room') pvp.cancel(); currentOpts?.cleanup?.(); }"],
  ["  close(force = false) {\n    if (!force && (current === 'dialog' || current === 'death' || current === 'results' || current === 'ending')) return;", "  refresh() { if (current) render(); },\n  close(force = false) {\n    if (!force && (current === 'dialog' || current === 'death' || current === 'results' || current === 'ending' || current === 'pvpResult')) return;\n    if (current === 'arena') { if (pvp.status === 'queued' || pvp.status === 'room') pvp.cancel(); currentOpts?.cleanup?.(); }"],
  ["    case 'title': h = renderTitle(); break;\n    case 'classSelect': h = renderClassSelect(); break;", "    case 'title': h = accTitle(ctx()); break;\n    case 'login': h = renderLogin(ctx()); break;\n    case 'charSelect': h = renderCharSelect(ctx()); break;\n    case 'charCreate': h = renderCharCreate(ctx()); break;\n    case 'arena': h = renderArena(ctx()); break;\n    case 'pvpResult': h = renderPvpResult(ctx()); break;\n    case 'rank': h = renderRank(ctx()); break;"],
  ["${world()?.mode && world().mode !== 'town' ? '<button data-a=\"leave\">마을로 귀환</button>' : ''}", "${world()?.mode && world().mode !== 'town' ? `<button data-a=\"leave\">${world().mode === 'pvp' ? '기권하고 나가기' : '마을로 귀환'}</button>` : ''}${world()?.mode === 'town' ? '<button data-a=\"open:arena\">투기장 (PvP)</button>' : ''}<button data-a=\"open:rank\">랭킹</button>"],
  ["    case 'toTitle': persist(); UI.close(true);", "    case 'toTitle': persist(); if (W?.mode === 'pvp') pvp.leave(); leaveToTitle(); UI.close(true);"],
  ["function onClick(e: MouseEvent) {\n  if (current === 'dialog') { advanceDialog(); return; }\n  const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement; if (!el || (el as any).disabled) return;\n  clickAction(el.dataset.a!, el);\n}",
   "function ctx(): Ctx { return { opts: currentOpts, render, open: UI.open, close: UI.close, toast: UI.toast, startWorld, pwaButton }; }\nfunction onClick(e: MouseEvent) {\n  if (current === 'dialog') { advanceDialog(); return; }\n  const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement; if (!el || (el as any).disabled) return;\n  const a = el.dataset.a!; const [cmd, p1] = a.split(':');\n  accountAction(cmd, p1, ctx()).then((handled) => { if (!handled) clickAction(a, el); }).catch((err) => UI.toast(String(err?.message || err), '#ff9a9a'));\n}"],
  ["    case 'continue': if (loadGame()) { music.setVolume(S.settings.bgm); startWorld({ mode: 'town', ch: S.chapter || 1 }); } break;\n    case 'pickClass': newGame(p1); music.setVolume(S.settings.bgm); startWorld({ mode: 'town', ch: 1 }); break;\n", ""],
  ["function startWorld(d: any) {\n  UI.close(true);", "function startWorld(d: any) {\n  UI.close(true); if (S) music.setVolume(S.settings.bgm);"],
]);
// 사용하지 않는 옛 타이틀/직업 선택 함수 제거
let s = fs.readFileSync('src/ui/ui.ts', 'utf8');
const a = s.indexOf('function renderTitle() {'); const b = s.indexOf('// ---------- 인벤토리 ----------');
if (a < 0 || b < 0) throw new Error('title block');
s = s.slice(0, a) + s.slice(b);
fs.writeFileSync('src/ui/ui.ts', s);
console.log('ok');
