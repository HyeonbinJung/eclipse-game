// 효과음: Kenney 오디오(CC0) / 배경음: WebAudio 절차 생성 앰비언트 (외부 음원 불필요)
import Phaser from 'phaser';
import { S } from '../core/state';

let game: Phaser.Game;
export function initAudio(g: Phaser.Game) { game = g; }
export const SFX_KEYS = ['hit1', 'hit2', 'parry', 'guard', 'hurt', 'bell', 'glass', 'slam', 'step', 'swing1', 'swing2', 'draw', 'dash', 'coin', 'door', 'page', 'anvil', 'chop', 'click', 'confirm', 'error', 'glitch', 'magic', 'pickup', 'levelup', 'victory', 'defeat', 'boss'];

const last: Record<string, number> = {};
export function sfx(key: string, vol = 1, detune = 120) {
  const v = (S?.settings.sfx ?? 0.7) * vol; if (v <= 0.01 || !game) return;
  const now = performance.now(); if (last[key] && now - last[key] < 35) return; last[key] = now;
  try { game.sound.play(key, { volume: v, detune: (Math.random() - 0.5) * detune }); } catch { /* 디코딩 전 */ }
}

// ---------- 절차 BGM ----------
class Music {
  ctx: AudioContext | null = null; master: GainNode | null = null; nodes: AudioNode[] = []; timer: any = null; theme = ''; vol = 0.45;
  ensure() {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return false;
      this.ctx = new AC(); this.master = this.ctx!.createGain(); this.master.gain.value = this.vol * 0.5; this.master.connect(this.ctx!.destination);
    }
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
    return true;
  }
  setVolume(v: number) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v * 0.5, this.ctx!.currentTime, 0.2); }
  stop() {
    if (this.timer) clearInterval(this.timer); this.timer = null;
    const t = this.ctx?.currentTime || 0;
    for (const n of this.nodes) { try { (n as any).gain?.setTargetAtTime(0, t, 0.4); (n as any).stop?.(t + 1.5); } catch { /* */ } }
    this.nodes = []; this.theme = '';
  }
  play(theme: string, root: number[], boss = false) {
    if (this.theme === theme + boss) return;
    if (!this.ensure()) return;
    this.stop(); this.theme = theme + boss; this.setVolume(S?.settings.bgm ?? 0.45);
    const ctx = this.ctx!; const out = ctx.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, ctx.currentTime, 1.2); out.connect(this.master!); this.nodes.push(out);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = boss ? 1400 : 900; filt.connect(out);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(filt.frequency); lfo.start(); this.nodes.push(lfo);
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    // 패드
    for (const [i, m] of root.slice(0, 3).entries()) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'sawtooth' : 'triangle'; o.frequency.value = hz(m - 12); o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = i === 0 ? 0.035 : 0.05; o.connect(g); g.connect(filt); o.start(); this.nodes.push(o, g);
      }
    }
    // 아르페지오/펄스
    const scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
    let step = 0; const bpm = boss ? 132 : theme === 'town' ? 84 : 96; const stepMs = 60000 / bpm / 2;
    this.timer = setInterval(() => {
      if (!this.ctx || document.hidden) return;
      const t = ctx.currentTime + 0.02;
      const pluck = (midi: number, dur: number, vol: number, type: OscillatorType = 'triangle') => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(midi);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
      };
      const base = root[0];
      if (boss) {
        if (step % 2 === 0) pluck(base - 24, 0.25, 0.22, 'square');
        if (step % 8 === 4) pluck(base - 12 + 3, 0.2, 0.12, 'square');
        if (step % 4 === 0) pluck(base + scale[(step / 4) % 5 | 0], 0.3, 0.06);
      } else {
        if (Math.random() < (theme === 'town' ? 0.45 : 0.32)) pluck(base + 12 + scale[Math.floor(Math.random() * scale.length)], 1.2, 0.05);
        if (step % 16 === 0) pluck(base - 12, 2.4, 0.08, 'sine');
      }
      step++;
    }, stepMs);
  }
}
export const music = new Music();
