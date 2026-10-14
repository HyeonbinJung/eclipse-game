// 판정 도형 + 공격 예고(Telegraph) 렌더링. 예고 중엔 판정 없음(기획서 3.6)
import Phaser from 'phaser';

export type WShape =
  | { k: 'circle'; x: number; y: number; r: number }
  | { k: 'cone'; x: number; y: number; r: number; a: number; half: number }
  | { k: 'rect'; x: number; y: number; a: number; len: number; w: number }
  | { k: 'ring'; x: number; y: number; R: number; a: number; b: number; reverse?: boolean }
  | { k: 'wedges'; x: number; y: number; R: number; safeHalf: number; rot: number }
  | { k: 'arena'; x: number; y: number; w: number; h: number; safe: { x: number; y: number; r: number }[] }
  | { k: 'multi'; parts: WShape[] };

const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export function hitTest(s: WShape, px: number, py: number, pr: number): boolean {
  switch (s.k) {
    case 'circle': return Math.hypot(px - s.x, py - s.y) < s.r + pr;
    case 'cone': {
      const d = Math.hypot(px - s.x, py - s.y); if (d > s.r + pr) return false; if (d < pr + 8) return true;
      const extra = Math.asin(Math.min(1, pr / Math.max(d, 1)));
      return Math.abs(angDiff(Math.atan2(py - s.y, px - s.x), s.a)) <= s.half + extra;
    }
    case 'rect': {
      const dx = px - s.x, dy = py - s.y; const c = Math.cos(-s.a), sn = Math.sin(-s.a);
      const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
      return lx > -pr && lx < s.len + pr && Math.abs(ly) < s.w / 2 + pr;
    }
    case 'ring': {
      const d = Math.hypot(px - s.x, py - s.y); if (d > s.R) return false;
      if (s.reverse) return d > s.a * 0.9;
      return !(d > s.a && d < s.b);
    }
    case 'wedges': {
      const d = Math.hypot(px - s.x, py - s.y); if (d > s.R) return false; if (d < 40) return true;
      const ang = Math.atan2(py - s.y, px - s.x) - s.rot;
      for (let i = 0; i < 4; i++) if (Math.abs(angDiff(ang, (i * Math.PI) / 2)) < s.safeHalf) return false;
      return true;
    }
    case 'arena': {
      if (px < s.x || py < s.y || px > s.x + s.w || py > s.y + s.h) return false;
      for (const z of s.safe) if (Math.hypot(px - z.x, py - z.y) < z.r) return false;
      return true;
    }
    case 'multi': return s.parts.some((p) => hitTest(p, px, py, pr));
  }
}

export function shapeArea(s: WShape): number {
  switch (s.k) {
    case 'circle': return Math.PI * s.r * s.r;
    case 'cone': return s.half * s.r * s.r;
    case 'rect': return s.len * s.w;
    case 'multi': return s.parts.reduce((a, p) => a + shapeArea(p), 0);
    default: return 0;
  }
}

export interface TeleStyle { parry?: boolean; fake?: boolean; color?: number; subtle?: boolean }
const RED = 0xff3048, CYAN = 0x30f0e0, SAFE = 0x60ff90;

function pathShape(g: Phaser.GameObjects.Graphics, s: WShape, scale = 1) {
  switch (s.k) {
    case 'circle': g.beginPath(); g.arc(s.x, s.y, s.r * scale, 0, Math.PI * 2); g.closePath(); break;
    case 'cone': g.beginPath(); g.moveTo(s.x, s.y); g.arc(s.x, s.y, s.r * scale, s.a - s.half, s.a + s.half); g.closePath(); break;
    case 'rect': {
      const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * scale, hw = s.w / 2;
      const pts = [[0, -hw], [L, -hw], [L, hw], [0, hw]].map(([x, y]) => new Phaser.Math.Vector2(s.x + x * c - y * sn, s.y + x * sn + y * c));
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.closePath(); break;
    }
    default: break;
  }
}

export function drawTelegraph(g: Phaser.GameObjects.Graphics, s: WShape, prog: number, st: TeleStyle = {}) {
  const col = st.fake ? 0x8a88a8 : st.color ?? RED;
  const baseA = st.subtle ? 0.1 : 0.16;
  if (s.k === 'multi') { for (const p of s.parts) drawTelegraph(g, p, prog, st); return; }
  if (s.k === 'ring') {
    if (s.reverse) {
      fillAnnulus(g, s.x, s.y, s.a * 0.9, s.R, col, baseA + 0.2 * prog);
      g.lineStyle(3, SAFE, 0.9); g.strokeCircle(s.x, s.y, s.a * 0.9);
    } else {
      g.fillStyle(col, baseA + 0.2 * prog); g.fillCircle(s.x, s.y, s.a);
      fillAnnulus(g, s.x, s.y, s.b, s.R, col, baseA + 0.2 * prog);
      g.lineStyle(3, SAFE, 0.9); g.strokeCircle(s.x, s.y, s.a + 4); g.strokeCircle(s.x, s.y, s.b - 4);
    }
    g.lineStyle(2, col, 0.9); g.strokeCircle(s.x, s.y, s.R); return;
  }
  if (s.k === 'wedges') {
    for (let i = 0; i < 4; i++) {
      const a0 = s.rot + (i * Math.PI) / 2 + s.safeHalf, a1 = s.rot + ((i + 1) * Math.PI) / 2 - s.safeHalf;
      g.fillStyle(col, baseA + 0.25 * prog); g.beginPath(); g.moveTo(s.x, s.y); g.arc(s.x, s.y, s.R, a0, a1); g.closePath(); g.fillPath();
      g.lineStyle(3, SAFE, 0.85); const am = s.rot + (i * Math.PI) / 2;
      g.beginPath(); g.moveTo(s.x + Math.cos(am - s.safeHalf) * 40, s.y + Math.sin(am - s.safeHalf) * 40); g.lineTo(s.x + Math.cos(am - s.safeHalf) * s.R, s.y + Math.sin(am - s.safeHalf) * s.R); g.strokePath();
      g.beginPath(); g.moveTo(s.x + Math.cos(am + s.safeHalf) * 40, s.y + Math.sin(am + s.safeHalf) * 40); g.lineTo(s.x + Math.cos(am + s.safeHalf) * s.R, s.y + Math.sin(am + s.safeHalf) * s.R); g.strokePath();
    }
    return;
  }
  if (s.k === 'arena') {
    g.fillStyle(col, 0.1 + 0.22 * prog); g.fillRect(s.x, s.y, s.w, s.h);
    for (const z of s.safe) { g.fillStyle(SAFE, 0.25); g.fillCircle(z.x, z.y, z.r); g.lineStyle(3, SAFE, 1); g.strokeCircle(z.x, z.y, z.r); }
    return;
  }
  // 바탕 + 차오르는 내부
  pathShape(g, s); g.fillStyle(col, st.fake ? 0.08 : baseA); g.fillPath();
  if (!st.fake) { pathShape(g, s, Math.max(0.05, prog)); g.fillStyle(col, 0.12 + 0.2 * prog); g.fillPath(); }
  // 테두리: 패링 가능=청록 단일 / 불가=붉은 이중
  if (st.parry) { pathShape(g, s); g.lineStyle(3, CYAN, 0.95); g.strokePath(); }
  else if (!st.fake && !st.subtle) {
    pathShape(g, s); g.lineStyle(3, col, 0.9); g.strokePath();
    if (s.k === 'circle') { g.lineStyle(1.5, col, 0.9); g.strokeCircle(s.x, s.y, s.r + 6); }
    else { pathShape(g, s, 1.04); g.lineStyle(1.5, col, 0.7); g.strokePath(); }
  } else { pathShape(g, s); g.lineStyle(1.5, col, st.fake ? 0.35 : 0.6); g.strokePath(); }
}

export function shapeCenter(s: WShape): { x: number; y: number } {
  switch (s.k) {
    case 'rect': return { x: s.x + Math.cos(s.a) * s.len * 0.5, y: s.y + Math.sin(s.a) * s.len * 0.5 };
    case 'cone': return { x: s.x + Math.cos(s.a) * s.r * 0.6, y: s.y + Math.sin(s.a) * s.r * 0.6 };
    case 'multi': return shapeCenter(s.parts[0]);
    case 'arena': return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
    default: return { x: (s as any).x, y: (s as any).y };
  }
}

// 두꺼운 원호 stroke 대신 사각형 조각으로 도넛 영역을 채운다
function fillAnnulus(g: Phaser.GameObjects.Graphics, x: number, y: number, r1: number, r2: number, color: number, alpha: number) {
  const N = 64; g.fillStyle(color, alpha);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    g.fillPoints([
      { x: x + Math.cos(a0) * r1, y: y + Math.sin(a0) * r1 }, { x: x + Math.cos(a0) * r2, y: y + Math.sin(a0) * r2 },
      { x: x + Math.cos(a1) * r2, y: y + Math.sin(a1) * r2 }, { x: x + Math.cos(a1) * r1, y: y + Math.sin(a1) * r1 },
    ] as any, true);
  }
}
