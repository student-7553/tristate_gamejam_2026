/**
 * Stealth-style background music via the Web Audio API.
 *
 * Slow, tense, sparse — built for a stealth game:
 *   - 85 BPM, 32-step (2-bar) 16th-note loop
 *   - Soft kick on beats 1 & 3 only
 *   - Single quiet snare click at the end of bar 2 (tension pickup)
 *   - Light quarter-note hi-hat ticks
 *   - Slow walking bass in the low register
 *   - Sparse triangle melody (flute-like, high tension phrases)
 *   - Atmospheric pad layer with slow attack — the "ambient drone"
 *
 * AudioContext is created lazily on the first start() call so it
 * always happens inside a user-gesture handler (browser autoplay policy).
 */
export class MusicPlayer {
  constructor() {
    this._ac       = null;
    this._master   = null;
    this.isPlaying = false;
    this.bpm       = 85;
    this._step     = 0;
    this._nextTime = 0;
    this._timerID  = null;
    this._AHEAD    = 0.1; // seconds to look ahead when scheduling

    // E minor pentatonic, two octaves
    // idx:   0       1       2       3       4       5       6       7       8       9
    //        E3      G3      A3      B3      D4      E4      G4      A4      B4      D5
    this._sc = [164.81,196.00,220.00,246.94,293.66,329.63,392.00,440.00,493.88,587.33];

    // ── 32-step patterns (2 bars of 16th notes) ──────────────────────────────

    // Kick — soft hits on beat 1 and 3 only (stealth: don't punch)
    // prettier-ignore
    this._kk = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
                1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];

    // Snare — single very quiet "tick" at the very end of bar 2 (tension pickup)
    // prettier-ignore
    this._sn = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1];

    // Hi-hat — quarter-note ticks only, very light
    // prettier-ignore
    this._hh = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,
                1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];

    // Bass — low, slow, sparse walking line (uses E3, A3, B3 for a tense feel)
    //        E3           E3           B3           A3
    // prettier-ignore
    this._bs = [ 0,-1,-1,-1, -1,-1,-1,-1,  0,-1,-1,-1, -1,-1,-1,-1,
                 0,-1,-1,-1, -1,-1,-1,-1,  3,-1,-1,-1,  2,-1,-1,-1];

    // Melody — sparse, high up the scale, long rests for tension
    //          D4                          E4
    // prettier-ignore
    this._ml = [-1,-1,-1,-1, -1,-1, 4,-1, -1,-1,-1,-1,  5,-1,-1,-1,
                -1,-1,-1,-1, -1,-1, 3,-1, -1,-1,-1,-1, -1,-1, 2,-1];
    //          B3                          A3

    // Pad — slow-attack atmospheric sine notes, one per bar
    //        E3                                                          D4
    // prettier-ignore
    this._pd = [ 0,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
                 4,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1];
  }

  // ── Lazy AudioContext init ────────────────────────────────────────────────

  _init() {
    if (this._ac) return;
    this._ac     = new AudioContext();
    this._master = this._ac.createGain();
    this._master.gain.value = 0.38;
    this._master.connect(this._ac.destination);
  }

  // ── Sound generators ─────────────────────────────────────────────────────

  _kick(t) {
    const osc = this._ac.createOscillator();
    const env = this._ac.createGain();
    osc.connect(env); env.connect(this._master);
    // Lower starting freq and shorter decay = softer, less punchy thud
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.30);
    env.gain.setValueAtTime(0.65, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    osc.start(t); osc.stop(t + 0.35);
  }

  _snare(t) {
    const ac  = this._ac;
    // Short white-noise tick — more of a brush/click than a cracking snare
    const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < dat.length; i++) dat[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const flt = ac.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 3500; flt.Q.value = 0.8;
    const env = ac.createGain();
    src.connect(flt); flt.connect(env); env.connect(this._master);
    env.gain.setValueAtTime(0.18, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    src.start(t); src.stop(t + 0.14);
  }

  _hihat(t) {
    const ac  = this._ac;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < dat.length; i++) dat[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const flt = ac.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 9000;
    const env = ac.createGain();
    src.connect(flt); flt.connect(env); env.connect(this._master);
    // Very soft — just a tick to mark time
    env.gain.setValueAtTime(0.12, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.start(t); src.stop(t + 0.05);
  }

  _note(t, freq, type, dur, vol) {
    const osc = this._ac.createOscillator();
    const env = this._ac.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(env); env.connect(this._master);
    env.gain.setValueAtTime(vol, t); env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  /** Atmospheric pad: slow linear attack, hold, then fade out. */
  _pad(t, freq, dur) {
    const osc = this._ac.createOscillator();
    const env = this._ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(env); env.connect(this._master);
    const atk = dur * 0.28;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.14, t + atk);
    env.gain.setValueAtTime(0.14, t + dur - atk);
    env.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // ── Sequencer ─────────────────────────────────────────────────────────────

  _schedule() {
    const step16 = (60 / this.bpm) / 4; // 16th-note duration in seconds
    const len    = this._kk.length;

    while (this._nextTime < this._ac.currentTime + this._AHEAD) {
      const s = this._step % len;
      const t = this._nextTime;

      if (this._kk[s]) this._kick(t);
      if (this._sn[s]) this._snare(t);
      if (this._hh[s]) this._hihat(t);

      const bn = this._bs[s];
      // Bass: long sustain (3 beats) for a slow, breathing feel
      if (bn >= 0) this._note(t, this._sc[bn], 'sine', step16 * 12, 0.45);

      const mn = this._ml[s];
      // Melody: triangle wave, held 2 beats, quieter
      if (mn >= 0) this._note(t, this._sc[mn], 'triangle', step16 * 8, 0.22);

      const pn = this._pd[s];
      // Pad: fills almost the whole bar with a slow bloom
      if (pn >= 0) this._pad(t, this._sc[pn], step16 * 15);

      this._step++;
      this._nextTime += step16;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Start playback. Safe to call multiple times — no-op if already playing. */
  start() {
    this._init();
    if (this._ac.state === 'suspended') this._ac.resume();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._nextTime = this._ac.currentTime;
    this._step     = 0;
    this._timerID  = setInterval(() => this._schedule(), 25);
  }

  stop() {
    this.isPlaying = false;
    clearInterval(this._timerID);
  }
}
