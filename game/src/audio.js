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
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;

        // Create continuous engine hum nodes
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.engineOsc.connect(this.engineGain);
        this.engineOsc.start();

        // Create police siren nodes
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.sirenGain.connect(this.ctx.destination);

        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenOsc.frequency.setValueAtTime(600, this.ctx.currentTime);
        this.sirenOsc.connect(this.sirenGain);
        this.sirenOsc.start();
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
  }

  playClick() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playPickup() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playPunch() {
    if (this.muted || !this.initialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  updateEngine(speed, driving) {
    if (!this.initialized || !this.ctx || !this.engineGain || !this.engineOsc) return;
    if (this.muted || !driving) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    const freq = 50 + Math.abs(speed) * 4;
    const vol = Math.min(0.25, 0.05 + Math.abs(speed) * 0.005);
    this.engineOsc.frequency.setTargetAtTime(Math.min(400, freq), this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  updateSiren(policeActive, dt) {
    if (!this.initialized || !this.ctx || !this.sirenGain || !this.sirenOsc) return;
    if (this.muted || !policeActive) {
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    this.sirenTime += dt * 3.5;
    const freq = 600 + Math.sin(this.sirenTime) * 350;
    this.sirenOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.sirenGain.gain.setTargetAtTime(0.2, this.ctx.currentTime, 0.05);
  }
}
