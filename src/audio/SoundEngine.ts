/**
 * Procedural Web Audio synthesizer for realistic tactile cue sports acoustics.
 * Zero external audio assets required; all waveforms & filtered noise are generated natively.
 */
class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastCollisionAt = 0;
  private lastCushionAt = 0;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  /** Soft leather/chalk transient + wood shaft thump when cue tip contacts cue ball. */
  public playCueStrike(powerPercent: number, tipHardness: number = 0.6): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainScale = Math.max(0.14, Math.min(1, powerPercent / 100));

    // Leather tip chalk transient (bandpass noise burst)
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100 + tipHardness * 1400, now);
      filter.Q.setValueAtTime(2.6, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.18 * gainScale, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

      noise.connect(filter).connect(nGain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.045);
    }

    // Shaft body low punch
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185 + tipHardness * 85, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.055);

    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0.22 * gainScale, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  /** Crisp phenolic-resin click scaled cleanly by collision impulse magnitude. */
  public playBallCollision(impulse: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const nowMs = performance.now();
    // Cluster break debounce to prevent distortion on multi-ball triangle impacts
    if (nowMs - this.lastCollisionAt < 14) return;
    this.lastCollisionAt = nowMs;

    const strength = Math.max(0.05, Math.min(1, impulse / 2600));
    const now = ctx.currentTime;

    // Resonant high phenolic modal click
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const baseFreq = 2650 + Math.min(900, strength * 750) + (Math.random() - 0.5) * 140;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(1250, now + 0.022);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28 * strength, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    // Secondary crisp upper overtone
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(baseFreq * 1.62, now);
    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.11 * strength, now);
    overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    osc.connect(gain).connect(ctx.destination);
    overtone.connect(overGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.032);
    overtone.start(now);
    overtone.stop(now + 0.018);
  }

  /** Warm damped rubber rail thud when a ball rebounds off cushion nose. */
  public playCushionHit(speed: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const nowMs = performance.now();
    if (nowMs - this.lastCushionAt < 25) return;
    this.lastCushionAt = nowMs;

    const strength = Math.max(0.06, Math.min(1, speed / 2400));
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165 + strength * 45, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.068);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22 * strength, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.072);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  /** Leather pocket drop + soft net settle sound. */
  public playPocketDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(520, now + 0.04);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.11, now + 0.05);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(lp).connect(nGain).connect(ctx.destination);
      noise.start(now + 0.03);
      noise.stop(now + 0.15);
    }
  }

  /** Subtle low warning chime for rule foul. */
  public playFoulTone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(98, now + 0.22);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(lp).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const soundEngine = new ProceduralSoundEngine();

/** Gentle tactile vibration on supported mobile devices without interrupting flow. */
export function triggerHaptic(durationMs: number = 12, enabled: boolean = true): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(durationMs);
  } catch {
    // Ignore blocked vibration contexts
  }
}
