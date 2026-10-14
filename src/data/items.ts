// 기획서 6장 — 장비 등급·수치·옵션·강화·유물
import { SP, Spr } from './sprites';
import { R, rand, randi, pick } from './formulas';

export type Slot = 'weapon' | 'armor' | 'gloves' | 'boots' | 'ring1' | 'ring2' | 'necklace' | 'relic';
export const SLOTS: { id: Slot; name: string; open: number; desc: string }[] = [
  { id: 'weapon', name: '주무기', open: 1, desc: 'ATK·속성' }, { id: 'armor', name: '갑옷', open: 1, desc: 'DEF·HP' },
  { id: 'gloves', name: '장갑', open: 4, desc: '치명·공속' }, { id: 'boots', name: '신발', open: 6, desc: '이속·회피' },
  { id: 'ring1', name: '반지1', open: 8, desc: '콤보·원소' }, { id: 'ring2', name: '반지2', open: 16, desc: '쿨감·자원' },
  { id: 'necklace', name: '목걸이', open: 20, desc: '전체 능력치' }, { id: 'relic', name: '유물', open: 10, desc: '고유 효과' },
];

export interface Rarity { id: string; name: string; mult: number; w: number; opts: number; unique: boolean; color: string; hex: number }
export const RARITIES: Rarity[] = [
  { id: 'common', name: '일반', mult: 1.0, w: 55, opts: 0, unique: false, color: '#c9ccd4', hex: 0xc9ccd4 },
  { id: 'uncommon', name: '고급', mult: 1.1, w: 27, opts: 1, unique: false, color: '#6fdc6f', hex: 0x6fdc6f },
  { id: 'rare', name: '희귀', mult: 1.25, w: 12, opts: 2, unique: false, color: '#4fa8ff', hex: 0x4fa8ff },
  { id: 'epic', name: '영웅', mult: 1.45, w: 5, opts: 3, unique: false, color: '#c070ff', hex: 0xc070ff },
  { id: 'legend', name: '전설', mult: 1.7, w: 0.9, opts: 2, unique: true, color: '#ffa23a', hex: 0xffa23a },
  { id: 'myth', name: '신화', mult: 1.9, w: 0.1, opts: 3, unique: true, color: '#ff4f70', hex: 0xff4f70 },
];
export const RAR: Record<string, Rarity> = Object.fromEntries(RARITIES.map((r) => [r.id, r]));
export const rarityIndex = (id: string) => RARITIES.findIndex((r) => r.id === id);

export interface AffixDef { name: string; pct: boolean; roll: (il: number) => number }
export const AFFIX: Record<string, AffixDef> = {
  atk: { name: '공격력', pct: false, roll: (il) => Math.max(1, R((1 + 0.5 * il) * rand(0.6, 1))) },
  hp: { name: '최대 HP', pct: false, roll: (il) => Math.max(3, R((5 + 3 * il) * rand(0.6, 1))) },
  def: { name: '방어력', pct: false, roll: (il) => Math.max(1, R((1 + 0.6 * il) * rand(0.6, 1))) },
  crit: { name: '치명타 확률', pct: true, roll: () => randi(2, 8) / 100 },
  critDmg: { name: '치명타 피해', pct: true, roll: () => randi(5, 20) / 100 },
  atkSpd: { name: '공격 속도', pct: true, roll: () => randi(3, 8) / 100 },
  cdr: { name: '쿨다운 감소', pct: true, roll: () => randi(2, 6) / 100 },
  move: { name: '이동 속도', pct: false, roll: () => randi(4, 10) },
  res: { name: '원소 저항', pct: true, roll: () => randi(3, 8) / 100 },
  pen: { name: '방어 관통', pct: true, roll: () => randi(3, 8) / 100 },
  dr: { name: '받는 피해 감소', pct: true, roll: () => randi(2, 5) / 100 },
  ult: { name: '궁극기 충전', pct: true, roll: () => randi(5, 12) / 100 },
  combo: { name: '콤보 점수', pct: true, roll: () => randi(5, 15) / 100 },
};
const POOLS: Record<Slot, string[]> = {
  weapon: ['atk', 'crit', 'critDmg', 'pen', 'atkSpd'],
  armor: ['hp', 'def', 'dr', 'res'],
  gloves: ['crit', 'atkSpd', 'critDmg', 'atk'],
  boots: ['move', 'hp', 'def', 'res'],
  ring1: ['crit', 'critDmg', 'combo', 'res', 'atk'],
  ring2: ['cdr', 'ult', 'crit', 'atk', 'hp'],
  necklace: ['atk', 'hp', 'def', 'crit', 'critDmg', 'cdr', 'ult'],
  relic: [],
};

export const UNIQUES: Record<string, string> = {
  bossDmg: '보스에게 주는 피해 +10%',
  parryHeal: '패링 성공 시 최대 HP 4% 회복',
  critBurn: '치명타 시 화상 부여',
  dashDmg: '대시 후 1초간 피해 +15%',
  execute: 'HP 30% 이하 적에게 피해 +15%',
  sSpeed: 'S랭크 시 공격 속도 +10%',
};

// 6.4 유물 10종
export interface RelicDef { id: string; name: string; lv: number; desc: string; boss: string }
export const RELICS: RelicDef[] = [
  { id: 'ash_seal', name: '잿빛 인장', lv: 10, desc: '삼연참(L-L-L) 최종타 +12%, 동일 타깃 6초 쿨', boss: 'root_guardian' },
  { id: 'tree_heart', name: '나무의 심장', lv: 10, desc: '완벽 회피 성공 시 최대 HP 3% 회복, 12초 CD', boss: 'forest_predator' },
  { id: 'royal_ring', name: '왕실의 반지', lv: 20, desc: '패링 성공 시 적 DEF -10% 4초', boss: 'fallen_king' },
  { id: 'guardian_seal', name: '수호자의 도장', lv: 20, desc: '보스전 중 1회 치명피격 피해 -40%', boss: 'black_captain' },
  { id: 'glacier_eye', name: '빙하의 눈', lv: 30, desc: '빙결/둔화 적 타격 시 +8% 피해', boss: 'frost_queen' },
  { id: 'steel_heart', name: '강철의 심장', lv: 30, desc: 'Poise 피해 +15%', boss: 'frost_hunter' },
  { id: 'ember_idol', name: '불씨의 우상', lv: 40, desc: '화상 적용 시 3초간 이동속도 +8%', boss: 'immortal_avatar' },
  { id: 'crimson_shard', name: '검붉은 파편', lv: 40, desc: 'A랭크 이상 시 치명 +5%', boss: 'lava_predator' },
  { id: 'void_revelation', name: '공허의 계시', lv: 50, desc: '완벽 회피 뒤 1초간 기술 피해 +10%', boss: 'void_executor' },
  { id: 'rift_crown', name: '균열의 왕관', lv: 50, desc: '궁극기 사용 후 게이지 15 환급, 1전투 1회', boss: 'rift_lord' },
];
export const RELIC: Record<string, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// 6.3 강화
export const ENHANCE = [
  null,
  { pct: 0.04, rate: 1.0, gold: 300, ess: 1 }, { pct: 0.08, rate: 1.0, gold: 550, ess: 2 }, { pct: 0.12, rate: 1.0, gold: 900, ess: 3 },
  { pct: 0.16, rate: 0.9, gold: 1400, ess: 4 }, { pct: 0.2, rate: 0.8, gold: 2000, ess: 5 }, { pct: 0.24, rate: 0.65, gold: 2900, ess: 7 },
  { pct: 0.28, rate: 0.5, gold: 4100, ess: 9 }, { pct: 0.32, rate: 0.4, gold: 5700, ess: 12 },
];

export interface Item {
  uuid: string; slot: Slot; itemLevel: number; rarity: string; name: string; cls?: string;
  rolledAffixes: { k: string; v: number }[]; unique?: string; relicId?: string; upgradeLevel: number; bound: boolean;
}

const CH_PREFIX = ['숲지기의', '왕성의', '서리', '잿불', '균열의'];
const BASE_NAMES: Record<Slot, string[]> = {
  weapon: [], armor: ['가죽 갑옷', '사슬 갑옷', '판금 갑옷'], gloves: ['장갑', '손보호대'], boots: ['장화', '각반'],
  ring1: ['반지', '인장 반지'], ring2: ['반지', '고리'], necklace: ['목걸이', '부적'], relic: [],
};
const WEAPON_NAMES: Record<string, string[]> = { blade: ['장검', '세검', '대검'], fist: ['건틀릿', '너클', '권갑'], mage: ['지팡이', '완드', '마도서'], ranger: ['장궁', '단궁', '합성궁'], lancer: ['장창', '미늘창', '기창'] };

export function slotIcon(slot: Slot, cls?: string): Spr {
  switch (slot) {
    case 'weapon': return cls === 'mage' ? SP.staff : cls === 'fist' ? SP.hammer : cls === 'ranger' ? SP.bow : cls === 'lancer' ? SP.spear : SP.sword;
    case 'armor': return SP.shield;
    case 'gloves': return SP.shieldR;
    case 'boots': return SP.sack;
    case 'ring1': case 'ring2': return SP.coin;
    case 'necklace': return SP.target;
    case 'relic': return SP.key;
  }
}

export function itemMain(it: Item) {
  const m = RAR[it.rarity].mult; const il = it.itemLevel;
  const up = 1 + (it.upgradeLevel ? ENHANCE[it.upgradeLevel]!.pct : 0);
  const o: Record<string, number> = {};
  switch (it.slot) {
    case 'weapon': o.atk = R((4 + 1.9 * il) * m * up); break;
    case 'armor': o.def = R((8 + 1.75 * il) * m * up); o.hp = R((2 + 2.6 * il) * m * up); break;
    case 'gloves': o.atk = R((0.5 + 0.15 * il) * m * up); o.crit = 0.02; break;
    case 'boots': o.move = 5; o.def = R((1 + 0.3 * il) * m * up); break;
    case 'ring1': case 'ring2': o.atk = R((0.4 + 0.12 * il) * m * up); break;
    case 'necklace': o.atk = R((0.6 + 0.18 * il) * m * up); o.hp = R((3 + 1.2 * il) * m * up); break;
    case 'relic': break;
  }
  return o;
}

let uid = 0;
export const newUuid = () => Date.now().toString(36) + '-' + (uid++).toString(36) + '-' + Math.random().toString(36).slice(2, 7);

export function rollRarity(minIdx = 0, allowMyth = false) {
  const pool = RARITIES.filter((r, i) => i >= minIdx && (allowMyth || r.id !== 'myth'));
  const tot = pool.reduce((s, r) => s + r.w, 0);
  let x = Math.random() * tot;
  for (const r of pool) { x -= r.w; if (x <= 0) return r.id; }
  return pool[0].id;
}

export function makeItem(slot: Slot, il: number, rarity: string, cls?: string): Item {
  il = Math.max(1, Math.min(50, il));
  const r = RAR[rarity]; const ch = Math.min(5, Math.ceil(il / 10));
  const names = slot === 'weapon' ? WEAPON_NAMES[cls || 'blade'] : BASE_NAMES[slot];
  const it: Item = { uuid: newUuid(), slot, itemLevel: il, rarity, name: `${CH_PREFIX[ch - 1]} ${pick(names)}`, cls: slot === 'weapon' ? cls : undefined, rolledAffixes: [], upgradeLevel: 0, bound: true };
  rollAffixes(it, r.opts);
  if (r.unique) it.unique = pick(Object.keys(UNIQUES));
  return it;
}
export function rollAffixes(it: Item, n: number) {
  const pool = [...POOLS[it.slot]]; it.rolledAffixes = [];
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    let v = AFFIX[k].roll(it.itemLevel);
    if (k === 'crit') v = Math.min(v, 0.08); // 한 아이템 치명 8% 초과 금지
    if (k === 'cdr') v = Math.min(v, 0.06); // CDR 6% 초과 금지
    it.rolledAffixes.push({ k, v });
  }
}
export function makeRelic(id: string): Item {
  const d = RELIC[id];
  return { uuid: newUuid(), slot: 'relic', itemLevel: d.lv, rarity: 'legend', name: d.name, rolledAffixes: [], relicId: id, upgradeLevel: 0, bound: true };
}
export function fmtAffix(k: string, v: number) {
  const a = AFFIX[k]; if (!a) return '';
  return `${a.name} +${a.pct ? Math.round(v * 100) + '%' : v}`;
}
