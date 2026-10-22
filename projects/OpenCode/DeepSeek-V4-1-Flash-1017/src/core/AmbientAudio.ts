/** Minimal procedural ambience: low structural hum + filtered wind noise. */
export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private running = false;

  get enabled(): boolean {
    return this.running;
  }

  async toggle(): Promise<boolean> {
    if (this.running) {
      this.stop();
      return false;
    }
    await this.start();
    return this.running;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  async start(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();

    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
    }
    if (this.running) return;
    this.running = true;

    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0.0001, now);
    this.master.gain.exponentialRampToValueAtTime(0.28, now + 2.4);

    // low structural drone
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    droneGain.connect(this.master);
    for (const [freq, gain, detune] of [
      [41.2, 0.5, -4],
      [61.8, 0.28, 5],
      [97.5, 0.12, 9],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(droneGain);
      osc.start();
      this.nodes.push(osc);
    }

    // wind / ocean noise
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.55;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.11;
    noise.connect(band).connect(noiseGain).connect(this.master);
    noise.start();
    this.nodes.push(noise);

    // slow swell on the noise bed
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.055;
    lfo.connect(lfoGain).connect(noiseGain.gain);
    lfo.start();
    this.nodes.push(lfo);

    // distant machinery beep
    const beep = ctx.createOscillator();
    beep.type = 'triangle';
    beep.frequency.value = 1180;
    const beepGain = ctx.createGain();
    beepGain.gain.value = 0;
    beep.connect(beepGain).connect(this.master);
    beep.start();
    this.nodes.push(beep);

    const schedule = () => {
      if (!this.running || !this.ctx) return;
      const t = this.ctx.currentTime;
      beepGain.gain.setValueAtTime(0.0001, t);
      beepGain.gain.exponentialRampToValueAtTime(0.018, t + 0.04);
      beepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      window.setTimeout(schedule, 7400 + Math.random() * 6000);
    };
    window.setTimeout(schedule, 2600);
  }

  stop(): void {
    this.running = false;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    const nodes = this.nodes;
    this.nodes = [];
    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      }
    }, 750);
  }
}
