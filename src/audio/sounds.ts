export type SoundKind =
  "move" | "capture" | "check" | "success" | "error" | "end";
type SoundSettings = { sound: boolean; volume?: number };
type Tone = [
  frequency: number,
  endFrequency: number,
  delay: number,
  duration: number,
  level: number,
  shape?: OscillatorType,
];

// Short, locally synthesized cues: no network, samples or new audio device per move.
const tones: Record<SoundKind, Tone[]> = {
  move: [[520, 190, 0, 0.075, 0.2]],
  capture: [
    [330, 120, 0, 0.11, 0.22],
    [880, 500, 0, 0.035, 0.055, "triangle"],
  ],
  check: [
    [660, 660, 0, 0.08, 0.09],
    [880, 880, 0.075, 0.12, 0.09],
  ],
  success: [
    [523.25, 523.25, 0, 0.11, 0.08],
    [659.25, 659.25, 0.085, 0.11, 0.08],
    [783.99, 783.99, 0.17, 0.18, 0.09],
  ],
  error: [
    [240, 180, 0, 0.11, 0.1],
    [180, 150, 0.09, 0.1, 0.08],
  ],
  end: [
    [392, 392, 0, 0.16, 0.08],
    [523.25, 523.25, 0.12, 0.23, 0.09],
  ],
};
let settings: Required<SoundSettings> = { sound: true, volume: 65 };
let preview: Required<SoundSettings> | undefined;
let context: AudioContext | undefined;
let master: GainNode | undefined;
let resuming: Promise<void> | undefined;
const voices = new Set<{ oscillator: OscillatorNode; envelope: GainNode }>();

function gainValue() {
  const current = preview ?? settings;
  return current.sound ? current.volume / 100 : 0;
}
function audioContext() {
  if (context?.state === "closed") {
    context = undefined;
    master = undefined;
  }
  if (!context && typeof globalThis.AudioContext === "function") {
    context = new AudioContext();
    master = context.createGain();
    master.gain.setValueAtTime(gainValue(), context.currentTime);
    master.connect(context.destination);
  }
  return context;
}
function normalized(next: SoundSettings): Required<SoundSettings> {
  return {
    sound: next.sound,
    volume: Number.isFinite(next.volume)
      ? Math.min(100, Math.max(0, Math.round(next.volume!)))
      : 65,
  };
}
function applyGain() {
  if (context && master && context.state !== "closed") {
    try {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(master.gain.value, context.currentTime);
      master.gain.linearRampToValueAtTime(
        gainValue(),
        context.currentTime + 0.015,
      );
    } catch {
      /* The OS can disconnect an output device at any time. */
    }
  }
}
export function configureSound(next: SoundSettings) {
  settings = normalized(next);
  applyGain();
}
/** A settings preview wins over intermediate snapshots until the control closes. */
export function previewSoundSettings(next?: SoundSettings) {
  preview = next ? normalized(next) : undefined;
  applyGain();
}

/** Call in a user gesture; resuming never replays previously skipped cues. */
export function unlockSound() {
  if (!gainValue()) return;
  try {
    const audio = audioContext();
    if (audio?.state === "suspended" && !resuming) {
      resuming = audio
        .resume()
        .catch(() => {})
        .finally(() => {
          resuming = undefined;
        });
    }
  } catch {
    /* Audio is optional, including when the device is unavailable. */
  }
}

export function playSound(kind: SoundKind) {
  if (!gainValue()) return;
  try {
    unlockSound();
    const audio = context;
    if (!audio || audio.state !== "running" || !master) return;
    for (const [
      frequency,
      endFrequency,
      delay,
      duration,
      level,
      shape = "sine",
    ] of tones[kind]) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      const start = audio.currentTime + delay;
      const voice = { oscillator, envelope };
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        start + duration,
      );
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(level, start + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
        voices.delete(voice);
      };
      voices.add(voice);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }
  } catch {
    /* Never interrupt training because audio failed. */
  }
}

export function disposeSound() {
  for (const { oscillator, envelope } of voices) {
    try {
      oscillator.stop();
    } catch {
      /* Already stopped. */
    }
    oscillator.disconnect();
    envelope.disconnect();
  }
  voices.clear();
  master?.disconnect();
  if (context && context.state !== "closed")
    void context.close().catch(() => {});
  master = undefined;
  context = undefined;
  resuming = undefined;
  preview = undefined;
}
