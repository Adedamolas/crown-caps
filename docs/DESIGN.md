# DESIGN.md — Crown Caps visual language

> The reference is `Drinks of the 2000's` (Rehoboth's poster frame). Everything here is derived
> from that image and from the GLB materials themselves. When in doubt, go back to the image.

## 1. The feeling, in one line

**Physical objects on a bone-white gallery wall — not a website with 3D on it.**

The poster works because it is a *photograph of things lying on a surface*. Real light, real
contact shadows, caps overlapping the type, some face-up and branded, some face-down and blank.
Nothing glows. Nothing is neon. The nostalgia comes from the objects being *believably physical*,
not from retro-styled chrome.

Three consequences that override normal web instincts:

- **Light background, not dark.** The current starter viewer is `#0a0a0a`. That is wrong for this
  project and gets replaced. See §5 for what a light background costs you technically.
- **Type is the layout.** The words are enormous. Type is not a label sitting politely beside the
  art; it is printed on the same wall the caps are lying on. It sits BEHIND every cap — see §6.
- **Depth is earned with shadow, not with blur or glow.** Soft, short, slightly warm contact
  shadows. No drop-shadow filters, no bloom.

## 2. Relationship to the house design system

`design-dna` is the house style for *tools* — 13px Inter, indigo, hairlines, ruthless restraint.
This project is deliberately **a different visual direction**, which that skill explicitly allows.

What we **keep** from it (non-negotiable, it is the discipline that stops this becoming mush):

- Semantic HSL CSS variables consumed via Tailwind. **Never hardcode hex in components.**
- The easing family and duration tokens (see `MOTION.md`).
- The three-tier text system (primary / secondary / tertiary — never more).
- Press feedback on every pressable, `prefers-reduced-motion` handling, hover gated behind
  `@media (hover: hover) and (pointer: fine)`.
- "Only `transform` and `opacity`" for anything that animates in the DOM layer.

What we **override**:

| design-dna default | Crown Caps |
| --- | --- |
| `--background: 240 7% 97%` cool grey | bone/warm `--paper` |
| Indigo `--primary` | mint `#b7e6de`, taken from the asset |
| Inter 13px for everything | Tinos display + Geist for meta |
| 300ms motion ceiling | exempt — this is an experience piece, see `MOTION.md` §1 |
| Dark contextual menus | no dark menus; this UI has almost no chrome |

## 3. Color

The accent is **not invented**. Every cap's second material slot, `Inner Cork Cover`, is authored
`baseColorFactor` = linear `(0.482, 0.800, 0.740)` → **`#b7e6de`**. That pale celadon is the
underside of every cap in the poster. It is the project's accent because it is literally the
project's material.

```css
:root {
  /* surface — warm bone, the gallery wall */
  --paper:       45 13% 93%;   /* #EFEDE8  main canvas */
  --paper-deep:  42 10% 87%;   /* #E1DED6  vignette, inset wells */
  --paper-edge:  40  8% 80%;   /* #CFCBC2  hairlines */

  /* ink — three tiers only */
  --ink:         30  4% 12%;   /* #201F1D  display type, primary */
  --ink-2:       30  3% 38%;   /* #635F5C  supporting copy */
  --ink-3:       30  4% 62%;   /* #A39D97  meta, captions, source lines */

  /* accent — the cap liner */
  --mint:        170 48% 81%;  /* #B7E6DE */
  --mint-deep:   172 34% 62%;  /* #82BDB4  hover/active on mint */
  --mint-wash:   170 40% 94%;  /* #E7F5F2  tinted fills */

  /* the crimped metal rim reads warm, use for focus rings + underlines */
  --rim:         28 22% 55%;   /* #A08A72 */

  --radius: 10px;
}
```

Notes:

- There is **no dark theme.** The poster is a lit white wall; inverting it destroys the entire
  premise. Set `color-scheme: light` and do not build a toggle. (This is the one place we
  deliberately drop a house convention — say so out loud rather than letting it look like an
  oversight.)
- Brand colors (Coca-Cola red, Pepsi blue…) appear **only inside the cap textures and the flat
  vector logos**, never as UI color. The chrome stays bone/ink/mint. This is what stops the page
  looking like a sponsor wall, and it matters for the IP posture in CLAUDE.md §10.
- `::selection { background: hsl(var(--mint) / 0.45); }`

## 4. Typography

Two families. Both self-hosted through `next/font` (subsetted, no external request, no CDN cost).

**Display — `Tinos`.** *(Corrected 2026-08-02.)* Metrically compatible with **Times New Roman**,
which is what the poster is actually set in.

The first choice was Instrument Serif, on the reasoning that the poster was a high-contrast
editorial serif. **That reading was wrong.** Rendering candidates beside a crop of the poster's
own "Drinks" settles it: the poster is a transitional book serif — moderate stroke contrast, wide
bowls, sturdy bracketed serifs — and Instrument Serif is visibly narrower and thinner. Tinos
matches its width, contrast and serif treatment closely enough to read as the same lettering.

Rejected in the same comparison: Libre Baskerville (too wide and heavy), EB Garamond (too light,
small x-height), Playfair Display (high contrast, and old-style numerals turn "2000's" into
"2ooo's").

Tinos also carries **₦ (U+20A6)**, which Instrument Serif does not — that had forced the Open
Graph cards to fall back to "N25". They now render the naira sign properly.

If the exact face ever matters, ask Rehoboth what he set the poster in; this is a very close
match, not a confirmed identification.

**Meta / UI — `Geist Sans`**, already installed in `app/layout.tsx`. Zero added bytes.

| Role | Family | Size | Notes |
| --- | --- | --- | --- |
| Hero word | Tinos | `clamp(4rem, 16vw, 14rem)` | tracking `-0.03em`, leading `0.85` |
| Cap name (focused) | Tinos | `clamp(2.5rem, 7vw, 5rem)` | italic permitted for variants |
| Section / eyebrow | Geist | `text-[11px]` | `uppercase`, tracking `0.18em`, `--ink-3` |
| Body / history | Geist | `text-[15px]` | `leading-7`, `--ink-2`, `max-w-[58ch]` |
| Field label | Geist | `text-[11px]` | uppercase, tracking `0.14em`, `--ink-3` |
| Value | Geist | `text-[13px]` | `--ink` |
| Source line | Geist | `text-[11px]` | `--ink-3`, underlined on hover |

Body copy goes to **15px, not the house 13px** — 13px is correct for tool chrome you scan; this is
prose someone *reads*, on a phone, possibly outdoors. Chrome and labels stay small.

Mixing roman and italic in the hero is a signature of the poster. Use it. Do not use it in body
copy.

## 5. Material & light (the part that is easy to get wrong)

**A light background makes metal harder, not easier.** Metal shows its environment. On a bone
background lit by a bright, uniformly white studio HDRI, the caps have nothing dark to reflect and
go flat and chalky — the exact opposite of the poster, where the metal has depth because the room
around it has dark corners.

Rules:

- Environment must have **contrast**, not just brightness. Either a small bundled HDRI with dark
  zones, or drei `<Lightformer>` rigs: one large soft key upper-left (matching the poster), one
  dim cool fill, and **at least one dark/negative card** so the crimped rim has something to catch.
- **Contact shadows are mandatory.** Without them the caps hover like stickers. drei
  `<ContactShadows>` — soft, short, warm-tinted (`color: '#8a7f72'`), low opacity (~0.35). This is
  the single highest-value detail for making the grid feel physical.
- **Do not blanket-set metalness.** CLAUDE.md §7 says traverse and set `metalness 0.9 /
  roughness 0.35`. That is right for the outer crown and **wrong for slot 2** (`Inner Cork Cover`,
  authored `metalness: 0`, `roughness: 0.5`). Applying 0.9 to the liner turns the mint
  flip-reveal face into chrome. Gate on `mat.map`, not on material name — names carry Blender's
  `.015` suffixes and vary per file, so name matching is brittle.
- **0.9 is too high for a self-built environment.** *(Learned the hard way, 2026-07-31.)*
  Diffuse contribution is `1 - metalness`, so at 0.9 a cap is effectively a mirror and only 10%
  of the printed artwork renders — **the logos disappear**. That value was proven against a full
  bright studio HDRI. Against the Lightformer rig here, caps rendered as near-black discs with no
  branding at all, which cost a long debugging detour. The grid runs **`metalness: 0.68`,
  `roughness: 0.3`**, which keeps the sheen and lets the ink read. A real cap is ink (a
  dielectric) over a metal substrate, so this is also the more honest model.
- **Environment coverage matters more than light intensity.** A metal surface shows its
  environment, so a sparse rig means sparse reflections. The rig needs a **large front softbox
  behind the camera** — that is what cap faces reflect straight back at the viewer — plus key,
  fill and overhead for the crimped rim, with gaps left dark for contrast.
- Tone mapping `ACESFilmic`, and **do not** crush exposure to make the bone background pure white;
  the poster's background is grey-warm (`#EFEDE8`), not `#FFF`. Keep it.

## 6. Layout language

- **Bleed, don't box.** The grid runs edge to edge and off all four sides. No max-width container
  on the canvas, no visible frame, no rounded card around the 3D.
- **A catalogue plate, not a pile.** *(Revised 2026-07-31 — this replaces an earlier "overlap is
  the whole trick" rule.)* Caps sit one per cell, centred, evenly spaced, with real air around
  them and faint ruled cell boundaries. The scattered overlapping version was built and rejected:
  at rest it reads as clutter, and it fights the specimen-catalogue feel the project actually
  wants. Spacing is set by `FIELD.CAP_IN_CELL` (cap diameter as a fraction of its cell) — 0.5.
- **The rules are faint on purpose.** The reference poster is a bare wall with no lines at all, so
  the boundaries sit at ~50% opacity: a hint of a museum plate, never a spreadsheet. One uniform
  (`uOpacity` in `GridRules.tsx`) controls it; 0 is a legitimate setting.
- Text panels sit **on** the wall as flat overlays with generous margin — they never get a card,
  a border, or a shadow. Separation comes from the blur behind them, not from a container.
- Chrome is near-zero: no navbar, no footer, no visible scrollbar. Any control that must exist is
  a small ink-on-bone text button, `text-[11px] uppercase tracking-[0.18em]`.
- Grain: a single tiling noise PNG (~2 KB) at `opacity: 0.035`, `mix-blend-mode: multiply`, fixed
  over everything. It is what makes a flat `#EFEDE8` read as paper. Cheap, and worth it.

## 7. Loading state — the mint face *is* the design

Do not build a spinner, a skeleton, or a progress bar.

The shared mesh loads once. Textures stream in per cap. Until a cap's texture arrives it renders
**face-down showing the blank mint liner** — which is exactly what half the caps in the poster are
already doing. As each texture lands, that cap flips over to reveal its brand.

The page therefore begins as a field of anonymous mint caps and *becomes* the drinks you remember.
That is the recognition hook from CLAUDE.md §1 expressed as a loading strategy, it costs nothing,
and it is honest about what is happening. This is the single best idea in this document; protect it.

Corollary: the flip animation is load-driven on first paint and click-driven later (the
play-and-share reveal in CLAUDE.md §6). Same animation, two triggers — build it once.

## 8. Content & accuracy

CLAUDE.md §8 is the binding rule and this document does not soften it: **no AI-generated drink
facts ship.** The design supports that rather than papering over it.

- Every factual field carries a `source` (URL or citation). The UI **renders no unsourced field.**
  A missing fact shows nothing — never a placeholder, never a guess, never "unknown".
- A quiet source line sits under each info block: `text-[11px] --ink-3`. Being visibly sourced is
  part of the credibility this project trades on.
- Where provenance is genuinely contested (Gold Spot / Limca market origin; the ₦25 cap), the copy
  says so plainly in one sentence. Stated uncertainty reads as authority; a confident wrong fact is
  what gets dragged.

See `ASSETS.md` §4 for the record shape that enforces this.

## 8b. Sound

Two CC0 clips from Freesound, fetched only after the first user gesture (browsers block
`AudioContext` before one, and a visitor who never interacts should not pay the ~71 KB):

| Clip | Trigger | File |
| --- | --- | --- |
| bottle cap opening | focusing a cap | `853036__litesouris__open-bottle-cap.mp3` |
| metal cap drop | flipping a cap | `816751__goldenkitty23__metal-bottle-cap-drops.mp3` |

CC0 imposes no attribution requirement, but credit the uploaders anyway — `litesouris` and
`goldenkitty23`. A visible **Sound on/off** control is mandatory and the choice persists in
`localStorage`. Sound must never autoplay, and a clip that has not finished decoding is skipped
rather than played late.

## 9. Review checklist

| Smell | Fix |
| --- | --- |
| Dark background anywhere | bone `--paper`; there is no dark theme here |
| Hardcoded hex in a component | semantic token |
| Brand color used as UI color | brand lives in textures/logos only |
| Cap floating without a contact shadow | add `<ContactShadows>`; it is not optional |
| Mint liner rendering shiny | `mat.map` gate on the metalness fix (§5) |
| A card, border, or panel around the 3D | remove; the grid bleeds |
| Spinner / skeleton / progress bar | mint-face-then-flip (§7) |
| A fact on screen with no source | delete the fact or source it |
| Caps crowded or overlapping their cell | lower `FIELD.CAP_IN_CELL`; this is a catalogue |
| Ruled lines loud enough to read as a table | drop `uOpacity`; the poster has no lines |
| Logos washed out / caps reading black | metalness too high for the environment (§5) |
