// ── Sound Engine ──
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.enabled = localStorage.getItem('se_enabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('se_volume') ?? '0.5');
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? this.volume : 0;
    this.masterGain.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = buf;
    this.reverbNode.connect(this.masterGain);
  }
  setVolume(v) {
    this.volume = v;
    localStorage.setItem('se_volume', String(v));
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? v : 0;
    this._updateBGMVolume();
  }
  setEnabled(b) {
    this.enabled = b;
    localStorage.setItem('se_enabled', String(b));
    if (this.masterGain) this.masterGain.gain.value = b ? this.volume : 0;
    this._updateBGMVolume();
    if (!b) this.stopBGM();
  }
  _osc(freq, type, dur, gain, env, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (opts.delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (env.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (opts.reverb && this.reverbNode) {
      const rg = this.ctx.createGain();
      rg.gain.value = opts.reverbMix || 0.3;
      g.connect(rg);
      rg.connect(this.reverbNode);
    }
    g.connect(this.masterGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  _noise(dur, gain, filterFreq, filterType = 'lowpass', opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (opts.delay || 0);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = filterFreq;
    if (opts.Q) f.Q.value = opts.Q;
    s.connect(f);
    f.connect(g);
    if (opts.reverb && this.reverbNode) {
      const rg = this.ctx.createGain();
      rg.gain.value = 0.2;
      g.connect(rg);
      rg.connect(this.reverbNode);
    }
    g.connect(this.masterGain);
    s.start(t);
    s.stop(t + dur);
  }

  // 単語受信：星が降るようなきらめき
  wordReceived() {
    this.init();
    const base = 900 + Math.random() * 300;
    this._osc(base, 'sine', 0.35, 0.12, { a: 0.005 }, { reverb: true, reverbMix: 0.4 });
    this._osc(base * 1.5, 'sine', 0.25, 0.06, { a: 0.02 }, { delay: 0.03, reverb: true });
  }
  // 単語選択：魔法陣に宝石を置く音
  wordSelected() {
    this.init();
    this._osc(440, 'sine', 0.5, 0.15, { a: 0.005 }, { reverb: true, reverbMix: 0.5 });
    this._osc(660, 'triangle', 0.35, 0.08, { a: 0.02 }, { delay: 0.02, reverb: true });
    this._osc(220, 'sine', 0.4, 0.06, { a: 0.01 });
  }
  // 単語削除：消え去る音
  wordRemoved() {
    this.init();
    this._osc(600, 'sine', 0.2, 0.08, { a: 0.005 }, { freqEnd: 250 });
  }
  // 詠唱開始：儀式の始まり
  ritualStart(type) {
    this.init();
    const bases = { '召喚': 80, '解放': 100, '封印': 60, '滅亡': 50, '覚醒': 90 };
    const base = bases[type] || 80;
    this._osc(base, 'sine', 3, 0.2, { a: 0.3 }, { freqEnd: base * 2.5, reverb: true, reverbMix: 0.5 });
    this._osc(base * 0.5, 'sine', 3.5, 0.1, { a: 0.5 }, { reverb: true });
    this._noise(2.5, 0.06, 300, 'lowpass', { attack: 0.5, reverb: true });
    this._osc(base * 12, 'sine', 2, 0.03, { a: 0.8 }, { delay: 0.5, reverb: true, reverbMix: 0.6 });
  }
  // 詠唱行出現：段階的に高まるチャイム
  lineReveal(index, total) {
    this.init();
    const progress = index / Math.max(total - 1, 1);
    const base = 500 + progress * 500;
    const gain = 0.15 + progress * 0.1;
    this._osc(base, 'sine', 0.7, gain, { a: 0.01 }, { reverb: true, reverbMix: 0.4 + progress * 0.3 });
    this._osc(base * 1.5, 'triangle', 0.4, gain * 0.4, { a: 0.03 }, { delay: 0.02, reverb: true });
    if (index > 0) {
      this._osc(base * 2, 'sine', 0.3, gain * 0.15, { a: 0.05 }, { delay: 0.05, reverb: true });
    }
  }
  // 詠唱完成：衝撃波
  chantComplete(type) {
    this.init();
    const bases = { '召喚': 70, '解放': 90, '封印': 50, '滅亡': 40, '覚醒': 80 };
    const base = bases[type] || 70;
    this._osc(base, 'sine', 2.5, 0.35, { a: 0.005 }, { reverb: true, reverbMix: 0.6 });
    this._osc(base * 0.5, 'sine', 3, 0.15, { a: 0.01 }, { reverb: true });
    this._noise(1.5, 0.12, 400, 'lowpass', { attack: 0.005, reverb: true });
    this._osc(1500, 'sine', 2, 0.04, { a: 0.1 }, { delay: 0.1, reverb: true, reverbMix: 0.7 });
    this._osc(2000, 'sine', 1.5, 0.02, { a: 0.2 }, { delay: 0.2, reverb: true });
  }
  // 詠唱消滅：溶けていく音
  chantFade() {
    this.init();
    this._osc(400, 'sine', 1.5, 0.08, { a: 0.01 }, { freqEnd: 150, reverb: true, reverbMix: 0.6 });
    this._noise(1, 0.03, 800, 'bandpass', { attack: 0.01, reverb: true });
  }
  // コピー確認音
  uiConfirm() {
    this.init();
    this._osc(800, 'sine', 0.15, 0.08, { a: 0.005 });
    this._osc(1200, 'sine', 0.15, 0.06, { a: 0.005 }, { delay: 0.08 });
  }

  // ── BGM（MP3ループ再生） ──
  startBGM() {
    if (this._bgmAudio) return;
    const audio = new Audio('/bgm/Moonlight_on_Vellum.mp3');
    audio.loop = true;
    audio.volume = this.enabled ? 0.3 * this.volume : 0;
    audio.play().catch(() => {});
    this._bgmAudio = audio;
  }
  stopBGM() {
    if (this._bgmAudio) {
      this._bgmAudio.pause();
      this._bgmAudio.currentTime = 0;
      this._bgmAudio = null;
    }
  }
  _updateBGMVolume() {
    if (this._bgmAudio) {
      this._bgmAudio.volume = this.enabled ? 0.3 * this.volume : 0;
    }
  }
}
const sfx = new SoundEngine();
