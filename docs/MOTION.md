# MOTION.md — the grid machine

> How the field of caps moves, attracts, wraps, and focuses. This is the spec for the single most
> important interaction in the project. Read `DESIGN.md` first for the visual language.

## 1. Motion philosophy

`design-dna` §3 caps UI motion at 300ms and forbids decorative animation. It also exempts
landing/experience surfaces from the ceiling while keeping the easing family. **This page is that
exemption** — the motion *is* the product. Longer, softer, continuous motion is correct here.

What still binds, absolutely:

- The easing family. `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entrances and focus,
  `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement. Never `ease-in`.
- Exits ~25% faster than entrances.
- Springs only under a finger (drag/flick), `bounce: 0`.
- `prefers-reduced-motion` is honoured for real (§8), not with a token gesture.
- DOM-layer motion is `transform`/`opacity`/`filter` only.

The governing feel is **weight**. These are small metal objects. They have momentum, they settle,
they do not snap. Everything below is damped, never linear.

### The one rule that makes it feel alive

> **Animate the derivative, never the value.**

Nothing in this scene ever resets its rotation, its position, or its phase. When state changes we
ease the *rate of change* and let the value keep integrating. A cap that has been slowly turning
for forty seconds and is then clicked does not jump to angle 0 and start a "detail view spin" —
its angular velocity eases from ambient to focused while its angle continues exactly where it was.

This is what the user means by "it doesn't stop and then continue, it is fluid". It is one line of
discipline applied everywhere, and it is the difference between the whole thing feeling alive or
feeling like two screens stitched together.

## 2. Frame budget & tiers

Target: **mid-range Android, metered data** (CLAUDE.md §5). Detect once on mount, never re-detect
mid-session (thrash is worse than a wrong guess).

```ts
const cores = navigator.hardwareConcurrency ?? 4;
const mem   = (navigator as any).deviceMemory ?? 4;
const tier  = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'C'
            : cores >= 8 && mem >= 8 ? 'A'
            : cores >= 4            ? 'B' : 'C';
```

| | A (desktop / flagship) | B (mid Android) | C (low / reduced-motion) |
| --- | --- | --- | --- |
| visible caps | ~110 | ~55 | ~28 |
| `dpr` | `[1, 2]` | `[1, 1.5]` | `1` |
| depth of field | optional DoF pass | scrim only | scrim only |
| contact shadows | `<ContactShadows>` live | baked, low-res, frame-skipped | single blurred sprite |
| ambient spin | yes | yes | none (static, focus-only) |
| cursor attraction | yes | yes | none |

Tier B is the design target — make it good there first, then let A be nicer. If B is only
achievable by making A boring, ship the boring version.

## 3. The infinite grid

### Geometry of the field

One `<Canvas>`. One shared `BufferGeometry` (verified identical across all 14 GLBs — see
`ASSETS.md` §1). Draw with **one `InstancedMesh` per cap type** — 14 draw calls, no texture atlas,
no custom shader. An atlas + a single draw call is possible later but is not needed to hit budget
and costs a lot of complexity.

*(Revised 2026-07-31. The original spec called for overlapping, jittered caps; that was built and
rejected in favour of an evenly spaced catalogue grid — see `DESIGN.md` §6.)*

- Cap diameter is a **fraction of its cell** (`FIELD.CAP_IN_CELL`, 0.5), so every cap sits alone
  inside its ruled box with air around it. No overlap, no positional jitter.
- Caps sit at cell **centres** — the `+0.5` in the loop. Cell boundaries fall on integer multiples
  of `cell`, so a cap is never sitting on a line.
- The hash still drives per-cap **identity, spin phase and spin rate**; it no longer drives
  position.

### Lining the rules up with the caps

The ruled boundaries are drawn in a shader on a plane **behind** the caps, so under perspective
they project at a different scale than the caps do — which makes caps drift out of their boxes
further from the centre of the screen. This is not fixable by nudging offsets.

A grid of cell `c` at depth `d₁` projects identically to a grid of cell `c · d₂/d₁` at depth `d₂`,
so pre-scale both cell and offset by the depth ratio:

```ts
const persp = (camZ - RULES_Z) / camZ;   // caps sit at z = 0
uCell.value = cell * persp;
uOffset.value.set(ox * persp, oy * persp);
```

Draw the rules in a **shader**, never as a CSS background: animating `background-position` every
frame repaints a full-screen layer and was a measurable source of stutter.

### Wrapping

Keep a virtual offset `O = (ox, oy)` driven by input. A fixed pool of `COLS × ROWS` instances
covers the viewport plus one ring of margin. For pool slot `(i, j)`:

```ts
const spanX = COLS * CW;
const wrap  = (v: number, L: number) => ((v % L) + L) % L;      // true modulo, not %
const x     = wrap(i * CW - ox + spanX / 2, spanX) - spanX / 2; // ∈ [-spanX/2, spanX/2)
```

**Identity must derive from the absolute cell, not the pool slot.** This is the bug that will
otherwise eat a day: if a cap's brand or jitter comes from `i`, every cap silently changes
identity the instant it wraps around the edge.

```ts
const absCol = Math.round((x + ox) / CW - 0.5);   // stable integer, survives wrapping
const absRow = Math.round((y + oy) / CH - 0.5);
const capId  = CAPS[capAt(absCol, absRow, CAPS.length)];   // (3·col + 5·row) mod 14
```

**Identity is a lattice, not a hash** *(revised 2026-07-31)*. Uniform random assignment clumps —
with 14 caps over ~40 visible cells you get ~3 copies of each on screen and duplicates land side
by side, which reads as a bug rather than a pattern. `(A·col + B·row) mod n` with A and B coprime
to n = 14 guarantees no two neighbours ever match (orthogonally or diagonally), the nearest repeat
of any cap is √10 ≈ 3.2 cells away, and density is exactly even. Spin phase and rate still come
from the hash, so the regularity never looks stamped.

Repetition is unavoidable on an infinite field with 14 caps. Evenly spread it reads as a printed
catalogue; clumped it reads as broken.

### Input

- **Drag** (pointer + touch): 1:1 with `O`. On release, inertia — velocity from the last ~80ms of
  movement, then exponential decay `v *= exp(-3.5 * dt)`, cut off below a small epsilon.
- **Wheel / trackpad**: both axes into `O`. Do not hijack into single-axis scroll; the field moves
  in any direction, that is the point. **Normalise `deltaMode`** (0 = pixels, 1 = lines,
  2 = pages) and clamp per notch, or a wheel mouse and a trackpad behave wildly differently.
- **Speed ceiling**: drag and inertia both clamp to `FIELD.MAX_SPEED`. Unbounded flick velocity
  sends the field across many cells per frame, every cap snaps rather than eases, and it reads as
  tearing rather than speed.
- **Keyboard**: arrows nudge `O` by one cell, `Tab` moves focus cap to cap. Per design-dna,
  **keyboard-initiated movement is not animated** beyond a 150ms settle — no flourish.
- No scrollbars, no scroll container. The page itself never scrolls; `overscroll-behavior: none`.

## 4. Cursor attraction

Every cap is faintly drawn toward the cursor, more strongly the closer it is.

Use a **gaussian falloff**, not linear-within-a-radius. Linear has a discontinuity at the radius
edge that you can see as a hard ring the caps "pop" across; the gaussian has none.

```ts
const d    = Math.hypot(cap.x - cur.x, cap.y - cur.y);
const w    = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));   // 1 at the cursor → 0 far away
const dirX = (cur.x - cap.x) / (d || 1);
const dirY = (cur.y - cap.y) / (d || 1);

target.x     = base.x + dirX * w * PULL;
target.y     = base.y + dirY * w * PULL;
target.z     = base.z + w * LIFT;          // rise toward the viewer
target.scale = 1 + w * 0.06;               // and grow very slightly
```

Starting values: `SIGMA ≈ 2.2 × CW`, `PULL ≈ 0.16 × CW`, `LIFT ≈ 0.35 × CW`. `PULL` must stay
small — the user asked for *faint*. If you can clearly see caps sliding, it is too high.

The `LIFT` + `scale` terms are what sell it. Pull alone reads as caps sliding on a table; adding
lift makes it read as **magnetic**, which is the intended feeling.

**Damp toward the target frame-rate-independently.** The naive `pos += (target - pos) * k` is
frame-rate dependent and will feel different at 60 and 120 Hz:

```ts
const a = 1 - Math.exp(-DAMP * dt);   // DAMP ≈ 6
pos.x += (target.x - pos.x) * a;
```

Gate the whole system behind `@media (hover: hover) and (pointer: fine)` — on touch there is no
cursor, and the attraction should simply not exist rather than snapping to the last touch point.

## 5. Ambient spin, and the tension it creates

Every cap turns continuously about **Y** ("sideways"), desynchronised by a per-cap phase from the
same hash, with ±15% speed variance so the field never pulses in unison.

```ts
angle[i] += dt * speed[i];   // monotonic. never reset. see §1.
```

**The tension:** a cap spinning freely about Y is edge-on twice per revolution, and edge-on it is
an unreadable metal sliver. The whole project exists for the "ohhh, Gold Spot!" jolt (CLAUDE.md
§1) — an animation that regularly hides the brand is fighting the product.

Resolution, in order of importance *(revised 2026-07-31)*:

1. **Warp the angle so it dwells face-on.** This is the real fix. Rather than turning uniformly,
   displace the angle by a sine of itself:

   ```ts
   const spin = raw - FIELD.SPIN_DWELL * Math.sin(raw);   // k = 0.62
   ```

   `dθ'/dθ = 1 − k·cos θ`, so the turn slows to `1−k` at face-on and speeds to `1+k` through the
   back. Still a genuine full 360°, still **monotonic** for `k < 1` — the derivative never reaches
   zero, so it never stalls or reverses and §1 holds. The brand faces you most of the time and the
   mint back becomes a quick flourish rather than half the loop.
2. **Slow it down.** 10–16s per revolution, not 2–3. It should read as *drifting*, barely
   perceptible in any one glance.
3. **Spread the phase.** With hashed phase offsets, at any instant most of the field is face-ish.
   Never let phase correlate with grid position or you get a visible wave.

**Base tilt is 0.** An earlier version tilted caps ~18° toward the viewer to avoid pure edge-on.
It aimed each face at the dark floor of the environment, so caps read dim and "face down". Upright
catches the key light. Do not reintroduce a tilt to solve an edge-on problem — warp the angle (1).

Do not solve it by making ambient caps oscillate instead of rotate — the oscillation turnaround is
visible and mechanical, and it breaks §1 the moment you focus one.

## 6. Focus — the transition that must not break

Clicking a cap grows it toward the viewer, holds it centred and spinning, and pushes the rest of
the field back and out of focus.

**The focused cap is never re-created.** No unmount, no remount, no separate detail component with
its own `<Canvas>`. It is promoted out of its `InstancedMesh` into a standalone mesh at *exactly*
its current transform and current `angle`, so the swap is invisible. Everything else keeps
running behind it.

Sequence (total ~820ms in, ~620ms out — exits faster, per the house rule):

| Track | In | Easing |
| --- | --- | --- |
| cap position → focus anchor | 820ms | `ease-out` |
| cap scale → focus scale | 820ms | `ease-out` |
| cap tilt → upright | 820ms | `ease-out` |
| angular velocity: ambient → focus rate | 900ms | `ease-in-out` |
| field push-back (`z -= …`) + attraction disabled | 700ms | `ease-out` |
| DoF / dim ramp | 600ms, 120ms late | `ease-out` |
| info panel rise + fade | 420ms, 260ms late | `ease-out` |

Notes that matter:

- **Angular velocity is eased, angle is not touched.** Focus rate is *slower* than ambient
  (~7s/rev) — the cap settles into a presentational turn. Because only the rate changed, there is
  no seam.
- The tilt-to-upright and the spin happen simultaneously on different axes. Do not sequence them.
- **Disable cursor attraction during and after focus**, ramped out over the same 700ms. Leaving it
  on makes the blurred background twitch under the info panel.
- Dismiss (`Esc`, click-away, back) reverses every track at ~0.75× duration, and the cap
  demotes back into its instance — which is still at its wrapped grid slot, because `O` kept
  updating. It returns to where it belongs, not to where it was.
- Deep links (`/cap/[slug]`) skip the transition and start focused. Arriving focused is not the
  same motion as focusing, and pretending otherwise means a fake 820ms wait on first paint.

### Separating the focused cap from the field

**Shipped: a scrim.** A paper-coloured plane sits between the field and the focused cap. The cap
travels in *front* of it and, being opaque, writes depth first — so the scrim is depth-rejected
exactly where the cap is. The field recedes behind a wash of paper while the cap stays crisp, for
one extra quad, no render target and no post-processing pass. It also degrades to nothing on weak
hardware, because there is nothing to degrade.

Real depth-of-field (`@react-three/postprocessing`, focal point tracking the cap's z) can layer on
top of this for tier A later. It is a genuine upgrade — the blur becomes physically motivated by
the cap's travel — but it is not required for the effect to read, and it must never ship to tier
B: a DoF pass is the first thing that tanks frame time on a mid-range Adreno.

Never blur with a CSS `backdrop-filter` over the canvas: it forces a second canvas or a readback,
and it would break the single-scene continuity that §1 depends on.

### Where a focused cap parks

The cap and the info panel must never occupy the same space. On a phone the panel is a bottom
sheet, so the cap parks in the upper part of the screen; on desktop the panel is a right-hand
column, so the cap shifts left. Getting this wrong does not merely look bad — it makes the cap
untappable, which silently kills the flip reveal.

⚠️ **Express the anchor as a fraction of the SCREEN and convert back to world units.** A focused
cap sits at `FOCUS_Z`, much nearer the camera than the `z = 0` plane that `viewport` describes, so
everything there is magnified by `camZ / (camZ - FOCUS_Z)` — roughly 2×. Placing the anchor
directly in world units overshoots by exactly that factor and throws the cap off-screen. The
flip hit-test needs the same correction, or it tests a point the cap is nowhere near.

### Flipping settles the spin

Turning a cap over eases its Y rotation to zero as the flip completes. You flip a cap in order to
READ what is under the crown; a message that keeps rotating away is a message nobody reads. Scale
the angle by `(1 - flipRamp)` rather than zeroing the rate — smooth in both directions, and it
hands straight back to the live spin on unflip.

The liner is only ever seen through a 180° flip about X, which maps local +y to screen −y. With
the default `flipY` the canvas top lands at the bottom and the message reads mirrored; the reveal
texture sets `flipY = false` to cancel exactly that.

### Sharpening on focus

The grid runs 256px textures, correct at ~120px on screen and visibly soft once a cap doubles in
size. On focus, that one cap swaps up to its 1024px texture (~29 KB) and drops back to 256 when
another cap takes focus, so **exactly one high-res texture is ever resident**. Holding all 14 at
1024 would cost ~56 MB of GPU memory — the kind of thing that kills the target device.

`cap-hi.glb` (50k tris, ~630 KB) exists for the same reason but is **not yet wired up**; the
focused cap still uses the 4k-tri grid mesh. If the crimped rim reads faceted when enlarged, that
is the fix — promote the focused cap to a standalone mesh per §6, at the same transform and spin
angle, so the swap is invisible.

## 7. Flip reveal

One animation, two triggers (see `DESIGN.md` §7):

- **Load-driven:** cap sits face-down mint, its texture arrives, it flips to reveal the brand.
  Stagger arrivals 40–80ms apart, cap total added delay at ~240ms, never block interaction.
- **Click-driven** (later, CLAUDE.md §6): focused cap flips to show the message under the crown.

Flip is 520ms `ease-out` about the X axis, with a small `z` lift at the midpoint so it arcs rather
than rotating in place — a cap flipped on a table rises slightly. Reuse the same function; if
these ever diverge into two implementations, one of them will start looking wrong.

## 8. Reduced motion

Tier C is not a degraded version, it is a correct version:

- No ambient spin, no cursor attraction, no inertia. The field is still, still overlapping, still
  beautiful — it is the poster.
- Focus still works, because it is navigation, not decoration: 200ms opacity + scale cross-fade,
  no travel, no blur ramp.
- The flip reveal becomes an opacity cross-fade between the two faces.
- Dragging still moves the field, 1:1, with no inertia after release.

## 9. Review checklist

| Smell | Fix |
| --- | --- |
| Any rotation or phase assigned `= 0` on a state change | ease the rate; never touch the value (§1) |
| Cap identity derived from pool index | derive from `absCol`/`absRow` (§3) |
| `v % L` used for wrapping | true modulo `((v % L) + L) % L` |
| `pos += (target - pos) * k` | `1 - exp(-k * dt)`, frame-rate independent (§4) |
| Linear falloff inside a radius | gaussian (§4) |
| Attraction visible enough to notice as movement | lower `PULL`; it is meant to be faint |
| Caps drifting off their ruled boxes | perspective pre-scale on the rules plane (§3) |
| Hero type slicing through caps | type plane must clear ±0.5·D of spin sweep (§6) |
| Focused cap off-screen or untappable | anchor in screen fractions, ÷ magnification (§6) |
| Field tearing on a hard flick | clamp to `FIELD.MAX_SPEED`; normalise wheel `deltaMode` |
| Caps edge-on and unreadable half the time | raise `SPIN_DWELL`; never add tilt (§5) |
| Rules drawn as an animated CSS background | shader; CSS repaints and stutters (§3) |
| Focus implemented as a route/component swap | promote in place, same object (§6) |
| Focused cap snapping home with no exit | hold it targetable through the ramp-out (§6) |
| Background caps still clickable while focused | field is inert; a click dismisses (§6) |
| DoF enabled on tier B | scrim only |
| `backdrop-filter` over the canvas | in-scene scrim or DoF |
| Attraction still live behind the info panel | ramp it out with the push-back |
| Spinner anywhere | mint face + flip (`DESIGN.md` §7) |
