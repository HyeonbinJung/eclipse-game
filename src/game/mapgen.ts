// 맵 렌더: 바닥 타일맵(×3) + 지형(Terrain) + 장식. 챕터 테마 팔레트로 틴트해 에셋 톤을 통일
import Phaser from 'phaser';
import { Theme } from '../data/world';
import { Spr } from '../data/sprites';
import { Terrain, T, FLOOR, SOLID, LIQUID, TC, PC, TERRAIN_KEY, TERRAIN_PX, hasTerrainSheet, hasPropsSheet, placeCustomProp, terrainFrame } from './terrain';
import type { World } from '../scenes/World';
import { smoothNoise } from '../core/rng';

export { T };
export interface Circle { x: number; y: number; r: number }
export interface Rect { x: number; y: number; w: number; h: number }

export function jitter(c: number, amt: number) {
  const col = Phaser.Display.Color.IntegerToColor(c); const k = 1 + (Math.random() - 0.5) * amt;
  return Phaser.Display.Color.GetColor(Math.min(255, col.red * k), Math.min(255, col.green * k), Math.min(255, col.blue * k));
}

const FLOOR_MIX = [0, 0, 0, 0, 1, 1, 2];

export function buildMap(W: World, th: Theme, t: Terrain, o: { density: number; clear: Circle[]; style?: Theme['solid'] }) {
  W.cameras.main.setBackgroundColor(th.bg);
  const custom = hasTerrainSheet(W);
  const px = custom ? TERRAIN_PX : 16;
  const map = W.make.tilemap({ tileWidth: px, tileHeight: px, width: t.cols, height: t.rows });
  const key = custom ? TERRAIN_KEY : th.groundSheet;
  const ts = map.addTilesetImage(key, key, px, px, 0, 0)!;
  const layer = map.createBlankLayer('ground', ts, 0, 0)!.setScale(T / px).setDepth(-10000);
  for (let y = 0; y < t.rows; y++) for (let x = 0; x < t.cols; x++) {
    if (custom) {
      // 바닥 장식 타일은 노이즈가 높은 곳에 무리 지어(꽃밭·균열 지대), 그 밖에는 아주 드물게
      const deco = smoothNoise(x, y, 6, th.row) > 0.72 ? Math.random() < 0.28 : Math.random() < 0.006;
      layer.putTileAt(terrainFrame(th, deco ? TC.deco : FLOOR_MIX[Math.floor(Math.random() * FLOOR_MIX.length)]), x, y); continue;
    }
    const idx = th.ground[Math.floor(Math.random() * th.ground.length)];
    const tile = layer.putTileAt(idx, x, y); tile.tint = jitter(th.groundTint, 0.03);
  }
  t.render(W, th, o.style || th.solid);
  const bounds: Rect = { x: T, y: T, w: (t.cols - 2) * T, h: (t.rows - 2) * T };
  // 장식/장애물 (도달 가능한 바닥에만)
  const obstacles: Circle[] = []; const placed: Circle[] = [];
  if (hasPropsSheet(W) && th.props.length) {
    // 커스텀 지형지물 배치: (1) 장애물 하나를 중심으로 작은 장식이 둘러싼 군락 (2) 숲·벽·물가 가장자리 장식
    const floorAt = (x: number, y: number) => t.at(Math.floor(x / T), Math.floor(y / T)) === FLOOR;
    const open3 = (cx: number, cy: number) => [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => t.at(cx + dx, cy + dy) === FLOOR));
    const inClear = (x: number, y: number, pad = 0) => o.clear.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + pad);
    const near = (x: number, y: number, d: number) => placed.some((c) => Math.hypot(c.x - x, c.y - y) < d + c.r);
    const put = (col: number, x: number, y: number, solid: boolean) => {
      placeCustomProp(W, th, col, x, y); placed.push({ x, y, r: solid ? 40 : 12 });
      if (solid) obstacles.push({ x, y: y - 6, r: 17 });
    };
    const decor = (x: number, y: number) => { if (floorAt(x, y) && !inClear(x, y) && !near(x, y, 14)) put(PC.decor[Math.random() < 0.55 ? 0 : 1], x, y, false); };
    // (1) 군락: 지역마다 장애물 종류가 이어지도록 노이즈로 고른다
    const clusters = Math.round((t.cols * t.rows * o.density) / 4);
    for (let i = 0, tries = 0; i < clusters && tries < clusters * 30; tries++) {
      const cx = 2 + Math.floor(Math.random() * (t.cols - 4)), cy = 2 + Math.floor(Math.random() * (t.rows - 4));
      if (!open3(cx, cy)) continue;
      const x = cx * T + T / 2 + (Math.random() - 0.5) * 16, y = cy * T + T * 0.8;
      if (inClear(x, y, 30) || near(x, y, 70)) continue;
      const n = smoothNoise(cx, cy, 7, th.row + 31);
      const main = PC.obstacle[n < 0.38 ? 0 : n < 0.66 ? 1 : 2];
      put(main, x, y, true); i++;
      if (Math.random() < 0.35) { // 짝 장애물
        const a = Math.random() * Math.PI * 2, d = 64 + Math.random() * 26; const x2 = x + Math.cos(a) * d, y2 = y + Math.sin(a) * d * 0.7;
        const c2 = Math.floor(x2 / T), r2 = Math.floor(y2 / T);
        if (open3(c2, r2) && !inClear(x2, y2, 30) && !near(x2, y2, 30)) put(Math.random() < 0.7 ? main : PC.obstacle[(PC.obstacle.indexOf(main as 3) + 1) % 3], x2, y2, true);
      }
      const k = 2 + Math.floor(Math.random() * 3); // 둘레 장식 2~4개
      for (let j = 0; j < k; j++) { const a = Math.random() * Math.PI * 2, d = 34 + Math.random() * 38; decor(x + Math.cos(a) * d, y + 8 + Math.sin(a) * d * 0.6); }
    }
    // (2) 가장자리: 막힌 지형 앞(아래쪽)과 옆에 풀·작은 소품, 물가에는 드문드문
    for (let cy = 1; cy < t.rows - 1; cy++) for (let cx = 1; cx < t.cols - 1; cx++) {
      if (t.at(cx, cy) !== FLOOR) continue;
      const solidN = [t.at(cx, cy - 1), t.at(cx - 1, cy), t.at(cx + 1, cy)].some((v) => v === SOLID);
      const wetN = [t.at(cx, cy - 1), t.at(cx, cy + 1), t.at(cx - 1, cy), t.at(cx + 1, cy)].some((v) => v === LIQUID);
      const p = solidN ? 0.2 : wetN ? 0.07 : 0;
      if (p && Math.random() < p) decor(cx * T + 10 + Math.random() * 28, cy * T + 18 + Math.random() * 16);
    }
    return { bounds, obstacles, layer };
  }
  const totalW = th.props.reduce((a, p) => a + p.w, 0);
  const count = totalW ? Math.floor(t.cols * t.rows * o.density) : 0;
  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalW; let pr = th.props[0];
    for (const p of th.props) { r -= p.w; if (r <= 0) { pr = p; break; } }
    const cx = 1 + Math.floor(Math.random() * (t.cols - 2)), cy = 1 + Math.floor(Math.random() * (t.rows - 2));
    if (t.at(cx, cy) !== FLOOR) continue;
    // 좁은 통로를 막지 않도록 주변 8칸이 모두 바닥일 때만 단단한 장식 배치
    if (pr.solid && ![-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => t.at(cx + dx, cy + dy) === FLOOR))) continue;
    const x = cx * T + 8 + Math.random() * 32, y = cy * T + 20 + Math.random() * 24;
    if (o.clear.some((c) => Math.hypot(c.x - x, c.y - y) < c.r)) continue;
    if (placed.some((c) => Math.hypot(c.x - x, c.y - y) < (pr.solid ? 80 : 34))) continue;
    placeProp(W, pr.spr, x, y, jitter(pr.tint, 0.1), pr.scale || 3);
    placed.push({ x, y, r: 20 });
    if (pr.solid) obstacles.push({ x, y: y - 6, r: 17 });
  }
  return { bounds, obstacles, layer };
}

export function placeProp(W: World, s: Spr, x: number, y: number, tint: number, scale = 3) {
  return W.add.image(x, y, s.sheet, s.frame).setScale(scale).setOrigin(0.5, 0.9).setTint(tint).setDepth(y);
}
