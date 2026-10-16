// DOM 기반 UI 패널. 게임 캔버스 위에 겹쳐 그린다.
import Phaser from 'phaser';
import {
  S, newGame, loadGame, hasSave, peekSave, persist, deleteSave, cls, equipItem, unequip, isEquipped, dismantle, enhance, reroll, craftWeapon,
  mainQuest, canAcceptMain, acceptMain, mainComplete, turnInMain, sideReward, pendingTraits, slotOpen, equipped, dismantleValue, chOf, bossDailyCount,
} from '../core/state';
import { computeStats, Stats } from '../core/stats';
import { CLASS_LIST, CLASSES, Move } from '../data/classes';
import { CHAPTERS, ChapterDef, SIDE_QUESTS, MAIN_QUESTS } from '../data/world';
import { BOSS, BOSSES } from '../data/bosses';
import { Item, RAR, SLOTS, Slot, fmtAffix, itemMain, slotIcon, UNIQUES, RELIC, ENHANCE, rarityIndex } from '../data/items';
import { Spr } from '../data/sprites';
import { potionPrice, rerollCost, craftCost, xpToNext, cumulativeXp } from '../data/formulas';
import { sfx, music } from '../audio/audio';
import { canInstall, promptInstall, isStandalone } from '../pwa';
import { renderTitle as accTitle, renderLogin, renderCharSelect, renderCharCreate, renderArena, renderPvpResult, renderRank, accountAction, leaveToTitle, Ctx } from './account';
import { pvp } from '../net/pvp';

let game: Phaser.Game; let root: HTMLElement; let panel: HTMLElement; let toasts: HTMLElement; let overlay: HTMLElement;
let current = ''; let currentOpts: any = {}; let blocking = false; let dialogCb: (() => void) | null = null;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const ico = (s: Spr, cls2 = '', tint?: string) => `<span class="ico ${s.sheet} ${cls2}" style="background-position:-${(s.frame % 12) * 48}px -${Math.floor(s.frame / 12) * 48}px;${tint ? `filter:drop-shadow(0 0 6px ${tint})` : ''}"></span>`;
const pct = (v: number) => Math.round(v * 100) + '%';
const world = () => game.scene.getScene('World') as any;

function itemIcon(it: Item) { return ico(it.relicId ? { sheet: 'town', frame: 117 } : slotIcon(it.slot, it.cls), 'rar-' + it.rarity, RAR[it.rarity].color); }
function itemName(it: Item) { return `<span style="color:${RAR[it.rarity].color}">${esc(it.name)}${it.upgradeLevel ? ' +' + it.upgradeLevel : ''}</span>`; }
function itemDetail(it: Item) {
  const m = itemMain(it); const slot = SLOTS.find((s) => s.id === it.slot)!;
  const mains = Object.entries(m).map(([k, v]) => `<div class="main">${k === 'atk' ? '공격력' : k === 'def' ? '방어력' : k === 'hp' ? '최대 HP' : k === 'crit' ? '치명타 확률' : '이동 속도'} +${k === 'crit' ? pct(v) : v}</div>`).join('');
  const aff = it.rolledAffixes.map((a) => `<div class="aff">${fmtAffix(a.k, a.v)}</div>`).join('');
  const uni = it.unique ? `<div class="uni">◆ ${UNIQUES[it.unique]}</div>` : '';
  const rel = it.relicId ? `<div class="uni">◆ ${RELIC[it.relicId].desc}</div><div class="dim">권장 Lv${RELIC[it.relicId].lv}</div>` : '';
  return `<div class="idet"><div class="ititle">${itemIcon(it)} <div>${itemName(it)}<div class="dim">${RAR[it.rarity].name} ${slot.name} · iLv ${it.itemLevel}</div></div></div>${mains}${aff}${uni}${rel}</div>`;
}
function statDiff(a: Stats, b: Stats) {
  const rows: [string, keyof Stats, boolean][] = [['최대 HP', 'maxHp', false], ['공격력', 'atk', false], ['방어력', 'def', false], ['치명타', 'crit', true], ['치명 피해', 'critDmg', true], ['공격 속도', 'atkSpd', true], ['쿨감', 'cdr', true], ['이동 속도', 'move', false], ['피해 감소', 'dr', true], ['원소 저항', 'res', true], ['방어 관통', 'pen', true]];
  return rows.map(([n, k, p]) => {
    const d = (b[k] as number) - (a[k] as number); if (Math.abs(d) < 0.0001) return '';
    return `<div class="diff ${d > 0 ? 'up' : 'down'}">${n} ${d > 0 ? '+' : ''}${p ? Math.round(d * 100) + '%' : Math.round(d)}</div>`;
  }).join('') || '<div class="dim">능력치 변화 없음</div>';
}

export const UI = {
  init(g: Phaser.Game) {
    game = g; root = document.getElementById('ui')!;
    const abs = (p: string) => `url("${new URL(p, document.baseURI).href}")`;
    document.documentElement.style.setProperty('--dun', abs('assets/img/dungeon.png'));
    document.documentElement.style.setProperty('--town', abs('assets/img/town.png'));
    root.innerHTML = `<div id="overlay"></div><div id="panel"></div><div id="toasts"></div><div id="banner"></div>`;
    panel = document.getElementById('panel')!; toasts = document.getElementById('toasts')!; overlay = document.getElementById('overlay')!;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    window.addEventListener('keydown', (e) => {
      if (current === 'dialog' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyG')) { e.preventDefault(); advanceDialog(); }
      else if (current && blocking && e.code === 'Escape' && current !== 'title' && current !== 'dialog' && current !== 'death' && current !== 'results' && current !== 'ending' && current !== 'pvpResult') UI.close();
      else if (current === 'results' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); clickAction('closeResults', null as any); }
    });
    const fit = () => {
      const c = document.querySelector('#game canvas') as HTMLCanvasElement; if (!c) return;
      const r = c.getBoundingClientRect(); const s = r.width / 1280;
      root.style.left = r.left + 'px'; root.style.top = r.top + 'px'; root.style.transform = `scale(${s})`;
    };
    window.addEventListener('resize', () => setTimeout(fit, 50)); g.scale.on('resize', fit); setInterval(fit, 1000); setTimeout(fit, 100);
  },
  isOpen() { return !!current && blocking; },
  toggle(name: string) { if (current === name) UI.close(); else if (!UI.isOpen()) UI.open(name); },
  refresh() { if (current) render(); },
  close(force = false) {
    if (!force && (current === 'dialog' || current === 'death' || current === 'results' || current === 'ending' || current === 'pvpResult')) return;
    if (current === 'arena') { if (pvp.status === 'queued' || pvp.status === 'room') pvp.cancel(); currentOpts?.cleanup?.(); }
    if (current && current !== 'title') sfx('click', 0.4);
    current = ''; blocking = false; panel.innerHTML = ''; panel.className = ''; overlay.className = '';
  },
  open(name: string, opts: any = {}) {
    if (!S && !['title', 'settings', 'help', 'login', 'charSelect', 'charCreate', 'rank'].includes(name)) return;
    if (current === 'arena' && name !== 'arena') { if (pvp.status === 'queued' || pvp.status === 'room') pvp.cancel(); currentOpts?.cleanup?.(); }
    current = name; currentOpts = opts; blocking = true; sfx('click', 0.4);
    overlay.className = name === 'dialog' ? '' : 'on';
    panel.className = 'p-' + name; render();
  },
  toast(msg: string, color = '#ffffff', ms = 2600) {
    const d = document.createElement('div'); d.className = 'toast'; d.style.color = color; d.textContent = msg; toasts.appendChild(d);
    while (toasts.children.length > 5) toasts.firstChild!.remove();
    setTimeout(() => d.classList.add('out'), ms); setTimeout(() => d.remove(), ms + 500);
  },
  banner(title: string, sub = '', ms = 2200) {
    const b = document.getElementById('banner')!; b.innerHTML = `<div class="bt">${esc(title)}</div><div class="bs">${esc(sub)}</div>`; b.className = 'on';
    clearTimeout((b as any)._t); (b as any)._t = setTimeout(() => (b.className = ''), ms);
  },
  bossIntro(name: string, title: string, intro: string) {
    const b = document.getElementById('banner')!; b.innerHTML = `<div class="bs">${esc(title)}</div><div class="bt boss">${esc(name)}</div><div class="bs">${esc(intro)}</div>`; b.className = 'on boss';
    clearTimeout((b as any)._t); (b as any)._t = setTimeout(() => (b.className = ''), intro ? 2600 : 1400);
  },
  dialog(lines: string[], cb?: () => void) { dialogCb = cb || null; UI.open('dialog', { lines, i: 0 }); },
  results(o: any) { UI.open('results', o); },
  death(o: any) { UI.open('death', o); },
};

function advanceDialog() {
  const o = currentOpts; o.i++; sfx('page', 0.4);
  if (o.i >= o.lines.length) { current = ''; blocking = false; panel.innerHTML = ''; panel.className = ''; overlay.className = ''; const cb = dialogCb; dialogCb = null; cb?.(); }
  else render();
}

function render() {
  const o = currentOpts; let h = '';
  switch (current) {
    case 'title': h = accTitle(ctx()); break;
    case 'login': h = renderLogin(ctx()); break;
    case 'charSelect': h = renderCharSelect(ctx()); break;
    case 'charCreate': h = renderCharCreate(ctx()); break;
    case 'arena': h = renderArena(ctx()); break;
    case 'pvpResult': h = renderPvpResult(ctx()); break;
    case 'rank': h = renderRank(ctx()); break;
    case 'menu': h = `<h2>메뉴</h2><div class="col">
      <button data-a="close">계속하기</button><button data-a="open:inventory">가방 (I)</button><button data-a="open:quest">퀘스트 (J)</button><button data-a="open:traits">특성 · 스킬 (K)</button>
      <button data-a="open:settings">설정</button><button data-a="open:help">도움말 (F1)</button>${world()?.mode && world().mode !== 'town' ? `<button data-a="leave">${world().mode === 'pvp' ? '기권하고 나가기' : '마을로 귀환'}</button>` : ''}${world()?.mode === 'town' ? '<button data-a="open:arena">투기장 (PvP)</button>' : ''}<button data-a="open:rank">랭킹</button>${pwaButton()}<button data-a="toTitle" class="dim-btn">저장 후 타이틀로</button></div>`; break;
    case 'inventory': h = renderInventory(); break;
    case 'quest': h = renderQuest(); break;
    case 'board': h = renderBoard(); break;
    case 'shop': h = renderShop(); break;
    case 'smith': h = renderSmith(); break;
    case 'traits': h = renderTraits(); break;
    case 'travel': h = renderTravel(); break;
    case 'settings': h = renderSettings(); break;
    case 'help': h = renderHelp(); break;
    case 'dialog': h = `<div class="dlg"><div class="dl-text">${esc(o.lines[o.i])}</div><div class="dl-next">▼ Space / 클릭 (${o.i + 1}/${o.lines.length})</div></div>`; break;
    case 'results': h = `<h2 class="gold">${esc(o.title)}</h2><div class="res-grid">
        <div>전투 시간<b>${Math.floor(o.time / 60)}:${String(Math.floor(o.time % 60)).padStart(2, '0')}</b></div><div>최고 콤보 랭크<b class="rank-${o.rank}">${o.rank}</b></div>
        <div>패링 성공<b>${o.parries}</b></div><div>피격<b>${o.hurt}</b></div><div>획득 경험치<b>+${o.xp.toLocaleString()}</b></div></div>
        <div class="loot">${o.lines.map((l: string) => `<div>· ${esc(l)}</div>`).join('')}${o.items.map((it: Item) => `<div class="lootitem">${itemIcon(it)} ${itemName(it)}</div>`).join('')}</div>
        <button data-a="closeResults" class="primary">확인 (Enter)</button>`; break;
    case 'death': h = `<h2 class="red">쓰러졌다…</h2><div class="dim">사망 원인: ${esc(o.cause || '알 수 없음')}</div>
        ${o.boss ? `<div class="dim">${esc(o.boss)} 남은 HP ${Math.round(o.hpLeft * 100)}% — 장비·경험치 손실 없음</div>` : '<div class="dim">장비·경험치 손실 없음</div>'}
        <div class="tip">팁: 청록 테두리 공격은 F로 패링, 붉은 이중 테두리는 Space 대시(무적 프레임)로 회피하세요.</div>
        <div class="row">${o.retry ? '<button data-a="retry" class="primary">즉시 재도전 (체크포인트)</button>' : ''}<button data-a="deathTown">마을로 귀환</button></div>`; break;
    case 'ending': h = renderEnding(); break;
  }
  panel.innerHTML = h;
}

// ---------- 타이틀 ----------
function pwaButton() {
  if (isStandalone()) return '';
  return canInstall() ? '<button data-a="install" class="pwa">⬇ 앱으로 설치 (PWA)</button>' : '<button data-a="installHelp" class="pwa">⬇ 앱 설치 방법</button>';
}
// ---------- 인벤토리 ----------
function renderInventory() {
  const st = computeStats(); const sel: Item | undefined = currentOpts.sel ? S.inventoryItems.find((i) => i.uuid === currentOpts.sel) : undefined;
  const eqHtml = SLOTS.map((s) => {
    const it = equipped(s.id); const open = slotOpen(s.id);
    return `<div class="eslot ${open ? '' : 'locked'} ${sel && sel.uuid === it?.uuid ? 'sel' : ''}" ${it ? `data-a="sel:${it.uuid}"` : ''}><div class="sl">${s.name}</div>${it ? itemIcon(it) : open ? '<span class="ico empty"></span>' : `<span class="lockt">Lv${s.open}</span>`}</div>`;
  }).join('');
  const sort = currentOpts.sort || 'rar';
  const bag = S.inventoryItems.filter((i) => !isEquipped(i)).sort((a, b) => sort === 'rar' ? rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.itemLevel - a.itemLevel : sort === 'lv' ? b.itemLevel - a.itemLevel : a.slot.localeCompare(b.slot));
  const bagHtml = bag.map((it) => `<div class="bslot ${sel?.uuid === it.uuid ? 'sel' : ''}" data-a="sel:${it.uuid}">${itemIcon(it)}${it.upgradeLevel ? `<i>+${it.upgradeLevel}</i>` : ''}</div>`).join('') + Array(Math.max(0, 30 - bag.length)).fill('<div class="bslot"></div>').join('');
  let det = '<div class="dim">아이템을 선택하세요.</div>';
  if (sel) {
    const eq = isEquipped(sel);
    let cmp = '';
    if (!eq) { let slot: Slot = sel.slot; if (slot === 'ring1' || slot === 'ring2') slot = equipped('ring1') && slotOpen('ring2') && !equipped('ring2') ? 'ring2' : 'ring1'; const cur = equipped(slot); cmp = `<div class="cmp"><div class="dim">장착 시 변화${cur ? ` (현재: ${itemName(cur)})` : ''}</div>${statDiff(st, computeStats({ slot, item: sel }))}</div>`; }
    det = itemDetail(sel) + cmp + `<div class="row">${eq ? (sel.slot !== 'weapon' ? `<button data-a="unequip:${Object.entries(S.equipmentItemIds).find(([, v]) => v === sel.uuid)![0]}">해제</button>` : '') : `<button class="primary" data-a="equip:${sel.uuid}">장착</button>${(sel.slot === 'ring1' || sel.slot === 'ring2') && slotOpen('ring2') ? `<button data-a="equipTo:${sel.uuid}:ring2">반지2에 장착</button>` : ''}<button data-a="dismantle:${sel.uuid}">분해 (정수 +${dismantleValue(sel)})</button>`}</div>`;
  }
  const ess = CHAPTERS.map((c) => `${c.essence} ${S.essence[c.id]}`).join(' · ');
  return `<h2>가방 <span class="dim small">${bag.length}/60</span><button class="x" data-a="close">✕</button></h2>
   <div class="inv"><div class="inv-l"><div class="equip">${eqHtml}</div>
     <div class="stats"><div>HP <b>${st.maxHp}</b></div><div>공격력 <b>${st.atk}</b></div><div>방어력 <b>${st.def}</b></div><div>치명타 <b>${pct(st.crit)}</b></div><div>치명 피해 <b>${pct(st.critDmg)}</b></div><div>공격 속도 <b>${st.atkSpd.toFixed(2)}×</b></div><div>쿨감 <b>${pct(st.cdr)}</b></div><div>이동 <b>${st.move}</b></div><div>피해 감소 <b>${pct(st.dr)}</b></div><div>방어 관통 <b>${pct(st.pen)}</b></div></div>
     <div class="dim small">G ${S.gold.toLocaleString()} · ${ess} · 균열석 ${S.riftStone} · 명예 ${S.honor}</div></div>
   <div class="inv-m"><div class="sortbar">정렬: <button data-a="sort:rar" class="${sort === 'rar' ? 'on' : ''}">등급</button><button data-a="sort:lv" class="${sort === 'lv' ? 'on' : ''}">레벨</button><button data-a="sort:slot" class="${sort === 'slot' ? 'on' : ''}">부위</button><button data-a="dismantleCommon">일반·고급 일괄 분해</button></div><div class="bag">${bagHtml}</div></div>
   <div class="inv-r">${det}</div></div>`;
}

// ---------- 퀘스트 ----------
function renderQuest() {
  const q = mainQuest(); const npc = currentOpts.npc; const ch = CHAPTERS[(q?.ch || 5) - 1];
  let body = '';
  if (!q) body = '<div>모든 메인 퀘스트를 완료했습니다. 보스 재도전과 전설 유물 파밍을 즐겨보세요.</div>';
  else if (mainComplete()) body = `<div class="qname">${esc(q.name)}</div><div class="gold">목표 달성!</div><div>보상: ${q.xp.toLocaleString()} XP · ${q.reward}</div>${npc ? '<button class="primary" data-a="turnIn">보고하기</button>' : '<div class="dim">마을의 퀘스트 NPC에게 보고하세요.</div>'}`;
  else if (S.questStates.mainActive) body = `<div class="qname">${esc(q.name)}</div><div>${q.cond} — ${S.questStates.mainProgress}/${q.need}</div><div class="dim">${q.type === 'boss' ? '여행의 문 → 던전에서 챕터 보스를 처치하세요.' : `${ch.field}에서 진행합니다. 여행의 문 → 필드.`}</div>`;
  else { const c = canAcceptMain(); body = `<div class="qname">Lv${q.lv} ${esc(q.name)}</div><div>${q.cond} · 보상 ${q.xp.toLocaleString()} XP + ${q.reward}</div>${npc ? (c.ok ? '<button class="primary" data-a="accept">수락</button>' : `<div class="warn">${c.why}</div>`) : `<div class="dim">${c.ok ? '마을 NPC에게 수락하세요.' : c.why}</div>`}`; }
  const done = (S.questStates.main - 1);
  const list = MAIN_QUESTS.slice(Math.max(0, done - 3), done + 4).map((m) => `<div class="${m.lv < S.questStates.main ? 'done' : m.lv === S.questStates.main ? 'cur' : 'dim'}">Lv${m.lv} ${esc(m.name)} — ${m.cond}</div>`).join('');
  const sd = S.questStates.side ? SIDE_QUESTS.find((x) => x.id === S.questStates.side!.id) : null;
  return `<h2>${npc ? esc(npc) : '퀘스트'}<button class="x" data-a="close">✕</button></h2>
   <div class="story dim">${esc(ch.conflict)}</div><div class="qbox">${body}</div>
   ${sd ? `<div class="qbox"><b>사이드</b> ${sd.id} ${sd.cond} (${S.questStates.side!.progress}/${sd.need})</div>` : ''}
   <div class="qlist">${list}</div><div class="dim small">메인 진행 ${done}/50</div>`;
}
function renderBoard() {
  const ch = S.chapter; const list = SIDE_QUESTS.filter((q) => q.ch <= S.unlockedChapter);
  const cur = S.questStates.side; const curDef = cur && SIDE_QUESTS.find((x) => x.id === cur.id);
  return `<h2>의뢰 게시판<button class="x" data-a="close">✕</button></h2>
  ${curDef ? `<div class="qbox">진행 중: <b>${curDef.id}</b> ${CHAPTERS[curDef.ch - 1].name} — ${curDef.cond} (${cur!.progress}/${curDef.need}) ${cur!.progress >= curDef.need ? '<button class="primary" data-a="sideTurnIn">보고</button>' : '<button data-a="sideAbandon">포기</button>'}</div>` : ''}
  <div class="dim small">보상: 다음 레벨 XP의 15~22% + 골드 · 반복 가능 · 한 번에 1개</div>
  <div class="blist">${list.map((q) => `<div class="bq ${q.ch === ch ? '' : 'dim'}"><b>${q.id}</b> ${CHAPTERS[q.ch - 1].name} · ${q.cond} · 권장 Lv${q.rec[0]}~${q.rec[1]} ${!cur ? `<button data-a="sideAccept:${q.id}">수락</button>` : ''}</div>`).join('')}</div>`;
}

// ---------- 상점 / 대장간 ----------
function renderShop() {
  const p = potionPrice(S.level);
  return `<h2>상점<button class="x" data-a="close">✕</button></h2>
  <div class="shoprow">${ico({ sheet: 'dun', frame: 115 })}<div><b>HP 포션</b><div class="dim">최대 HP 30% 회복 · 쿨다운 15초 · 전투 소지 3개</div></div><div>${p} G</div><button data-a="buyPot:1">구매</button><button data-a="buyPot:5">×5</button></div>
  <div class="dim">보유 포션 ${S.potions} · 골드 ${S.gold.toLocaleString()}</div>
  <div class="dim small">장비 감정은 무료입니다. 분해·재련·제작·강화는 대장장이에게.</div>`;
}
function renderSmith() {
  const sel = currentOpts.sel ? S.inventoryItems.find((i) => i.uuid === currentOpts.sel) : null;
  const items = [...S.inventoryItems].filter((i) => i.slot !== 'relic').sort((a, b) => Number(isEquipped(b)) - Number(isEquipped(a)) || rarityIndex(b.rarity) - rarityIndex(a.rarity));
  let det = '<div class="dim">강화할 장비를 선택하세요.</div>';
  if (sel) {
    const e = ENHANCE[sel.upgradeLevel + 1]; const ch = chOf(sel);
    det = itemDetail(sel) + (e ? `<div class="qbox">다음 강화 +${sel.upgradeLevel + 1}: 주 능력치 누적 +${Math.round(e.pct * 100)}% · 성공률 <b>${Math.round(e.rate * 100)}%</b><br>비용 ${e.gold.toLocaleString()} G / ${CHAPTERS[ch - 1].essence} ${e.ess} (보유 ${S.essence[ch]})<br><span class="dim">실패 시 강화 단계 유지 · 파괴/하락 없음</span></div><button class="primary" data-a="enhance:${sel.uuid}">강화</button>` : '<div class="gold">최대 강화</div>')
      + (RAR[sel.rarity].opts ? `<div class="qbox">옵션 재련: ${rerollCost(sel.itemLevel)} G + 정수 3 <button data-a="reroll:${sel.uuid}">재련</button></div>` : '');
  }
  return `<h2>대장장이<button class="x" data-a="close">✕</button></h2><div class="inv"><div class="inv-m"><div class="bag">${items.map((it) => `<div class="bslot ${sel?.uuid === it.uuid ? 'sel' : ''} ${isEquipped(it) ? 'eq' : ''}" data-a="ssel:${it.uuid}">${itemIcon(it)}${it.upgradeLevel ? `<i>+${it.upgradeLevel}</i>` : ''}</div>`).join('')}</div>
   <div class="qbox">무기 제작 (iLv ${S.level}, 희귀 이상): ${craftCost(S.level).toLocaleString()} G + ${CHAPTERS[Math.min(5, Math.ceil(S.level / 10)) - 1].essence} 12 <button data-a="craft">제작</button></div></div><div class="inv-r">${det}</div></div>`;
}

// ---------- 특성 / 스킬 ----------
function moveRow(k: string, m: Move) {
  const lock = m.unlock && S.level < m.unlock;
  return `<tr class="${lock ? 'dim' : ''}"><td>${k}</td><td>${m.name}</td><td>${m.hits ? `${(m.coef * m.hits).toFixed(2)} (${m.hits}히트)` : m.coef.toFixed(2)}</td><td>${m.cd ? m.cd + 's' : m.dur + 's'}</td><td>${lock ? `Lv${m.unlock}` : ''}${m.mp ? ` MP ${m.mp}` : ''}${m.res ? ` 자원 ${m.res}` : ''}</td></tr>`;
}
function renderTraits() {
  const c = cls();
  const tr = c.traits.map((t) => {
    const ch = S.traitChoices[t.lv]; const open = S.level >= t.lv;
    return `<div class="trait ${open ? '' : 'dim'}"><div class="tl">Lv${t.lv}</div>${t.opts.map((o, i) => `<div class="topt ${ch === i ? 'on' : ''} ${ch !== undefined && ch !== i ? 'off' : ''}" ${open && ch === undefined ? `data-a="trait:${t.lv}:${i}"` : ''}><b>${o.name}</b><div class="small">${o.desc}</div></div>`).join('')}</div>`;
  }).join('');
  const combos = Object.entries(c.combos).map(([k, v]) => `<tr><td>${k.split('').join('-')}</td><td>${v.name}</td><td>${v.total.toFixed(2)}</td><td colspan="2">${v.desc}</td></tr>`).join('');
  return `<h2>${c.name} · 특성과 스킬<button class="x" data-a="close">✕</button></h2>
   <div class="dim small">특성은 슬롯당 2개 중 1개를 선택합니다. 스킬 재분배는 언제든 무료입니다(기획서 10.2).</div>
   <div class="traits">${tr}</div><button data-a="respec" class="small-btn">특성 재분배 (무료)</button>
   <table class="skills"><tr><th>키</th><th>기술</th><th>계수</th><th>길이/CD</th><th></th></tr>${c.L.map((m, i) => moveRow('L' + (i + 1), m)).join('')}${moveRow('H', c.H)}${moveRow('Q', c.Q)}${moveRow('E', c.E)}${moveRow('F→L', c.C)}${moveRow('R', c.R)}</table>
   <table class="skills"><tr><th>커맨드</th><th>콤보</th><th>총 계수</th><th colspan="2">효과</th></tr>${combos}</table>`;
}

// ---------- 이동 ----------
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const ROOM_NAME: Record<string, string> = { s: '시작', n: '전투', e: '정예', p: '퍼즐', t: '함정', c: '체크포인트', b: '보스' };
// 던전 입장 조건: 챕터 해금 → (최종 던전은 중간보스 격파) → 레벨
function dungeonLock(c: ChapterDef, i: number): string {
  const d = c.dungeons[i];
  if (c.id > S.unlockedChapter) return `챕터 ${ROMAN[c.id - 2]} 최종보스 격파 필요`;
  if (i === 1 && !((S.clearedBosses[c.mid] || 0) > 0)) return `${BOSS[c.mid].name} 격파 필요`;
  const need = i === 0 ? d.lv[0] : d.lv[1];
  return S.level >= need ? '' : `Lv${need} 필요`;
}
function dungeonDetail(c: ChapterDef, i: number) {
  const d = c.dungeons[i], b = BOSS[d.boss], lock = dungeonLock(c, i), clears = S.clearedBosses[d.boss] || 0;
  const mid = Math.ceil(d.rooms.length / 2);
  const course = ['s', ...d.rooms.slice(0, mid), 'c', ...d.rooms.slice(mid), 'b'].map((r) => `<span class="droom r-${r}">${ROOM_NAME[r]}</span>`).join('<span class="dim">›</span>');
  const known = c.id <= S.unlockedChapter; // 해금 전 지역은 보스 패턴을 숨김
  return `<div class="ddet">
    <div class="dim small">챕터 ${ROMAN[c.id - 1]} · ${c.name}</div>
    <div class="dtitle">${d.name}</div>
    <div class="dgrid"><span class="dim">권장 레벨</span><b>Lv${d.lv[0]}~${d.lv[1]}</b><span class="dim">위험 요소</span><b>${c.hazard}</b>
      <span class="dim">보상</span><b>${d.reward}</b><span class="dim">클리어</span><b>${clears ? `${clears}회` : '없음'}</b></div>
    <h3>방 구성 <span class="dim small">방 ${d.rooms.length}개 + 체크포인트</span></h3><div class="dcourse">${course}</div>
    <h3>${b.role === 'final' ? '최종보스' : '중간보스'} · ${b.name} <span class="dim small">Lv${b.lv}</span></h3>
    <div class="dim small">${b.intro}</div>
    ${known ? `<div class="dpat">${b.patterns.map((p) => `<span>${p.name}</span>`).join('')}</div>` : '<div class="dim small">아직 알려지지 않은 지역 — 패턴 정보 비공개</div>'}
    <button class="primary big" data-a="go:dungeon:${c.id}:${i}" ${lock ? 'disabled' : ''}>${lock ? '🔒 ' + lock : '입장'}</button>
  </div>`;
}
function renderTravel() {
  const ch = CHAPTERS[S.chapter - 1];
  // 선택: 저장된 선택 → 현재 챕터에서 입장 가능하고 미클리어인 던전 → 현재 챕터 첫 던전
  if (!currentOpts.dsel) {
    const i = ch.dungeons.findIndex((d, k) => !dungeonLock(ch, k) && !(S.clearedBosses[d.boss] || 0));
    currentOpts.dsel = `${ch.id}:${Math.max(0, i)}`;
  }
  const [sc, si] = String(currentOpts.dsel).split(':').map(Number);
  const list = CHAPTERS.map((c) => `<div class="dch ${c.id === ch.id ? 'cur' : ''}"><div class="dchn">챕터 ${ROMAN[c.id - 1]} · ${c.name}${c.id === ch.id ? ' <span class="gold small">현재</span>' : ''}</div>${c.dungeons.map((d, i) => {
    const lock = dungeonLock(c, i), done = (S.clearedBosses[d.boss] || 0) > 0;
    const st = done ? '<span class="dok">✓ 클리어</span>' : lock ? `<span class="dim">🔒 ${lock}</span>` : '<span class="gold">입장 가능</span>';
    return `<button class="dbtn ${c.id === sc && i === si ? 'on' : ''} ${lock ? 'locked' : ''}" data-a="dsel:${c.id}:${i}"><span>${d.name} <span class="dim small">Lv${d.lv[0]}~${d.lv[1]}</span></span><span class="small">${st}</span></button>`;
  }).join('')}</div>`).join('');
  const towns = CHAPTERS.filter((c) => c.id <= S.unlockedChapter && c.id !== ch.id).map((c) => `<button data-a="go:town:${c.id}">${c.town} (${c.name})</button>`).join('');
  const cleared = BOSSES.filter((b) => (S.clearedBosses[b.id] || 0) > 0).map((b) => `<button data-a="go:boss:${b.ch}:${b.id}">${b.name} <span class="dim">Lv${b.lv} · 오늘 ${bossDailyCount(b.id)}/3</span></button>`).join('');
  return `<h2>여행의 문<button class="x" data-a="close">✕</button></h2>
  <div class="travel"><button class="primary" data-a="go:field:${ch.id}">필드: ${ch.field} <span class="dim">Lv${ch.range[0]}~${ch.range[1]}</span></button></div>
  <h3>던전</h3><div class="dsel"><div class="dlist">${list}</div>${dungeonDetail(CHAPTERS[sc - 1], si)}</div>
  ${towns ? `<h3>다른 마을</h3><div class="travel">${towns}</div>` : ''}
  ${cleared ? `<h3>보스 재도전 <span class="dim small">하루 3회 보상, 이후 30%</span></h3><div class="travel">${cleared}</div>` : ''}`;
}

// ---------- 설정 / 도움말 / 엔딩 ----------
function renderSettings() {
  const st = S?.settings || { sfx: 0.7, bgm: 0.45, shake: true, patternName: true, photosensitive: false, dmgNumbers: true, fps30: false, hints: true };
  const tg = (k: string, label: string) => `<label class="tg"><input type="checkbox" data-s="${k}" ${(st as any)[k] ? 'checked' : ''}> ${label}</label>`;
  return `<h2>설정<button class="x" data-a="${S ? 'close' : 'open:title'}">✕</button></h2>
  <label class="sl">효과음 <input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-s="sfx"></label>
  <label class="sl">배경음 <input type="range" min="0" max="1" step="0.05" value="${st.bgm}" data-s="bgm"></label>
  ${tg('shake', '화면 흔들림')}${tg('patternName', '보스 패턴명 표시')}${tg('dmgNumbers', '피해 숫자 표시')}${tg('photosensitive', '광과민 보호 모드 (섬광·흔들림·슬로우 완화)')}${tg('fps30', '30fps 제한 (저사양, 새로고침 후 적용)')}
  ${S ? `<div class="row"><button data-a="exportSave">세이브 내보내기</button><button data-a="importSave">세이브 가져오기</button><button data-a="wipe" class="danger">세이브 삭제</button></div>` : ''}
  <div class="dim small">세이브는 브라우저에 자동 저장되며 직전 저장본 2개를 번갈아 보관합니다.</div>`;
}
function renderHelp() {
  return `<h2>조작법 · 전투 가이드<button class="x" data-a="${S ? 'close' : 'open:title'}">✕</button></h2><div class="help">
  <div><b>WASD</b> 이동 · <b>마우스</b> 조준 · <b>좌클릭</b> 약공격(L, 길게 누르면 연타) · <b>우클릭</b> 강공격(H)</div>
  <div><b>Space/Shift</b> 대시 (70~190ms 무적, CD 1.2초) · <b>F</b> 패링 (120ms) · <b>Q/E</b> 스킬 (Lv4/Lv8) · <b>R</b> 궁극기 (Lv20)</div>
  <div><b>1</b> 포션 (30% 회복, 300ms 준비동작 — 맞으면 취소, 포션은 유지) · <b>G</b> 상호작용 · <b>I</b> 가방 · <b>J</b> 퀘스트 · <b>K</b> 특성</div>
  <div><b>게임패드</b> 왼스틱 이동 · X 약공격 · Y 강공격 · B 대시 · LB 패링 · RB Q · RT E · LT R · A 상호작용 · ↑ 포션</div>
  <h3>공격 예고</h3><div><span style="color:#30f0e0">청록 테두리 + ⚔</span> = 패링 가능 · <span style="color:#ff4058">붉은 이중 테두리 + !</span> = 패링 불가 (대시로 회피) · <span style="color:#60ff90">초록</span> = 안전 지대</div>
  <h3>콤보 체인 (700ms 안에 이어서 입력)</h3><div>L-L-L · L-L-H · L-H-H · <b>대시 직후</b> L-H · <b>패링 성공 후 450ms 안에 L</b> → 반격, 이어서 H</div>
  <h3>콤보 랭크</h3><div>명중 L10 · H17 · Q/E 22 · 패링 35 · 완벽 회피 20점. 같은 기술 3연속은 50%. 2.5초 공백부터 초당 -25, 피격 시 -35%. D→C→B→A→S, 랭크가 높을수록 궁극기 충전 +5~20%.</div>
  <h3>진행</h3><div>마을 NPC에게 메인 퀘스트(레벨당 1개)를 받고 필드에서 목표를 달성 → 보고. 던전 1은 중간보스, 던전 2는 챕터 최종보스. 최종보스를 잡으면 다음 챕터가 열립니다. 사망해도 손실은 없습니다.</div></div>`;
}
function renderEnding() {
  if (S.ending) return `<h2 class="gold">ECLIPSE</h2><div class="story">${S.ending === 'seal' ? '균열은 봉인되었다. 하늘은 다시 하나로 이어지고, 세계는 조용히 숨을 고른다.' : '균열은 다시 세워졌다. 위험을 안은 채로, 세계는 더 넓은 하늘을 얻었다.'}</div><div class="dim">플레이 해 주셔서 감사합니다. Lv50 보스 재도전과 전설·신화 장비 파밍이 계속됩니다.</div><button class="primary" data-a="endingDone">마을로</button>`;
  return `<h2 class="gold">선택의 순간</h2><div class="story">군주는 쓰러졌다. 균열을 만든 최초의 연구자가 남긴 마지막 장치가 당신의 손에 있다.</div>
   <div class="row"><button class="primary" data-a="ending:seal">균열을 봉인한다</button><button data-a="ending:rebuild">균열을 재건한다</button></div><div class="dim small">엔딩 선택은 스토리와 마을 외형만 바꾸며 보상·전투력은 동일합니다.</div>`;
}

// ---------- 이벤트 ----------
function onInput(e: Event) {
  const t = e.target as HTMLInputElement; const k = t.dataset.s; if (!k) return;
  const st: any = S ? S.settings : null; if (!st) return;
  st[k] = t.type === 'checkbox' ? t.checked : parseFloat(t.value);
  if (k === 'bgm') music.setVolume(st.bgm);
  if (k === 'fps30') localStorage.setItem('eclipse_fps30', t.checked ? '1' : '0');
  persist();
}
function ctx(): Ctx { return { opts: currentOpts, render, open: UI.open, close: UI.close, toast: UI.toast, startWorld, pwaButton }; }
function onClick(e: MouseEvent) {
  if (current === 'dialog') { advanceDialog(); return; }
  const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement; if (!el || (el as any).disabled) return;
  const a = el.dataset.a!; const [cmd, p1] = a.split(':');
  accountAction(cmd, p1, ctx()).then((handled) => { if (!handled) clickAction(a, el); }).catch((err) => UI.toast(String(err?.message || err), '#ff9a9a'));
}
function startWorld(d: any) {
  UI.close(true); if (S) music.setVolume(S.settings.bgm);
  if (game.scene.isActive('Title')) game.scene.stop('Title');
  if (game.scene.isActive('World')) (game.scene.getScene('World') as any).travel(d);
  else game.scene.start('World', d);
}
function clickAction(a: string, _el: HTMLElement) {
  const [cmd, p1, p2, p3] = a.split(':'); const W = world();
  switch (cmd) {
    case 'close': UI.close(); break;
    case 'open': UI.open(p1); break;
    case 'install': promptInstall().then(() => render()); break;
    case 'installHelp': UI.toast(location.protocol === 'file:' ? 'PWA 설치는 http(s) 서버에서 열어야 합니다 (npm run preview).' : '브라우저 주소창 오른쪽의 설치 아이콘(⊕) 또는 메뉴 → "앱 설치"를 사용하세요.', '#9fe0ff', 5000); break;
    case 'leave': UI.close(true); W?.travel({ mode: 'town', ch: S.chapter }); break;
    case 'toTitle': persist(); if (W?.mode === 'pvp') pvp.leave(); leaveToTitle(); UI.close(true); game.scene.stop('World'); game.scene.stop('Hud'); music.stop(); game.scene.start('Title'); break;
    case 'sel': currentOpts.sel = p1; render(); break;
    case 'dsel': currentOpts.dsel = `${p1}:${p2}`; render(); break;
    case 'ssel': currentOpts.sel = p1; render(); break;
    case 'sort': currentOpts.sort = p1; render(); break;
    case 'equip': case 'equipTo': { const it = S.inventoryItems.find((i) => i.uuid === p1)!; const err = equipItem(it, p2 as Slot | undefined); if (err) UI.toast(err, '#ff9a9a'); else sfx('confirm', 0.5); render(); break; }
    case 'unequip': unequip(p1 as Slot); render(); break;
    case 'dismantle': { const it = S.inventoryItems.find((i) => i.uuid === p1)!; const err = dismantle(it); if (err) UI.toast(err, '#ff9a9a'); else { sfx('anvil', 0.5); currentOpts.sel = null; } render(); break; }
    case 'dismantleCommon': { let n = 0; for (const it of [...S.inventoryItems]) if (!isEquipped(it) && (it.rarity === 'common' || it.rarity === 'uncommon') && it.upgradeLevel === 0 && it.slot !== 'relic') { dismantle(it); n++; } UI.toast(`${n}개 분해`, '#a0c8ff'); render(); break; }
    case 'accept': acceptMain(); sfx('confirm', 0.6); UI.toast('퀘스트 수락: ' + mainQuest().name, '#ffd76a'); render(); break;
    case 'turnIn': { const r = turnInMain(); if (r) { sfx('victory', 0.6); UI.toast(`퀘스트 완료! +${r.q.xp} XP · ${r.rew}`, '#ffd76a', 3500); } render(); break; }
    case 'sideAccept': S.questStates.side = { id: p1, progress: 0 }; persist(); sfx('confirm', 0.5); render(); W?.events?.emit('quest'); break;
    case 'sideAbandon': S.questStates.side = null; persist(); render(); break;
    case 'sideTurnIn': { const r = sideReward(); if (r) { sfx('victory', 0.5); UI.toast(`의뢰 완료! +${r.xp} XP, +${r.gold} G`, '#9fe0ff', 3000); } render(); break; }
    case 'buyPot': { const n = +p1; const cost = potionPrice(S.level) * n; if (S.gold < cost) { UI.toast('골드가 부족합니다', '#ff9a9a'); sfx('error'); break; } S.gold -= cost; S.potions += n; sfx('coin', 0.6); persist(); if (W?.player) W.player.potionBelt = Math.min(3, S.potions); render(); break; }
    case 'enhance': { const it = S.inventoryItems.find((i) => i.uuid === p1)!; const r = enhance(it); UI.toast(r.msg, r.ok ? '#7dff9a' : '#ff9a9a'); sfx(r.ok ? 'anvil' : 'error', 0.7); render(); break; }
    case 'reroll': { const it = S.inventoryItems.find((i) => i.uuid === p1)!; const err = reroll(it); if (err) UI.toast(err, '#ff9a9a'); else sfx('anvil', 0.6); render(); break; }
    case 'craft': { const r = craftWeapon(); if (r.err) UI.toast(r.err, '#ff9a9a'); else { UI.toast(`제작 완료: ${RAR[r.it.rarity].name} ${r.it.name}`, RAR[r.it.rarity].color); sfx('anvil', 0.8); } render(); break; }
    case 'trait': S.traitChoices[+p1] = +p2; persist(); sfx('confirm', 0.6); W?.player?.refreshStats(); render(); break;
    case 'respec': S.traitChoices = {}; persist(); W?.player?.refreshStats(); render(); break;
    case 'go': {
      if (p1 === 'town') startWorld({ mode: 'town', ch: +p2 });
      if (p1 === 'field') startWorld({ mode: 'field', ch: +p2 });
      if (p1 === 'dungeon') startWorld({ mode: 'dungeon', ch: +p2, dungeon: +p3, room: 0 });
      if (p1 === 'boss') startWorld({ mode: 'boss', ch: +p2, bossId: p3, rematch: true });
      break;
    }
    case 'closeResults': { const cb = currentOpts.onClose; UI.close(true); cb?.(); break; }
    case 'retry': { const cb = currentOpts.retry; UI.close(true); cb?.(); break; }
    case 'deathTown': { const cb = currentOpts.town; UI.close(true); cb?.(); break; }
    case 'ending': S.ending = p1 as any; S.honor += 50; persist(); sfx('victory', 0.8); render(); break;
    case 'endingDone': UI.close(true); startWorld({ mode: 'town', ch: 5 }); break;
    case 'exportSave': { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = `eclipse-save-Lv${S.level}.json`; l.click(); URL.revokeObjectURL(u); break; }
    case 'importSave': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = async () => { try { const o = JSON.parse(await inp.files![0].text()); if (!o.classId) throw 0; localStorage.setItem('eclipse_save_a', JSON.stringify({ ...o, lastSavedAt: Date.now() })); localStorage.setItem('eclipse_slot', 'a'); location.reload(); } catch { UI.toast('올바른 세이브 파일이 아닙니다', '#ff9a9a'); } }; inp.click(); break; }
    case 'wipe': if (confirm('세이브를 삭제할까요? 되돌릴 수 없습니다.')) { deleteSave(); location.reload(); } break;
  }
}
void xpToNext; void cumulativeXp; void pendingTraits;
