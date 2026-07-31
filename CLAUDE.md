# CLAUDE.md — Crown Caps (working title)

> Persistent project context for Claude Code. Read this fully before making changes.
> This project is being handed off mid-flow from a planning session — the context below
> is the accumulated state, decisions, and hard-won gotchas. Don't re-derive them.

---

## 1. What this is

An interactive web tribute to the **crown caps (bottle caps) of early-2000s soft drinks**,
built around **Nigerian nostalgia**. Users browse the caps of the drinks they grew up on,
spin them in 3D, and read a little history/info on each.

The emotional core is **recognition** — the "ohhh, Gold Spot!" jolt someone feels seeing a
cap they haven't thought about in 20 years. Every design decision should protect that moment.

Origin: based on a viral X/Twitter post by **Rehoboth (@rehobothige_)** who modelled,
designed, textured and animated 3D crown caps of ~15 early-2000s soft drinks in Blender.

## 2. Collaboration & credit (do not skip)

- **3D assets were created by Rehoboth (@rehobothige_).** The builder has been given full
  creative freedom over the site.
- **Credit line is still TBD and MUST be locked before launch.** Some caps are personalised
  (e.g. a Coca-Cola cap reads "Rehoboth"). Do not ship publicly without the credit
  arrangement sorted. Flag this if it looks unresolved near launch.

## 3. Current status

- **14 GLB cap assets** exported from Blender, textures packed and verified, living (or about
  to live) in **`/public`**. (One modelled design was a dud and was intentionally excluded.)
- **Asset pipeline is proven end-to-end**: Blender → GLB → loaded & spinning in react-three-fiber,
  textures intact, logos crisp. This is done. Do not reopen Blender unless a specific cap is broken.
- **Web build is just starting** — first task is proving one cap renders/spins in the actual app,
  then grid + data + detail view.

## 4. Stack

**v1 (now):**
- **Next.js** (App Router assumed — confirm) + **TypeScript**
- 3D: **`three`**, **`@react-three/fiber`**, **`@react-three/drei`** (+ `@types/three` dev)
- **NO database in v1.** Cap data is a static **`caps.ts`** file (~14–15 records). Do not stand up
  Postgres/Drizzle/tRPC for explore-and-read — it's premature.

**Later (play-and-share phase only):**
- Postgres + Drizzle ORM + tRPC — introduced when persistence is actually needed
  (guestbook, quiz results, rankings). Not before.

*Builder's default studio stack (for reference): Next.js, TypeScript, tRPC, Drizzle, PostgreSQL.*

## 5. Architecture & UX

**Model: "shelf → spotlight."**
- Landing = a **grid of all caps** (this is the recognition hook — people scan for *their* drink).
- Click a cap → **detail view**: one large, freely-spinnable 3D cap + an info/history panel beside it.
- Think museum layout with a toy at the centre.

**⚠️ CRITICAL mobile-first constraint (this drives the whole build):**
- Target users are on **mid-range Android and metered/expensive data**. Data-lightness is a
  **core principle, not a nice-to-have** ("building around the Nigerian mind").
- **NEVER render ~15 separate `<Canvas>` elements.** 15 WebGL contexts will melt budget phones.
  This is the #1 trap and it still stands.
- ⚠️ **AMENDED 2026-07-31 — the "static thumbnails only" rule is superseded.** The direction is now
  a single live interactive grid (see `docs/DESIGN.md`, `docs/MOTION.md`). This is *one* canvas with
  *one* shared geometry instanced many times — a different machine from 15 contexts, and it
  measures **lighter** than the thumbnail plan: ~205 KB first paint vs 16.52 MB today.
  All 14 GLBs were measured to contain identical geometry; see `docs/ASSETS.md` §1 for the numbers.
  **The data-lightness principle is unchanged and still binding** — only the mechanism changed.
- Thumbnail PNGs are no longer needed. The grid's loading state is the caps' own blank mint liner,
  flipping to reveal each brand as its texture streams in (`docs/DESIGN.md` §7).

## 6. Scope

**v1 — explore-and-read (build this):**
- Grid of caps (static thumbnails)
- Detail view: spin cap (OrbitControls), verified info/history text
- (Optional, cheap, high-nostalgia) sound: the *pssst* / clink

**Later — play-and-share (NOT v1, context only):**
- **Flip-the-cap reveal** — the intended "magic moment": spin → flip the cap over → a message
  under the crown (echoing the win/"try again" promos everyone remembers). The inner cap face is
  already a **separate material/surface** (see §7), so the reveal canvas already exists.
- "Which 2000s drink are you?" shareable quiz (intended growth engine)
- Wall of memories / guestbook (user-submitted one-liners)
- Rank & aggregate ("Nigeria's most-missed drink")
- Collect-them-all / sticker-album mechanic

## 7. Technical notes & gotchas (LEARNED — do not relearn)

- **Metalness is flat on import.** The GLB export flattened the metallic response (the Blender
  material used node math — Overlay / Invert / Color Ramp — that glTF can't represent). Fix in
  code: traverse the loaded scene and set `metalness ≈ 0.9`, `roughness ≈ 0.35`.
  ⚠️ **CORRECTED 2026-07-31: apply this to the OUTER crown ONLY.** Slot 2 (`Inner Cork Cover`) is
  authored `metalness: 0, roughness: 0.5` — painted liner. Blanket-setting 0.9 turns the mint
  flip-reveal face into chrome. Gate on `if (mat.map)`, not on material name (names carry
  per-file Blender suffixes like `.015`). Fixed in `app/components/CapViewer.tsx`.
- **Each cap has TWO material slots** (outer cork/crown + inner face). `mesh.material` may be an
  **array** — handle both cases when tweaking materials. The inner face is currently a plain
  solid colour (blank) — that's the intended flip-reveal canvas, leave room for it.
- **An environment map is REQUIRED** for metal to read as shine. Without one, high metalness makes
  caps look *dark/black*, not shiny. Use drei `<Environment>`. **Production:** bundle a small local
  HDRI instead of CDN-fetching a preset (data cost).
- **R3F is client-only.** Use `'use client'`, and if SSR/hydration errors appear, wrap the viewer
  in `dynamic(() => import(...), { ssr: false })`.
- **Framing:** wrap the model in drei `<Center>` and tune camera `position` Z to frame it.
- **If re-exporting from Blender:** glTF 2.0 (.glb), **Selected Objects ✓, +Y Up ✓,
  Animation OFF, Draco OFF.** (Draco crashed the Flatpak Blender — `libdraco.so` missing.
  Don't enable it there.)
- GLBs are ~1.3MB each, 14 total — light.

## 8. Info-block accuracy (this is the project's credibility)

- Getting the drink facts **right** is the whole reputation of the site. Nigerian Twitter will
  drag any inaccuracy.
- **Do NOT publish AI-generated (Gemini/etc.) drink facts raw. Every fact must be verified.**
- Provenance is genuinely uncertain for some (e.g. Gold Spot and Limca may be Indian-market
  brands; "₦25 / N25" green cap — unclear if it's a brand or a price gimmick). Research and
  confirm before publishing.
- Rehoboth may share his own research notes — treat as raw material to verify, not as gospel.

## 9. Cap list (finalize against actual `/public` filenames)

✅ **CONFIRMED 2026-07-31 against `/public` — full inventory + embedded texture names in
`docs/ASSETS.md` §3.** Two corrections to the guess below:
- **There is no Mirinda cap.** No such file exists (the excluded dud?). Confirm with Rehoboth.
- **"₦25" is not its own brand** — it's `7up-old.glb`, whose texture is named `N25 7UP COVER`.
- ⚠️ Unresolved: `goldspot-orange.glb` contains a texture named `GOLD SPOT RED`. One name is
  wrong; resolve before it reaches the UI.

Original guess (kept for reference): Gold Spot **(3 variants)**, Pepsi (retro + modern),
Coca-Cola, Crush, Fanta, Sprite, Limca, Mountain Dew ("Dew"), Schweppes, 7up, ₦25, Mirinda.

**Naming convention for GLBs/thumbnails:** lowercase, no spaces (`crush.glb`, `pepsi.glb`).
Distinguish the three Gold Spots explicitly by what's on them
(e.g. `goldspot-cola`, `goldspot-orange`, `goldspot-orange-soft`) so they never get mixed up.

## 10. IP note

These are real, live trademarks (Coca-Cola, Pepsi, etc.). A **non-commercial** nostalgia tribute
is generally tolerated; it gets legally touchy the moment it's **monetised** (merch, ads). Keep
this in mind before any monetisation is added.

## 11. Immediate next steps

1. **[in progress]** Prove one cap renders + spins in R3F (viewer component — see starter below).
2. Define the `caps.ts` data shape (id, slug, display name, glb path, thumbnail path, blurb,
   history, flavour, bottler, price-then/price-now — all fields verified).
3. Grid page using **static thumbnails**.
4. Detail route (`/cap/[slug]`) with the 3D viewer + info panel.
5. Fill in verified info content.

---

## Appendix — proven starter viewer component

This already works (one cap, spinning, correct materials). Use as the seed for the detail view.

```tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Center, useGLTF } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';

function Cap({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // Metal fix: GLB import flattens metalness. These caps have TWO material slots,
  // so handle material arrays.
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        mat.metalness = 0.9;
        mat.roughness = 0.35;
        mat.needsUpdate = true;
      });
    });
  }, [scene]);

  return <Center><primitive object={scene} /></Center>;
}

export default function CapViewer({ url = '/goldspot.glb' }: { url?: string }) {
  return (
    <div style={{ width: '100%', height: '100dvh', background: '#0a0a0a' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 1], fov: 45 }}>
        <Suspense fallback={null}>
          <Cap url={url} />
          {/* Environment is what makes metal read as shine. Bundle a local HDRI for prod. */}
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
```
