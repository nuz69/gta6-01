/**
 * AudioSystem - Web Audio API procedural sound effects and engine/siren synthesizer
 * SOLMARINA: NEON HEAT
 *
 * The two looping oscillators (engine hum, police siren) share one setup
 * helper, and the three one-shot effects share one blip helper driven by a
 * small frequency-step table. All frequencies, gains, ramps, and timings
 * are unchanged from the original implementation.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTime = 0;
  }

  /**
   * Creates a silent looping oscillator wired to the destination and starts it.
   * Returns the { osc, gain } pair.
   */
  _startLoopOsc(type, baseFreq) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.connect(gain);
    osc.start();
    return { osc, gain };
  }

  /**
   * Plays a short synthesized blip.
   * freqSteps: [[offsetSeconds, freqHz, 'set' | 'exp'], ...] — the first step
   * always uses setValueAtTime; later steps ramp ('exp') or jump ('set').
   */
  _blip({ type, freqSteps, peak, duration }) {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      freqSteps.forEach(([offset, freq, mode], index) => {
        if (index === 0 || mode !== 'exp') {
          osc.frequency.setValueAtTime(freq, now + offset);
        } else {
          osc.frequency.exponentialRampToValueAtTime(freq, now + offset);
        }
      });
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  /** Silences a loop gain immediately. */
  _cutLoop(gainNode) {
    if (gainNode && this.ctx) {
      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.initialized = true;

      // Engine hum oscillator (sawtooth)
      const engine = this._startLoopOsc('sawtooth', 55);
      this.engineOsc = engine.osc;
      this.engineGain = engine.gain;

      // Police siren oscillator (sine wave sweeping)
      const siren = this._startLoopOsc('sine', 600);
      this.sirenOsc = siren.osc;
      this.sirenGain = siren.gain;
    } catch (err) {
      console.warn('WebAudio initialization failed:', err);
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    if (this.muted) {
      this._cutLoop(this.engineGain);
      this._cutLoop(this.sirenGain);
    }
  }

  isMuted() {
    return this.muted;
  }

  getEngineFreq() {
    return this.engineOsc && this.engineOsc.frequency ? this.engineOsc.frequency.value : 0;
  }

  playClick() {
    this._blip({
      type: 'sine',
      freqSteps: [[0, 750, 'set'], [0.04, 350, 'exp']],
      peak: 0.12,
      duration: 0.04,
    });
  }

  playPickup() {
    this._blip({
      type: 'triangle',
      freqSteps: [[0, 587.33, 'set'], [0.09, 880.00, 'set']], // D5 -> A5
      peak: 0.18,
      duration: 0.25,
    });
  }

  playPunch() {
    this._blip({
      type: 'square',
      freqSteps: [[0, 110, 'set'], [0.12, 25, 'exp']],
      peak: 0.25,
      duration: 0.12,
    });
  }

  updateEngine(speed, driving) {
    if (!this.initialized || !this.ctx || !this.engineGain || !this.engineOsc) return;
    if (this.muted || !driving) {
      this._cutLoop(this.engineGain);
      return;
    }
    const absSpeed = Math.abs(speed);
    const targetFreq = Math.min(380, 50 + absSpeed * 3.5);
    const targetVol = Math.min(0.2, 0.04 + absSpeed * 0.004);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.08);
  }

  updateSiren(policeActive, dt) {
    if (!this.initialized || !this.ctx || !this.sirenGain || !this.sirenOsc) return;
    if (this.muted || !policeActive) {
      this._cutLoop(this.sirenGain);
      return;
    }
    this.sirenTime += (dt || 0.016) * 4.0;
    const sirenFreq = 550 + Math.sin(this.sirenTime) * 320;
    this.sirenOsc.frequency.setTargetAtTime(sirenFreq, this.ctx.currentTime, 0.05);
    this.sirenGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
  }
}
