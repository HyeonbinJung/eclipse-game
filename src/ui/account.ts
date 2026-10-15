// 계정 · 캐릭터 슬롯 · 캐릭터 생성 · 투기장(PvP) 로비 패널
import { CLASSES, JOBS, BASE_TUNING } from '../data/classes';
import { CHAPTERS } from '../data/world';
import { S, newGame, persist, setStorageNs, adoptSave, peekSave, loadGame, clearCurrent } from '../core/state';
import { computeStats } from '../core/stats';
import { account, online, login, register, logout, listChars, getChar, deleteChar, leaderboard, flush, me, CharSummary } from '../net/api';
import { pvp } from '../net/pvp';
import { CHARS, CHAR_BY_ID, CHAR_SHEET, CHAR_SRC, CHAR_W, CHAR_H, CLASS_DEFAULT_CHAR, CharDef } from '../data/chars';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

// 스프라이트 프레임 + 색상(곱셈 틴트)을 data URL로 그려 미리보기에 사용
type Sheet = { src: string; fw: number; fh: number; img?: HTMLImageElement; state: 'idle' | 'loading' | 'ok' | 'fail'; waiters: (() => void)[] };
const SHEETS: Record<string, Sheet> = {
  dun: { src: 'assets/img/dungeon.png', fw: 16, fh: 16, state: 'idle', waiters: [] },
  [CHAR_SHEET]: { src: CHAR_SRC, fw: CHAR_W, fh: CHAR_H, state: 'idle', waiters: [] },
};
const cache = new Map<string, string>();
function sheetImg(key: string, rerender?: () => void): HTMLImageElement | null {
  const sh = SHEETS[key]; if (sh.state === 'ok') return sh.img!; if (sh.state === 'fail') return null;
  if (rerender && !sh.waiters.includes(rerender)) sh.waiters.push(rerender);
  if (sh.state === 'idle') {
    sh.state = 'loading'; const im = new Image();
    const done = (ok: boolean) => { sh.state = ok ? 'ok' : 'fail'; sh.img = im; const w = sh.waiters; sh.waiters = []; w.forEach((f) => f()); };
    im.onload = () => done(true); im.onerror = () => done(false); im.src = sh.src;
  }
  return null;
}
// chars 시트가 로드됐다면 실제로 들어 있는 캐릭터만 반환(아직 로딩 중이거나 없으면 빈 배열 → 기존 의상 사용)
export function availableChars(rerender?: () => void): CharDef[] {
  const im = sheetImg(CHAR_SHEET, rerender); if (!im) return [];
  const n = Math.floor(im.naturalWidth / CHAR_W) * Math.floor(im.naturalHeight / CHAR_H);
  return CHARS.filter((d) => d.frame < n);
}
export function spriteURL(frame: number, tint = 0xffffff, scale = 6, rerender?: () => void, sheetKey = 'dun') {
  const key = `${sheetKey}-${frame}-${tint}-${scale}`; if (cache.has(key)) return cache.get(key)!;
  const sheet = sheetImg(sheetKey, rerender); if (!sheet) return '';
  const { fw, fh } = SHEETS[sheetKey]; const cols = Math.max(1, Math.floor(sheet.naturalWidth / fw));
  const c = document.createElement('canvas'); c.width = fw * scale; c.height = fh * scale; const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
  x.drawImage(sheet, (frame % cols) * fw, Math.floor(frame / cols) * fh, fw, fh, 0, 0, fw * scale, fh * scale);
  if (tint !== 0xffffff) {
    const d = x.getImageData(0, 0, c.width, c.height); const r = (tint >> 16) & 255, g = (tint >> 8) & 255, b = tint & 255;
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] = (d.data[i] * r) / 255; d.data[i + 1] = (d.data[i + 1] * g) / 255; d.data[i + 2] = (d.data[i + 2] * b) / 255; }
    x.putImageData(d, 0, 0);
  }
  const url = c.toDataURL(); cache.set(key, url); return url;
}
// size = 표시 높이. 너비는 시트 프레임 비율을 따른다
const sprImg = (frame: number, tint: number, size: number, rr?: () => void, sheetKey = 'dun') => {
  const { fw, fh } = SHEETS[sheetKey]; const w = Math.round((size * fw) / fh); const u = spriteURL(frame, tint, Math.max(1, Math.ceil(size / fh)), rr, sheetKey);
  return u ? `<img class="pix" src="${u}" style="width:${w}px;height:${size}px">` : `<span style="display:inline-block;width:${w}px;height:${size}px"></span>`;
};
// 직업 기본 외형 미리보기: 커스텀 캐릭터가 있으면 그것, 없으면 기존 프레임
const classImg = (classId: string, size: number, rr: () => void) => {
  const d = CHAR_BY_ID[CLASSES[classId]?.char ?? CLASS_DEFAULT_CHAR[classId]];
  return d && availableChars(rr).includes(d) ? sprImg(d.frame, 0xffffff, size, rr, CHAR_SHEET) : sprImg(CLASSES[classId]?.spr.frame ?? 96, 0xffffff, size, rr);
};

export interface Ctx { opts: any; render: () => void; open: (n: string, o?: any) => void; close: (force?: boolean) => void; toast: (m: string, c?: string, ms?: number) => void; startWorld: (d: any) => void; pwaButton: () => string }

export function renderTitle(c: Ctx) {
  const u = account.user; const sv = peekSaveGuest();
  const guestCont = sv ? `<button data-a="guestContinue">게스트 이어하기 — ${esc(sv.name || '')} ${CLASSES[sv.classId]?.name || ''} Lv${sv.level}</button>` : '';
  const acc = u
    ? `<div class="acct">👤 <b>${esc(u.username)}</b> · 레이팅 ${u.rating} (${u.wins}승 ${u.losses}패)</div><button data-a="open:charSelect" class="primary">캐릭터 선택</button><button data-a="open:rank">랭킹</button><button data-a="logout" class="dim-btn">로그아웃</button>`
    : `<button data-a="open:login" class="primary">로그인 / 회원가입</button><div class="dim small">계정이 있으면 레벨·장비가 서버에 저장되고 PvP 대전을 할 수 있습니다.</div>`;
  return `<div class="title"><div class="logo">ECLIPSE</div><div class="sub">잊혀진 균열 · 2D 액션 RPG</div>
    <div class="col">${acc}${guestCont}<button data-a="guestNew">게스트로 새 게임</button><button data-a="open:settings">설정</button><button data-a="open:help">조작법</button>${c.pwaButton()}</div>
    <div class="credit">아트·사운드: Kenney (CC0) · 폰트: Galmuri (OFL) · 배경음: 절차 생성<br>Design Baseline 1.0 · EXTRIVER PRESENTS</div></div>`;
}
function peekSaveGuest() { setStorageNs('eclipse_save_'); return peekSave(); }

export function renderLogin(c: Ctx) {
  const o = c.opts;
  return `<h2>${o.mode === 'register' ? '회원가입' : '로그인'}<button class="x" data-a="open:title">✕</button></h2>
   <form class="form" onsubmit="return false">
     <label>아이디<input id="f-user" maxlength="16" autocomplete="username" value="${esc(o.user || '')}" placeholder="2~16자 한글/영문/숫자"></label>
     <label>비밀번호<input id="f-pass" type="password" maxlength="64" autocomplete="${o.mode === 'register' ? 'new-password' : 'current-password'}" placeholder="6자 이상"></label>
     ${o.mode === 'register' ? '<label>비밀번호 확인<input id="f-pass2" type="password" maxlength="64" autocomplete="new-password"></label>' : ''}
     ${o.err ? `<div class="warn">${esc(o.err)}</div>` : ''}
     <div class="row"><button class="primary" data-a="${o.mode === 'register' ? 'doRegister' : 'doLogin'}">${o.busy ? '처리 중…' : o.mode === 'register' ? '가입하기' : '로그인'}</button>
     <button data-a="loginMode:${o.mode === 'register' ? 'login' : 'register'}">${o.mode === 'register' ? '이미 계정이 있어요' : '새 계정 만들기'}</button></div>
   </form>`;
}

export function renderCharSelect(c: Ctx) {
  const o = c.opts;
  if (!o.chars) { listChars().then((cs) => { o.chars = cs; c.render(); }).catch((e) => { o.err = e.message; o.chars = []; c.render(); }); return '<h2>캐릭터 선택</h2><div class="dim">불러오는 중…</div>'; }
  const slots = [0, 1, 2].map((i) => {
    const ch: CharSummary | undefined = o.chars.find((x: CharSummary) => x.slot === i);
    if (!ch) return `<div class="slotcard empty" data-a="newChar:${i}"><div class="plus">＋</div><div>새 캐릭터</div></div>`;
    const cl = CLASSES[ch.classId];
    return `<div class="slotcard"><div class="sprw">${classImg(ch.classId, 72, c.render)}</div><div class="cname">${esc(ch.name)}</div><div class="dim">${cl?.name || ch.classId} · Lv ${ch.level}</div>
      <div class="dim small">${new Date(ch.updatedAt).toLocaleString()}</div><div class="row"><button class="primary" data-a="playChar:${i}">플레이</button><button class="danger" data-a="delChar:${i}">삭제</button></div></div>`;
  }).join('');
  return `<h2>캐릭터 선택 <span class="dim small">${esc(account.user?.username)}</span><button class="x" data-a="open:title">✕</button></h2>${o.err ? `<div class="warn">${esc(o.err)}</div>` : ''}<div class="slots">${slots}</div>`;
}

const BASE_LABEL: Record<string, string> = { blade: '검', fist: '격투', mage: '마법', ranger: '궁수', lancer: '창' };
// 직업 성향을 짧은 태그로: 체력 +10% · 공속 +6% 등
const modTags = (cl: any) => {
  const m = cl.mods || {}; const t: string[] = [];
  const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  if (m.hp && m.hp !== 1) t.push(`체력 ${pct(m.hp - 1)}`); if (m.atk && m.atk !== 1) t.push(`공격 ${pct(m.atk - 1)}`); if (m.def && m.def !== 1) t.push(`방어 ${pct(m.def - 1)}`);
  if (m.crit) t.push(`치명 ${pct(m.crit)}`); if (m.atkSpd) t.push(`공속 ${pct(m.atkSpd)}`); if (m.move) t.push(`이동 ${m.move > 0 ? '+' : ''}${m.move}`);
  return t.length ? t.join(' · ') : '균형형';
};

export function renderCharCreate(c: Ctx) {
  const o = c.opts; if (!CLASSES[o.cls] || !JOBS.includes(CLASSES[o.cls])) o.cls = JOBS[0].id;
  const cl = CLASSES[o.cls];
  // 직업 = 캐릭터. 계열별로 한 줄씩(검·격투·마법·궁수·창)
  const rows = (Object.keys(BASE_LABEL) as string[]).map((b) => `<div class="jrow"><div class="jbase">${BASE_LABEL[b]}</div>${JOBS.filter((j) => j.base === b).map((j) =>
    `<div class="jcard ${o.cls === j.id ? 'on' : ''}" data-a="ccClass:${j.id}" title="${esc(j.name)}"><div class="jimg">${classImg(j.id, 52, c.render)}</div><div class="jname">${esc(j.name)}</div></div>`).join('')}</div>`).join('');
  const sig = (cl.sig || []).map((e) => EFF_LABEL[e]).filter(Boolean).join(' · ');
  return `<h2>캐릭터 만들기 ${o.slot >= 0 ? `<span class="dim small">슬롯 ${o.slot + 1}</span>` : '<span class="dim small">게스트 (이 브라우저에만 저장)</span>'}<button class="x" data-a="${o.slot >= 0 ? 'open:charSelect' : 'open:title'}">✕</button></h2>
   <div class="cc"><div class="cc-l"><div class="preview">${classImg(cl.id, 150, c.render)}</div>
     <div class="jtitle"><b class="gold">${esc(cl.name)}</b> <span class="dim small">${esc(cl.en)}</span></div>
     <div class="crole">${BASE_LABEL[cl.base]} 계열 · ${esc(cl.role)}</div>
     <div class="cdesc">${esc(cl.desc)}</div>
     <div class="small" style="color:var(--cyan)">${BASE_LABEL[cl.base]} 계열: ${BASE_TUNING[cl.base].label}</div>
     <div class="dim small">직업 성향: ${modTags(cl)}${sig ? ` · 시그니처: ${sig}` : ''}<br>무기: ${esc(cl.weaponNoun)} · 자원: ${esc(cl.resName)}</div>
     <label class="nm">이름<input id="f-name" maxlength="12" value="${esc(o.name || '')}" placeholder="캐릭터 이름"></label></div>
   <div class="cc-r"><div class="jobs">${rows}</div>
     <div class="qbox"><span class="dim">L</span> ${cl.L.map((m) => esc(m.name)).join(' → ')} · <span class="dim">H</span> ${esc(cl.H.name)}<br><span class="dim">Q</span> ${esc(cl.Q.name)} · <span class="dim">E</span> ${esc(cl.E.name)} · <span class="dim">R</span> ${esc(cl.R.name)}</div>
     ${o.slot < 0 && peekSaveGuest() ? '<div class="warn">게스트 새 게임은 기존 게스트 저장 데이터를 덮어씁니다.</div>' : ''}
     <button class="primary big" data-a="ccCreate">모험 시작</button></div></div>`;
}
const EFF_LABEL: Record<string, string> = { bleed: '출혈', burn: '화상', chill: '빙결', poison: '독', slow: '둔화', knock: '넉백', defDown: '방어 약화', critUp: '치명', stagger: '경직' };

export function renderArena(c: Ctx) {
  const o = c.opts; const u = account.user;
  if (!online()) return `<h2>투기장<button class="x" data-a="close">✕</button></h2><div>PvP 대전은 로그인한 계정 캐릭터로만 할 수 있습니다.</div><div class="dim">타이틀 → 로그인 후 캐릭터를 선택하세요.</div>`;
  if (account.slot < 0) return `<h2>투기장<button class="x" data-a="close">✕</button></h2><div>게스트 캐릭터로는 대전할 수 없습니다. 계정 캐릭터로 접속하세요.</div>`;
  if (!o.wired) {
    o.wired = true;
    const re = () => { if (c.opts === o) c.render(); };
    const onErr = (m: string) => { o.err = m; re(); };
    const onMatch = () => { cleanup(); c.close(true); c.startWorld({ mode: 'pvp', ch: S.chapter || 1 }); };
    const cleanup = () => { pvp.off('status', re); pvp.off('error', onErr); pvp.off('match', onMatch); };
    pvp.on('status', re); pvp.on('error', onErr); pvp.on('match', onMatch); o.cleanup = cleanup;
    leaderboard().then((lb) => { o.lb = lb; re(); }).catch(() => {});
  }
  const st = pvp.status; const snapLine = (() => { const s = computeStats(); return `Lv${S.level} · ATK ${s.atk} · DEF ${s.def} · HP ${s.maxHp}`; })();
  const busy = st === 'queued' ? `<div class="gold">상대를 찾는 중… <span class="spin">◐</span></div><button data-a="pvpCancel">취소</button>`
    : st === 'room' ? `<div>방 코드: <b class="code">${pvp.roomCode}</b> — 친구에게 알려주세요</div><button data-a="pvpCancel">방 닫기</button>`
    : `<div class="row"><button class="primary" data-a="pvpQueue">빠른 대전</button><button data-a="pvpRoom">방 만들기</button></div>
       <div class="row"><input id="f-code" maxlength="5" placeholder="방 코드" style="width:120px;text-transform:uppercase"><button data-a="pvpJoin">참가</button></div>`;
  const lb = o.lb ? `<table class="skills"><tr><th>#</th><th>계정</th><th>레이팅</th><th>전적</th></tr>${o.lb.pvp.map((r: any, i: number) => `<tr class="${r.username === u!.username ? 'gold' : ''}"><td>${i + 1}</td><td>${esc(r.username)}</td><td>${r.rating}</td><td>${r.wins}승 ${r.losses}패</td></tr>`).join('') || '<tr><td colspan="4" class="dim">아직 기록이 없습니다</td></tr>'}</table>` : '<div class="dim">랭킹 불러오는 중…</div>';
  return `<h2>투기장 <span class="dim small">1:1 실시간 대전 · 2분</span><button class="x" data-a="arenaClose">✕</button></h2>
   <div class="qbox">👤 <b>${esc(u!.username)}</b> · 레이팅 <b class="gold">${u!.rating}</b> · ${u!.wins}승 ${u!.losses}패<br><span class="dim">${esc(S.name)} (${CLASSES[S.classId].name}) · ${snapLine}</span></div>
   <div class="dim small">규칙: HP ×2, 받는 피해 ×0.7, 포션 없음. 판정은 맞는 쪽 화면 기준이라 패링·대시 회피가 그대로 통합니다. 시간 종료 시 남은 HP 비율이 높은 쪽이 승리.</div>
   ${o.err ? `<div class="warn">${esc(o.err)}</div>` : ''}${busy}<h3>레이팅 랭킹</h3>${lb}`;
}
export function renderPvpResult(c: Ctx) {
  const o = c.opts; const reason: Record<string, string> = { ko: 'K.O.', timeout: '시간 종료 (남은 HP 비교)', disconnect: '상대 연결 끊김', forfeit: '기권' };
  return `<h2 class="${o.win ? 'gold' : o.draw ? '' : 'red'}">${o.draw ? '무승부' : o.win ? '승리!' : '패배'}</h2>
   <div>vs ${esc(o.opp?.name)} (${esc(o.opp?.user || '')})</div><div class="dim">${reason[o.reason] || o.reason}</div>
   <div class="res-grid" style="grid-template-columns:1fr 1fr"><div>레이팅<b>${o.rating}</b></div><div>변동<b class="${o.delta >= 0 ? 'gold' : 'red'}">${o.delta >= 0 ? '+' : ''}${o.delta}</b></div></div>
   <button class="primary" data-a="pvpDone">확인</button>`;
}
export function renderRank(c: Ctx) {
  const o = c.opts;
  if (!o.lb) { leaderboard().then((lb) => { o.lb = lb; c.render(); }).catch((e) => { o.err = e.message; c.render(); }); return '<h2>랭킹</h2><div class="dim">불러오는 중…</div>'; }
  return `<h2>랭킹<button class="x" data-a="${S ? 'close' : 'open:title'}">✕</button></h2><div class="inv">
   <div style="width:440px"><h3>PvP 레이팅</h3><table class="skills"><tr><th>#</th><th>계정</th><th>레이팅</th><th>전적</th></tr>${o.lb.pvp.map((r: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(r.username)}</td><td>${r.rating}</td><td>${r.wins}승 ${r.losses}패</td></tr>`).join('') || '<tr><td colspan="4" class="dim">기록 없음</td></tr>'}</table></div>
   <div style="width:440px"><h3>레벨</h3><table class="skills"><tr><th>#</th><th>캐릭터</th><th>직업</th><th>Lv</th></tr>${o.lb.level.map((r: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(r.name)} <span class="dim">${esc(r.username)}</span></td><td>${CLASSES[r.classId]?.name || ''}</td><td>${r.level}</td></tr>`).join('') || '<tr><td colspan="4" class="dim">기록 없음</td></tr>'}</table></div></div>`;
}

// 반환값 true면 처리됨
export async function accountAction(cmd: string, p1: string, c: Ctx): Promise<boolean> {
  const o = c.opts; const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  switch (cmd) {
    case 'loginMode': c.open('login', { mode: p1, user: val('f-user') }); return true;
    case 'doLogin': case 'doRegister': {
      const user = val('f-user').trim(), pass = val('f-pass');
      if (cmd === 'doRegister' && pass !== val('f-pass2')) { o.err = '비밀번호 확인이 일치하지 않습니다.'; o.user = user; c.render(); return true; }
      o.busy = true; o.user = user; c.render();
      try { if (cmd === 'doLogin') await login(user, pass); else await register(user, pass); c.toast(cmd === 'doLogin' ? '로그인했습니다' : '가입을 환영합니다!', '#9fe0ff'); c.open('charSelect'); }
      catch (e: any) { o.busy = false; o.err = e.message; c.render(); }
      return true;
    }
    case 'logout': await logout(); account.slot = -1; c.open('title'); return true;
    case 'newChar': c.open('charCreate', { slot: +p1 }); return true;
    case 'playChar': {
      const slot = +p1;
      try {
        const r = await getChar(slot); account.slot = slot; setStorageNs(`eclipse_u${account.user!.id}_s${slot}_`);
        const src = adoptSave(r.data); if (src === 'local') c.toast('이 기기에 더 최신 진행이 있어 그것을 사용합니다', '#ffd76a'); persist();
        c.startWorld({ mode: 'town', ch: S.chapter || 1 });
      } catch (e: any) { o.err = e.message; c.render(); }
      return true;
    }
    case 'delChar': {
      if (!confirm('이 캐릭터를 삭제할까요? 서버에서 영구 삭제됩니다.')) return true;
      await deleteChar(+p1).catch(() => {}); for (const k of ['a', 'b', 'slot']) localStorage.removeItem(`eclipse_u${account.user!.id}_s${p1}_${k}`);
      o.chars = null; c.render(); return true;
    }
    case 'guestContinue': setStorageNs('eclipse_save_'); account.slot = -1; if (loadGame()) c.startWorld({ mode: 'town', ch: S.chapter || 1 }); return true;
    case 'guestNew': c.open('charCreate', { slot: -1 }); return true;
    case 'ccClass': o.name = val('f-name'); o.cls = p1; c.render(); return true;
    case 'ccCreate': {
      const name = val('f-name').trim() || CLASSES[o.cls].name;
      if (o.slot >= 0) { account.slot = o.slot; setStorageNs(`eclipse_u${account.user!.id}_s${o.slot}_`); for (const k of ['a', 'b', 'slot']) localStorage.removeItem(`eclipse_u${account.user!.id}_s${o.slot}_${k}`); }
      else { account.slot = -1; setStorageNs('eclipse_save_'); }
      const job = CLASSES[o.cls];
      newGame(o.cls, name, { frame: job.spr.frame, tint: 0xffffff, char: job.char }); await flush();
      c.startWorld({ mode: 'town', ch: 1 }); return true;
    }
    case 'pvpQueue': case 'pvpRoom': case 'pvpJoin': {
      o.err = ''; const s = computeStats();
      const snap = { name: S.name, classId: S.classId, look: S.look, level: S.level, atk: s.atk, def: s.def, maxHp: s.maxHp };
      try {
        if (cmd === 'pvpQueue') await pvp.queue(snap); else if (cmd === 'pvpRoom') await pvp.createRoom(snap);
        else { const code = val('f-code').trim().toUpperCase(); if (code.length !== 5) { o.err = '5자리 방 코드를 입력하세요.'; c.render(); return true; } await pvp.joinRoom(code, snap); }
      } catch (e: any) { o.err = e.message; }
      c.render(); return true;
    }
    case 'pvpCancel': pvp.cancel(); c.render(); return true;
    case 'arenaClose': if (pvp.status === 'queued' || pvp.status === 'room') pvp.cancel(); o.cleanup?.(); c.close(); return true;
    case 'pvpDone': { const cb = o.onClose; await me(); c.close(true); cb?.(); return true; }
  }
  return false;
}
export function leaveToTitle() { flush(); clearCurrent(); account.slot = -1; }
export { CHAPTERS };
