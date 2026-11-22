// Short synthesised effects. Silent until the visitor turns sound on.
let context: AudioContext | undefined;
let enabled = false;

const EFFECTS = {
  open: [196, 294],
  lantern: [523, 392],
  fixed: [330, 247, 440],
  beacon: [220, 330, 277, 415],
} as const;

export function toggleSound(): boolean {
  enabled = !enabled;
  if (enabled) {
    context ??= new AudioContext();
    void context.resume();
    play('open');
  }
  return enabled;
}

export function play(effect: keyof typeof EFFECTS): void {
  if (!enabled || !context) return;
  const audio = context;
  EFFECTS[effect].forEach((frequency, i) => {
    const at = audio.currentTime + i * 0.08;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.13);
  });
}
