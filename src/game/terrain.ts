// 격자 지형: 바닥 / 벽 / 액체(물·용암·빙수·공허) / 다리 / 관문. 셀 48px.
import Phaser from 'phaser';
import type { World } from '../scenes/World';
import type { Actor } from './combat';
import { Theme } from '../data/world';
import { SP } from '../data/sprites';

export const T = 48;
export const FLOOR = 0, SOLID = 1, LIQUID = 2, BRIDGE = 3, GATE = 4, PROP = 5; // PROP: 건물 등 보이지 않는 충돌 셀
export type LiquidKind = 'water' | 'lava' | 'ice' | 'void' | 'moat';
const LIQ: Record<LiquidKind, { base: number; deep: number; shore: number; spark: number }> = {
  water: { base: 0x3d78b8, deep: 0x2a5690, shore: 0x9fd0ff, spark: 0xcfeaff },
  moat: { base: 0x34506a, deep: 0x243a50, shore: 0x7a9ab8, spark: 0xa8c0d8 },
  ice: { base: 0x6aa8d8, deep: 0x4a88c0, shore: 0xe0f6ff, spark: 0xffffff },
  lava: { base: 0xd8501a, deep: 0x9a2a10, shore: 0xffb050, spark: 0xffe080 },
  void: { base: 0x120a24, deep: 0x07040f, shore: 0x8a5aff, spark: 0xc8a0ff },
};

export class Terrain {
  g: Uint8Array; reach: Uint8Array;
  constructor(public cols: number, public rows: number, public liquid: LiquidKind = 'water', fill = FLOOR) {
    this.g = new Uint8Array(cols * rows).fill(fill); this.reach = new Uint8Array(cols * rows);
    for (let x = 0; x < cols; x++) { this.set(x, 0, SOLID); this.set(x, rows - 1, SOLID); }
    for (let y = 0; y < rows; y++) { this.set(0, y, SOLID); this.set(cols - 1, y, SOLID); }
  }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  at(x: number, y: number) { return this.in(x, y) ? this.g[y * this.cols + x] : SOLID; }
  set(x: number, y: number, v: number) { if (this.in(x, y)) this.g[y * this.cols + x] = v; }
  inner(x: number, y: number) { return x > 0 && y > 0 && x < this.cols - 1 && y < this.rows - 1; }
  passable(x: number, y: number) { const v = this.at(x, y); return v === FLOOR || v === BRIDGE; }
  blocksMove(v: number) { return v === SOLID || v === LIQUID || v === GATE || v === PROP; }
  blocksShot(v: number) { return v === SOLID || v === GATE || v === PROP; }
  cell(px: number, py: number) { return { x: Math.floor(px / T), y: Math.floor(py / T) }; }
  center(cx: number, cy: number) { return { x: cx * T + T / 2, y: cy * T + T / 2 + 10 }; }

  // ---------- 생성 도구 ----------
  rect(x0: number, y0: number, w: number, h: number, v: number, onlyIf?: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (this.inner(x, y) && (onlyIf === undefined || this.at(x, y) === onlyIf)) this.set(x, y, v);
  }
  outline(x0: number, y0: number, w: number, h: number, v: number, gaps = 2) {
    const cells: [number, number][] = [];
    for (let x = x0; x < x0 + w; x++) { cells.push([x, y0], [x, y0 + h - 1]); }
    for (let y = y0 + 1; y < y0 + h - 1; y++) { cells.push([x0, y], [x0 + w - 1, y]); }
    for (const [x, y] of cells) if (this.inner(x, y)) this.set(x, y, v);
    for (let i = 0; i < gaps; i++) { const [x, y] = cells[Math.floor(Math.random() * cells.length)]; for (let d = -1; d <= 1; d++) { this.set(x + (y === y0 || y === y0 + h - 1 ? d : 0), y + (x === x0 || x === x0 + w - 1 ? d : 0), FLOOR); } }
  }
  blob(cx: number, cy: number, r: number, v: number, onlyIf = FLOOR) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.15) + (Math.random() - 0.5) * 1.2;
      if (d <= r && this.inner(x, y) && this.at(x, y) === onlyIf) this.set(x, y, v);
    }
  }
  river(horizontal: boolean, width: number, bridges: number) {
    const len = horizontal ? this.cols : this.rows, span = horizontal ? this.rows : this.cols;
    let c = Math.floor(span * (0.3 + Math.random() * 0.4)); const path: number[] = [];
    for (let i = 0; i < len; i++) { if (Math.random() < 0.35) c += Math.random() < 0.5 ? -1 : 1; c = Phaser.Math.Clamp(c, 4, span - 5); path.push(c); }
    for (let i = 0; i < len; i++) for (let k = 0; k < width; k++) { const p = path[i] + k - Math.floor(width / 2); horizontal ? this.set(i, p, LIQUID) : this.set(p, i, LIQUID); }
    for (let b = 0; b < bridges; b++) {
      const at = Math.floor(((b + 0.5) / bridges) * (len - 8)) + 4;
      for (let d = 0; d < 2; d++) for (let k = -width; k <= width; k++) {
        const i = at + d, p = path[Math.min(len - 1, i)] + k;
        const x = horizontal ? i : p, y = horizontal ? p : i;
        if (this.at(x, y) === LIQUID) this.set(x, y, BRIDGE);
      }
    }
    // 테두리 벽과 맞닿는 부분 정리
    for (let x = 0; x < this.cols; x++) { this.set(x, 0, SOLID); this.set(x, this.rows - 1, SOLID); }
    for (let y = 0; y < this.rows; y++) { this.set(0, y, SOLID); this.set(this.cols - 1, y, SOLID); }
  }
  carvePath(ax: number, ay: number, bx: number, by: number, w = 2) {
    // L자 통로: 액체는 다리로, 벽은 바닥으로
    const carve = (x: number, y: number) => { for (let k = 0; k < w; k++) for (let j = 0; j < w; j++) { const xx = x + k, yy = y + j; if (!this.inner(xx, yy)) continue; const v = this.at(xx, yy); if (v === LIQUID) this.set(xx, yy, BRIDGE); else if (v === SOLID) this.set(xx, yy, FLOOR); } };
    let x = ax, y = ay; const horizFirst = Math.random() < 0.5;
    if (horizFirst) { while (x !== bx) { carve(x, y); x += Math.sign(bx - x); } while (y !== by) { carve(x, y); y += Math.sign(by - y); } }
    else { while (y !== by) { carve(x, y); y += Math.sign(by - y); } while (x !== bx) { carve(x, y); x += Math.sign(bx - x); } }
    carve(bx, by);
  }
  clearAround(cx: number, cy: number, r: number) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (this.inner(x, y) && Math.hypot(x - cx, y - cy) <= r + 0.3) { const v = this.at(x, y); if (v === SOLID) this.set(x, y, FLOOR); if (v === LIQUID) this.set(x, y, BRIDGE); } }

  flood(sx: number, sy: number) {
    this.reach.fill(0); const q: number[] = [sy * this.cols + sx]; this.reach[q[0]] = 1;
    while (q.length) {
      const i = q.pop()!; const x = i % this.cols, y = (i / this.cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; const j = ny * this.cols + nx; if (this.in(nx, ny) && !this.reach[j] && this.passable(nx, ny)) { this.reach[j] = 1; q.push(j); } }
    }
  }
  // 고립된 구역을 가장 가까운 도달 가능 구역과 연결 (작은 섬은 벽으로 메움)
  connect(sx: number, sy: number) {
    for (let iter = 0; iter < 30; iter++) {
      this.flood(sx, sy);
      const seen = new Uint8Array(this.g.length); let fixed = false;
      for (let i = 0; i < this.g.length; i++) {
        if (seen[i] || this.reach[i] || !this.passable(i % this.cols, (i / this.cols) | 0)) continue;
        const comp: number[] = []; const q = [i]; seen[i] = 1;
        while (q.length) { const k = q.pop()!; comp.push(k); const x = k % this.cols, y = (k / this.cols) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * this.cols + nx; if (this.in(nx, ny) && !seen[j] && !this.reach[j] && this.passable(nx, ny)) { seen[j] = 1; q.push(j); } } }
        if (comp.length < 25) { for (const k of comp) this.g[k] = SOLID; continue; }
        // 컴포넌트에서 가장 가까운 도달 셀 찾기
        let best = -1, bd = 1e9, from = comp[0];
        for (const k of comp.filter((_, n) => n % 3 === 0)) { const x = k % this.cols, y = (k / this.cols) | 0; for (let j = 0; j < this.g.length; j += 2) if (this.reach[j]) { const d = Math.abs(x - (j % this.cols)) + Math.abs(y - ((j / this.cols) | 0)); if (d < bd) { bd = d; best = j; from = k; } } }
        if (best >= 0) { this.carvePath(from % this.cols, (from / this.cols) | 0, best % this.cols, (best / this.cols) | 0, 2); fixed = true; break; }
      }
      if (!fixed) break;
    }
    this.flood(sx, sy);
  }
  randomReachable(rng = Math.random) {
    for (let i = 0; i < 400; i++) { const x = 1 + Math.floor(rng() * (this.cols - 2)), y = 1 + Math.floor(rng() * (this.rows - 2)); if (this.reach[y * this.cols + x] && this.at(x, y) === FLOOR) return this.center(x, y); }
    return null;
  }
  nearestPassable(px: number, py: number) {
    const c = this.cell(px, py); if (this.passable(c.x, c.y)) return { x: px, y: py };
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; if (this.passable(c.x + dx, c.y + dy)) return this.center(c.x + dx, c.y + dy); }
    return { x: px, y: py };
  }

  // ---------- 충돌 ----------
  resolve(a: Actor) {
    const r = Math.max(8, a.r * 0.55);
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor((a.x - r) / T), x1 = Math.floor((a.x + r) / T), y0 = Math.floor((a.y - r) / T), y1 = Math.floor((a.y + r) / T);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (!this.blocksMove(this.at(cx, cy))) continue;
        const L = cx * T, Tp = cy * T, Rr = L + T, B = Tp + T;
        const nx = Phaser.Math.Clamp(a.x, L, Rr), ny = Phaser.Math.Clamp(a.y, Tp, B);
        let dx = a.x - nx, dy = a.y - ny; let d = Math.hypot(dx, dy);
        if (d === 0) { // 중심이 셀 안: 가장 가까운 변으로
          const opts = [[a.x - L, -1, 0], [Rr - a.x, 1, 0], [a.y - Tp, 0, -1], [B - a.y, 0, 1]].sort((p, q) => p[0] - q[0])[0];
          a.x += opts[1] * (opts[0] + r); a.y += opts[2] * (opts[0] + r); continue;
        }
        if (d < r) { a.x += (dx / d) * (r - d); a.y += (dy / d) * (r - d); }
      }
    }
  }
  shotBlocked(px: number, py: number) { const c = this.cell(px, py); return this.blocksShot(this.at(c.x, c.y)); }

  // ---------- 렌더 ----------
  gates: Map<number, Phaser.GameObjects.GameObject[]> = new Map();
  liquidG: Phaser.GameObjects.Graphics | null = null;
  render(W: World, th: Theme, style: 'trees' | 'wall' | 'rock') {
    const g = W.add.graphics().setDepth(-9500); this.liquidG = g; const L = LIQ[this.liquid];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const v = this.at(x, y); const px = x * T, py = y * T;
      if (v === LIQUID || v === BRIDGE) {
        const deep = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => { const n = this.at(x + dx, y + dy); return n === LIQUID || n === BRIDGE || n === SOLID; });
        g.fillStyle(deep ? L.deep : L.base, 1).fillRect(px, py, T, T);
        // 물가 하이라이트
        if (this.passable(x, y - 1) && this.at(x, y - 1) !== BRIDGE) { g.fillStyle(L.shore, 0.85).fillRect(px, py, T, 4); g.fillStyle(0x000000, 0.25).fillRect(px, py + 4, T, 6); }
        if (this.passable(x - 1, y) && this.at(x - 1, y) !== BRIDGE) g.fillStyle(L.shore, 0.5).fillRect(px, py, 3, T);
        if (this.passable(x + 1, y) && this.at(x + 1, y) !== BRIDGE) g.fillStyle(L.shore, 0.5).fillRect(px + T - 3, py, 3, T);
        if (this.liquid === 'void' && Math.random() < 0.08) g.fillStyle(0xffffff, 0.6).fillRect(px + Math.random() * T, py + Math.random() * T, 2, 2);
        if (v === BRIDGE) W.add.image(px + T / 2, py + T / 2, 'dun', 37).setScale(3).setTint(this.liquid === 'void' ? 0xb090e0 : 0xc89868).setDepth(-9400);
        else if (Math.random() < 0.06) { const s = W.add.image(px + Math.random() * T, py + Math.random() * T, 'fx_spark').setTint(L.spark).setScale(0.05).setBlendMode(Phaser.BlendModes.ADD).setDepth(-9300).setAlpha(0); W.tweens.add({ targets: s, alpha: 0.9, scale: 0.09, yoyo: true, repeat: -1, delay: Math.random() * 3000, duration: 900 + Math.random() * 900 }); }
      } else if (v === SOLID && this.inner(x, y)) {
        if (style === 'trees') {
          const f = [SP.treeG.frame, SP.pine.frame, SP.tree.frame][Math.floor(Math.random() * 3)];
          W.add.image(px + T / 2, py + T, 'town', f).setScale(3).setOrigin(0.5, 1).setTint(Phaser.Display.Color.GetColor(110 + Math.random() * 30, 150 + Math.random() * 30, 110)).setDepth(py + T);
        } else if (style === 'rock') {
          W.add.image(px + T / 2, py + T / 2, th.wallSheet, th.wallFrame).setScale(3).setTint(th.wallTint).setDepth(-9450);
          if (Math.random() < 0.6) W.add.image(px + T / 2, py + T, 'dun', SP.rock.frame).setScale(3).setOrigin(0.5, 1).setTint(th.wallTint).setDepth(py + T);
        } else {
          const face = !this.blocksMove(this.at(x, y + 1)) || this.at(x, y + 1) === LIQUID;
          if (face) W.add.image(px + T / 2, py + T, th.wallSheet, th.wallFrame).setScale(3).setOrigin(0.5, 1).setTint(th.wallTint).setDepth(py + T);
          else { g.fillStyle(Phaser.Display.Color.ValueToColor(th.wallTint).darken(55).color, 1).fillRect(px, py, T, T); }
        }
      }
    }
  }
  setGate(cells: [number, number][], closed: boolean, W: World) {
    for (const [x, y] of cells) {
      const k = y * this.cols + x; this.set(x, y, closed ? GATE : FLOOR);
      const old = this.gates.get(k); old?.forEach((o) => o.destroy()); this.gates.delete(k);
      if (closed) {
        const gg = W.add.graphics().setDepth(y * T + T);
        gg.fillStyle(0x200810, 0.5).fillRect(x * T, y * T, T, T);
        for (let i = 0; i < 4; i++) { gg.fillStyle(0x8a3040, 1).fillRect(x * T + 4 + i * 12, y * T, 5, T); gg.fillStyle(0xff7080, 1).fillRect(x * T + 5 + i * 12, y * T, 2, T); }
        const glow = W.add.image(x * T + T / 2, y * T + T / 2, 'fx_light').setTint(0xff3050).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35).setAlpha(0.4).setDepth(y * T + T + 1);
        this.gates.set(k, [gg, glow]);
      }
    }
  }
}
