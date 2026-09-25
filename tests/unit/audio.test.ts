import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class Parameter {
  value = 0;
  setValueAtTime(value: number) {
    this.value = value;
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }
  cancelScheduledValues() {}
}
class Node {
  disconnected = false;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
class Oscillator extends Node {
  frequency = new Parameter();
  type = "sine";
  onended: (() => void) | null = null;
  started = false;
  start() {
    this.started = true;
  }
  stop() {}
}
class Gain extends Node {
  gain = new Parameter();
}
class Context {
  static instances: Context[] = [];
  currentTime = 1;
  state = "running";
  destination = {};
  gains: Gain[] = [];
  oscillators: Oscillator[] = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  constructor() {
    Context.instances.push(this);
  }
  createGain() {
    const node = new Gain();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new Oscillator();
    this.oscillators.push(node);
    return node;
  }
}

beforeEach(() => {
  vi.resetModules();
  Context.instances = [];
  vi.stubGlobal("AudioContext", Context);
});
afterEach(() => vi.unstubAllGlobals());

describe("offline chess sounds", () => {
  it("stays silent on configuration, mute and zero volume", async () => {
    const audio = await import("../../src/audio/sounds");
    audio.configureSound({ sound: true, volume: 65 });
    expect(Context.instances).toHaveLength(0);
    audio.configureSound({ sound: false, volume: 65 });
    audio.playSound("move");
    audio.configureSound({ sound: true, volume: 0 });
    audio.playSound("success");
    expect(Context.instances).toHaveLength(0);
  });
  it("shares one context, applies volume and disconnects finished voices", async () => {
    const audio = await import("../../src/audio/sounds");
    audio.configureSound({ sound: true, volume: 50 });
    audio.playSound("move");
    audio.playSound("capture");
    expect(Context.instances).toHaveLength(1);
    const context = Context.instances[0];
    expect(context.gains[0].gain.value).toBeCloseTo(0.5);
    expect(context.oscillators.length).toBeGreaterThanOrEqual(2);
    for (const voice of context.oscillators) {
      expect(voice.started).toBe(true);
      voice.onended?.();
      expect(voice.disconnected).toBe(true);
    }
    expect(context.gains.slice(1).every((gain) => gain.disconnected)).toBe(
      true,
    );
    audio.configureSound({ sound: false, volume: 50 });
    expect(context.gains[0].gain.value).toBe(0);
  });
  it("does not accumulate stale sounds while browser audio is suspended", async () => {
    const audio = await import("../../src/audio/sounds");
    audio.unlockSound();
    const context = Context.instances[0];
    context.state = "suspended";
    context.resume.mockRejectedValueOnce(new Error("Audio blocked"));
    expect(() => audio.playSound("move")).not.toThrow();
    await Promise.resolve();
    expect(context.oscillators).toHaveLength(0);
    context.state = "running";
    audio.playSound("check");
    expect(context.oscillators.length).toBeGreaterThan(0);
  });
  it("tolerates unavailable audio and safely closes its shared context", async () => {
    const audio = await import("../../src/audio/sounds");
    vi.stubGlobal("AudioContext", undefined);
    expect(() => audio.playSound("error")).not.toThrow();
    vi.stubGlobal("AudioContext", Context);
    audio.playSound("end");
    const context = Context.instances[0];
    context.close.mockRejectedValueOnce(new Error("Device lost"));
    expect(() => audio.disposeSound()).not.toThrow();
    await Promise.resolve();
    expect(context.gains[0].disconnected).toBe(true);
  });
  it("keeps a live slider preview while saved settings refresh in the background", async () => {
    const audio = await import("../../src/audio/sounds");
    audio.previewSoundSettings({ sound: true, volume: 40 });
    audio.playSound("move");
    audio.configureSound({ sound: true, volume: 20 });
    expect(Context.instances[0].gains[0].gain.value).toBeCloseTo(0.4);
    audio.previewSoundSettings();
    expect(Context.instances[0].gains[0].gain.value).toBeCloseTo(0.2);
  });
});
