// 맵 생성: 타일 32→48px(×3 스케일), 챕터 테마 팔레트로 틴트해 에셋 톤을 통일
import Phaser from 'phaser';
import { Theme } from '../data/world';
import { Spr } from '../data/sprites';
import type { World } from '../scenes/World';

export const T = 48;
export interface Circle { x: number; y: number; r: number }
export interface Rect { x: number; y: number; w: number; h: number }

function jitter(c: number, amt: number) {
  const col = Phaser.Display.Color.IntegerToColor(c); const k = 1 + (Math.random() - 0.5) * amt;
  return Phaser.Display.Color.GetColor(Math.min(255, col.red * k), Math.min(255, col.green * k), Math.min(255, col.blue * k));
}

export function buildMap(W: World, th: Theme, cols: number, rows: number, o: { density: number; clear: Circle[]; wallProps?: boolean }) {
  W.cameras.main.setBackgroundColor(th.bg);
  const map = W.make.tilemap({ tileWidth: 16, tileHeight: 16, width: cols, height: rows });
  const ts = map.addTilesetImage(th.groundSheet, th.groundSheet, 16, 16, 0, 0)!;
  const layer = map.createBlankLayer('ground', ts, 0, 0)!.setScale(3).setDepth(-10000);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const idx = th.ground[Math.floor(Math.random() * th.ground.length)];
    const t = layer.putTileAt(idx, x, y); t.tint = jitter(th.groundTint, 0.03);
  }
  const rects: Rect[] = [];
  // 외곽 벽
  const wallImg = (x: number, y: number) => {
    const im = W.add.image(x * T + T / 2, y * T + T, th.wallSheet, th.wallFrame).setScale(3).setOrigin(0.5, 1).setTint(jitter(th.wallTint, 0.12));
    im.setDepth(y * T + T);
  };
  for (let x = 0; x < cols; x++) { wallImg(x, 0); wallImg(x, rows - 1); }
  for (let y = 1; y < rows - 1; y++) { wallImg(0, y); wallImg(cols - 1, y); }
  rects.push({ x: 0, y: 0, w: cols * T, h: T * 1.3 }, { x: 0, y: (rows - 1) * T, w: cols * T, h: T }, { x: 0, y: 0, w: T, h: rows * T }, { x: (cols - 1) * T, y: 0, w: T, h: rows * T });
  const bounds: Rect = { x: T, y: T * 1.3, w: (cols - 2) * T, h: (rows - 2.3) * T };
  // 장식/장애물
  const obstacles: Circle[] = []; const placed: Circle[] = [];
  const totalW = th.props.reduce((a, p) => a + p.w, 0);
  const count = Math.floor(cols * rows * o.density);
  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalW; let pr = th.props[0];
    for (const p of th.props) { r -= p.w; if (r <= 0) { pr = p; break; } }
    const x = bounds.x + 30 + Math.random() * (bounds.w - 60), y = bounds.y + 40 + Math.random() * (bounds.h - 60);
    if (o.clear.some((c) => Math.hypot(c.x - x, c.y - y) < c.r)) continue;
    if (placed.some((c) => Math.hypot(c.x - x, c.y - y) < (pr.solid ? 70 : 34))) continue;
    placeProp(W, pr.spr, x, y, jitter(pr.tint, 0.1), pr.scale || 3);
    placed.push({ x, y, r: 20 });
    if (pr.solid) obstacles.push({ x, y: y - 6, r: 17 });
  }
  return { bounds, obstacles, rects, layer };
}

export function placeProp(W: World, s: Spr, x: number, y: number, tint: number, scale = 3) {
  const im = W.add.image(x, y, s.sheet, s.frame).setScale(scale).setOrigin(0.5, 0.9).setTint(tint).setDepth(y);
  return im;
}
