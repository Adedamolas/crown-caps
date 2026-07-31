'use client';

/**
 * Cap sounds. Web Audio rather than <audio> elements so overlapping plays don't
 * fight over one element and latency stays low enough to feel attached to the tap.
 *
 * Nothing is fetched until the first user gesture: browsers block AudioContext before
 * one, and these are ~71 KB that a visitor who never interacts should not pay for.
 *
 * Assets are CC0 from Freesound — see docs/ASSETS.md for attribution.
 */

type Clip = 'open' | 'clink';

const SOURCES: Record<Clip, string> = {
  open: '/sound/853036__litesouris__open-bottle-cap.mp3',
  clink: '/sound/816751__goldenkitty23__metal-bottle-cap-drops.mp3',
};

const GAIN: Record<Clip, number> = {
  open: 0.5,
  clink: 0.35, // the drop is sharper; it needs pulling back to sit with the other
};

let ctx: AudioContext | null = null;
const buffers = new Map<Clip, AudioBuffer>();
let started = false;
let muted = false;

const STORAGE_KEY = 'crown-caps:muted';

export function isMuted() {
  return muted;
}

export function loadMutePreference() {
  if (typeof window === 'undefined') return false;
  muted = window.localStorage.getItem(STORAGE_KEY) === '1';
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* private mode — the preference just won't persist */
  }
}

/** Call from a real user gesture. Safe to call repeatedly. */
export function initSound() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();

  (Object.keys(SOURCES) as Clip[]).forEach(async (clip) => {
    try {
      const res = await fetch(SOURCES[clip]);
      const data = await res.arrayBuffer();
      buffers.set(clip, await ctx!.decodeAudioData(data));
    } catch {
      /* a missing or undecodable clip must never break the page */
    }
  });
}

export function play(clip: Clip) {
  if (muted || !ctx) return;
  const buffer = buffers.get(clip);
  if (!buffer) return; // still decoding — silence beats a delayed blurt

  // Safari suspends the context when the tab is backgrounded.
  if (ctx.state === 'suspended') void ctx.resume();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = GAIN[clip];
  source.connect(gain).connect(ctx.destination);
  source.start();
}
