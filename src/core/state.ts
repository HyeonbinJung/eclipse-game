// 저장 스키마(기획서 13.4) + 성장/인벤토리/퀘스트 진행
import Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import { xpToNext, MAX_LEVEL, randi, rerollCost, craftCost, R } from '../data/formulas';
import { Item, makeItem, Slot, SLOTS, ENHANCE, RAR, rarityIndex, rollAffixes, rollRarity, makeRelic, RELIC } from '../data/items';
import { queueUpload } from '../net/api';
import type { Look } from '../game/look';
import { MAIN_QUESTS, SIDE_QUESTS, CHAPTERS, chapterOfLevel } from '../data/world';

export const SCHEMA_VERSION = 1;
export const bus = new Phaser.Events.EventEmitter();

export interface Settings { sfx: number; bgm: number; shake: boolean; patternName: boolean; photosensitive: boolean; dmgNumbers: boolean; fps30: boolean; hints: boolean }
export interface SaveGame {
  schemaVersion: number; accountId?: string; characterId: string; classId: string; name: string; look: Look; level: number; currentXp: number; gold: number;
  attributes: { str: number; vit: number }; skills: Record<string, number>; traitChoices: Record<string, number>;
  equipmentItemIds: Partial<Record<Slot, string>>; inventoryItems: Item[];
  questStates: { main: number; mainActive: boolean; mainProgress: number; side: { id: string; progress: number } | null; sideDone: string[] };
  clearedBosses: Record<string, number>; perBossPityCounts: Record<string, number>; settings: Settings;
  essence: number[]; riftStone: number; honor: number; potions: number; chapter: number; unlockedChapter: number;
  seenStory: string[]; ending?: 'seal' | 'rebuild'; bossDaily: { date: string; counts: Record<string, number> };
  playTimeSec: number; lastSavedAt: number; tutorialDone: boolean; firstCombatAt?: number;
}

export let S: SaveGame = null as any;

export const defaultSettings = (): Settings => ({ sfx: 0.7, bgm: 0.45, shake: true, patternName: true, photosensitive: false, dmgNumbers: true, fps30: false, hints: true });

export function newGame(classId: string, name = '', look?: Look) {
  S = {
    schemaVersion: SCHEMA_VERSION, characterId: 'c-' + Date.now().toString(36), classId, name: name || '모험가', look: look || { frame: CLASSES[classId].spr.frame, tint: 0xffffff }, level: 1, currentXp: 0, gold: 120,
    attributes: { str: 5, vit: 4 }, skills: {}, traitChoices: {}, equipmentItemIds: {}, inventoryItems: [],
    questStates: { main: 1, mainActive: false, mainProgress: 0, side: null, sideDone: [] },
    clearedBosses: {}, perBossPityCounts: {}, settings: loadSettingsOnly() || defaultSettings(),
    essence: [0, 0, 0, 0, 0, 0], riftStone: 0, honor: 0, potions: 3, chapter: 1, unlockedChapter: 1,
    seenStory: [], bossDaily: { date: today(), counts: {} }, playTimeSec: 0, lastSavedAt: Date.now(), tutorialDone: false,
  };
  const w = makeItem('weapon', 1, 'common', classId); const a = makeItem('armor', 1, 'common');
  S.inventoryItems.push(w, a); S.equipmentItemIds.weapon = w.uuid; S.equipmentItemIds.armor = a.uuid;
  persist();
}

const today = () => new Date().toISOString().slice(0, 10);
// 저장 네임스페이스: 게스트는 'eclipse_save_', 계정 캐릭터는 'eclipse_u{id}_s{slot}_'
let NS = 'eclipse_save_';
export function setStorageNs(ns: string) { NS = ns; }
const KEY = (s: string) => NS + s;
const SLOTKEY = () => NS + 'slot';

// 저장 실패 대비 직전 세이브 2개 로테이션
export function persist() {
  if (!S) return;
  S.lastSavedAt = Date.now();
  try {
    const slot = localStorage.getItem(SLOTKEY()) === 'a' ? 'b' : 'a';
    localStorage.setItem(KEY(slot), JSON.stringify(S));
    localStorage.setItem(SLOTKEY(), slot);
  } catch (e) { console.warn('save failed', e); }
  queueUpload(S);
}
function readSlot(s: string): SaveGame | null {
  try { const t = localStorage.getItem(KEY(s)); if (!t) return null; const o = JSON.parse(t); return o && o.classId ? o : null; } catch { return null; }
}
export function hasSave() { return !!(readSlot('a') || readSlot('b')); }
export function peekSave() { const a = readSlot('a'), b = readSlot('b'); if (!a) return b; if (!b) return a; return a.lastSavedAt >= b.lastSavedAt ? a : b; }
export function loadGame() {
  const s = peekSave(); if (!s) return false;
  S = migrate(s); return true;
}
// 서버에서 받은 세이브를 로컬 캐시보다 최신이면 채택
export function adoptSave(remote: any) {
  const local = peekSave();
  const pickRemote = remote && (!local || (remote.lastSavedAt || 0) >= (local.lastSavedAt || 0));
  S = migrate(pickRemote ? remote : local);
  try { localStorage.setItem(KEY('a'), JSON.stringify(S)); localStorage.setItem(SLOTKEY(), 'a'); } catch { /* */ }
  return pickRemote ? 'remote' : 'local';
}
export function clearCurrent() { S = null as any; }
function migrate(s: any): SaveGame {
  if (!s.schemaVersion) s.schemaVersion = 1;
  s.settings = { ...defaultSettings(), ...(s.settings || {}) };
  s.bossDaily ||= { date: today(), counts: {} };
  s.seenStory ||= []; s.essence ||= [0, 0, 0, 0, 0, 0];
  s.name ||= '모험가'; s.look ||= { frame: CLASSES[s.classId]?.spr.frame ?? 96, tint: 0xffffff };
  if (s.look.char != null && typeof s.look.char !== 'string') delete s.look.char;
  if (s.look.char === 'carrot') s.look.char = 'fox'; // 19번 칸: 당근 궁수 → 여우 궁수
  return s as SaveGame;
}
export function loadSettingsOnly(): Settings | null { const s = peekSave(); return s ? { ...defaultSettings(), ...s.settings } : null; }
export function deleteSave() { localStorage.removeItem(KEY('a')); localStorage.removeItem(KEY('b')); }
export function ns() { return NS; }

// ---------- 성장 ----------
export const cls = () => CLASSES[S.classId];
export function gainXp(n: number) {
  if (S.level >= MAX_LEVEL || n <= 0) return;
  S.currentXp += Math.round(n);
  bus.emit('xp', n);
  while (S.level < MAX_LEVEL && S.currentXp >= xpToNext(S.level)) {
    S.currentXp -= xpToNext(S.level); S.level++;
    bus.emit('levelup', S.level);
  }
  if (S.level >= MAX_LEVEL) S.currentXp = 0;
}
export function hasTrait(id: string) {
  const c = cls();
  return c.traits.some((t) => S.traitChoices[t.lv] !== undefined && t.opts[S.traitChoices[t.lv]].id === id);
}
export function pendingTraits() { return cls().traits.filter((t) => S.level >= t.lv && S.traitChoices[t.lv] === undefined); }

// ---------- 인벤토리 ----------
export const findItem = (uuid?: string) => S.inventoryItems.find((i) => i.uuid === uuid);
export const equipped = (slot: Slot) => findItem(S.equipmentItemIds[slot]);
export const isEquipped = (it: Item) => Object.values(S.equipmentItemIds).includes(it.uuid);
export function slotOpen(slot: Slot) { return S.level >= SLOTS.find((s) => s.id === slot)!.open; }
export function equipItem(it: Item, slot?: Slot) {
  let target: Slot = slot || it.slot;
  if (it.slot === 'ring1' || it.slot === 'ring2') target = slot || (slotOpen('ring2') && equipped('ring1') && !equipped('ring2') ? 'ring2' : it.slot === 'ring2' && slotOpen('ring2') ? 'ring2' : 'ring1');
  if (!slotOpen(target)) return `${SLOTS.find((s) => s.id === target)!.name} 슬롯은 Lv${SLOTS.find((s) => s.id === target)!.open}에 개방됩니다.`;
  if (it.relicId && S.level < RELIC[it.relicId].lv) return `권장 레벨 ${RELIC[it.relicId].lv} 이상에서 장착할 수 있습니다.`;
  if (it.slot === 'weapon' && it.cls && it.cls !== S.classId) return '다른 직업의 무기입니다.';
  for (const k of Object.keys(S.equipmentItemIds) as Slot[]) if (S.equipmentItemIds[k] === it.uuid) delete S.equipmentItemIds[k];
  S.equipmentItemIds[target] = it.uuid;
  bus.emit('stats'); persist(); return null;
}
export function unequip(slot: Slot) { if (slot === 'weapon') return; delete S.equipmentItemIds[slot]; bus.emit('stats'); persist(); }
export const INV_MAX = 60;
export function addItem(it: Item) {
  if (S.inventoryItems.filter((i) => !isEquipped(i)).length >= INV_MAX) { autoDismantle(it); return false; }
  S.inventoryItems.push(it); bus.emit('item', it); return true;
}
function autoDismantle(it: Item) { const e = dismantleValue(it); S.essence[chOf(it)] += e; bus.emit('toast', `가방이 가득 차 ${it.name}을(를) 자동 분해했습니다 (+정수 ${e})`); }
export const chOf = (it: Item) => Math.min(5, Math.max(1, Math.ceil(it.itemLevel / 10)));
export function dismantleValue(it: Item) {
  // 분해: 골드 0 / 정수 반환 25% (강화 투자분 포함)
  let invested = 0; for (let i = 1; i <= it.upgradeLevel; i++) invested += ENHANCE[i]!.ess;
  return Math.max(1, rarityIndex(it.rarity) + 1 + Math.floor(invested * 0.25));
}
export function dismantle(it: Item) {
  if (isEquipped(it)) return '장착 중인 장비는 분해할 수 없습니다.';
  S.inventoryItems = S.inventoryItems.filter((i) => i !== it);
  S.essence[chOf(it)] += dismantleValue(it); persist(); return null;
}
export function enhance(it: Item) {
  if (it.slot === 'relic') return { ok: false, msg: '유물은 강화할 수 없습니다.' };
  const next = it.upgradeLevel + 1; const e = ENHANCE[next];
  if (!e) return { ok: false, msg: '최대 강화 단계입니다.' };
  const ch = chOf(it);
  if (S.gold < e.gold) return { ok: false, msg: '골드가 부족합니다.' };
  if (S.essence[ch] < e.ess) return { ok: false, msg: '정수가 부족합니다.' };
  S.gold -= e.gold; S.essence[ch] -= e.ess;
  const success = Math.random() < e.rate;
  if (success) it.upgradeLevel = next; // 실패 시 강화 유지(파괴·하락 없음)
  bus.emit('stats'); persist();
  return { ok: success, msg: success ? `강화 성공! +${next}` : '강화 실패 — 단계는 유지됩니다.' };
}
export function reroll(it: Item) {
  const cost = rerollCost(it.itemLevel); const ch = chOf(it);
  if (it.slot === 'relic' || RAR[it.rarity].opts === 0) return '재련할 옵션이 없습니다.';
  if (S.gold < cost || S.essence[ch] < 3) return '골드 또는 정수가 부족합니다.';
  S.gold -= cost; S.essence[ch] -= 3; rollAffixes(it, RAR[it.rarity].opts); bus.emit('stats'); persist(); return null;
}
export function craftWeapon() {
  const il = S.level; const ch = chapterOfLevel(il); const cost = craftCost(il);
  if (S.gold < cost || S.essence[ch] < 12) return { err: `골드 ${cost}, ${ch}장 정수 12개가 필요합니다.` } as any;
  S.gold -= cost; S.essence[ch] -= 12;
  const it = makeItem('weapon', il, rollRarity(2, il >= 45), S.classId); addItem(it); persist(); return { it };
}

// ---------- 퀘스트 ----------
export const mainQuest = () => MAIN_QUESTS[S.questStates.main - 1];
export function canAcceptMain() {
  const q = mainQuest(); if (!q) return { ok: false, why: '모든 메인 퀘스트를 완료했습니다.' };
  if (S.questStates.mainActive) return { ok: false, why: '이미 진행 중입니다.' };
  if (S.level < q.lv - 1) return { ok: false, why: `Lv${q.lv - 1} 이상 필요 (사냥·사이드 퀘스트로 경험치를 모으세요)` };
  if (q.ch > S.unlockedChapter) return { ok: false, why: '이전 챕터 최종보스를 먼저 격파하세요.' };
  return { ok: true, why: '' };
}
export function acceptMain() { S.questStates.mainActive = true; S.questStates.mainProgress = 0; persist(); bus.emit('quest'); }
export function questProgress(type: string, n = 1, extra?: string) {
  const q = mainQuest();
  if (q && S.questStates.mainActive && q.type === type && S.questStates.mainProgress < q.need) {
    if (type !== 'boss' || extra === CHAP_FINAL(q.ch)) {
      S.questStates.mainProgress = Math.min(q.need, S.questStates.mainProgress + n);
      bus.emit('quest'); if (S.questStates.mainProgress >= q.need) bus.emit('toast', `퀘스트 목표 달성: ${q.name} — 마을에 보고하세요`, '#ffd76a');
    }
  }
  const sd = S.questStates.side;
  if (sd) {
    const def = SIDE_QUESTS.find((x) => x.id === sd.id)!;
    const map: Record<string, string> = { kill: 'kill', material: 'smat', elite: 'elites', event: 'event' };
    if (map[def.type] === type || (def.type === 'elite' && type === 'elites')) {
      if (sd.progress < def.need) { sd.progress = Math.min(def.need, sd.progress + n); bus.emit('quest'); if (sd.progress >= def.need) bus.emit('toast', `사이드 퀘스트 ${def.id} 완료 — 게시판에 보고하세요`, '#9fe0ff'); }
    }
  }
}
const CHAP_FINAL = (ch: number) => CHAPTERS[ch - 1].final;
export function mainComplete() { const q = mainQuest(); return q && S.questStates.mainActive && S.questStates.mainProgress >= q.need; }
export function turnInMain() {
  const q = mainQuest(); if (!mainComplete()) return null;
  S.questStates.mainActive = false; S.questStates.mainProgress = 0; S.questStates.main++;
  gainXp(q.xp);
  let rew = '';
  if (q.reward === '정수') { const n = 2 + Math.floor(q.lv / 10); S.essence[q.ch] += n; rew = `${CHAPTERS[q.ch - 1].essence} ×${n}`; }
  if (q.reward === '포션') { S.potions += 2; rew = 'HP 포션 ×2'; }
  if (q.reward === '상자') { const it = makeItem(randomSlotFor(S.level), S.level, rollRarity(1), S.classId); addItem(it); rew = `${RAR[it.rarity].name} ${it.name}`; S.gold += 40 + 8 * S.level; }
  persist(); bus.emit('quest'); return { q, rew };
}
export function sideReward() {
  const sd = S.questStates.side; if (!sd) return null;
  const def = SIDE_QUESTS.find((x) => x.id === sd.id)!; if (sd.progress < def.need) return null;
  const xp = Math.round((S.level >= MAX_LEVEL ? 0 : xpToNext(S.level)) * (0.15 + Math.random() * 0.07));
  const gold = 60 + 12 * S.level;
  gainXp(xp); S.gold += gold; S.questStates.side = null; S.questStates.sideDone.push(def.id); persist(); bus.emit('quest');
  return { xp, gold };
}
export function randomSlotFor(L: number): Slot {
  const open = SLOTS.filter((s) => s.id !== 'relic' && L >= s.open).map((s) => s.id);
  return open[randi(0, open.length - 1)];
}

// ---------- 보스 보상 (10.1 / 6.5 파밍 안전장치) ----------
export function bossDailyCount(id: string) { if (S.bossDaily.date !== today()) S.bossDaily = { date: today(), counts: {} }; return S.bossDaily.counts[id] || 0; }
export function grantBossLoot(bossId: string, lv: number, role: 'mid' | 'final', ch: number) {
  const out: string[] = []; const items: Item[] = [];
  const kills = (S.clearedBosses[bossId] || 0) + 1; S.clearedBosses[bossId] = kills;
  const daily = bossDailyCount(bossId); S.bossDaily.counts[bossId] = daily + 1;
  const mult = daily >= 3 ? 0.3 : 1; // 하루 3회 이후 보상 30%
  const gold = R((role === 'final' ? 240 + 30 * lv : 140 + 22 * lv) * mult); S.gold += gold; out.push(`골드 +${gold}`);
  const ess = Math.max(1, R((role === 'final' ? 6 : 4) * mult)); S.essence[ch] += ess; out.push(`${CHAPTERS[ch - 1].essence} +${ess}`);
  if (kills === 1) { const w = makeItem('weapon', lv, rollRarity(2), S.classId); items.push(w); out.push('첫 처치 보상: 희귀 이상 무기 확정'); }
  if (kills === 3) { S.essence[ch] += 10; out.push('3번째 처치: 영웅 재료(정수 ×10) 확정'); }
  // 전설 천장: 동일 보스 20회 무획득 시 확정
  const pity = (S.perBossPityCounts[bossId] || 0) + 1;
  let legend = Math.random() < 0.02 * mult;
  if (pity >= 21) { legend = true; out.push('천장 도달: 전설 확정'); }
  if (legend) { items.push(makeItem(randomSlotFor(lv), lv, lv >= 45 && Math.random() < 0.1 ? 'myth' : 'legend', S.classId)); S.perBossPityCounts[bossId] = 0; }
  else S.perBossPityCounts[bossId] = pity;
  if (Math.random() < (role === 'final' ? 1 : 0.8) * mult) items.push(makeItem(randomSlotFor(lv), lv, rollRarity(1, lv >= 45), S.classId));
  const relic = Object.values(RELIC).find((r) => r.boss === bossId);
  if (relic && !S.inventoryItems.some((i) => i.relicId === relic.id)) { items.push(makeRelic(relic.id)); out.push(`유물 획득: ${relic.name}`); }
  if (ch === 5) { S.riftStone += 2; }
  if (lv >= 50) { S.honor += 10; out.push('명예 점수 +10'); }
  for (const it of items) addItem(it);
  persist();
  return { lines: out, items };
}
export function debugLevelUp() { if (S && S.level < MAX_LEVEL) gainXp(xpToNext(S.level) - S.currentXp); }
