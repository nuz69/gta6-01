/**
 * AudioSystem - Web Audio API procedural sound effects and engine/siren synthesizer
 * SOLMARINA: NEON HEAT
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

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.initialized = true;

      // Engine hum oscillator (sawtooth)
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
      this.engineOsc.connect(this.engineGain);
      this.engineOsc.start();

      // Police siren oscillator (sine wave sweeping)
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(600, this.ctx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenOsc.start();
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
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
  }

  isMuted() {
    return this.muted;
  }

  getEngineFreq() {
    return this.engineOsc && this.engineOsc.frequency ? this.engineOsc.frequency.value : 0;
  }

  playClick() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  playPickup() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.09); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playPunch() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  updateEngine(speed, driving) {
    if (!this.initialized || !this.ctx || !this.engineGain || !this.engineOsc) return;
    if (this.muted || !driving) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
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
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    this.sirenTime += (dt || 0.016) * 4.0;
    const sirenFreq = 550 + Math.sin(this.sirenTime) * 320;
    this.sirenOsc.frequency.setTargetAtTime(sirenFreq, this.ctx.currentTime, 0.05);
    this.sirenGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
  }
}
