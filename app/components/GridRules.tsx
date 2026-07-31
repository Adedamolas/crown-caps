'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * The ruled cell boundaries, drawn in a shader on a single quad behind the caps.
 *
 * Deliberately NOT a CSS background: animating `background-position` every frame
 * repaints a full-screen layer, which was the source of the visible micro-stutter.
 * A shader is compositor-free, stays crisp at any DPR, and wraps for free.
 */
export function makeRulesConfig(color: THREE.Color): THREE.ShaderMaterialParameters {
  return {
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uOffset: { value: new THREE.Vector2(0, 0) },
      uCell: { value: 1 },
      uColor: { value: color },
      // Faint by default: the reference is a bare gallery wall, and full-strength rules
      // turn the field into a spreadsheet. Raise toward 1 for a stronger catalogue look.
      uOpacity: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      out vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec2  uOffset;
      uniform float uCell;
      uniform vec3  uColor;
      uniform float uOpacity;
      in  vec2 vPos;
      out vec4 fragColor;

      void main() {
        vec2 uv = (vPos + uOffset) / uCell;
        // Distance to the nearest cell boundary, in pixels — gives a hairline that
        // stays exactly one pixel wide at any zoom or DPR.
        vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
        float a = (1.0 - min(min(g.x, g.y), 1.0)) * uOpacity;
        if (a <= 0.002) discard;
        fragColor = vec4(uColor, a);
      }
    `,
  };
}

/** Reads a semantic `H S% L%` custom property so the shader honours the tokens. */
export function useTokenColor(name: string, fallback: string) {
  return useMemo(() => {
    const c = new THREE.Color(fallback);
    if (typeof window === 'undefined') return c;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const [h, s, l] = raw.split(/\s+/);
    if (h && s && l) c.setStyle(`hsl(${h}, ${s}, ${l})`);
    return c;
  }, [name, fallback]);
}
