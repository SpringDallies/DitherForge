import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../state/useAppStore';
import {
  getStoredSettings,
  type DitherForgeSettings,
  type LogoDitherStyle
} from '../dialogs/SettingsDialog';

export interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'full';
  size?: number;
  className?: string;
}

const BASE = import.meta.env.BASE_URL;

export const THEME_LOGO_MAP: Record<string, string> = {
  dark: `${BASE}assets/themes/dark.webp`,
  dark_pro: `${BASE}assets/themes/dark_pro.webp`,
  nord: `${BASE}assets/themes/nord.webp`,
  evergreen: `${BASE}assets/themes/evergreen.webp`,
  gruvbox: `${BASE}assets/themes/gruvbox.webp`,
  catppuccin_mocha: `${BASE}assets/themes/catppuccin_mocha.webp`,
  tokyo_night: `${BASE}assets/themes/tokyo_night.webp`,
  solarized_dark: `${BASE}assets/themes/solarized_dark.webp`,
  one_dark: `${BASE}assets/themes/one_dark.webp`,
  light_pro: `${BASE}assets/themes/light_pro.webp`,
  dracula: `${BASE}assets/themes/dracula.webp`,
  kanagawa_wave: `${BASE}assets/themes/kanagawa_wave.webp`,
  monokai_pro: `${BASE}assets/themes/monokai.webp`,
  rose_pine: `${BASE}assets/themes/rose_pine.webp`,
};

/* Anvil outline traced from the PNG (x,y pairs, 6 units wide, CCW) */
const OUTLINE = [
  2.123,-1.578,2.156,-1.577,2.195,-1.567,2.228,-1.554,2.257,-1.538,2.287,-1.515,2.314,-1.488,2.326,-1.472,
  2.342,-1.447,2.362,-1.403,2.369,-1.383,2.376,-1.344,2.376,-1.295,2.373,-1.272,2.366,-1.243,2.346,-1.194,
  2.329,-1.167,2.300,-1.130,2.210,-1.040,2.197,-1.031,2.118,-0.952,2.105,-0.942,1.939,-0.779,1.924,-0.768,
  1.805,-0.648,1.754,-0.587,1.711,-0.528,1.655,-0.433,1.610,-0.335,1.580,-0.250,1.563,-0.188,1.547,-0.106,
  1.546,-0.090,1.540,-0.054,1.540,-0.028,1.537,-0.015,1.537,0.113,1.537,0.126,1.540,0.139,1.540,0.165,
  1.554,0.253,1.574,0.338,1.593,0.400,1.626,0.482,1.663,0.555,1.691,0.606,1.731,0.666,1.795,0.746,
  1.842,0.797,1.857,0.808,1.891,0.843,1.931,0.875,1.996,0.923,2.064,0.966,2.133,1.002,2.218,1.038,
  2.287,1.061,2.349,1.077,2.417,1.091,2.456,1.095,2.466,1.097,2.486,1.098,2.496,1.101,2.558,1.104,
  2.567,1.107,2.594,1.108,2.616,1.111,2.656,1.118,2.711,1.135,2.745,1.148,2.783,1.167,2.817,1.187,
  2.875,1.232,2.912,1.269,2.950,1.318,2.976,1.360,2.999,1.409,3.000,1.452,2.992,1.476,2.986,1.488,
  2.973,1.506,2.946,1.524,2.917,1.535,2.868,1.535,2.852,1.538,2.620,1.539,2.600,1.542,2.368,1.542,
  2.349,1.545,2.117,1.545,2.100,1.548,1.868,1.548,1.849,1.552,1.617,1.552,1.597,1.555,1.365,1.555,
  1.346,1.558,1.114,1.558,1.094,1.561,0.862,1.561,0.843,1.565,0.611,1.565,0.591,1.568,0.363,1.568,
  0.343,1.571,0.111,1.571,0.091,1.574,-0.140,1.574,-0.160,1.578,-0.392,1.578,-0.412,1.581,-0.614,1.581,
  -0.653,1.573,-0.692,1.560,-0.784,1.507,-0.823,1.487,-0.862,1.471,-0.908,1.458,-0.973,1.447,-1.316,1.447,
  -1.333,1.440,-1.378,1.412,-1.424,1.389,-1.486,1.363,-1.545,1.344,-1.610,1.327,-1.672,1.317,-1.695,1.316,
  -1.708,1.313,-1.748,1.313,-1.764,1.310,-2.956,1.310,-2.969,1.306,-2.986,1.296,-2.996,1.282,-3.000,1.269,
  -3.000,1.246,-2.996,1.233,-2.984,1.217,-2.969,1.205,-2.845,1.081,-2.830,1.070,-2.705,0.944,-2.690,0.933,
  -2.564,0.807,-2.550,0.795,-2.512,0.758,-2.469,0.722,-2.408,0.675,-2.316,0.612,-2.247,0.572,-2.162,0.530,
  -2.110,0.507,-1.999,0.468,-1.944,0.452,-1.819,0.425,-1.751,0.415,-1.692,0.411,-1.679,0.408,-1.653,0.408,
  -1.643,0.405,-1.614,0.405,-1.604,0.402,-1.574,0.401,-1.565,0.399,-1.535,0.398,-1.525,0.396,-1.496,0.395,
  -1.486,0.392,-1.457,0.392,-1.447,0.389,-1.418,0.388,-1.408,0.386,-1.378,0.385,-1.369,0.382,-1.339,0.382,
  -1.329,0.379,-1.300,0.379,-1.290,0.376,-1.261,0.375,-1.251,0.373,-1.222,0.372,-1.212,0.369,-1.182,0.369,
  -1.173,0.366,-1.143,0.366,-1.133,0.363,-1.104,0.362,-1.094,0.360,-1.065,0.359,-1.055,0.356,-1.026,0.356,
  -1.016,0.353,-0.986,0.352,-0.977,0.350,-0.947,0.349,-0.937,0.347,-0.908,0.346,-0.898,0.343,-0.869,0.343,
  -0.859,0.340,-0.830,0.339,-0.820,0.337,-0.790,0.336,-0.781,0.333,-0.751,0.333,-0.741,0.330,-0.712,0.330,
  -0.702,0.327,-0.673,0.326,-0.663,0.324,-0.634,0.323,-0.624,0.320,-0.595,0.320,-0.585,0.317,-0.562,0.317,
  -0.503,0.307,-0.438,0.286,-0.415,0.277,-0.382,0.260,-0.350,0.241,-0.310,0.212,-0.286,0.191,-0.263,0.168,
  -0.231,0.129,-0.192,0.067,-0.173,0.024,-0.156,-0.021,-0.142,-0.083,-0.142,-0.100,-0.139,-0.113,-0.139,-0.198,
  -0.150,-0.260,-0.159,-0.296,-0.173,-0.333,-0.202,-0.390,-0.225,-0.427,-0.250,-0.459,-0.301,-0.509,-0.931,-0.996,
  -0.977,-1.039,-1.020,-1.093,-1.033,-1.112,-1.056,-1.155,-1.079,-1.210,-1.092,-1.259,-1.099,-1.298,-1.102,-1.370,
  -1.099,-1.396,-1.092,-1.426,-1.075,-1.465,-1.052,-1.499,-1.019,-1.532,-0.996,-1.547,-0.947,-1.570,-0.915,-1.577,
  -0.892,-1.578,-0.879,-1.581,-0.291,-1.581,-0.274,-1.578,-0.219,-1.577,-0.209,-1.575,-0.183,-1.574,-0.160,-1.571,
  -0.105,-1.561,-0.059,-1.551,-0.003,-1.534,0.059,-1.511,0.114,-1.487,0.173,-1.456,0.284,-1.393,0.356,-1.356,
  0.408,-1.334,0.464,-1.314,0.536,-1.294,0.640,-1.274,0.692,-1.270,0.706,-1.267,0.820,-1.267,0.836,-1.270,
  0.862,-1.271,0.875,-1.274,0.892,-1.274,0.983,-1.291,1.049,-1.308,1.107,-1.327,1.166,-1.352,1.274,-1.405,
  1.512,-1.531,1.542,-1.544,1.591,-1.560,1.617,-1.567,1.679,-1.577,1.718,-1.578,1.735,-1.581,2.117,-1.580
];

// Build SVG path string once for crisp 2D Flat Logo mode
const SVG_PATH_DATA = (() => {
  let d = '';
  for (let i = 0; i < OUTLINE.length; i += 2) {
    const x = OUTLINE[i].toFixed(3);
    const y = (-OUTLINE[i + 1]).toFixed(3); // Invert Y for SVG coordinate space
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d + ' Z';
})();

const DEPTH = 1.1;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface LogoThemeColors {
  shadow: [number, number, number];
  highlight: [number, number, number];
  lightMode: number;
}

const LOGO_THEMES: Record<string, LogoThemeColors> = {
  obsidian:  { shadow: [0.34, 0.35, 0.45], highlight: [0.96, 0.98, 1.00], lightMode: 0.0 },
  light_pro: { shadow: [0.12, 0.13, 0.16], highlight: [0.55, 0.57, 0.62], lightMode: 1.0 },
  indigo:    { shadow: [0.35, 0.50, 0.95], highlight: [0.93, 0.96, 1.00], lightMode: 0.0 },
  emerald:   { shadow: [0.14, 0.66, 0.48], highlight: [0.90, 1.00, 0.95], lightMode: 0.0 },
  crimson:   { shadow: [0.84, 0.26, 0.46], highlight: [1.00, 0.91, 0.96], lightMode: 0.0 },
  amber:     { shadow: [0.86, 0.52, 0.15], highlight: [1.00, 0.96, 0.84], lightMode: 0.0 },
  violet:    { shadow: [0.66, 0.30, 0.94], highlight: [0.98, 0.93, 1.00], lightMode: 0.0 },
  coffee:    { shadow: [0.55, 0.38, 0.26], highlight: [0.95, 0.88, 0.78], lightMode: 0.0 }
};

function mapAppThemeToLogoTheme(appTheme: string): LogoThemeColors {
  switch (appTheme) {
    case 'light_pro':
      return LOGO_THEMES.light_pro;
    case 'evergreen':
      return LOGO_THEMES.emerald;
    case 'gruvbox':
    case 'monokai_pro':
    case 'kanagawa_wave':
      return LOGO_THEMES.amber;
    case 'catppuccin_mocha':
    case 'dracula':
      return LOGO_THEMES.violet;
    case 'rose_pine':
      return LOGO_THEMES.crimson;
    case 'tokyo_night':
    case 'nord':
    case 'solarized_dark':
    case 'one_dark':
      return LOGO_THEMES.indigo;
    case 'dark_pro':
    case 'dark':
    default:
      return LOGO_THEMES.obsidian;
  }
}

function mapDitherStyleToInt(style: LogoDitherStyle | undefined): number {
  switch (style) {
    case 'none':
      return 0;
    case 'bayer2':
      return 1;
    case 'bayer4':
      return 2;
    case 'bayer8':
      return 3;
    case 'halftone':
      return 4;
    case 'scanline':
      return 5;
    case 'checker':
      return 6;
    default:
      return 2;
  }
}

const ANVIL_SVG_POINTS = (() => {
  const pts: string[] = [];
  for (let i = 0; i < OUTLINE.length; i += 2) {
    pts.push(`${OUTLINE[i]},${(-OUTLINE[i + 1]).toFixed(3)}`);
  }
  return pts.join(' ');
})();

export const Logo: React.FC<LogoProps> = ({ size = 280, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const [logoCfg, setLogoCfg] = useState<DitherForgeSettings>(() => getStoredSettings());
  const settingsRef = useRef<DitherForgeSettings>(logoCfg);
  settingsRef.current = logoCfg;

  const targetColorsRef = useRef<LogoThemeColors>(mapAppThemeToLogoTheme(activeTheme));
  const triggerThemeShineRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targetColorsRef.current = mapAppThemeToLogoTheme(activeTheme);
    if (settingsRef.current.logoPeriodicShine !== false) {
      triggerThemeShineRef.current?.();
    }
  }, [activeTheme]);

  useEffect(() => {
    const handleSettingsChanged = () => {
      const next = getStoredSettings();
      settingsRef.current = next;
      setLogoCfg({ ...next });
    };
    window.addEventListener('ditherforge_settings_changed', handleSettingsChanged);
    window.addEventListener('storage', handleSettingsChanged);
    return () => {
      window.removeEventListener('ditherforge_settings_changed', handleSettingsChanged);
      window.removeEventListener('storage', handleSettingsChanged);
    };
  }, []);

  const is2DMode = logoCfg.logoMode === '2d';
  const useAntialias = (logoCfg.logoSharpness ?? 'smooth') === 'smooth';

  useEffect(() => {
    if (is2DMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: useAntialias,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
    } catch {
      return;
    }

    // Compact 16:9 aspect ratio so the horizontal anvil fills the box without vertical dead space
    const ASPECT = 1.55;
    const initialResH = settingsRef.current.logoResolution || 256;
    const initialResW = Math.round(initialResH * ASPECT);
    renderer.setPixelRatio(1);
    renderer.setSize(initialResW, initialResH, false);
    renderer.setClearColor(0x000000, 0);
    let currentResH = initialResH;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, ASPECT, 0.1, 100);
    camera.position.set(0, 0.22, 9.4);
    camera.lookAt(0, 0.22, 0);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const shape = new THREE.Shape();
    for (let i = 0; i < OUTLINE.length; i += 2) {
      if (i === 0) shape.moveTo(OUTLINE[i], OUTLINE[i + 1]);
      else shape.lineTo(OUTLINE[i], OUTLINE[i + 1]);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      curveSegments: 1,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.19,
      bevelSize: 0.0,
      bevelSegments: 4
    });
    geo.center();

    /* Smooth the normals on the sides and bevels while keeping front/back caps crisp */
    (function smoothWalls(g: THREE.BufferGeometry) {
      const p = g.attributes.position;
      const out = new Float32Array(p.count * 3);
      const key = (i: number) =>
        p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
      const A = new THREE.Vector3();
      const B = new THREE.Vector3();
      const C = new THREE.Vector3();
      const acc = new Map<string, THREE.Vector3>();
      const tris: { f: THREE.Vector3; cap: boolean }[] = [];

      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i);
        B.fromBufferAttribute(p, i + 1);
        C.fromBufferAttribute(p, i + 2);
        const f = C.clone().sub(B).cross(A.clone().sub(B));
        const len = f.length();
        const cap = len > 0 && Math.abs(f.z) / len > 0.999;
        tris.push({ f, cap });
        if (!cap) {
          for (let k = 0; k < 3; k++) {
            const kk = key(i + k);
            if (!acc.has(kk)) acc.set(kk, new THREE.Vector3());
            acc.get(kk)!.add(f);
          }
        }
      }
      tris.forEach((t, ti) => {
        for (let k = 0; k < 3; k++) {
          const kStr = key(ti * 3 + k);
          let n = t.cap ? t.f.clone() : (acc.get(kStr)?.clone() ?? t.f.clone());
          n = n.length() > 1e-9 ? n.normalize() : new THREE.Vector3(0, 0, 1);
          out.set([n.x, n.y, n.z], (ti * 3 + k) * 3);
        }
      });
      g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    })(geo);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uShadow:         { value: new THREE.Vector3(...targetColorsRef.current.shadow) },
        uHighlight:      { value: new THREE.Vector3(...targetColorsRef.current.highlight) },
        uLightMode:      { value: targetColorsRef.current.lightMode },
        uFlatness:       { value: 1.0 },
        uDitherMode:     { value: mapDitherStyleToInt(settingsRef.current.logoDitherStyle) },
        uSteps:          { value: settingsRef.current.logoColorSteps ?? 16 },
        uDitherStrength: { value: settingsRef.current.logoDitherStrength ?? 2.0 },
        uLight:          { value: new THREE.Vector3(0.4, 0.75, 0.6) },
        uGain:           { value: 1 },
        uShine:          { value: -1 },
        uAxis:           { value: new THREE.Vector2(0.8, 0.6) },
        uBlush:          { value: 0.0 },
        uHeat:           { value: 0.0 },
        uBlushZ:         { value: 0.92 },
        uSparkPos:       { value: new THREE.Vector3(0, 0, 0.8) },
        uSparkLight:     { value: 0.0 }
      },
      vertexShader: `
        uniform float uFlatness;
        varying vec3 vNormal;
        varying vec3 vLocalNormal;
        varying vec3 vViewPos;
        varying vec3 vLocalPos;
        varying float vCap;
        varying vec2 vP;
        void main() {
          float isCap = step(0.85, abs(normal.z));
          vec3 camber = vec3(
            position.x * 0.16 + sin(position.y * 0.9) * 0.05,
            position.y * 0.22 + cos(position.x * 0.6) * 0.04,
            0.0
          ) * isCap;

          vec3 curvedNormal = normalize(normal + camber);
          vLocalNormal = curvedNormal;
          vNormal = normalize(normalMatrix * curvedNormal);
          vCap = isCap;
          vLocalPos = position;

          vec3 pos = position;
          pos.z *= (1.0 - 0.98 * uFlatness);

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vViewPos = -mvPos.xyz;
          vP = position.xy;
          gl_Position = projectionMatrix * mvPos;
        }`,
      fragmentShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif

        varying vec3 vNormal;
        varying vec3 vLocalNormal;
        varying vec3 vViewPos;
        varying vec3 vLocalPos;
        varying float vCap;
        varying vec2 vP;
        uniform float uShine;
        uniform vec2 uAxis;
        uniform vec3 uShadow;
        uniform vec3 uHighlight;
        uniform float uLightMode;
        uniform int uDitherMode;
        uniform float uSteps;
        uniform float uDitherStrength;
        uniform vec3 uLight;
        uniform float uGain;
        uniform float uBlush;
        uniform float uHeat;
        uniform float uBlushZ;
        uniform vec3 uSparkPos;
        uniform float uSparkLight;

        float bayer2(vec2 p) {
          vec2 c = mod(floor(p), 2.0);
          float b = (c.y < 0.5)
            ? ((c.x < 0.5) ? 0.0 : 2.0)
            : ((c.x < 0.5) ? 3.0 : 1.0);
          return (b + 0.5) / 4.0;
        }

        float bayer4(vec2 p) {
          vec2 c = mod(floor(p), 4.0);
          float x = c.x;
          float y = c.y;
          float b = 0.0;
          if (y < 0.5) {
            b = (x < 0.5) ? 0.0 : (x < 1.5) ? 8.0 : (x < 2.5) ? 2.0 : 10.0;
          } else if (y < 1.5) {
            b = (x < 0.5) ? 12.0 : (x < 1.5) ? 4.0 : (x < 2.5) ? 14.0 : 6.0;
          } else if (y < 2.5) {
            b = (x < 0.5) ? 3.0 : (x < 1.5) ? 11.0 : (x < 2.5) ? 1.0 : 9.0;
          } else {
            b = (x < 0.5) ? 15.0 : (x < 1.5) ? 7.0 : (x < 2.5) ? 13.0 : 5.0;
          }
          return (b + 0.5) / 16.0;
        }

        float bayer8(vec2 p) {
          float b4 = bayer4(floor(p * 0.5));
          float b2 = bayer2(p);
          return (4.0 * b4 + b2 - 0.5) / 4.0;
        }

        float sampleDitherPattern(vec2 fragCoord) {
          if (uDitherMode == 0) return 0.5;
          if (uDitherMode == 1) return bayer2(fragCoord);
          if (uDitherMode == 2) return bayer4(fragCoord);
          if (uDitherMode == 3) return bayer8(fragCoord);
          if (uDitherMode == 4) {
            vec2 cell = fract(fragCoord / 4.0) - 0.5;
            return clamp(length(cell) * 1.414, 0.0, 1.0);
          }
          if (uDitherMode == 5) {
            return mod(floor(fragCoord.y), 2.0) < 0.5 ? 0.22 : 0.78;
          }
          if (uDitherMode == 6) {
            vec2 c = mod(floor(fragCoord), 2.0);
            return abs(c.x - c.y) < 0.5 ? 0.25 : 0.75;
          }
          return bayer4(fragCoord);
        }

        float traceCapsuleLight(vec3 P, vec3 N, vec3 R, vec3 A, vec3 B) {
          vec3 AB = B - A;
          float ab2 = dot(AB, AB);

          float tSurf = clamp(dot(P - A, AB) / ab2, 0.0, 1.0);
          vec3 closestP = A + AB * tSurf;
          vec3 toLight = closestP - P;
          float dist = length(toLight);
          vec3 Ldir = toLight / max(dist, 0.001);

          float ndotl = max(dot(N, Ldir), 0.0) * 0.75 + 0.25;
          float bounce = ndotl / (1.0 + dist * dist * 2.1);

          float rDotL = max(dot(R, Ldir), 0.0);
          float specRay = pow(rDotL, 7.0) / (0.55 + dist * 0.85);

          return bounce * 0.65 + specRay * 0.90;
        }

        void main() {
          vec3 n = normalize(vNormal);
          vec3 V = normalize(vViewPos);
          vec3 Lk = normalize(uLight);

          vec3 R = reflect(-V, n);

          float ry = R.y + R.x * 0.24 + (Lk.y - 0.65) * 0.45 + (Lk.x * R.x) * 0.35;

          float upperSky    = smoothstep(-0.08, 0.38, ry);
          float zenithGlint = smoothstep(0.42, 0.88, ry);
          float lowerBounce = smoothstep(-0.22, -0.72, ry) * 0.42;
          float darkCore    = exp(-pow((ry + 0.16) * 4.2, 2.0));

          float chrome = 0.18 + 0.64 * upperSky + 0.24 * zenithGlint + lowerBounce - 0.22 * darkCore;

          float ribbon = max(dot(R, Lk), 0.0);
          chrome += 0.32 * pow(ribbon, 3.5);

          float ndotv = clamp(dot(n, V), 0.0, 1.0);
          float fresnel = pow(1.0 - ndotv, 2.4);
          float fresnelSign = mix(0.42, -0.22, uLightMode);
          chrome += fresnelSign * fresnel * (0.35 + 0.65 * smoothstep(-0.3, 0.5, R.y));

          float frontGleam = vCap * pow(max(n.z, 0.0), 1.3);
          float capFloor = mix(0.66, 0.54, uLightMode);
          float capBlend = mix(0.72, 0.48, uLightMode);
          chrome = mix(chrome, max(chrome, capFloor + 0.24 * upperSky), frontGleam * capBlend);

          float rawLit = clamp(chrome * 0.94 * uGain, 0.0, 1.0);
          float lit = smoothstep(0.04, 0.96, rawLit);

          float steps = max(2.0, uSteps);
          float scaled = lit * steps;
          float fracPart = fract(scaled);
          float ditherMask = smoothstep(0.14, 0.30, fracPart) * (1.0 - smoothstep(0.70, 0.86, fracPart));
          float patVal = sampleDitherPattern(gl_FragCoord.xy) - 0.5;
          float d = patVal * ditherMask * uDitherStrength;

          float q = (uDitherMode == 0)
            ? lit
            : clamp(floor(scaled + 0.5 + d) / steps, 0.0, 1.0);

          vec3 heatShadow = mix(uShadow, vec3(0.88, 0.16, 0.24), uHeat * 0.72);
          float midMix    = mix(0.62, 0.54, uLightMode);
          float hiWhite   = mix(0.45, 0.22, uLightMode);
          vec3 heatMid    = mix(mix(uShadow, uHighlight, midMix), vec3(0.98, 0.36, 0.42), uHeat * 0.62);
          vec3 heatHi     = mix(mix(uHighlight, vec3(1.0), hiWhite), vec3(1.00, 0.78, 0.76), uHeat * 0.55);

          float shadowMult = mix(0.34, 0.86, uLightMode);
          vec3 lo  = heatShadow * (shadowMult + 0.14 * uHeat);
          vec3 mid = heatMid;
          vec3 hi  = heatHi;

          vec3 col = q < 0.42
            ? mix(lo, mid, q / 0.42)
            : mix(mid, hi, pow((q - 0.42) / 0.58, 0.85));

          if (uHeat > 0.01) {
            float coreHeat = exp(-dot(vP * vec2(0.45, 0.65), vP * vec2(0.45, 0.65))) * uHeat;
            float heatQuant = clamp(floor(coreHeat * 4.0 + 0.4 + patVal * 0.35) / 4.0, 0.0, 1.0);
            col += vec3(0.45, 0.06, 0.08) * heatQuant;
          }

          if (uSparkLight > 0.01) {
            float sDist = length(vLocalPos - uSparkPos);
            float sGlow = (1.0 / (1.0 + sDist * sDist * 4.5)) * uSparkLight;
            float sQuant = clamp(floor(sGlow * 4.0 + 0.35 + patVal * 0.4) / 4.0, 0.0, 1.0);
            col = mix(col, vec3(1.0, 0.90, 0.72), clamp(sQuant * 0.75, 0.0, 1.0));
          }

          if (uBlush > 0.001) {
            vec3 P = vLocalPos;
            vec3 N = normalize(vLocalNormal);
            vec3 Vloc = normalize(vec3(0.0, 0.18, 1.0));
            vec3 Rloc = reflect(-Vloc, N);
            float bz = uBlushZ;

            float e1 = traceCapsuleLight(P, N, Rloc, vec3(-1.62, 0.36, bz), vec3(-1.30, 1.12, bz));
            float e2 = traceCapsuleLight(P, N, Rloc, vec3(-1.12, 0.36, bz), vec3(-0.80, 1.12, bz));
            float e3 = traceCapsuleLight(P, N, Rloc, vec3( 0.80, 0.36, bz), vec3( 1.12, 1.12, bz));
            float e4 = traceCapsuleLight(P, N, Rloc, vec3( 1.30, 0.36, bz), vec3( 1.62, 1.12, bz));

            float totalRayGlow = (e1 + e2 + e3 + e4) * uBlush;
            float glowLevel = clamp(floor(totalRayGlow * 4.2 + 0.35 + patVal * 0.45) / 4.0, 0.0, 1.0);

            vec3 pinkBounce = vec3(1.0, 0.20, 0.50);
            vec3 pinkSpec   = vec3(1.0, 0.76, 0.90);
            vec3 rayColor   = mix(pinkBounce, pinkSpec, clamp(totalRayGlow * 0.65, 0.0, 1.0));

            col = mix(col, rayColor, clamp(glowLevel * 0.76, 0.0, 1.0));
            col += pinkBounce * (glowLevel * 0.28);
          }

          col = clamp(col, 0.0, 1.0);

          float t = (dot(vP, uAxis) - (uShine * 2.0 - 1.0) * 4.4) / 0.46;
          float band = uShine < 0.0 ? 0.0 : exp(-t * t);
          col = mix(col, vec3(1.0), step(0.56, band + patVal * 0.30));

          gl_FragColor = vec4(col, 1.0);
        }`
    });

    const mesh = new THREE.Mesh(geo, material);
    rootGroup.add(mesh);

    /* ---------- Seamless Raymarched SDF Capsule Blush Rods (Zero Rod+Ball Overlap Seam) ---------- */
    const blushGroup = new THREE.Group();
    rootGroup.add(blushGroup);

    const blushMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uEmission: { value: 0.0 },
        uOpacity:  { value: 0.0 },
        uLight:    { value: new THREE.Vector3(0.4, 0.75, 0.6) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
        varying vec2 vUv;
        uniform float uEmission;
        uniform float uOpacity;
        uniform vec3 uLight;

        void main() {
          if (uOpacity <= 0.01) discard;
          // Local quad coordinates: x in [-1, 1], y in [-1, 1]
          // Capsule axis runs along y in [-0.66, 0.66], radius = 0.32 in UV space
          vec2 p = vUv * 2.0 - 1.0;
          float halfLen = 0.66;
          float radius = 0.32;
          float clampedY = clamp(p.y, -halfLen, halfLen);
          vec2 dVec = vec2(p.x, p.y - clampedY);
          float dist = length(dVec) / radius;
          if (dist > 1.0) discard;

          // Reconstruct true 3D hemisphere/cylinder normal seamlessly with zero geometry overlap
          float nz = sqrt(max(0.0, 1.0 - dist * dist));
          vec3 n = normalize(vec3(dVec / radius, nz));
          vec3 V = vec3(0.0, 0.0, 1.0);
          vec3 L = normalize(uLight);

          float ndotv = clamp(n.z, 0.0, 1.0);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(n, H), 0.0), 14.0);
          float core = smoothstep(0.10, 0.85, ndotv);

          vec3 dimRim   = vec3(0.75, 0.14, 0.36);
          vec3 dimCore  = vec3(0.95, 0.32, 0.54);
          vec3 glowRim  = vec3(1.00, 0.22, 0.52);
          vec3 glowCore = vec3(1.00, 0.68, 0.86);
          vec3 hiWhite  = vec3(1.00, 0.96, 0.98);

          float em = clamp(uEmission, 0.0, 1.35);
          vec3 rimCol  = mix(dimRim, glowRim, clamp(em, 0.0, 1.0));
          vec3 bodyCol = mix(dimCore, glowCore, clamp(em, 0.0, 1.0));

          vec3 col = mix(rimCol, bodyCol, core);
          float highlightStrength = clamp((spec * 0.9 + pow(ndotv, 3.2) * 0.68) * (0.45 + 0.80 * em), 0.0, 1.0);
          col = mix(col, hiWhite, highlightStrength);

          // Crisp anti-aliased capsule edge + scale-in pop so it never looks ghostly/semi-transparent
          float edgeAlpha = smoothstep(1.0, 0.84, dist);
          gl_FragColor = vec4(col, edgeAlpha * clamp(uOpacity, 0.0, 1.0));
        }`
    });

    const slashDisposableGeos: THREE.BufferGeometry[] = [];
    function createSeamless3DSlash(x1: number, y1: number, x2: number, y2: number, radius: number) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - Math.PI * 0.5;

      const quadW = (radius / 0.32) * 2.0;
      const quadH = (len * 0.5 / 0.66) * 2.0;
      const planeGeo = new THREE.PlaneGeometry(quadW, quadH);
      slashDisposableGeos.push(planeGeo);

      const slashMesh = new THREE.Mesh(planeGeo, blushMaterial);
      slashMesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, 0);
      slashMesh.rotation.z = angle;
      return slashMesh;
    }

    const SLASH_RADIUS = 0.11;
    const slashL1 = createSeamless3DSlash(-1.62, 0.36, -1.30, 1.12, SLASH_RADIUS);
    const slashL2 = createSeamless3DSlash(-1.12, 0.36, -0.80, 1.12, SLASH_RADIUS);
    const slashR1 = createSeamless3DSlash( 0.80, 0.36,  1.12, 1.12, SLASH_RADIUS);
    const slashR2 = createSeamless3DSlash( 1.30, 0.36,  1.62, 1.12, SLASH_RADIUS);

    slashL1.rotation.y =  0.14;
    slashL2.rotation.y =  0.08;
    slashR1.rotation.y = -0.08;
    slashR2.rotation.y = -0.14;

    blushGroup.add(slashL1, slashL2, slashR1, slashR2);
    blushGroup.position.set(0, 0, 0.92);
    blushGroup.scale.setScalar(1.0);
    blushGroup.visible = false;

    /* ---------- 3D Diamond/Streak Forge Sparks ---------- */
    const sparkGroup = new THREE.Group();
    rootGroup.add(sparkGroup);

    const sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
    sparkGeo.scale(0.65, 2.6, 0.65);

    interface SparkItem {
      mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.ShaderMaterial>;
      active: boolean;
      age: number;
      maxAge: number;
      vx: number;
      vy: number;
      vz: number;
      scale: number;
    }

    const SPARK_POOL: SparkItem[] = [];
    function makeSparkMaterial() {
      return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uLife: { value: 0.0 },
          uGlow: { value: 0.0 }
        },
        vertexShader: `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
          #else
            precision mediump float;
          #endif
          uniform float uLife;
          uniform float uGlow;

          void main() {
            float t = clamp(uLife, 0.0, 1.0);
            vec3 birthCol = mix(vec3(1.0, 0.88, 0.60), vec3(1.0, 1.0, 1.0), uGlow);
            vec3 midCol   = mix(vec3(1.0, 0.52, 0.12), vec3(1.0, 0.78, 0.35), uGlow);
            vec3 tailCol  = vec3(0.85, 0.14, 0.08);

            vec3 col = t < 0.45
              ? mix(birthCol, midCol, t / 0.45)
              : mix(midCol, tailCol, (t - 0.45) / 0.55);

            float alpha = (1.0 - pow(t, 2.2)) * (0.80 + 0.20 * uGlow);
            gl_FragColor = vec4(col, alpha);
          }`
      });
    }

    for (let i = 0; i < 28; i++) {
      const sMat = makeSparkMaterial();
      const sMesh = new THREE.Mesh(sparkGeo, sMat);
      sMesh.visible = false;
      sparkGroup.add(sMesh);
      SPARK_POOL.push({
        mesh: sMesh,
        active: false,
        age: 0,
        maxAge: 0.45,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 1
      });
    }

    // Exact 2D point-in-polygon hit test against the anvil OUTLINE.
    // Runs in <0.005ms, no 3D mesh raycast lag on rapid clicks.
    function isPointInAnvilPolygon(px: number, py: number): boolean {
      let inside = false;
      const n = OUTLINE.length;
      for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
        const xi = OUTLINE[i];
        const yi = OUTLINE[i + 1];
        const xj = OUTLINE[j];
        const yj = OUTLINE[j + 1];
        const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }

    const localHit = new THREE.Vector3();
    function getFastAnvilClickPoint(clientX: number, clientY: number) {
      if (!canvas || !rootGroup) return null;
      const rect = canvas.getBoundingClientRect();
      // Project screen click onto the anvil's Z=0 plane using camera FOV (32 deg) & distance (8.4)
      const ndcX = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const ndcY = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;

      const halfHeightWorld = Math.tan(THREE.MathUtils.degToRad(32 * 0.5)) * 9.4;
      const halfWidthWorld = halfHeightWorld * 1.55;

      const worldX = ndcX * halfWidthWorld;
      const worldY = ndcY * halfHeightWorld + 0.22;

      const localX = (worldX - rootGroup.position.x) / Math.max(0.01, rootGroup.scale.x);
      const localY = (worldY - rootGroup.position.y) / Math.max(0.01, rootGroup.scale.y);

      if (!isPointInAnvilPolygon(localX, localY)) {
        return null;
      }

      localHit.set(localX, localY, 0.72);
      return localHit;
    }

    function spawnClickSparks(localOrigin: THREE.Vector3, clickMeter: number) {
      const glowLevel = Math.min(1.0, Math.max(0.1, (clickMeter - 1.0) / 10.0));

      material.uniforms.uSparkPos.value.copy(localOrigin);
      material.uniforms.uSparkLight.value = 0.50 + 0.70 * glowLevel;

      const count = 6;
      let spawned = 0;
      for (const sp of SPARK_POOL) {
        if (sp.active) continue;
        sp.active = true;
        sp.age = 0;
        sp.maxAge = rnd(0.28, 0.46);

        const angle = rnd(-Math.PI * 0.85, Math.PI * 0.85);
        const speed = rnd(3.2, 5.8);

        sp.vx = Math.sin(angle) * speed;
        sp.vy = Math.cos(angle) * speed * 0.85 + rnd(1.1, 2.5);
        sp.vz = rnd(0.8, 2.8);

        sp.scale = rnd(0.85, 1.25);
        sp.mesh.position.set(
          localOrigin.x + rnd(-0.05, 0.05),
          localOrigin.y + rnd(-0.05, 0.05),
          localOrigin.z
        );
        sp.mesh.scale.setScalar(sp.scale);
        sp.mesh.material.uniforms.uLife.value = 0.0;
        sp.mesh.material.uniforms.uGlow.value = glowLevel;
        sp.mesh.visible = true;

        spawned++;
        if (spawned >= count) break;
      }
    }

    function stepSparks(dt: number) {
      const gravity = 15.5;
      for (const sp of SPARK_POOL) {
        if (!sp.active) continue;
        sp.age += dt;
        const progress = sp.age / sp.maxAge;
        if (progress >= 1.0) {
          sp.active = false;
          sp.mesh.visible = false;
          continue;
        }

        sp.vy -= gravity * dt;
        sp.vx *= 1.0 - 1.5 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;

        sp.mesh.rotation.z = Math.atan2(sp.vy, sp.vx) - Math.PI * 0.5;
        sp.mesh.scale.setScalar(sp.scale * (1.0 - 0.55 * progress));
        sp.mesh.material.uniforms.uLife.value = progress;
      }
    }

    /* ---------- Soft Billowing FBM Forge Steam (Zero Top Clipping, Zero Hard Circles) ---------- */
    const steamGroup = new THREE.Group();
    scene.add(steamGroup);

    const steamPlaneGeo = new THREE.PlaneGeometry(1.45, 1.45);
    interface SteamPuff {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
      active: boolean;
      age: number;
      maxAge: number;
      vx: number;
      vy: number;
      swayFreq: number;
      swayAmp: number;
      seed: number;
      baseScale: number;
    }
    const STEAM_PUFFS: SteamPuff[] = [];

    function makeSteamMaterial(seedVal: number) {
      return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uLife: { value: 0.0 },
          uSeed: { value: seedVal },
          uHeat: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: `
          #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
          #else
            precision mediump float;
          #endif
          varying vec2 vUv;
          varying vec3 vWorldPos;
          uniform float uLife;
          uniform float uSeed;
          uniform float uHeat;

          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          float valueNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float amp = 0.5;
            mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
            for (int i = 0; i < 4; i++) {
              v += amp * valueNoise(p);
              p = rot * p * 2.02 + vec2(11.3, 7.9);
              amp *= 0.5;
            }
            return v;
          }

          void main() {
            // World-space top ceiling fade so steam ALWAYS dissolves smoothly before canvas top edge
            float topSafeFade = smoothstep(2.15, 1.15, vWorldPos.y);
            if (topSafeFade <= 0.001) discard;

            vec2 p = vUv * 2.0 - 1.0;
            float flow = uLife * 1.9 + uSeed * 5.7;

            // Domain-warped FBM cloud puff (organic irregular silhouette, never a circle or stripe)
            vec2 q = vec2(
              fbm(p * 1.7 + vec2(uSeed, -flow * 0.75)),
              fbm(p * 1.7 + vec2(uSeed + 4.1, -flow * 0.95))
            );
            vec2 r = p + (q - 0.5) * 1.15;

            float dist = length(r * vec2(1.05, 1.15));
            float cloudDetail = fbm(r * 2.8 - vec2(0.0, flow * 1.2));

            // Soft feathered vapor mask that stays strictly inside the quad boundary (dist < 0.95)
            float mask = smoothstep(0.95, 0.15, dist + (0.45 - cloudDetail) * 0.55);
            float lifeFade = sin(clamp(uLife, 0.0, 1.0) * 3.14159);
            float erode = smoothstep(uLife * 0.42, 0.88, mask * (0.55 + 0.65 * cloudDetail));

            float alpha = erode * lifeFade * topSafeFade * 0.52;
            if (alpha <= 0.01) discard;

            vec3 warmGlow = vec3(1.00, 0.70, 0.78);
            vec3 vaporMid = vec3(0.84, 0.87, 0.93);
            vec3 vaporHi  = vec3(0.97, 0.98, 1.00);

            float warmth = uHeat * (1.0 - clamp(uLife * 1.3, 0.0, 1.0)) * 0.75;
            vec3 col = mix(mix(vaporMid, warmGlow, warmth), vaporHi, cloudDetail * 0.75);

            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.58));
          }`
      });
    }

    for (let i = 0; i < 14; i++) {
      const seed = rnd(0.1, 9.9);
      const mat = makeSteamMaterial(seed);
      const puff = new THREE.Mesh(steamPlaneGeo, mat);
      puff.visible = false;
      steamGroup.add(puff);
      STEAM_PUFFS.push({
        mesh: puff,
        active: false,
        age: 0,
        maxAge: 1.5,
        vx: 0,
        vy: 0,
        swayFreq: rnd(2.0, 3.6),
        swayAmp: rnd(0.18, 0.42),
        seed,
        baseScale: 1
      });
    }

    let steamSpawnTimer = 0;
    function spawnSteamPuff() {
      const p = STEAM_PUFFS.find((x) => !x.active);
      if (!p) return;
      p.active = true;
      p.age = 0;
      p.maxAge = rnd(1.05, 1.55);
      const spawnX = rootGroup.position.x + rnd(-1.65, 1.65);
      const spawnY = rootGroup.position.y + rnd(0.55, 0.90);
      const spawnZ = rnd(0.15, 0.55);
      p.mesh.position.set(spawnX, spawnY, spawnZ);
      p.vx = rnd(-0.22, 0.22);
      p.vy = rnd(0.75, 1.15);
      p.swayFreq = rnd(2.0, 3.6);
      p.swayAmp = rnd(0.18, 0.42);
      p.seed = rnd(0.1, 9.9);
      p.baseScale = rnd(0.65, 1.05);
      p.mesh.material.uniforms.uSeed.value = p.seed;
      p.mesh.material.uniforms.uLife.value = 0.0;
      p.mesh.material.uniforms.uHeat.value = HOVER.anvilHeat;
      p.mesh.scale.setScalar(p.baseScale * 0.55);
      p.mesh.rotation.set(0, 0, rnd(0, Math.PI * 2));
      p.mesh.visible = true;
    }

    function stepSteam(dt: number, shouldEmit: boolean) {
      if (shouldEmit) {
        steamSpawnTimer -= dt;
        if (steamSpawnTimer <= 0) {
          spawnSteamPuff();
          steamSpawnTimer = rnd(0.10, 0.18);
        }
      }
      for (const p of STEAM_PUFFS) {
        if (!p.active) continue;
        p.age += dt;
        const progress = p.age / p.maxAge;
        if (progress >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
        const sway = Math.sin(p.age * p.swayFreq + p.seed) * p.swayAmp;
        p.mesh.position.x += (p.vx + sway) * dt;
        p.mesh.position.y += p.vy * (1.0 - 0.30 * progress) * dt;
        p.mesh.rotation.z += sway * 0.25 * dt;

        const sc = p.baseScale * (0.55 + 0.85 * Math.pow(progress, 0.8));
        p.mesh.scale.setScalar(sc);
        p.mesh.material.uniforms.uLife.value = progress;
        p.mesh.material.uniforms.uHeat.value = HOVER.anvilHeat;
      }
    }

    /* Continuous Organic Drift + Floating Breath */
    const makeNoise = () => {
      const g = Array.from({ length: 256 }, () => rnd(-1, 1));
      const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
      return (x: number) => {
        const i = Math.floor(x);
        const f = x - i;
        const u = fade(f);
        const a = g[i & 255] * f;
        const b = g[(i + 1) & 255] * (f - 1);
        return (a + (b - a) * u) * 2;
      };
    };

    const chan = (amp: number, hz: number) => ({
      v: 0,
      amp,
      hz: hz * rnd(0.85, 1.2),
      off: rnd(0, 500),
      n1: makeNoise(),
      n2: makeNoise(),
      nm: makeNoise()
    });

    const MOTION = {
      ry: chan(0.68, 0.11),
      rx: chan(0.20, 0.15),
      rz: chan(0.09, 0.19),
      px: chan(0.22, 0.09),
      py: chan(0.26, 0.14)
    };

    const HOVER = {
      tx: 0, ty: 0,
      x: 0, y: 0,
      vx: 0, vy: 0,
      influence: 0,
      smoothedInfluence: 0,
      energy: 0,
      lastPx: 0,
      lastPy: 0,
      clickPosY: 0,
      clickVelY: 0,
      clickRotZ: 0,
      clickVelRotZ: 0,
      clickPitch: 0,
      clickVelPitch: 0,
      clickYaw: 0,
      clickVelYaw: 0,
      clickComboIndex: 0,
      clickMeter: 0,
      lastClickTime: -999,
      rodOpacity: 0,
      rodEmission: 0,
      anvilHeat: 0,
      steaming: false
    };

    const start = performance.now();
    let virtualAnimTime = 0;

    const SHINE = {
      on: false,
      t0: 0,
      dur: 0.95,
      next: rnd(1.8, 3.5),
      cooldownUntil: 0
    };

    function triggerShineSweep(dx: number, dy: number, dur: number) {
      if (settingsRef.current.logoPeriodicShine === false) return;
      const now = (performance.now() - start) / 1000;
      SHINE.on = true;
      SHINE.t0 = now;
      SHINE.dur = dur;
      SHINE.cooldownUntil = now + dur + rnd(2.2, 4.0);
      SHINE.next = now + rnd(2.8, 5.2);

      const angle = Math.atan2(dy || 0.5, dx || 0.8);
      const sweepAngle = angle * 0.5 + 0.65;
      const flip = dx >= 0 ? 1 : -1;
      material.uniforms.uAxis.value.set(Math.cos(sweepAngle) * flip, Math.sin(sweepAngle));
    }

    triggerThemeShineRef.current = () => triggerShineSweep(1, 0.5, 0.95);

    function triggerInteractiveShine(dx: number, dy: number) {
      if (settingsRef.current.logoPeriodicShine === false) return;
      const now = (performance.now() - start) / 1000;
      if (SHINE.on || now < SHINE.cooldownUntil) return;
      if (HOVER.energy < 0.75) return;
      HOVER.energy = 0;
      triggerShineSweep(dx, dy, rnd(0.80, 1.05));
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!canvas) return;
      const cfg = settingsRef.current;
      const reactMode = cfg.logoCursorReact ?? 'sidebar';

      if (reactMode === 'off') {
        HOVER.tx = 0;
        HOVER.ty = 0;
        HOVER.influence = 0;
        return;
      }

      const sens = cfg.logoCursorSensitivity ?? 0.4;
      const hoverContainer = (canvas.closest('.sidebar-brand') || canvas.parentElement || canvas) as HTMLElement;
      const hoverRect = hoverContainer.getBoundingClientRect();
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const halfW = Math.max(hoverRect.width * 0.5, 1);
      const halfH = Math.max(hoverRect.height * 0.5, 1);

      const rawX = (e.clientX - cx) / halfW;
      const rawY = (e.clientY - cy) / halfH;
      const dist = Math.hypot(rawX, rawY);

      const isDirectlyOverLogo =
        e.clientX >= hoverRect.left &&
        e.clientX <= hoverRect.right &&
        e.clientY >= hoverRect.top &&
        e.clientY <= hoverRect.bottom;

      if (reactMode === 'direct' || reactMode === 'sidebar') {
        if (!isDirectlyOverLogo) {
          HOVER.tx = 0;
          HOVER.ty = 0;
          HOVER.influence = 0;
          return;
        }
        const nearFalloff = Math.exp(-dist * dist * 0.28);
        const nearDirX = rawX / Math.max(1.0, dist * 0.65);
        const nearDirY = rawY / Math.max(1.0, dist * 0.65);
        HOVER.influence = nearFalloff;
        HOVER.ty = nearDirX * 0.56 * nearFalloff * sens;
        HOVER.tx = nearDirY * 0.36 * nearFalloff * sens;
      } else {
        const nearFalloff = Math.exp(-dist * dist * 0.28);
        const nearDirX = rawX / Math.max(1.0, dist * 0.65);
        const nearDirY = rawY / Math.max(1.0, dist * 0.65);
        const winW = Math.max(window.innerWidth, 1);
        const winH = Math.max(window.innerHeight, 1);
        const normWinX = Math.max(-1.2, Math.min(1.2, (e.clientX - cx) / (winW * 0.65)));
        const normWinY = Math.max(-1.2, Math.min(1.2, (e.clientY - cy) / (winH * 0.65)));
        const globalGaze = 0.26;

        HOVER.influence = Math.max(nearFalloff, globalGaze);
        HOVER.ty =
          (nearDirX * 0.52 * nearFalloff + normWinX * 0.24 * (1.0 - nearFalloff * 0.65)) * sens;
        HOVER.tx =
          (nearDirY * 0.34 * nearFalloff + normWinY * 0.17 * (1.0 - nearFalloff * 0.65)) * sens;
      }

      const dx = rawX - HOVER.lastPx;
      const dy = rawY - HOVER.lastPy;
      const stepDist = Math.hypot(dx, dy);

      if (stepDist > 0.006 && HOVER.influence > 0.20) {
        HOVER.energy = Math.min(1.5, HOVER.energy + stepDist * 1.15 * HOVER.influence);
        if (stepDist * HOVER.influence > 0.065) {
          triggerInteractiveShine(dx, dy);
        }
      }

      HOVER.lastPx = rawX;
      HOVER.lastPy = rawY;
    };

    const handleWindowLeave = () => {
      HOVER.tx = 0;
      HOVER.ty = 0;
      HOVER.influence = 0;
    };

    const handleCanvasPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      if (settingsRef.current.logoInteractiveClick === false) return;
      const hitLocal = getFastAnvilClickPoint(e.clientX, e.clientY);
      if (!hitLocal) return;

      const now = (performance.now() - start) / 1000;
      HOVER.lastClickTime = now;
      HOVER.clickMeter = Math.min(14.0, HOVER.clickMeter + 1.0);
      HOVER.clickComboIndex += 1;

      spawnClickSparks(hitLocal, HOVER.clickMeter);

      // Vary the angle offset on every click using golden-angle stepping + random jitter
      // so consecutive clicks bounce in fresh 3D directions instead of repeating one angle!
      const goldenStep = HOVER.clickComboIndex * 2.39996 + rnd(-0.45, 0.45);
      const dirX = Math.cos(goldenStep);
      const dirY = Math.sin(goldenStep);

      const intensity = 0.42 + 0.58 * Math.min(1.0, HOVER.clickMeter / 11.0);
      HOVER.clickVelY -= (0.95 + 1.15 * intensity) * (0.75 + 0.25 * Math.abs(dirY));
      HOVER.clickVelRotZ += dirX * (0.85 + 1.25 * intensity);
      HOVER.clickVelPitch += (dirY * 0.65 + 0.45) * (0.75 + 1.05 * intensity);
      HOVER.clickVelYaw += -dirX * (0.70 + 1.10 * intensity);

      if (HOVER.clickMeter >= 10.5) {
        spawnSteamPuff();
      }
    };

    const hoverContainer = (canvas.closest('.sidebar-brand') || canvas.parentElement || canvas) as HTMLElement;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleWindowLeave);
    window.addEventListener('blur', handleWindowLeave);
    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    hoverContainer.addEventListener('pointerdown', handleCanvasPointerDown);

    let gainNow = 1;
    let lastWallS = 0;

    function stepMotion(wallS: number) {
      const dt = Math.max(0.001, Math.min(wallS - lastWallS, 0.05));
      lastWallS = wallS;

      const cfg = settingsRef.current;
      const speedMult = cfg.logoSpeed ?? 0.05;
      const idleWiggle = cfg.logoWiggle ?? 0.0;

      virtualAnimTime += dt * speedMult;
      const s = virtualAnimTime;

      HOVER.smoothedInfluence +=
        (HOVER.influence - HOVER.smoothedInfluence) * (1 - Math.exp(-8.0 * dt));

      const activeMotionScale = Math.max(idleWiggle, HOVER.smoothedInfluence * 0.25);

      for (const c of Object.values(MOTION)) {
        const x = s * c.hz + c.off;
        c.v =
          c.amp *
          activeMotionScale *
          (0.85 + 0.3 * c.nm(x * 0.2)) *
          (c.n1(x) + 0.3 * c.n2(x * 2.7));
      }
      MOTION.rz.v -= MOTION.ry.v * 0.10;
      MOTION.px.v += MOTION.ry.v * 0.12;
      MOTION.py.v += MOTION.rx.v * 0.15;

      const breathMain = Math.sin(s * 2.05) * activeMotionScale;
      const floatY = 0.24 * breathMain + MOTION.py.v;
      const floatX = MOTION.px.v;
      const breathPitch = 0.055 * Math.cos(s * 2.05 - 0.4) * activeMotionScale;
      const breathScale = 1.0 + 0.022 * breathMain;

      const timeSinceClick = wallS - HOVER.lastClickTime;
      if (timeSinceClick > 0.65) {
        const coolRate = HOVER.clickMeter >= 10.5 ? 3.5 : 2.8;
        HOVER.clickMeter = Math.max(0, HOVER.clickMeter - dt * coolRate);
      }

      const m = cfg.logoInteractiveClick === false ? 0 : HOVER.clickMeter;
      // Fast, snappy blush transition so rods never linger half-transparent
      const targetOpacity = m >= 5.0 ? Math.min(1.0, (m - 4.8) / 0.6) : 0.0;
      const targetEmission =
        m >= 5.0
          ? 0.45 + 0.90 * Math.pow(Math.min(1.0, Math.max(0.0, (m - 5.0) / 5.5)), 1.05)
          : 0.0;
      const targetHeat = m >= 7.5 ? Math.min(1.0, (m - 7.5) / 3.5) : 0.0;
      HOVER.steaming = m >= 10.5;

      const opRate = targetOpacity < HOVER.rodOpacity ? 22.0 : 18.0;
      const emRate = targetEmission < HOVER.rodEmission ? 18.0 : 14.0;
      const heatRate = targetHeat < HOVER.anvilHeat ? 6.5 : 4.2;

      HOVER.rodOpacity += (targetOpacity - HOVER.rodOpacity) * (1 - Math.exp(-opRate * dt));
      HOVER.rodEmission += (targetEmission - HOVER.rodEmission) * (1 - Math.exp(-emRate * dt));
      HOVER.anvilHeat += (targetHeat - HOVER.anvilHeat) * (1 - Math.exp(-heatRate * dt));

      blushGroup.visible = HOVER.rodOpacity > 0.02;
      // Subtle scale pop on the blush group so it pops in/out cleanly
      const blushPopScale = 0.86 + 0.14 * HOVER.rodOpacity;
      blushGroup.scale.setScalar(blushPopScale);

      const emissionPulse = HOVER.rodEmission * (0.93 + 0.07 * Math.sin(wallS * 7.0));

      blushMaterial.uniforms.uOpacity.value = HOVER.rodOpacity;
      blushMaterial.uniforms.uEmission.value = emissionPulse;
      material.uniforms.uBlush.value = emissionPulse * HOVER.rodOpacity;
      material.uniforms.uHeat.value = HOVER.anvilHeat;

      material.uniforms.uSparkLight.value = Math.max(
        0.0,
        material.uniforms.uSparkLight.value - dt * 5.5
      );

      stepSteam(dt, HOVER.steaming);
      stepSparks(dt);

      HOVER.clickVelY += (-HOVER.clickPosY * 65.0 - HOVER.clickVelY * 10.5) * dt;
      HOVER.clickPosY += HOVER.clickVelY * dt;
      HOVER.clickPosY = Math.max(-0.32, HOVER.clickPosY);

      HOVER.clickVelRotZ += (-HOVER.clickRotZ * 58.0 - HOVER.clickVelRotZ * 9.5) * dt;
      HOVER.clickRotZ += HOVER.clickVelRotZ * dt;

      HOVER.clickVelPitch += (-HOVER.clickPitch * 60.0 - HOVER.clickVelPitch * 10.0) * dt;
      HOVER.clickPitch += HOVER.clickVelPitch * dt;

      HOVER.clickVelYaw += (-HOVER.clickYaw * 56.0 - HOVER.clickVelYaw * 9.2) * dt;
      HOVER.clickYaw += HOVER.clickVelYaw * dt;

      const stiffness = 28.0;
      const damping = 8.5;
      HOVER.vx += ((HOVER.tx - HOVER.x) * stiffness - HOVER.vx * damping) * dt;
      HOVER.vy += ((HOVER.ty - HOVER.y) * stiffness - HOVER.vy * damping) * dt;
      HOVER.x += HOVER.vx * dt;
      HOVER.y += HOVER.vy * dt;
      HOVER.energy = Math.max(0, HOVER.energy - dt * 1.15);

      const bankZ = -HOVER.y * 0.14;
      const rotX = MOTION.rx.v + breathPitch + HOVER.x + HOVER.clickPitch;
      const rotY = MOTION.ry.v + HOVER.y + HOVER.clickYaw;
      const rotZ = MOTION.rz.v + bankZ + HOVER.clickRotZ;

      rootGroup.rotation.set(rotX, rotY, rotZ);
      rootGroup.position.set(
        floatX + HOVER.y * 0.22,
        floatY - HOVER.x * 0.18 + HOVER.clickPosY - 0.14,
        0
      );
      rootGroup.scale.setScalar(breathScale);

      const tiltMag = Math.hypot(rotX, rotY, rotZ);
      const activity = Math.min(1.0, Math.max(HOVER.smoothedInfluence, tiltMag * 4.5, idleWiggle));
      material.uniforms.uFlatness.value = 1.0 - activity;
    }

    const L = {
      a: rnd(0, 6.28), b: rnd(0, 6.28), c: rnd(0, 6.28),
      s1: rnd(0.05, 0.09), s2: rnd(0.09, 0.14), s3: rnd(0.07, 0.11)
    };

    function stepLight() {
      const s = virtualAnimTime;
      const idleWiggle = settingsRef.current.logoWiggle ?? 0.0;
      const lightMotion = Math.max(idleWiggle, HOVER.smoothedInfluence);

      const az = 0.20 + (0.45 * Math.sin(s * L.s1 + L.a) + 0.25 * Math.sin(s * L.s2 + L.b)) * lightMotion;
      const el = 0.78 + (0.18 * Math.sin(s * L.s3 + L.c) + 0.08 * Math.sin(s * 2.05)) * lightMotion;
      const azA = az + rootGroup.rotation.y * 0.75 - HOVER.y * 0.55;
      const elA = el - rootGroup.rotation.x * 0.75 + HOVER.x * 0.45;

      material.uniforms.uLight.value.set(
        Math.sin(azA) * Math.cos(elA),
        Math.sin(elA),
        Math.cos(azA) * Math.cos(elA)
      );
      blushMaterial.uniforms.uLight.value.copy(material.uniforms.uLight.value);

      const facing = Math.max(0, Math.cos(rootGroup.rotation.y) * Math.cos(rootGroup.rotation.x));
      gainNow += (1.02 + 0.28 * (1 - facing) - gainNow) * 0.06;
      material.uniforms.uGain.value = gainNow;
    }

    function stepShine(wallS: number) {
      if (settingsRef.current.logoPeriodicShine === false) {
        SHINE.on = false;
        material.uniforms.uShine.value = -1;
        return;
      }

      if (!SHINE.on && wallS >= SHINE.next && wallS >= SHINE.cooldownUntil) {
        const a = rnd(0.45, 1.15);
        const flip = Math.random() < 0.5 ? -1 : 1;
        triggerShineSweep(Math.cos(a) * flip, Math.sin(a), rnd(0.85, 1.15));
      }

      if (SHINE.on) {
        const p = (wallS - SHINE.t0) / SHINE.dur;
        if (p >= 1) {
          SHINE.on = false;
          SHINE.next = wallS + rnd(2.8, 5.2);
          material.uniforms.uShine.value = -1;
        } else {
          material.uniforms.uShine.value = p * p * (3 - 2 * p);
        }
      }
    }

    const cur = {
      s: [...targetColorsRef.current.shadow],
      h: [...targetColorsRef.current.highlight],
      lm: targetColorsRef.current.lightMode
    };

    let rafId: number | null = null;
    let contextLost = false;
    let disposed = false;

    function frame() {
      if (disposed || contextLost || document.hidden) return;
      const wallS = (performance.now() - start) / 1000;
      const cfg = settingsRef.current;

      const desiredResH = cfg.logoResolution || 256;
      if (desiredResH !== currentResH) {
        currentResH = desiredResH;
        renderer.setSize(Math.round(desiredResH * ASPECT), desiredResH, false);
      }

      material.uniforms.uDitherMode.value = mapDitherStyleToInt(cfg.logoDitherStyle);
      material.uniforms.uSteps.value = cfg.logoColorSteps ?? 16;
      material.uniforms.uDitherStrength.value = cfg.logoDitherStrength ?? 2.0;

      stepMotion(wallS);
      stepLight();
      stepShine(wallS);

      const tgt = targetColorsRef.current;
      for (let i = 0; i < 3; i++) {
        cur.s[i] += (tgt.shadow[i] - cur.s[i]) * 0.08;
        cur.h[i] += (tgt.highlight[i] - cur.h[i]) * 0.08;
      }
      cur.lm += (tgt.lightMode - cur.lm) * 0.08;
      material.uniforms.uShadow.value.set(cur.s[0], cur.s[1], cur.s[2]);
      material.uniforms.uHighlight.value.set(cur.h[0], cur.h[1], cur.h[2]);
      material.uniforms.uLightMode.value = cur.lm;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handleContextRestored = () => {
      contextLost = false;
      if (!disposed && rafId === null) {
        frame();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!contextLost && !disposed && rafId === null) {
        lastWallS = (performance.now() - start) / 1000;
        frame();
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    frame();

    return () => {
      disposed = true;
      triggerThemeShineRef.current = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleWindowLeave);
      window.removeEventListener('blur', handleWindowLeave);
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      hoverContainer.removeEventListener('pointerdown', handleCanvasPointerDown);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      geo.dispose();
      material.dispose();
      blushMaterial.dispose();
      slashDisposableGeos.forEach((g) => g.dispose());
      sparkGeo.dispose();
      SPARK_POOL.forEach((sp) => sp.mesh.material.dispose());
      steamPlaneGeo.dispose();
      STEAM_PUFFS.forEach((st) => st.mesh.material.dispose());
      renderer.dispose();
    };
  }, [useAntialias, is2DMode]);

  const widthPx = size;
  const heightPx = Math.round(size / 1.55);

  const sharpnessMode = logoCfg.logoSharpness ?? 'smooth';
  const imageRenderingStyle: React.CSSProperties['imageRendering'] =
    sharpnessMode === 'smooth'
      ? 'auto'
      : sharpnessMode === 'crisp'
      ? 'crisp-edges'
      : 'pixelated';

  const [imgFailed, setImgFailed] = useState(false);

  if (is2DMode) {
    const isLightTheme = activeTheme === 'light_pro';
    const fallback = isLightTheme
      ? `${BASE}assets/themes/light_pro.webp`
      : `${BASE}assets/themes/dark.webp`;
    const themeLogo = THEME_LOGO_MAP[activeTheme] || fallback;

    // The 3D canvas mark renders the anvil silhouette at ~71.8% of widthPx (~201px wide at size=280).
    // In theme WebP assets:
    // - Dark themes have ~92.7% visible anvil width (1186 / 1280).
    // - Light theme has ~82.3% visible anvil width (1053 / 1280).
    // Sizing imgWidth directly by the visible anvil content ratio matches the 3D mark 1:1.
    const targetVisibleWidth = widthPx * 0.718;
    const imgWidth = Math.round(
      isLightTheme ? targetVisibleWidth / 0.8227 : targetVisibleWidth / 0.9266
    );
    // In 3D mode, camera position & rootGroup.position.y put the anvil resting ~6% lower than center.
    const offsetY = Math.round(heightPx * 0.06);

    return (
      <div
        className={`df-anvil-2d-logo sharpness-${sharpnessMode} ${className}`.trim()}
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        {imgFailed ? (
          <svg
            viewBox="-3.1 -1.7 6.2 3.4"
            aria-label="DitherForge"
            style={{
              width: `${Math.round(targetVisibleWidth)}px`,
              height: 'auto',
              display: 'block',
              transform: `translateY(${offsetY}px)`
            }}
          >
            <polygon points={ANVIL_SVG_POINTS} fill="var(--accent-primary, #dedede)" />
          </svg>
        ) : (
          <img
            key={themeLogo}
            src={themeLogo}
            alt="DitherForge"
            draggable={false}
            onError={() => setImgFailed(true)}
            style={{
              width: `${imgWidth}px`,
              height: 'auto',
              display: 'block',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'none',
              imageRendering: imageRenderingStyle,
              transform: `translateY(${offsetY}px)`
            }}
          />
        )}
      </div>
    );
  }

  const resH = logoCfg.logoResolution || 256;
  const resW = Math.round(resH * 1.55);

  return (
    <canvas
      ref={canvasRef}
      width={resW}
      height={resH}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`df-anvil-3d-logo sharpness-${sharpnessMode} ${className}`.trim()}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        cursor: logoCfg.logoInteractiveClick !== false ? 'pointer' : 'default',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        imageRendering: imageRenderingStyle,
        display: 'block'
      }}
    />
  );
};
