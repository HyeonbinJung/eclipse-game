// 시드 고정 난수: 같은 시드면 항상 같은 수열. 맵을 매번 똑같이 만들 때 쓴다.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// fn 실행 동안 Math.random을 시드 난수로 바꿔 둔다. 맵 생성 코드가 Math.random을 직접 쓰므로 한 번에 고정할 수 있다.
export function withSeed<T>(seed: number, fn: () => T): T {
  const orig = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = orig; }
}

// 격자 좌표용 결정적 값 노이즈(0~1). 같은 종류의 나무·바위가 군락을 이루게 할 때 쓴다.
export function cellNoise(x: number, y: number, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function smoothNoise(x: number, y: number, scale: number, seed = 0) {
  const fx = x / scale, fy = y / scale; const x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = fx - x0, ty = fy - y0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = cellNoise(x0, y0, seed), b = cellNoise(x0 + 1, y0, seed), c = cellNoise(x0, y0 + 1, seed), d = cellNoise(x0 + 1, y0 + 1, seed);
  return a + (b - a) * s(tx) + (c - a) * s(ty) + (a - b - c + d) * s(tx) * s(ty);
}
