const STORAGE_KEY = "teletext-audio-unlocked";
let ctx: AudioContext | null = null;

function getCtxCtor(): typeof AudioContext | undefined {
  return window.AudioContext || (window as never as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function ensureCtx(): AudioContext | null {
  const Ctor = getCtxCtor();
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function playToneInternal(c: AudioContext, freq: number, ms: number, type: OscillatorType, gainValue: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + ms / 1000);
}

export function isAudioUnlockedStored(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export async function unlockAudioByGesture(): Promise<boolean> {
  const c = ensureCtx();
  if (!c) return false;
  try {
    if (c.state === "suspended") await c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.value = 0.04;
    osc.frequency.value = 880;
    osc.type = "square";
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.06);
    window.localStorage.setItem(STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function primeAudioFromStorage(): void {
  if (!isAudioUnlockedStored()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().catch(() => undefined);
  }
}

export function getAudioState(): "unsupported" | "suspended" | "running" {
  const c = ensureCtx();
  if (!c) return "unsupported";
  return c.state === "running" ? "running" : "suspended";
}

export function playTone(freq: number, ms: number, type: OscillatorType = "square", gainValue = 0.08): void {
  const c = ensureCtx();
  if (!c) return;
  try {
    if (c.state === "suspended" && isAudioUnlockedStored()) {
      void c.resume().then(() => playToneInternal(c, freq, ms, type, gainValue));
      return;
    }
    if (c.state !== "running") return;
    playToneInternal(c, freq, ms, type, gainValue);
  } catch {
    /* noop */
  }
}
