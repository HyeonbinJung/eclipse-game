// 챕터별 지형 레이아웃: 필드 5종 · 마을 5종 · 방/복도형 던전 · 보스/PvP 아레나
import { Terrain, FLOOR, SOLID, LIQUID, BRIDGE, PROP } from './terrain';
import { CHAPTERS, Theme } from '../data/world';

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export interface FieldLayout { t: Terrain; spawn: { cx: number; cy: number }; landmarks: { cx: number; cy: number; kind: string }[] }

export function genField(ch: number, cols = 64, rows = 44): FieldLayout {
  const th = CHAPTERS[ch - 1].theme;
  const spawn = { cx: 5, cy: Math.floor(rows / 2) };
  const landmarks: FieldLayout['landmarks'] = [];
  let t: Terrain;
  switch (ch) {
    case 1: { // 침식의 숲: 굽이치는 강 + 지류, 나무 군락
      t = new Terrain(cols, rows, th.liquid);
      t.river(true, 3, 4); t.river(false, 2, 3);
      for (let i = 0; i < 16; i++) t.blob(ri(6, cols - 6), ri(4, rows - 5), 1.5 + Math.random() * 2.5, SOLID);
      for (let i = 0; i < 3; i++) t.blob(ri(10, cols - 8), ri(6, rows - 7), 2 + Math.random() * 1.5, LIQUID); // 독 늪
      break;
    }
    case 2: { // 잿빛 성채: 해자로 둘러싼 내성 + 무너진 안뜰 벽
      t = new Terrain(cols, rows, th.liquid);
      const kx = Math.floor(cols * 0.55), ky = Math.floor(rows / 2);
      t.outline(kx - 12, ky - 9, 24, 18, LIQUID, 0); t.outline(kx - 11, ky - 8, 22, 16, LIQUID, 0);
      for (const [bx, by] of [[kx - 1, ky - 9], [kx - 1, ky + 7], [kx - 12, ky - 1], [kx + 10, ky - 1]]) t.rect(bx, by, 3, 3, BRIDGE, LIQUID);
      t.outline(kx - 6, ky - 4, 12, 8, SOLID, 2); landmarks.push({ cx: kx, cy: ky, kind: 'keep' });
      for (let i = 0; i < 9; i++) { const w = ri(6, 11), h = ri(5, 8); const x = ri(3, cols - w - 3), y = ri(3, rows - h - 3); if (Math.abs(x + w / 2 - kx) < 16 && Math.abs(y + h / 2 - ky) < 12) continue; t.outline(x, y, w, h, SOLID, 3); }
      break;
    }
    case 3: { // 빙하동굴: 얼어붙은 호수 + 크레바스 + 암석 기둥
      t = new Terrain(cols, rows, th.liquid);
      for (let i = 0; i < 5; i++) t.blob(ri(12, cols - 10), ri(6, rows - 7), 3 + Math.random() * 3, LIQUID);
      t.river(false, 2, 3);
      for (let i = 0; i < 14; i++) t.blob(ri(6, cols - 6), ri(4, rows - 5), 1 + Math.random() * 1.5, SOLID);
      break;
    }
    case 4: { // 화산 성역: 용암 강 2줄 + 다리, 바위 지대
      t = new Terrain(cols, rows, th.liquid);
      t.river(false, 3, 3); t.river(false, 3, 2); t.river(true, 2, 4);
      for (let i = 0; i < 12; i++) t.blob(ri(6, cols - 6), ri(4, rows - 5), 1.2 + Math.random() * 2, SOLID);
      break;
    }
    default: { // 공허의 사원: 공허 위에 떠 있는 섬들 + 다리
      t = new Terrain(cols, rows, th.liquid, LIQUID);
      const gx = 5, gy = 3; const cells: { x: number; y: number; w: number; h: number }[] = [];
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        const cw = Math.floor((cols - 4) / gx), chh = Math.floor((rows - 4) / gy);
        const w = ri(7, cw - 3), h = ri(6, chh - 3); const x = 2 + i * cw + ri(0, cw - w - 1), y = 2 + j * chh + ri(0, chh - h - 1);
        t.rect(x, y, w, h, FLOOR); cells.push({ x, y, w, h });
        if (Math.random() < 0.4) t.blob(x + w / 2, y + h / 2, 1.2, SOLID);
      }
      const mid = (c: { x: number; y: number; w: number; h: number }) => [c.x + Math.floor(c.w / 2), c.y + Math.floor(c.h / 2)];
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        const c = cells[j * gx + i];
        if (i < gx - 1) { const [ax, ay] = mid(c), [bx, by] = mid(cells[j * gx + i + 1]); t.carvePath(ax, ay, bx, by, 2); }
        if (j < gy - 1 && (i % 2 === 0 || Math.random() < 0.4)) { const [ax, ay] = mid(c), [bx, by] = mid(cells[(j + 1) * gx + i]); t.carvePath(ax, ay, bx, by, 2); }
      }
      const s = cells[gx]; spawn.cx = s.x + 2; spawn.cy = s.y + Math.floor(s.h / 2);
      break;
    }
  }
  t.clearAround(spawn.cx, spawn.cy, 4);
  for (let y = spawn.cy - 4; y <= spawn.cy + 4; y++) for (let x = spawn.cx - 4; x <= spawn.cx + 4; x++) if (t.at(x, y) === BRIDGE && t.inner(x, y)) t.set(x, y, FLOOR);
  t.connect(spawn.cx, spawn.cy);
  return { t, spawn, landmarks };
}

// ---------- 마을 ----------
export interface TownLayout {
  t: Terrain; theme: Theme; spawn: [number, number];
  houses: { x: number; y: number; style: 'wb' | 'wr' | 'sb' | 'sr' }[];
  npc: Record<'quest' | 'shop' | 'smith' | 'board' | 'portal' | 'dummy' | 'arena', [number, number]>;
  deco: { cx: number; cy: number; s: string; tint?: number; solid?: boolean }[]; fire?: [number, number][];
}
export function genTown(ch: number): TownLayout {
  const base = CHAPTERS[ch - 1];
  const cols = 34, rows = 22;
  const deco: TownLayout['deco'] = [];
  let t: Terrain; let theme: Theme; let houses: TownLayout['houses']; let npc: TownLayout['npc']; let fire: [number, number][] | undefined; let spawn: [number, number] = [17, 15];
  switch (ch) {
    case 1: { // 나무그늘 야영지: 숲 속 공터, 연못, 모닥불
      theme = { ...base.townTheme, solid: 'trees', liquid: 'water' }; t = new Terrain(cols, rows, 'water');
      for (let i = 0; i < 10; i++) t.blob(ri(2, cols - 3), Math.random() < 0.5 ? ri(1, 3) : ri(rows - 4, rows - 2), 2, SOLID);
      t.blob(26, 6, 3, LIQUID); t.rect(25, 9, 2, 1, BRIDGE, LIQUID);
      houses = [{ x: 5, y: 4, style: 'wb' }, { x: 10, y: 4, style: 'wr' }, { x: 6, y: 14, style: 'wr' }];
      npc = { quest: [16, 8], shop: [21, 12], smith: [12, 11], board: [18, 12], portal: [17, 18], dummy: [28, 14], arena: [24, 17] };
      fire = [[17, 11]];
      deco.push({ cx: 15, cy: 12, s: 'log' }, { cx: 19, cy: 10, s: 'log' }, { cx: 23, cy: 4, s: 'mushroom' }, { cx: 30, cy: 10, s: 'bush' }, { cx: 3, cy: 10, s: 'bush' });
      break;
    }
    case 2: { // 재의 요새: 성벽으로 둘러싼 석조 광장
      theme = { ...CHAPTERS[1].theme, solid: 'wall', liquid: 'moat', props: [] }; t = new Terrain(cols, rows, 'moat');
      t.outline(3, 2, 28, 18, SOLID, 0); t.rect(15, 19, 4, 1, FLOOR); t.rect(15, 2, 4, 1, FLOOR);
      t.rect(1, 1, 2, 20, LIQUID); t.rect(31, 1, 2, 20, LIQUID);
      houses = [{ x: 5, y: 3, style: 'sb' }, { x: 9, y: 3, style: 'sb' }, { x: 22, y: 3, style: 'sr' }, { x: 26, y: 3, style: 'sb' }];
      npc = { quest: [17, 9], shop: [24, 12], smith: [8, 12], board: [14, 9], portal: [17, 17], dummy: [27, 15], arena: [6, 16] };
      deco.push({ cx: 13, cy: 7, s: 'gargoyle', solid: true }, { cx: 21, cy: 7, s: 'gargoyle', solid: true }, { cx: 7, cy: 13, s: 'anvil' }, { cx: 10, cy: 14, s: 'crate' }, { cx: 11, cy: 14, s: 'crate' }, { cx: 25, cy: 16, s: 'tomb1' });
      break;
    }
    case 3: { // 광산 거점: 설원, 얼어붙은 호수, 갱도 입구
      theme = { ...CHAPTERS[2].theme, solid: 'rock', liquid: 'ice' }; t = new Terrain(cols, rows, 'ice');
      t.rect(1, 1, 32, 3, SOLID); t.rect(14, 1, 5, 3, FLOOR, SOLID); t.rect(14, 1, 5, 1, SOLID);
      t.blob(27, 15, 4, LIQUID); t.blob(5, 17, 2, SOLID);
      houses = [{ x: 4, y: 5, style: 'wb' }, { x: 21, y: 5, style: 'wb' }];
      npc = { quest: [16, 6], shop: [10, 10], smith: [20, 10], board: [13, 13], portal: [16, 18], dummy: [8, 15], arena: [24, 9] };
      deco.push({ cx: 15, cy: 3, s: 'cart' }, { cx: 18, cy: 3, s: 'crate' }, { cx: 11, cy: 5, s: 'pine', solid: true }, { cx: 30, cy: 6, s: 'pine', solid: true }, { cx: 2, cy: 12, s: 'pine', solid: true }, { cx: 19, cy: 15, s: 'crate' });
      break;
    }
    case 4: { // 황동 피난소: 용암 강을 끼고 있는 사막 마을
      theme = { ...CHAPTERS[3].theme, solid: 'rock', liquid: 'lava' }; t = new Terrain(cols, rows, 'lava');
      t.rect(1, 17, 32, 3, LIQUID); t.rect(15, 17, 4, 3, BRIDGE, LIQUID);
      for (let i = 0; i < 6; i++) t.blob(ri(3, 30), ri(1, 3), 1.5, SOLID);
      houses = [{ x: 4, y: 5, style: 'wr' }, { x: 9, y: 9, style: 'sr' }, { x: 23, y: 5, style: 'wr' }];
      npc = { quest: [17, 7], shop: [21, 12], smith: [14, 13], board: [18, 11], portal: [17, 20], dummy: [28, 13], arena: [5, 14] };
      fire = [[16, 10], [27, 9]];
      deco.push({ cx: 12, cy: 5, s: 'rock', solid: true }, { cx: 30, cy: 14, s: 'rock', solid: true }, { cx: 2, cy: 9, s: 'treeOS', solid: true }, { cx: 20, cy: 15, s: 'barrel' });
      break;
    }
    default: { // 최후의 전초기지: 공허 위의 섬
      theme = { ...CHAPTERS[4].theme, solid: 'wall', liquid: 'void' }; t = new Terrain(cols, rows, 'void', LIQUID);
      t.blob(17, 11, 10, FLOOR, LIQUID); t.rect(8, 6, 18, 11, FLOOR); t.blob(29, 5, 3, FLOOR, LIQUID); t.blob(5, 17, 3, FLOOR, LIQUID);
      t.carvePath(22, 8, 28, 5, 2); t.carvePath(10, 14, 6, 17, 2);
      houses = [{ x: 9, y: 6, style: 'sb' }, { x: 20, y: 6, style: 'sr' }];
      npc = { quest: [16, 8], shop: [21, 12], smith: [12, 12], board: [17, 13], portal: [29, 5], dummy: [24, 15], arena: [5, 17] };
      spawn = [17, 15];
      deco.push({ cx: 14, cy: 15, s: 'gargoyleG', solid: true }, { cx: 20, cy: 15, s: 'gargoyleG', solid: true }, { cx: 10, cy: 11, s: 'wellGreen', solid: true });
      break;
    }
  }
  for (const h of houses) t.rect(h.x, h.y + 1, 3, 2, PROP);
  t.clearAround(spawn[0], spawn[1], 1);
  t.flood(spawn[0], spawn[1]);
  return { t, theme, houses, npc, deco, fire, spawn };
}

// ---------- 던전: 방과 복도 ----------
export interface DRoom { x: number; y: number; w: number; h: number; type: string; gates: [number, number][]; state: 'idle' | 'active' | 'cleared'; idx: number }
export function genDungeon(types: string[]): { t: Terrain; rooms: DRoom[]; spawn: [number, number] } {
  const W = 13, H = 10, C = 6; const rows = 24; const cols = 3 + types.length * (W + C);
  const t = new Terrain(cols, rows, 'water', SOLID);
  const rooms: DRoom[] = [];
  types.forEach((type, i) => {
    const w = type === 's' || type === 'c' || type === 'b' ? 10 : W + ri(-1, 2), h = type === 's' || type === 'c' || type === 'b' ? 8 : H + ri(-1, 2);
    const x = 2 + i * (W + C), y = ri(2, rows - h - 2);
    t.rect(x, y, w, h, FLOOR); rooms.push({ x, y, w, h, type, gates: [], state: type === 's' || type === 'c' || type === 'b' ? 'cleared' : 'idle', idx: i });
    if ((type === 'n' || type === 'e') && Math.random() < 0.6) t.blob(x + w / 2 + ri(-2, 2), y + h / 2 + ri(-2, 2), 1.3, Math.random() < 0.5 ? SOLID : LIQUID);
  });
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i], b = rooms[i + 1];
    const ya = ri(a.y + 1, a.y + a.h - 4), yb = ri(b.y + 1, b.y + b.h - 4); const xa = a.x + a.w, xb = b.x - 1; const xm = ri(xa + 1, xb - 2);
    for (let x = xa; x <= xm + 2; x++) t.rect(x, ya, 1, 3, FLOOR);
    for (let y = Math.min(ya, yb); y <= Math.max(ya, yb) + 2; y++) t.rect(xm, y, 3, 1, FLOOR);
    for (let x = xm; x <= xb; x++) t.rect(x, yb, 1, 3, FLOOR);
    const exit: [number, number][] = [[xa, ya], [xa, ya + 1], [xa, ya + 2]], entry: [number, number][] = [[xb, yb], [xb, yb + 1], [xb, yb + 2]];
    a.gates.push(...exit); b.gates.push(...entry);
  }
  const s = rooms[0]; const spawn: [number, number] = [s.x + 2, s.y + Math.floor(s.h / 2)];
  t.connect(spawn[0], spawn[1]);
  return { t, rooms, spawn };
}

export function genArena(cols: number, rows: number, liquid: Theme['liquid'], pillars = 0) {
  const t = new Terrain(cols, rows, liquid);
  if (pillars) {
    const pts = [[0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7], [0.5, 0.5]].slice(0, pillars);
    for (const [fx, fy] of pts) t.rect(Math.floor(cols * fx) - 1, Math.floor(rows * fy) - 1, 2, 2, SOLID);
  }
  t.flood(Math.floor(cols / 2), rows - 3);
  return t;
}
