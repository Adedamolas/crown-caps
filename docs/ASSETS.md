# ASSETS.md — what is actually in the GLBs, and the pipeline that follows from it

> Everything in §1 is **measured**, not assumed — read straight out of the GLB JSON chunks in
> `/public` on 2026-07-31. Re-measure if the assets are ever re-exported.

## 1. Measured facts

14 GLB files, **16.52 MB total on disk**.

Every single cap is structurally identical:

| Property | Value | Same across all 14? |
| --- | --- | --- |
| meshes | 1 (`Cylinder.***`), 2 primitives | yes |
| materials | 2 | yes |
| prim 0 | `Outer Cork Material - Rusted` — 13,408 verts / 77,352 indices, textured | yes |
| prim 1 | `Inner Cork Cover` — 12,894 verts / 74,268 indices, untextured `#b7e6de` | yes |
| total | **26,302 verts, 50,540 triangles** | yes |
| attributes | `POSITION, NORMAL, TEXCOORD_0` (no tangents, no vertex colors) | yes |
| texture | one PNG, ~1400 × 1389, 43–134 KB | size varies, dims don't |

**The geometry is byte-for-byte the same mesh in all 14 files.** The only thing that differs is
the single cover PNG. So of 16.52 MB, roughly **15.3 MB is one mesh downloaded fourteen times.**

```
current:  14 × (1.09 MB geometry + ~86 KB texture) = 16.52 MB
unique:    1 × 1.09 MB geometry + 1.20 MB textures =  2.30 MB   (7.2× smaller)
```

### The second problem: 50k triangles is far too heavy for the grid

Instancing shares the geometry in memory and in draw calls, but the **vertex shader still runs per
instance**. At the tier-B target of ~55 visible caps that is 26,302 × 55 ≈ **1.45 M vertices per
frame** — around 87 M verts/sec at 60fps. A mid-range Adreno will not hold that alongside the
fragment work, and this is exactly the "melts budget phones" outcome CLAUDE.md §5 warned about,
arriving by a different route than expected.

The mesh is that dense because the crown's crimped rim is modelled geometrically. At grid scale a
cap is ~120 px across, where that detail is invisible and belongs in a normal map.

**This is why the grid needs an LOD, and it is not optional.**

## 2. Pipeline

Two levels of detail, two texture sizes. Built once, checked into `/public`, no runtime cost.

| Artifact | Source | Target | Used by |
| --- | --- | --- | --- |
| `cap-lo.glb` | any cap, geometry only | ~4 k tris, meshopt, + baked normal map | the grid, all instances |
| `cap-hi.glb` | any cap, geometry only | 50 k tris as-is, meshopt | the focused cap only, on demand |
| `tex/<slug>-256.webp` | embedded PNG | 256², WebP q80 | grid |
| `tex/<slug>-1024.webp` | embedded PNG | 1024², WebP q85 | focused cap, on demand |

Use **`@gltf-transform/cli`**, not Blender. This sidesteps the `libdraco.so` Flatpak crash in
CLAUDE.md §7 entirely — compression happens outside Blender, and meshopt is a better fit than
Draco here anyway (much faster decode on low-end devices, which is the whole point).

Both scripts are checked in and reproducible:

```bash
node scripts/extract-textures.mjs   # GLB → tex/<slug>-{256,1024}.webp
node scripts/build-geometry.mjs     # goldspot.glb → cap-lo.glb + cap-hi.glb
```

⚠️ **Order matters in `build-geometry.mjs`: weld → simplify → prune → *then* strip textures.**
Stripping the texture binding first makes `prune()` see an unused `TEXCOORD_0` and delete it —
the mesh then has no UVs, every cap samples a single corner pixel, and the whole grid renders as
flat blocks of colour. This cost real debugging time; do not reorder it.

`sharp` is already a dependency (it ships with Next) so texture extraction needs no new install.

### Resulting budget — measured, not estimated

```
first paint   cap-lo.glb           56 KB     4,042 tris (from 50,540)
              14 × 256² WebP       46 KB
                                  ────────
                                  102 KB      ← the entire interactive grid

on focus      1 × 1024² WebP      ~29 KB      per cap viewed, one resident at a time
              cap-hi.glb          629 KB      built, NOT yet wired up (see below)
```

**102 KB for first meaningful paint, against 16.52 MB of raw GLBs — about 165× lighter**, and
lighter than the 14 static thumbnail PNGs CLAUDE.md §5 originally proposed as the data-safe
option. The data-lightness principle is not compromised to get the 3D grid; it is better served
by it.

`cap-hi.glb` is built and sitting in `/public` but nothing loads it yet — the focused cap still
uses the 4k-tri grid mesh. Wire it up if the crimped rim reads faceted when enlarged
(`MOTION.md` §6). The 1024px texture swap **is** live and handles the dominant source of softness.

### Loading order

1. `cap-lo.glb` — nothing renders until this lands.
2. All 14 × 256² textures, in parallel, lowest byte-count first.
3. Caps render face-down mint from the moment step 1 completes and flip as their texture arrives
   (`DESIGN.md` §7). There is no loading screen.
4. `cap-hi.glb` + the 1024² texture are fetched **on first focus**, never on load. Until they
   arrive the focused cap uses the lo mesh and 256² texture — visibly softer for a moment, then it
   sharpens. Do not block the focus transition on the fetch.

## 3. Cap inventory — corrections to CLAUDE.md §9

The guessed list in §9 does not match `/public`. The embedded texture names give the real
identities:

| File | Embedded texture name | Note |
| --- | --- | --- |
| `7up.glb` | `Gold 7UP COVER` | |
| `7up-old.glb` | `N25 7UP COVER` | **this is the "₦25" cap** — a 7Up variant, not its own brand |
| `coca-cola.glb` | `Cocacola COVER` | the personalised "Rehoboth" cap (CLAUDE.md §2) |
| `crush.glb` | `CRUSH COVER` | |
| `dew.glb` | `DEW COVER` | |
| `fanta.glb` | `FANTA COVER` | |
| `goldspot.glb` | `Gold Spot 2 COVER` | |
| `goldspot-golden.glb` | `Gold Spot COVER` | |
| `goldspot-orange.glb` | `GOLD SPOT RED` | ⚠️ filename says *orange*, texture says *RED* |
| `limca.glb` | `LIMCA COVER` | |
| `pepsi.glb` | `PEPSI COVERtp` | |
| `pepsi-old.glb` | `PEPSI COVER2` | |
| `schweppes.glb` | `Schwepps COVER` | Bitter Lemon, per the label in the poster |
| `sprite.glb` | `SPRITE COVER` | |

Two things to resolve with Rehoboth before content is written:

- **There is no Mirinda cap.** §9 lists one; no file exists. Either it was the excluded dud, or it
  was never modelled.
- **`goldspot-orange` vs `GOLD SPOT RED`.** One of the two names is wrong and §9 explicitly warns
  the three Gold Spots must never get mixed up. Confirm against the render before naming it in the
  UI, and rename the file to match reality.

## 4. `caps.ts` record shape

The schema's job is to make CLAUDE.md §8 mechanically enforceable: **an unsourced fact cannot
reach the screen.**

```ts
/** A fact that is allowed to render only because someone checked it. */
type Sourced<T> = { value: T; source: string; note?: string };

export type Cap = {
  slug: string;              // url + texture key, e.g. 'gold-spot-red'
  file: string;              // '/goldspot-orange.glb' — the original, for reference
  texture: string;           // 'goldspot-orange' → tex/<key>-{256,1024}.webp
  name: string;              // 'Gold Spot'
  variant?: string;          // 'Red' — distinguishes the three Gold Spots
  brandColor: string;        // for the flat vector logo layer only, never UI chrome

  blurb?:    Sourced<string>;   // one line, the recognition beat
  history?:  Sourced<string>;   // 2–4 sentences
  flavour?:  Sourced<string>;
  bottler?:  Sourced<string>;
  years?:    Sourced<string>;
  priceThen?: Sourced<string>;

  /** Set when provenance is genuinely contested. Rendered verbatim, in the open. */
  disputed?: string;
};
```

Rules that the code enforces, not the author's memory:

- Every optional field is `Sourced<T>`. Rendering reads `.value` and always prints `.source`
  beneath. A fact with no source is `undefined` and simply does not render — no placeholder, no
  "unknown", no empty label.
- `disputed` renders as a plain sentence in the info panel. Gold Spot and Limca (possibly
  Indian-market brands) and the ₦25 cap all need this until settled.
- **Do not seed this file with model-generated facts, not even as `// TODO` placeholder prose.**
  Placeholder facts are how unverified claims ship — someone fills the layout with plausible text
  and it never gets checked. Ship the file with names and slugs only; every `Sourced` field stays
  absent until a human has a citation. I have deliberately not written any drink history into this
  repo for that reason.
- Rehoboth's research notes are raw material to verify against a second source, not a source.

## 4b. Sound assets

| File | Source | Licence |
| --- | --- | --- |
| `sound/853036__litesouris__open-bottle-cap.mp3` | Freesound, uploader `litesouris` | CC0 |
| `sound/816751__goldenkitty23__metal-bottle-cap-drops.mp3` | Freesound, uploader `goldenkitty23` | CC0 |

~71 KB combined, fetched only after the first user gesture. CC0 requires no attribution; credit
the uploaders regardless. **Any future audio must be CC0 or explicitly licensed** — this project
already sits on live trademarks (CLAUDE.md §10) and does not need a second rights problem.

## 5. Research status

Done 2026-07-31, sources and supporting quotes in `app/data/caps.ts`. **9 of 14 caps carry
sourced facts; 5 carry `disputed` flags.**

Established: 7up's first Nigerian bottle on **1 October 1960** (independence day); Fanta into
Nigeria **1960**; Coca-Cola bottled in Nigeria since **1953**; Pepsi via Seven-Up in the **early
1990s**; Schweppes founded **Geneva 1783**, Bitter Lemon **1957**.

⚠️ **Gold Spot, Limca and Crush have no documented Nigerian distribution.** All three are
well-documented brands — Gold Spot and Limca Indian (Parle), Crush American — but no
authoritative source could be found placing them in the Nigerian market, only Nigerian forum
recollection. This is 5 of the 14 caps. Do not describe them as Nigerian-market drinks on the
site without resolving it. CLAUDE.md §8 flagged this risk; it is now confirmed unresolved rather
than disproven.

## 6. Open items

- [ ] Confirm `goldspot-orange` / `GOLD SPOT RED` naming with Rehoboth
- [ ] Confirm whether a Mirinda cap exists or was the excluded dud
- [ ] **Lock the credit line** — CLAUDE.md §2, blocks public launch
- [ ] Resolve Gold Spot / Limca / Crush Nigerian distribution, or say so plainly on the site
- [ ] Resolve the ₦25 cap; find Schweppes' Nigerian bottler; pin Pepsi's exact launch year
- [ ] Upgrade every source from Wikipedia-grade to primary records
- [ ] Bake the rim normal map when generating `cap-lo.glb`
- [ ] Wire `cap-hi.glb` for the focused cap if the rim reads faceted
