// 시작 인트로: "Software by Extriver" — 심볼 링이 그려지며 조립된 뒤 워드마크가 펼쳐진다.
// 게임은 뒤에서 그대로 로딩되고, 클릭·키 입력으로 건너뛸 수 있다.
// ?nointro 또는 자동화 브라우저(navigator.webdriver)에서는 생략, ?intro 는 강제 재생.

const GOLD = '#d6b87e';
const WORD_SRC = 'assets/img/extriver-wordmark.png';
const WORD_RATIO = 1261 / 250; // 워드마크 원본 비율
const PERIOD_AT = 1199 / 1261; // 마침표가 시작되는 가로 위치(금색 처리)

// 각도는 위(12시)에서 시계 방향, 도 단위
const pt = (r: number, deg: number) => { const a = ((deg - 90) * Math.PI) / 180; return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; };
const arc = (r: number, a0: number, a1: number) => `M${pt(r, a0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(r, a1)}`;
// 십자 틈: 세로 틈 반폭 17px, 가로 틈 반폭 20px (원본 1080px 로고 기준)
const gap = (r: number, hw: number) => (Math.asin(Math.min(1, hw / r)) * 180) / Math.PI;
function quadrants(r: number, trim: [number, number, number, number] = [0, 0, 0, 0]) {
  const v = gap(r, 17), h = gap(r, 20);
  return [[v, 90 - h], [90 + h, 180 - v], [180 + v, 270 - h], [270 + h, 360 - v]].map(([a, b], i) => arc(r, a + trim[i], b));
}

function symbolSVG() {
  const ring = (r: number, w: number, cls: string, trim?: [number, number, number, number]) =>
    quadrants(r, trim).map((d, i) => `<path class="${cls}" style="--i:${i}" d="${d}" stroke-width="${w}" pathLength="1"/>`).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const deg = i * 6, major = i % 5 === 0;
    return `<path class="${major ? 'tk mj' : 'tk'}" d="M${pt(major ? 383 : 387, deg)} L${pt(major ? 397 : 393, deg)}"/>`;
  }).join('');
  const inner: [number, number, [number, number, number, number]?][] = [[253, 8], [267, 6, [0, 0, 34, 0]], [281, 4], [295.5, 3.5, [0, 0, 0, 22]], [310, 2.5]];
  return `<svg class="xr-sym" viewBox="-540 -540 1080 1080" aria-hidden="true">
  <defs>
    <linearGradient id="xrSilver" x1="-1" y1="-1" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9ccd3"/><stop offset="1" stop-color="#8e9198"/></linearGradient>
    <radialGradient id="xrGlow"><stop offset="0" stop-color="${GOLD}" stop-opacity=".9"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  </defs>
  <g class="xr-outer"><circle r="405" class="oc"/>${ticks}</g>
  <g class="xr-inner">${inner.map(([r, w, t], k) => `<g style="--k:${k}">${ring(r, w, 'ir', t)}</g>`).join('')}</g>
  <g class="xr-main">${ring(365, 22, 'mr')}
    <g class="hk"><rect x="-376" y="-26" width="54" height="6"/><rect x="-376" y="20" width="54" height="6"/><rect x="322" y="-26" width="54" height="6"/><rect x="322" y="20" width="54" height="6"/></g>
  </g>
  <g class="xr-gold"><rect class="gl gt" x="-2" y="-405" width="4" height="165"/><rect class="gl gb" x="-2" y="240" width="4" height="165"/></g>
  <circle class="xr-wave" r="60"/>
  <circle class="xr-halo" r="70" fill="url(#xrGlow)"/>
  <circle class="xr-dot" r="6"/>
</svg>`;
}

const CSS = `
#xr-intro { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; overflow: hidden; cursor: pointer;
  background: radial-gradient(ellipse at 50% 45%, #15171d 0%, #07080b 60%, #000 100%); font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --s: min(170px, 24vw); animation: xrIn .5s ease-out both; }
#xr-intro.out { animation: xrOut .7s cubic-bezier(.6,0,.4,1) forwards; pointer-events: none; }
#xr-intro.skip { animation: xrOut .3s ease-in forwards; pointer-events: none; }
#xr-intro::before { content: ""; position: absolute; inset: -50%; background: repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px); pointer-events: none; }
#xr-intro::after { content: ""; position: absolute; top: 0; bottom: 0; width: 22%; left: -30%; transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent); animation: xrSweep 1.3s 2.35s ease-in-out both; pointer-events: none; }
.xr-stage { display: flex; flex-direction: column; align-items: center; gap: calc(var(--s) * .16); }
.xr-by { color: #9a9ea8; font-size: calc(var(--s) * .1); letter-spacing: .55em; padding-left: .55em; text-transform: uppercase; font-weight: 600;
  animation: xrBy 1.1s 2.55s cubic-bezier(.2,.7,.2,1) both; }
.xr-lock { display: flex; align-items: center; }
.xr-sym { width: var(--s); height: var(--s); overflow: visible; animation: xrSym 1.3s .1s cubic-bezier(.2,.8,.2,1) both, xrSymShift .9s 2.05s cubic-bezier(.7,0,.2,1) forwards; }
.xr-word { height: calc(var(--s) * .5); width: calc(var(--s) * .5 * ${WORD_RATIO.toFixed(4)}); max-width: 0; margin-left: 0; overflow: hidden; position: relative;
  animation: xrWord .95s 2.05s cubic-bezier(.7,0,.2,1) both; }
.xr-word i { position: absolute; inset: 0; width: calc(var(--s) * .5 * ${WORD_RATIO.toFixed(4)});
  -webkit-mask: url(${WORD_SRC}) left center / contain no-repeat; mask: url(${WORD_SRC}) left center / contain no-repeat;
  background: linear-gradient(90deg, #fff 0%, #e6e8ee ${(PERIOD_AT * 100 - 0.1).toFixed(2)}%, ${GOLD} ${(PERIOD_AT * 100).toFixed(2)}%);
  animation: xrWordIn .9s 2.15s cubic-bezier(.2,.7,.2,1) both; }
.xr-word i::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,.95) 50%, transparent 65%) -150% 0 / 60% 100% no-repeat;
  animation: xrShine 1.1s 3.05s ease-in-out both; }
.xr-line { height: 1px; width: calc(var(--s) * 3.2); background: linear-gradient(90deg, transparent, ${GOLD}, transparent); transform: scaleX(0); opacity: .8;
  animation: xrLine 1s 2.9s cubic-bezier(.2,.7,.2,1) both; }
.xr-skip { position: absolute; right: 22px; bottom: 18px; color: #555a66; font-size: 11px; letter-spacing: .2em; animation: xrIn .6s 1s both; }

.xr-sym path, .xr-sym rect, .xr-sym circle { fill: none; }
.xr-outer { transform-origin: 0 0; animation: xrOuter 1.6s .15s cubic-bezier(.2,.8,.2,1) both; }
.xr-outer .oc { stroke: #3a3d45; stroke-width: 1.5; }
.xr-outer .tk { stroke: #4a4e58; stroke-width: 2; } .xr-outer .tk.mj { stroke: #9aa0ab; stroke-width: 3; }
.xr-main { transform-origin: 0 0; animation: xrSpinA 1.5s .3s cubic-bezier(.15,.85,.25,1) both; }
.xr-inner { transform-origin: 0 0; animation: xrSpinB 1.6s .45s cubic-bezier(.15,.85,.25,1) both; }
.mr, .ir { stroke: url(#xrSilver); stroke-linecap: butt; stroke-dasharray: 1; stroke-dashoffset: 1; }
.mr { animation: xrDraw .9s calc(.35s + var(--i) * .09s) cubic-bezier(.5,0,.2,1) forwards; }
.ir { animation: xrDraw .8s calc(.6s + var(--k) * .08s + var(--i) * .05s) cubic-bezier(.5,0,.2,1) forwards; }
.xr-main .hk rect { fill: url(#xrSilver); opacity: 0; animation: xrFade .3s 1.15s ease-out forwards; }
.xr-gold .gl { fill: ${GOLD}; transform-box: fill-box; transform: scaleY(0); }
.xr-gold .gt { transform-origin: 50% 0; animation: xrGrow .45s 1.3s cubic-bezier(.2,.9,.2,1) forwards; }
.xr-gold .gb { transform-origin: 50% 100%; animation: xrGrow .45s 1.3s cubic-bezier(.2,.9,.2,1) forwards; }
.xr-dot { fill: ${GOLD} !important; transform-box: fill-box; transform-origin: center; transform: scale(0); animation: xrPop .55s 1.6s cubic-bezier(.3,1.8,.5,1) forwards; }
.xr-halo { transform-box: fill-box; transform-origin: center; opacity: 0; animation: xrHalo 2.2s 1.6s ease-out forwards; }
.xr-wave { stroke: ${GOLD}; stroke-width: 3; transform-box: fill-box; transform-origin: center; opacity: 0; animation: xrWave 1.1s 1.62s cubic-bezier(.1,.6,.3,1) forwards; }

@keyframes xrIn { from { opacity: 0; } }
@keyframes xrOut { to { opacity: 0; transform: scale(1.04); filter: blur(6px); } }
@keyframes xrFade { to { opacity: 1; } }
@keyframes xrSym { from { transform: scale(1.75); } to { transform: scale(1.55); } }
@keyframes xrSymShift { from { transform: scale(1.55); } to { transform: scale(1); } }
@keyframes xrOuter { from { transform: rotate(-50deg) scale(.86); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes xrSpinA { from { transform: rotate(110deg); } to { transform: none; } }
@keyframes xrSpinB { from { transform: rotate(-80deg); } to { transform: none; } }
@keyframes xrDraw { to { stroke-dashoffset: 0; } }
@keyframes xrGrow { to { transform: scaleY(1); } }
@keyframes xrPop { to { transform: scale(1); } }
@keyframes xrHalo { 0% { opacity: 0; transform: scale(.3); } 18% { opacity: 1; transform: scale(1.4); } 100% { opacity: .35; transform: scale(1); } }
@keyframes xrWave { 0% { opacity: .9; transform: scale(.2); } 100% { opacity: 0; transform: scale(7); } }
@keyframes xrWord { to { max-width: 100vw; margin-left: calc(var(--s) * .13); } }
@keyframes xrWordIn { from { opacity: 0; transform: translateX(-12%); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes xrShine { to { background-position: 250% 0; } }
@keyframes xrBy { from { opacity: 0; letter-spacing: 1.4em; filter: blur(4px); } to { opacity: 1; } }
@keyframes xrLine { to { transform: scaleX(1); } }
@keyframes xrSweep { to { left: 120%; } }
@media (prefers-reduced-motion: reduce) { #xr-intro *, #xr-intro::after { animation-duration: .01s !important; animation-delay: 0s !important; } }
`;

export function playIntro(): Promise<void> {
  const q = new URLSearchParams(location.search);
  if (!q.has('intro') && (q.has('nointro') || navigator.webdriver)) return Promise.resolve();
  return new Promise((resolve) => {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const el = document.createElement('div'); el.id = 'xr-intro';
    el.innerHTML = `<div class="xr-stage"><div class="xr-by">Software by</div>
      <div class="xr-lock">${symbolSVG()}<div class="xr-word"><i></i></div></div>
      <div class="xr-line"></div></div><div class="xr-skip">CLICK TO SKIP</div>`;
    document.body.appendChild(el);
    let done = false;
    const finish = (skip: boolean) => {
      if (done) return; done = true;
      window.removeEventListener('keydown', onKey); el.removeEventListener('pointerdown', onClick);
      el.classList.add(skip ? 'skip' : 'out');
      setTimeout(() => { el.remove(); style.remove(); resolve(); }, skip ? 320 : 720);
    };
    const onKey = () => finish(true); const onClick = () => finish(true);
    window.addEventListener('keydown', onKey); el.addEventListener('pointerdown', onClick);
    setTimeout(() => finish(false), 4700);
  });
}
