'use client';

import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  Center,
  useGLTF,
} from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';

function Cap({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // The GLB export flattened metalness, so we restore it in code (CLAUDE.md §7).
  // But ONLY on the textured outer crown: slot 2 (`Inner Cork Cover`) is authored
  // metalness 0 / roughness 0.5 on purpose — it's painted liner, and forcing it to
  // 0.9 turns the mint flip-reveal face into chrome. Gate on `.map` rather than the
  // material name, since names carry per-file Blender suffixes (`.015`, `.011`, …).
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat.map) return;
        mat.metalness = 0.9;
        mat.roughness = 0.35;
        mat.needsUpdate = true;
      });
    });
  }, [scene]);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

export default function CapViewer({ url = '/goldspot.glb' }: { url?: string }) {
  return (
    <div className="h-dvh w-full bg-paper">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 1], fov: 45 }}>
        <Suspense fallback={null}>
          <Cap url={url} />

          {/* A built environment, not a CDN preset: costs zero bytes and — crucially —
              starts black, so the metal has dark regions to reflect. A uniformly bright
              studio preset on a bone background makes the caps read chalky (DESIGN.md §5). */}
          <Environment resolution={256}>
            <Lightformer intensity={2.6} position={[-4, 3, 3]} scale={[8, 8, 1]} color="#fffaf2" />
            <Lightformer intensity={0.7} position={[5, -1, 2]} scale={[8, 8, 1]} color="#cfe3e0" />
            <Lightformer intensity={1.1} position={[0, 5, -3]} scale={[6, 6, 1]} color="#ffffff" />
          </Environment>

          {/* Without contact shadows the cap floats like a sticker. Not optional. */}
          <ContactShadows
            position={[0, -0.22, 0]}
            opacity={0.35}
            scale={2}
            blur={2.6}
            far={0.6}
            color="#8a7f72"
          />
        </Suspense>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
