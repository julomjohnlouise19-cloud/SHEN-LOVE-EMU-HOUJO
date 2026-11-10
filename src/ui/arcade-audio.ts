export class ArcadeAudio {
  private context?: AudioContext;
  enabled = false;
  async enable(value: boolean) {
    this.enabled = value;
    if (value) {
      this.context ??= new AudioContext();
      await this.context.resume();
    }
  }
  play(kind: "shot" | "correct" | "wrong" | "jackpot") {
    if (!this.enabled || !this.context) return;
    const ctx = this.context,
      notes =
        kind === "jackpot"
          ? [523, 659, 784, 1046, 784, 1046]
          : kind === "correct"
            ? [523, 659, 784]
            : kind === "wrong"
              ? [130, 90]
              : [280, 150];
    notes.forEach((hz, index) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      const start = ctx.currentTime + index * (kind === "shot" ? 0.025 : 0.09);
      oscillator.type = kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(hz, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });
  }
  close() {
    this.enabled = false;
    void this.context?.close().catch(() => undefined);
  }
}
