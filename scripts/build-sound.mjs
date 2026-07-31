/**
 * Trims the raw Freesound clips down to the part we actually want.
 * Requires ffmpeg on PATH. Run: node scripts/build-sound.mjs
 *
 * Why each window was chosen — measured from the waveform, not guessed:
 *
 * open-bottle-cap (1.46s) holds FOUR separate events. Windowed RMS + zero-crossing
 * rate shows the hiss lives only in the first ~120ms (ZCR 0.50–0.54 = broadband
 * noise). After that come a knock at 360ms, a thump at 600ms and a second short hiss
 * at 1020ms. The thump is the LOUDEST thing in the file at -12 dB, so playing the clip
 * whole means mostly hearing a thump — which is exactly why it sounded wrong.
 *
 * metal-bottle-cap-drops (1.39s) is a cap bouncing to rest by ~470ms, followed by
 * ~900ms of digital silence (below -95 dB) that is pure payload with nothing in it.
 *
 * Both are normalised afterwards, because cutting the loudest section leaves the
 * remainder far too quiet.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'public', 'sound');

const CLIPS = [
  {
    src: '853036__litesouris__open-bottle-cap.mp3',
    out: 'open.mp3',
    start: 0,
    end: 0.135, // the hiss, and nothing after it
    fade: 0.045,
  },
  {
    src: '816751__goldenkitty23__metal-bottle-cap-drops.mp3',
    out: 'clink.mp3',
    start: 0.055, // skip the near-silent lead-in so the hit is immediate on tap
    end: 0.47, // the cap has come to rest; the rest of the file is silence
    fade: 0.07,
  },
];

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'buffer' });

/** True peak of a window, so we can normalise without clipping. */
function peakOf(file, start, end) {
  const raw = path.join(DIR, '.probe.raw');
  ff(['-i', path.join(DIR, file), '-ss', String(start), '-to', String(end), '-f', 's16le', '-ar', '48000', '-ac', '1', raw]);
  const buf = fs.readFileSync(raw);
  let peak = 0;
  for (let i = 0; i < buf.length / 2; i++) peak = Math.max(peak, Math.abs(buf.readInt16LE(i * 2) / 32768));
  fs.unlinkSync(raw);
  return peak;
}

for (const clip of CLIPS) {
  const peak = peakOf(clip.src, clip.start, clip.end);
  // Leave 1 dB of headroom.
  const gainDb = 20 * Math.log10(0.89 / Math.max(peak, 1e-6));
  const dur = clip.end - clip.start;

  ff([
    '-i', path.join(DIR, clip.src),
    '-ss', String(clip.start),
    '-to', String(clip.end),
    '-af', [
      `volume=${gainDb.toFixed(2)}dB`,
      // Always fade out, or the hard cut clicks.
      `afade=t=out:st=${(dur - clip.fade).toFixed(3)}:d=${clip.fade}`,
      // And a 5ms fade in, in case the cut lands mid-waveform.
      'afade=t=in:st=0:d=0.005',
    ].join(','),
    '-ac', '1',
    '-ar', '44100',
    '-b:a', '96k',
    path.join(DIR, clip.out),
  ]);

  const before = fs.statSync(path.join(DIR, clip.src)).size;
  const after = fs.statSync(path.join(DIR, clip.out)).size;
  console.log(
    `  ${clip.out.padEnd(10)} ${(dur * 1000).toFixed(0)}ms  ` +
      `peak ${(20 * Math.log10(peak)).toFixed(1)}dB → -1.0dB  ` +
      `${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB`,
  );
}
