// 맵 렌더: 바닥 타일맵(×3) + 지형(Terrain) + 장식. 챕터 테마 팔레트로 틴트해 에셋 톤을 통일
import Phaser from 'phaser';
import { Theme } from '../data/world';
import { Spr } from '../data/sprites';
import { Terrain, T, FLOOR } from './terrain';
import type { World } from '../scenes/World';

export { T };
export interface Circle { x: number; y: number; r: number }
export interface Rect { x: number; y: number; w: number; h: number }

export function jitter(c: number, amt: number) {
  const col = Phaser.Display.Color.IntegerToColor(c); const k = 1 + (Math.random() - 0.5) * amt;
  return Phaser.Display.Color.GetColor(Math.min(255, col.red * k), Math.min(255, col.green * k), Math.min(255, col.blue * k));
}

export function buildMap(W: World, th: Theme, t: Terrain, o: { density: number; clear: Circle[]; style?: Theme['solid'] }) {
  W.cameras.main.setBackgroundColor(th.bg);
  const map = W.make.tilemap({ tileWidth: 16, tileHeight: 16, width: t.cols, height: t.rows });
  const ts = map.addTilesetImage(th.groundSheet, th.groundSheet, 16, 16, 0, 0)!;
  const layer = map.createBlankLayer('ground', ts, 0, 0)!.setScale(3).setDepth(-10000);
  for (let y = 0; y < t.rows; y++) for (let x = 0; x < t.cols; x++) {
    const idx = th.ground[Math.floor(Math.random() * th.ground.length)];
    const tile = layer.putTileAt(idx, x, y); tile.tint = jitter(th.groundTint, 0.03);
  }
  t.render(W, th, o.style || th.solid);
  const bounds: Rect = { x: T, y: T, w: (t.cols - 2) * T, h: (t.rows - 2) * T };
  // 장식/장애물 (도달 가능한 바닥에만)
  const obstacles: Circle[] = []; const placed: Circle[] = [];
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
