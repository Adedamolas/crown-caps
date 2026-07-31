'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';
import { CAPS } from '../data/caps';
import { FIELD, capAt, clamp, damp, falloff, hash2, hash2b, wrap } from './capField';
import { makeRulesConfig, useTokenColor } from './GridRules';
import CapInfo from './CapInfo';
import TypeLayer, { useTitleTexture } from './TypeLayer';
import { useRevealTexture } from './RevealTexture';
import { initSound, isMuted, loadMutePreference, play, setMuted } from './sound';

/** Ceilings, so a resize never needs to reallocate instance buffers. A viewport
 *  holds ~50 cells; the per-cap meshes only need the worst case for one brand. */
const MAX_INSTANCES = 190;
const MAX_PER_CAP = 72;

/**
 * Depth planes, expressed as multiples of cap diameter D so they hold at any
 * viewport size.
 *
 * A cap spinning about Y sweeps its whole DIAMETER through Z — edge-on it occupies
 * ±0.5·D of depth, not its thickness. Anything sharing that range gets sliced by the
 * mesh, which is what put the hero letters visibly through the caps. The type plane
 * therefore sits clear behind the deepest cap: 0.5·D for the sweep, plus half the
 * depth spread, plus margin. Caps then sit ON the type, exactly like objects on a
 * printed wall in the reference poster.
 */
const TYPE_Z_D = -(0.5 + FIELD.DEPTH / 2 + 0.22);
const RULES_Z_D = TYPE_Z_D - 0.55;
/** Where a focused cap travels to, and the scrim that separates it from the field. */
const FOCUS_Z = 3.1;
const SCRIM_Z = 1.6;

/** Scratch, module-scoped to keep the frame loop allocation-free. */
const target = [0, 0, 0];
const outerCounts = new Int32Array(CAPS.length);

// ---------------------------------------------------------------------------

export type CapGeometry = { outerGeo: THREE.BufferGeometry; innerGeo: THREE.BufferGeometry };

/**
 * Splits a loaded cap into its two slots and normalises it.
 *
 * Shared by both LODs on purpose: cap-lo and cap-hi MUST come out of here with
 * identical orientation, centre and scale, or swapping to the hi mesh on focus
 * would visibly jump.
 */
function prepareCapGeometry(scene: THREE.Object3D): CapGeometry {
  const found: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) found.push(o as THREE.Mesh);
  });

  // Slot names survive the pipeline ("Outer Cork Material - Rusted.015"). Fall back
  // to vertex count, since the outer crown is always the denser of the two.
  const isOuter = (m: THREE.Mesh) => {
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    return /outer/i.test(mat?.name ?? '');
  };
  let outer = found.find(isOuter);
  let inner = found.find((m) => m !== outer);
  if (!outer || !inner) {
    const sorted = [...found].sort(
      (a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count,
    );
    [outer, inner] = sorted;
  }

  // The cap's axis is +Y (measured from the normals: 2834 verts face +Y vs 328 at
  // -Y, so the printed face is +Y). rotateX(+PI/2) swings that face to +Z, toward
  // the camera.
  //
  // But it also maps the cap's local +Z — which is the artwork's "up" — onto -Y,
  // i.e. straight down, so every logo lands upside down. rotateZ(PI) spins it back
  // in-plane without disturbing the face direction.
  const outerGeo = outer.geometry.clone();
  const innerGeo = inner.geometry.clone();
  for (const g of [outerGeo, innerGeo]) {
    g.rotateX(Math.PI / 2);
    g.rotateZ(Math.PI);
  }

  outerGeo.computeBoundingBox();
  const bb = outerGeo.boundingBox!;
  const diameter = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
  const cx = (bb.max.x + bb.min.x) / 2;
  const cy = (bb.max.y + bb.min.y) / 2;
  const cz = (bb.max.z + bb.min.z) / 2;
  for (const g of [outerGeo, innerGeo]) {
    g.translate(-cx, -cy, -cz);
    g.scale(1 / diameter, 1 / diameter, 1 / diameter);
    g.computeBoundingSphere();
  }

  // The inner liner ships with no TEXCOORD_0 — it was untextured in Blender, so the
  // pipeline correctly dropped it. Project planar UVs from Z so the flip reveal has
  // something to print a message onto. The liner is a flat disc, so a planar
  // projection is exact rather than an approximation.
  if (!innerGeo.getAttribute('uv')) {
    const pos = innerGeo.getAttribute('position');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) + 0.5; // geometry is centred and diameter 1
      uv[i * 2 + 1] = pos.getY(i) + 0.5;
    }
    innerGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }

  return { outerGeo, innerGeo };
}

function useCapGeometry() {
  const { scene } = useGLTF('/cap-lo.glb');
  return useMemo(() => prepareCapGeometry(scene), [scene]);
}

/**
 * Fetches the 50k-triangle mesh the first time a cap is focused, never on load.
 *
 * Loaded imperatively rather than through `useGLTF`, which suspends — suspending here
 * would blank the whole field mid-transition. Instead the focused cap keeps using the
 * 4k grid mesh until this resolves, then swaps silently.
 */
function useHiGeometry(wanted: boolean): CapGeometry | null {
  const [geo, setGeo] = useState<CapGeometry | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!wanted || started.current) return;
    started.current = true;

    let cancelled = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(
      typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder,
    );
    loader.load('/cap-hi.glb', (gltf) => {
      if (!cancelled) setGeo(prepareCapGeometry(gltf.scene));
    });

    return () => {
      cancelled = true;
    };
  }, [wanted]);

  useEffect(
    () => () => {
      geo?.outerGeo.dispose();
      geo?.innerGeo.dispose();
    },
    [geo],
  );

  return geo;
}

/** Streams the 14 grid textures in, so caps reveal progressively (DESIGN.md §7). */
function useCapTextures() {
  const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    let cancelled = false;

    CAPS.forEach((cap) => {
      loader.load(`/tex/${cap.texture}-256.webp`, (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.flipY = false; // glTF UV convention
        loaded.push(tex);
        setTextures((prev) => ({ ...prev, [cap.slug]: tex }));
      });
    });

    return () => {
      cancelled = true;
      loaded.forEach((t) => t.dispose());
    };
  }, []);

  return textures;
}

// ---------------------------------------------------------------------------

/**
 * Owns the field's mutable input state AND its own DOM listeners (bound to the
 * canvas), so nothing mutates a prop across a component boundary.
 */
export type Focus = { col: number; row: number; capIdx: number };

function CapField({
  focus,
  flipped,
  onFocus,
  onFlip,
}: {
  focus: Focus | null;
  flipped: boolean;
  onFocus: (f: Focus | null) => void;
  onFlip: () => void;
}) {
  const { outerGeo, innerGeo } = useCapGeometry();
  const hi = useHiGeometry(focus !== null);
  const textures = useCapTextures();

  /** The promoted focused cap: full-detail mesh, same transform, same spin angle. */
  const heroRef = useRef<THREE.Group>(null);
  const heroOuterRef = useRef<THREE.Mesh>(null);
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);
  const domElement = useThree((s) => s.gl.domElement);

  const camZ = useThree((s) => s.camera.position.z);

  const edgeColor = useTokenColor('--paper-edge', '#CFCBC2');
  const paperColor = useTokenColor('--paper', '#EFEDE8');
  const inkColor = useTokenColor('--ink', '#201F1D');

  const titleTex = useTitleTexture(inkColor);
  const titleMatRef = useRef<THREE.MeshBasicMaterial>(null);

  /** Under-crown message for the focused cap, printed on the mint liner. */
  const revealTex = useRevealTexture(focus ? CAPS[focus.capIdx] : null, inkColor);
  const heroInnerMatRef = useRef<THREE.MeshStandardMaterial>(null);

  /**
   * Materials are declared in JSX and reached through refs — the R3F way. They are
   * scene-graph objects mutated every frame, not React values, so they must not be
   * read during render.
   */
  const rulesRef = useRef<THREE.ShaderMaterial>(null);
  const scrimRef = useRef<THREE.MeshBasicMaterial>(null);
  const rulesArgs = useMemo(
    () => [makeRulesConfig(edgeColor)] as [THREE.ShaderMaterialParameters],
    [edgeColor],
  );

  /** Focus ramp, 0 → 1. */
  const ease = useRef(0);
  /** Flip ramp, 0 = brand face, 1 = turned over to the message under the crown.
   *  Named apart from the per-cap `flip` inside the frame loop, which is the
   *  texture-load reveal and a different thing entirely. */
  const flipRamp = useRef(0);
  /** Total distance dragged, used to fade the hero type once exploring begins. */
  const travelled = useRef(0);
  /**
   * The cap that is focused OR still animating back. Without this the exit never
   * plays: the moment `focus` clears, no cell matches any more, so the cap would
   * simply vanish from the focus position instead of shrinking home.
   */
  const held = useRef<Focus | null>(null);

  const outerRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const innerRef = useRef<THREE.InstancedMesh>(null);

  const input = useRef({ ox: 0, oy: 0, vx: 0, vy: 0, dragging: false, px: 0, py: 0, hover: false });

  const dummy = useMemo(() => {
    const o = new THREE.Object3D();
    o.rotation.order = 'YXZ'; // world-Y spin outside the local X tilt
    return o;
  }, []);

  /** Per-cap flip progress, 0 = face-down mint, 1 = revealed. */
  const reveal = useRef(new Float32Array(CAPS.length));
  /** Smoothed per-slot offsets, so attraction eases instead of snapping. */
  const smooth = useRef(new Float32Array(MAX_INSTANCES * 3));

  const outerMats = useMemo(
    () =>
      CAPS.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: '#b9b4ab', // bare crimped metal until its texture lands
            // CLAUDE.md §7 proved 0.9 against a full studio HDRI. At 0.9 the surface is
            // effectively a mirror — diffuse is (1 - metalness), so only 10% of the
            // printed artwork renders and the logos wash out. A real cap is ink (a
            // dielectric) over a metal substrate; 0.68 keeps the sheen while letting the
            // print actually read. Raise toward 0.9 for more mirror, lower for more ink.
            metalness: 0.68,
            roughness: 0.3,
            envMapIntensity: 1.15,
          }),
      ),
    [],
  );
  const innerMat = useMemo(
    // Authored value from the GLB. Matte painted liner — never metallic (DESIGN.md §5).
    () => new THREE.MeshStandardMaterial({ color: '#b7e6de', metalness: 0, roughness: 0.5 }),
    [],
  );

  useEffect(() => {
    CAPS.forEach((cap, i) => {
      const tex = textures[cap.slug];
      if (tex && outerMats[i].map !== tex) {
        outerMats[i].map = tex;
        outerMats[i].color.set('#ffffff');
        outerMats[i].needsUpdate = true;
      }
    });
  }, [textures, outerMats]);

  useEffect(
    () => () => {
      outerMats.forEach((m) => m.dispose());
      innerMat.dispose();
    },
    [outerMats, innerMat],
  );

  /**
   * Sharpening on focus. The grid runs on 256px textures, which is right when a cap is
   * ~120px on screen but visibly soft once it doubles in size. On focus we swap that
   * cap alone up to its 1024px texture (~29 KB) and drop back to 256 when another cap
   * takes focus — so exactly ONE high-res texture is ever resident. Keeping all 14 at
   * 1024 would cost ~56 MB of GPU memory, which is precisely the kind of thing that
   * kills a mid-range Android (ASSETS.md §2).
   */
  const hiRes = useRef<{ idx: number; tex: THREE.Texture } | null>(null);
  useEffect(() => {
    const idx = focus?.capIdx;
    if (idx == null || hiRes.current?.idx === idx) return;

    let cancelled = false;
    new THREE.TextureLoader().load(`/tex/${CAPS[idx].texture}-1024.webp`, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.flipY = false;

      // Release the previous one and put its cap back on the 256.
      const prev = hiRes.current;
      if (prev) {
        outerMats[prev.idx].map = textures[CAPS[prev.idx].slug] ?? null;
        outerMats[prev.idx].needsUpdate = true;
        prev.tex.dispose();
      }

      outerMats[idx].map = tex;
      outerMats[idx].needsUpdate = true;
      hiRes.current = { idx, tex };
    });

    return () => {
      cancelled = true;
    };
  }, [focus?.capIdx, outerMats, textures]);

  useEffect(() => () => void hiRes.current?.tex.dispose(), []);

  // Field dimensions, recomputed only when the viewport changes.
  const layout = useMemo(() => {
    const across = viewport.width < viewport.height ? FIELD.ACROSS_NARROW : FIELD.ACROSS_WIDE;
    const cell = viewport.width / across;
    const cols = Math.min(Math.ceil(viewport.width / cell) + 2, 20);
    const rows = Math.min(Math.ceil(viewport.height / cell) + 2, 20);
    const D = cell * FIELD.CAP_IN_CELL;
    const narrow = viewport.width < viewport.height;

    // Where a focused cap parks. The info panel and the cap must never share space:
    // on a phone the panel is a bottom sheet, so the cap moves into the upper part of
    // the screen; on desktop the panel is a right-hand column, so the cap shifts left.
    // Getting this wrong makes the cap unreadable AND untappable, which kills the flip.
    //
    // The anchor is expressed as a fraction of the SCREEN and converted back to world
    // units, because a focused cap sits much nearer the camera than the z = 0 plane
    // `viewport` describes — everything there is magnified by ~2x. Placing it directly
    // in world units overshoots by exactly that factor and throws the cap off-screen.
    const magnify = camZ / (camZ - FOCUS_Z);
    const focusX = narrow ? 0 : (-0.2 * viewport.width) / magnify;
    const focusY = narrow ? (0.25 * viewport.height) / magnify : 0;
    const focusScale = narrow ? 1.3 : 1.9;

    return {
      cell,
      cols,
      rows,
      D,
      narrow,
      focusX,
      focusY,
      focusScale,
      spanX: cols * cell,
      spanY: rows * cell,
      typeZ: TYPE_Z_D * D,
      rulesZ: RULES_Z_D * D,
    };
  }, [viewport.width, viewport.height, camZ]);

  // Input, bound to the canvas itself.
  useEffect(() => {
    const el = domElement;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const drag = { x: 0, y: 0, t: 0 };
    // world units per CSS pixel
    const k = () => viewport.height / size.height;

    const press = { x: 0, y: 0 };

    const down = (e: PointerEvent) => {
      // Browsers refuse to create an AudioContext outside a user gesture, so this is
      // the earliest legitimate moment. Also keeps the ~71 KB off the initial load.
      initSound();
      el.setPointerCapture(e.pointerId);
      const s = input.current;
      s.dragging = true;
      s.vx = 0;
      s.vy = 0;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = performance.now();
      press.x = e.clientX;
      press.y = e.clientY;
    };

    const move = (e: PointerEvent) => {
      const s = input.current;
      const r = el.getBoundingClientRect();
      if (fine) {
        s.hover = true;
        s.px = ((e.clientX - r.left) / r.width) * 2 - 1;
        s.py = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }
      if (!s.dragging || focus) return; // the field is frozen while a cap is focused

      const dx = (e.clientX - drag.x) * k();
      const dy = (e.clientY - drag.y) * k();
      s.ox -= dx;
      s.oy += dy;
      travelled.current += Math.hypot(dx, dy);

      // Velocity from the last pointer segment, clamped. An unbounded flick sends
      // the field across many cells per frame, at which point every cap snaps to its
      // new cell instead of easing and the whole grid appears to tear.
      const now = performance.now();
      const dt = Math.max((now - drag.t) / 1000, 1 / 240);
      const cap = FIELD.MAX_SPEED * layout.cell;
      s.vx = clamp(-dx / dt, -cap, cap);
      s.vy = clamp(dy / dt, -cap, cap);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
    };

    const up = (e: PointerEvent) => {
      const s = input.current;
      s.dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      // A press that barely moved is a click, not a flick.
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) {
        const r0 = el.getBoundingClientRect();
        if (focus) {
          // While focused the field behind the scrim is inert. Clicking the cap itself
          // flips it to the message under the crown; clicking away dismisses. Nothing
          // re-targets focus to whatever happens to sit underneath.
          //
          // The target is wherever the cap actually parked, projected to screen —
          // testing the centre of the viewport would miss it entirely on mobile,
          // where the cap sits high to clear the bottom sheet.
          const cx = r0.left + r0.width * (0.5 + layout.focusX / viewport.width);
          const cy = r0.top + r0.height * (0.5 - layout.focusY / viewport.height);
          // The cap is nearer the camera than the z = 0 plane the viewport describes,
          // so it covers more screen than its world radius suggests.
          const magnify = camZ / (camZ - FOCUS_Z);
          const worldR = (layout.D * layout.focusScale * magnify) / 2;
          const hit = (worldR / viewport.width) * r0.width * 1.05;
          if (Math.hypot(e.clientX - cx, e.clientY - cy) < hit) onFlip();
          else onFocus(null);
          return;
        }
        const r = el.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
        const wx = (nx * viewport.width) / 2;
        const wy = (ny * viewport.height) / 2;

        // The lattice is regular, so the cell under the cursor is arithmetic — no
        // raycast, no per-instance bookkeeping.
        const cell = layout.cell;
        const col = Math.round((wx + s.ox) / cell - 0.5);
        const row = Math.round((wy + s.oy) / cell - 0.5);
        onFocus({ col, row, capIdx: capAt(col, row, CAPS.length) });
      }
    };
    const leave = () => {
      input.current.hover = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (focus) return;
      const s = input.current;

      // deltaMode varies by device: 0 = pixels (trackpads), 1 = lines, 2 = pages.
      // Without normalising, a line-mode mouse crawls and a page-mode one teleports.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.height : 1;
      const step = size.height * 0.35; // ceiling on how far one notch may throw it
      s.ox += clamp(e.deltaX * unit, -step, step) * k();
      s.oy -= clamp(e.deltaY * unit, -step, step) * k();
      s.vx = 0;
      s.vy = 0;
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
    };
  }, [domElement, viewport.width, viewport.height, size.height, camZ, layout, onFocus, onFlip, focus]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30); // clamp so a stall doesn't teleport the field
    const s = input.current;

    // Focus ramp. Exits are faster than entrances, per the house motion rules.
    if (focus) held.current = focus;
    ease.current += ((focus ? 1 : 0) - ease.current) * damp(focus ? 4.2 : 5.6, dt);
    if (!focus && ease.current < 0.002) {
      ease.current = 0;
      held.current = null; // fully home; release it back to the field
    }
    // Flip ramp toward the under-crown message, and the hero type fading out once
    // the user starts exploring — the title has done its job by then.
    flipRamp.current += ((flipped ? 1 : 0) - flipRamp.current) * damp(5, dt);
    if (!s.dragging) travelled.current += Math.hypot(s.vx, s.vy) * dt;
    const titleMat = titleMatRef.current;
    if (titleMat) {
      const faded = Math.max(0, 1 - travelled.current / (layout.cell * 6));
      titleMat.opacity = faded * (1 - ease.current);
      titleMat.visible = titleMat.opacity > 0.01;
    }

    const active = focus ?? held.current;
    const scrim = scrimRef.current;
    if (scrim) {
      scrim.opacity = ease.current * 0.82;
      scrim.visible = ease.current > 0.005;
    }

    // Inertia after release, with the same speed ceiling as the drag itself so a
    // long fling cannot outrun it.
    if (!s.dragging && !focus) {
      const decay = Math.exp(-FIELD.DAMP_DRAG * dt);
      const vMax = FIELD.MAX_SPEED * layout.cell;
      s.vx = clamp(s.vx * decay, -vMax, vMax);
      s.vy = clamp(s.vy * decay, -vMax, vMax);
      if (Math.abs(s.vx) < 1e-4) s.vx = 0;
      if (Math.abs(s.vy) < 1e-4) s.vy = 0;
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
    }

    const { cell, cols, rows, spanX, spanY, D, rulesZ } = layout;
    const spinBase = (Math.PI * 2) / FIELD.REV_SECONDS;
    const t = performance.now() / 1000;

    // Keep the ruled lines locked to the field.
    //
    // The rules plane sits behind the caps, so under perspective it projects at a
    // different scale — which is why caps drifted out of their boxes further from the
    // centre of the screen. A grid of cell `c` at depth `d1` projects identically to a
    // grid of cell `c * d2/d1` at depth `d2`, so pre-scaling by the depth ratio makes
    // the lines line up exactly, everywhere.
    const persp = (camZ - rulesZ) / camZ;
    const rules = rulesRef.current;
    if (rules) {
      rules.uniforms.uCell.value = cell * persp;
      rules.uniforms.uOffset.value.set(s.ox * persp, s.oy * persp);
    }

    // Reveal easing (load-driven flip — DESIGN.md §7).
    const revealStep = damp(4, dt);
    CAPS.forEach((cap, i) => {
      const to = textures[cap.slug] ? 1 : 0;
      reveal.current[i] += (to - reveal.current[i]) * revealStep;
    });

    const curX = s.hover ? (s.px * viewport.width) / 2 : 0;
    const curY = s.hover ? (s.py * viewport.height) / 2 : 0;
    const sigma = FIELD.SIGMA * cell;
    const posStep = damp(FIELD.DAMP_POS, dt);
    const sm = smooth.current;

    let innerCount = 0;
    outerCounts.fill(0);

    // Only take over once the hi mesh has actually arrived; until then the focused
    // cap stays in the instanced field on the lo mesh.
    const hero = active && hi ? heroRef.current : null;
    if (heroRef.current) heroRef.current.visible = hero !== null;

    for (let j = 0; j < rows && innerCount < MAX_INSTANCES; j++) {
      for (let i = 0; i < cols && innerCount < MAX_INSTANCES; i++) {
        const slot = j * cols + i;

        // The +0.5 puts each cap at the CENTRE of its ruled box rather than on the
        // boundary — the lines are at integer multiples of `cell`.
        const x = wrap((i + 0.5) * cell - s.ox + spanX / 2, spanX) - spanX / 2;
        const y = wrap((j + 0.5) * cell - s.oy + spanY / 2, spanY) - spanY / 2;

        // Identity comes from the ABSOLUTE cell, so it survives wrapping.
        const absCol = Math.round((x + s.ox) / cell - 0.5);
        const absRow = Math.round((y + s.oy) / cell - 0.5);
        const h = hash2(absCol, absRow); // spin phase only
        const hb = hash2b(absCol, absRow); // spin rate only
        const capIdx = capAt(absCol, absRow, CAPS.length);

        // Depth variation. Not positional jitter — the caps stay centred in their
        // boxes — but each sits slightly nearer or further, so the hero type at z = 0
        // has caps both in front of and behind it. That interleaving is the poster.
        const zDepth = (hb - 0.5) * FIELD.DEPTH * D;

        // Cursor attraction — gaussian, so there is no visible radius edge. Ramped out
        // while focused, or the blurred field twitches under the info panel.
        let w = 0;
        if (s.hover && !focus) {
          const dx = curX - x;
          const dy = curY - y;
          const d = Math.hypot(dx, dy);
          w = falloff(d, sigma);
          const inv = d || 1;
          target[0] = x + (dx / inv) * w * FIELD.PULL * cell;
          target[1] = y + (dy / inv) * w * FIELD.PULL * cell;
          target[2] = zDepth + w * FIELD.LIFT * cell;
        } else {
          target[0] = x;
          target[1] = y;
          target[2] = zDepth;
        }

        const o = slot * 3;
        // A wrapped cap jumps a full span; snap rather than sliding across the screen.
        if (Math.abs(sm[o] - target[0]) > cell * 2 || Math.abs(sm[o + 1] - target[1]) > cell * 2) {
          sm[o] = target[0];
          sm[o + 1] = target[1];
          sm[o + 2] = target[2];
        } else {
          sm[o] += (target[0] - sm[o]) * posStep;
          sm[o + 1] += (target[1] - sm[o + 1]) * posStep;
          sm[o + 2] += (target[2] - sm[o + 2]) * posStep;
        }

        // Spin: a pure function of elapsed time, so it is monotonic and never resets —
        // focusing a cap changes where it is, never where it is in its rotation.
        const raw = t * spinBase * (0.85 + hb * 0.3) + h * Math.PI * 2;
        const spin = raw - FIELD.SPIN_DWELL * Math.sin(raw); // dwell face-on, sweep the back
        const flip = (1 - reveal.current[capIdx]) * Math.PI;

        // Focused cap: same instance, eased toward the viewer. Nothing is recreated.
        const isFocused = active !== null && absCol === active.col && absRow === active.row;
        let px = sm[o];
        let py = sm[o + 1];
        let pz = sm[o + 2];
        let scale = D * (1 + w * 0.06);
        if (isFocused) {
          const f = ease.current;
          px += (layout.focusX - px) * f;
          py += (layout.focusY - py) * f;
          pz += (FOCUS_Z - pz) * f;
          scale += (D * layout.focusScale - scale) * f;
        }

        dummy.position.set(px, py, pz);
        dummy.rotation.set(FIELD.TILT + flip, spin, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();

        // Once the hi-res mesh is available, the focused cap is drawn by the hero
        // group instead of as an instance. Both are driven from this same `dummy`, so
        // the handover is invisible — including the spin angle, which is a pure
        // function of time and therefore identical on both sides.
        if (isFocused && hero) {
          hero.position.copy(dummy.position);
          hero.rotation.copy(dummy.rotation);
          // Turn it over onto its back, and unwind the spin as it goes. You flip a cap
          // in order to READ what is under the crown, so it has to settle facing you —
          // a message that keeps rotating away is a message nobody reads. Scaling the
          // angle rather than zeroing the rate keeps the motion smooth in both
          // directions and returns it to the live spin on unflip.
          hero.rotation.y = spin * (1 - flipRamp.current);
          hero.rotation.x += flipRamp.current * Math.PI;
          hero.scale.copy(dummy.scale);
          if (heroOuterRef.current) heroOuterRef.current.material = outerMats[capIdx];
          continue; // skip the instanced copy
        }

        innerRef.current?.setMatrixAt(innerCount++, dummy.matrix);
        const om = outerRefs.current[capIdx];
        if (om && outerCounts[capIdx] < MAX_PER_CAP) {
          om.setMatrixAt(outerCounts[capIdx]++, dummy.matrix);
        }
      }
    }

    // Upload only the slice actually in use. Without the update range, three re-sends
    // every allocated matrix on all 15 meshes each frame — ~180 KB/frame of pure waste.
    const upload = (m: THREE.InstancedMesh | null, count: number) => {
      if (!m) return;
      m.count = count;
      const attr = m.instanceMatrix;
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, count * 16);
      attr.needsUpdate = true;
    };

    upload(innerRef.current, innerCount);
    for (let i = 0; i < CAPS.length; i++) upload(outerRefs.current[i], outerCounts[i]);
  });

  return (
    <>
      {/* Ruled cells, sat behind the caps. Faint — the reference poster is a bare wall,
          so these are a hint of a catalogue plate, not a spreadsheet. */}
      <mesh position={[0, 0, layout.rulesZ]} frustumCulled={false}>
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
        <shaderMaterial ref={rulesRef} args={rulesArgs} />
      </mesh>

      {/* The scrim: a paper-coloured plane between the field and the focused cap.
          The cap travels in FRONT of it and writes depth first, so the scrim is
          rejected where the cap is — the field recedes while the cap stays crisp,
          for one extra quad and no post-processing pass (MOTION.md §6). */}
      <mesh position={[0, 0, SCRIM_Z]} frustumCulled={false} renderOrder={1}>
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
        <meshBasicMaterial
          ref={scrimRef}
          color={paperColor}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* The focused cap at full detail (50k tris vs the grid's 4k), so the crimped
          rim holds up when it is enlarged. Fetched on first focus only. */}
      {titleTex && (
        <TypeLayer
          texture={titleTex}
          materialRef={titleMatRef}
          z={layout.typeZ}
          // Sitting further from the camera shrinks it on screen; scale by the depth
          // ratio so it still occupies the intended fraction of the viewport.
          width={viewport.width * (layout.narrow ? 0.94 : 0.82) * ((camZ - layout.typeZ) / camZ)}
        />
      )}

      {hi && (
        <group ref={heroRef} visible={false}>
          <mesh ref={heroOuterRef} geometry={hi.outerGeo} material={outerMats[0]} />
          {/* The hero gets its own liner material so the under-crown message prints
              on this cap only — the grid's shared mint stays untouched. */}
          <mesh geometry={hi.innerGeo}>
            <meshStandardMaterial
              ref={heroInnerMatRef}
              color="#b7e6de"
              map={revealTex}
              metalness={0}
              roughness={0.5}
            />
          </mesh>
        </group>
      )}

      <instancedMesh
        ref={innerRef}
        args={[innerGeo, innerMat, MAX_INSTANCES]}
        frustumCulled={false}
      />
      {CAPS.map((cap, i) => (
        <instancedMesh
          key={cap.slug}
          ref={(el) => {
            outerRefs.current[i] = el;
          }}
          args={[outerGeo, outerMats[i], MAX_PER_CAP]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------

export default function CapGrid() {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [flipped, setFlipped] = useState(false);
  /** Outlives `focus` so the panel can animate out alongside the cap. */
  const [panel, setPanel] = useState<Focus | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Single entry point for focus changes, so panel lifetime is driven by the event
   *  rather than by an effect reacting to it (which cascades renders). */
  const changeFocus = useCallback((next: Focus | null) => {
    setFocus(next);
    setFlipped(false); // a new cap always arrives brand-side up
    if (next) play('open');
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    if (next) {
      setPanel(next);
    } else {
      unmountTimer.current = setTimeout(() => setPanel(null), 320);
    }
  }, []);

  const toggleFlip = useCallback(() => {
    play('clink');
    setFlipped((f) => !f);
  }, []);

  // Lazy initialiser rather than an effect: localStorage is available on the client's
  // first render, and reading it in an effect causes a visible flip of the label.
  const [muted, setMutedState] = useState(loadMutePreference);
  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
  }, []);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && changeFocus(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, changeFocus]);

  useEffect(() => () => void (unmountTimer.current && clearTimeout(unmountTimer.current)), []);

  return (
    <div className="relative h-dvh w-full touch-none select-none bg-paper">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <CapField
          focus={focus}
          flipped={flipped}
          onFocus={changeFocus}
          onFlip={toggleFlip}
        />

        {/*
          A built environment — zero bytes over the wire. An environment map is what a
          metallic surface actually *shows*, so the coverage here matters more than any
          light: too sparse and every cap becomes a mirror reflecting black.

          The big front softbox is the important one. It sits behind the camera, so it
          is what the caps' faces reflect straight back at the viewer. The key and rim
          shape the crimped edge; the gaps between them keep the dark zones that stop
          the metal reading chalky on a bone background (DESIGN.md §5).
        */}
        <Environment resolution={128}>
          {/* front softbox — reflected by every cap face */}
          <Lightformer intensity={1.5} position={[0, 0, 9]} scale={[26, 26, 1]} color="#fffdf8" />
          {/* key, upper-left, matching the poster's light direction */}
          <Lightformer intensity={3.2} position={[-6, 5, 5]} scale={[10, 10, 1]} color="#fffaf2" />
          {/* cool fill, lower-right */}
          <Lightformer intensity={1.3} position={[6, -2, 4]} scale={[10, 10, 1]} color="#d6e8e5" />
          {/* overhead, for the rim highlight */}
          <Lightformer intensity={1.8} position={[0, 7, 0]} scale={[12, 12, 1]} color="#ffffff" />
        </Environment>
      </Canvas>

      <button
        onClick={toggleMute}
        aria-pressed={muted}
        className="absolute bottom-5 left-5 z-10 text-[11px] uppercase tracking-[0.18em] text-ink-3
                   transition-[color,transform] duration-150 ease-out hover:text-ink active:scale-90"
      >
        {muted ? 'Sound off' : 'Sound on'}
      </button>

      {panel && (
        <CapInfo
          cap={CAPS[panel.capIdx]}
          visible={focus !== null}
          onClose={() => changeFocus(null)}
        />
      )}
    </div>
  );
}

useGLTF.preload('/cap-lo.glb');
