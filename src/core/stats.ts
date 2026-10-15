// 최종 스탯 계산 (기획서 3.2 상한 포함)
import { atkBase, defBase, hpBase, strAt, vitAt, R } from '../data/formulas';
import { itemMain, Item, Slot } from '../data/items';
import { S, findItem, hasTrait, cls } from './state';
import { BASE_TUNING } from '../data/classes';

export interface Stats {
  maxHp: number; atk: number; def: number; crit: number; critDmg: number; atkSpd: number; cdr: number;
  res: number; pen: number; move: number; dr: number; ultGain: number; comboGain: number;
  mpMax: number; mpRegen: number; mpCost: number; relics: Set<string>; uniques: Set<string>;
}

export function computeStats(override?: { slot: Slot; item: Item | null }): Stats {
  const L = S.level;
  const st: Stats = {
    maxHp: hpBase(L) + R(vitAt(L) * 4), atk: atkBase(L) + R(strAt(L) * 0.6), def: defBase(L),
    crit: 0.05, critDmg: 1.5, atkSpd: 1, cdr: 0, res: 0, pen: 0, move: 190, dr: 0, ultGain: 0, comboGain: 0,
    mpMax: 60 + 2 * L, mpRegen: 1, mpCost: 1, relics: new Set(), uniques: new Set(),
  };
  const eq: Partial<Record<Slot, Item>> = {};
  for (const [slot, id] of Object.entries(S.equipmentItemIds)) { const it = findItem(id); if (it) eq[slot as Slot] = it; }
  if (override) { if (override.item) { for (const k of Object.keys(eq) as Slot[]) if (eq[k]?.uuid === override.item.uuid) delete eq[k]; eq[override.slot] = override.item; } else delete eq[override.slot]; }
  for (const it of Object.values(eq)) {
    if (!it) continue;
    const m = itemMain(it);
    for (const [k, v] of Object.entries(m)) (st as any)[k] += v;
    for (const a of it.rolledAffixes) {
      if (a.k === 'combo') st.comboGain += a.v; else if (a.k === 'ult') st.ultGain += a.v; else (st as any)[a.k] += a.v;
    }
    if (it.unique) st.uniques.add(it.unique);
    if (it.relicId) st.relics.add(it.relicId);
  }
  const bt = BASE_TUNING[cls()?.base ?? 'blade']; // 계열 밸런스
  st.maxHp *= bt.hp; st.def *= bt.def; st.dr += bt.dr;
  const md = cls()?.mods; // 직업 스탯 성향
  if (md) { st.maxHp *= md.hp ?? 1; st.atk *= md.atk ?? 1; st.def *= md.def ?? 1; st.crit += md.crit ?? 0; st.atkSpd += md.atkSpd ?? 0; st.move += md.move ?? 0; }
  if (hasTrait('ironbody')) st.maxHp = R(st.maxHp * 1.07);
  if (hasTrait('spirit')) st.ultGain += 0.08;
  if (hasTrait('focus')) st.mpRegen *= 1.15;
  if (hasTrait('stabilize')) st.mpCost *= 0.85;
  // 상한
  st.crit = Math.min(0.5, st.crit); st.critDmg = Math.min(2.25, st.critDmg); st.atkSpd = Math.min(1.4, st.atkSpd);
  st.cdr = Math.min(0.25, st.cdr); st.res = Math.min(0.5, st.res); st.pen = Math.min(0.4, st.pen);
  st.move = Math.min(230, st.move); st.dr = Math.min(0.25, st.dr);
  st.maxHp = R(st.maxHp); st.atk = R(st.atk); st.def = R(st.def);
  return st;
}
