import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
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
  -0.231,0.129,-0.192,0.067,-0.173,0.024,-0.156,-0.021,-0.142,-0.083,-0.142,-0.100,-0.139,-0.113,-0.139,
  -0.198,-0.150,-0.260,-0.159,-0.296,-0.173,-0.333,-0.202,-0.390,-0.225,-0.427,-0.250,-0.459,-0.301,-0.509,
  -0.931,-0.996,-0.977,-1.039,-1.020,-1.093,-1.033,-1.112,-1.056,-1.155,-1.079,-1.210,-1.092,-1.259,-1.099,
  -1.298,-1.102,-1.370,-1.099,-1.396,-1.092,-1.426,-1.075,-1.465,-1.052,-1.499,-1.019,-1.532,-0.996,-1.547,
  -0.947,-1.570,-0.915,-1.577,-0.892,-1.578,-0.879,-1.581,-0.291,-1.581,-0.274,-1.578,-0.219,-1.577,-0.209,
  -1.575,-0.183,-1.574,-0.160,-1.571,-0.105,-1.561,-0.059,-1.551,-0.003,-1.534,0.059,-1.511,0.114,-1.487,
  0.173,-1.456,0.284,-1.393,0.356,-1.356,0.408,-1.334,0.464,-1.314,0.536,-1.294,0.640,-1.274,0.692,-1.270,
  0.706,-1.267,0.820,-1.267,0.836,-1.270,0.862,-1.271,0.875,-1.274,0.892,-1.274,0.983,-1.291,1.049,-1.308,
  1.107,-1.327,1.166,-1.352,1.274,-1.405,1.512,-1.531,1.542,-1.544,1.591,-1.560,1.617,-1.567,1.679,-1.577,
  1.718,-1.578,1.735,-1.581,2.117,-1.580
];

const DEPTH = 1.1;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface LogoThemeColors {
  shadow: [number, number, number];
  highlight: [number, number, number];
  lightMode: number;
}

const LOGO_THEMES: Record<string, LogoThemeColors> = {
  obsidian:  { shadow: [0.34, 0.35, 0.45], highlight: [0.96, 0.98, 1.00], lightMode: 0.0 },
  light_pro: { shadow: [0.58, 0.64, 0.73], highlight: [0.85, 0.89, 0.95], lightMode: 1.0 },
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

function smoothWalls(g: THREE.BufferGeometry) {
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
    const f = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
    const cap = Math.abs(f.z) > 0.85;
    tris.push({ f, cap });
    if (!cap) {
      for (const k of [key(i), key(i + 1), key(i + 2)]) {
        if (!acc.has(k)) acc.set(k, new THREE.Vector3());
        acc.get(k)!.add(f);
      }
    }
  }

  for (let i = 0; i < p.count; i++) {
    const tri = tris[Math.floor(i / 3)];
    let n: THREE.Vector3;
    if (tri.cap) {
      n = tri.f;
    } else {
      n = acc.get(key(i)) || tri.f;
      n = n.length() > 1e-9 ? n.normalize() : new THREE.Vector3(0, 0, 1);
    }
    out[i * 3] = n.x;
    out[i * 3 + 1] = n.y;
    out[i * 3 + 2] = n.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}

/* Module-level precomputed geometry: built once at module evaluation so component mount is 0ms */
const SHARED_ANVIL_GEO: THREE.BufferGeometry = (() => {
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
  smoothWalls(geo);
  return geo;
})();

/* Module-level constant shader sources */
const MAIN_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vec4 vp = modelViewMatrix * vec4(position, 1.0);
    vViewPos = vp.xyz;
    gl_Position = projectionMatrix * vp;
  }
`;

const MAIN_FRAGMENT_SHADER = `
  uniform vec3  uShadow;
  uniform vec3  uHighlight;
  uniform float uLightMode;
  uniform int   uDitherMode;
  uniform float uSteps;
  uniform float uDitherStrength;
  uniform vec3  uLight;
  uniform float uShine;
  uniform float uShineW;
  uniform vec2  uAxis;
  uniform float uShinePos;
  uniform float uShine2Pos;
  uniform float uSparkTime;
  uniform vec3  uSparkPos;
  uniform float uBlush;
  uniform float uSteamTime;

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec3  vViewPos;

  float bayer4(vec2 p) {
    ivec2 ip = ivec2(mod(p, 4.0));
    int idx = ip.x + ip.y * 4;
    if (idx == 0) return 0.0 / 16.0;
    if (idx == 1) return 8.0 / 16.0;
    if (idx == 2) return 2.0 / 16.0;
    if (idx == 3) return 10.0 / 16.0;
    if (idx == 4) return 12.0 / 16.0;
    if (idx == 5) return 4.0 / 16.0;
    if (idx == 6) return 14.0 / 16.0;
    if (idx == 7) return 6.0 / 16.0;
    if (idx == 8) return 3.0 / 16.0;
    if (idx == 9) return 11.0 / 16.0;
    if (idx == 10) return 1.0 / 16.0;
    if (idx == 11) return 9.0 / 16.0;
    if (idx == 12) return 15.0 / 16.0;
    if (idx == 13) return 7.0 / 16.0;
    if (idx == 14) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  float bayer2(vec2 p) {
    ivec2 ip = ivec2(mod(p, 2.0));
    int idx = ip.x + ip.y * 2;
    if (idx == 0) return 0.0 / 4.0;
    if (idx == 1) return 2.0 / 4.0;
    if (idx == 2) return 3.0 / 4.0;
    return 1.0 / 4.0;
  }

  float bayer8(vec2 p) {
    return (bayer4(p) * 4.0 + bayer2(floor(p / 4.0))) / 16.0;
  }

  float halftoneDither(vec2 p) {
    vec2 c = fract(p / 4.0) - 0.5;
    return clamp(length(c) * 1.6, 0.0, 1.0);
  }

  float scanlineDither(vec2 p) {
    return mod(floor(p.y), 2.0) == 0.0 ? 0.25 : 0.75;
  }

  float checkerDither(vec2 p) {
    ivec2 ip = ivec2(mod(p, 2.0));
    return float(ip.x ^ ip.y);
  }

  float getDitherThreshold(vec2 fragCoord) {
    if (uDitherMode == 0) return 0.5;
    if (uDitherMode == 1) return bayer2(fragCoord);
    if (uDitherMode == 2) return bayer4(fragCoord);
    if (uDitherMode == 3) return bayer8(fragCoord);
    if (uDitherMode == 4) return halftoneDither(fragCoord);
    if (uDitherMode == 5) return scanlineDither(fragCoord);
    if (uDitherMode == 6) return checkerDither(fragCoord);
    return bayer4(fragCoord);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLight);
    vec3 V = normalize(-vViewPos);

    float diff = max(dot(N, L), 0.0);
    float hemi = N.y * 0.16 + 0.84;
    float baseLight = mix(diff * 0.82 + 0.18, diff * 0.7 + 0.3 * hemi, 0.4);

    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 32.0);

    float d = dot(vWorldPos.xy, uAxis);
    float s1 = smoothstep(uShineW, 0.0, abs(d - uShinePos));
    float s2 = smoothstep(uShineW * 0.55, 0.0, abs(d - uShine2Pos)) * 0.75;
    float shineTotal = (s1 + s2) * uShine;

    float dSpk = length(vWorldPos - uSparkPos);
    float spk = 0.0;
    if (uSparkTime >= 0.0 && uSparkTime < 0.6) {
      float fade = 1.0 - uSparkTime / 0.6;
      float pulse = sin(uSparkTime * 20.0) * 0.5 + 0.5;
      spk = smoothstep(0.9, 0.0, dSpk) * fade * pulse * 2.2;
    }

    float lit = baseLight + spec * 0.45 + shineTotal * 0.85 + spk;

    vec3 col;
    if (uDitherMode == 0) {
      float quant = floor(lit * uSteps) / (uSteps - 1.0);
      col = mix(uShadow, uHighlight, clamp(quant, 0.0, 1.0));
    } else {
      float thr = getDitherThreshold(gl_FragCoord.xy) - 0.5;
      float stepped = (lit + thr * (uDitherStrength / uSteps)) * uSteps;
      float q = clamp(floor(stepped) / (uSteps - 1.0), 0.0, 1.0);
      col = mix(uShadow, uHighlight, q);
    }

    if (uBlush > 0.001) {
      float b1 = smoothstep(0.42, 0.0, length(vWorldPos.xy - vec2( 0.7, -0.15)));
      float b2 = smoothstep(0.42, 0.0, length(vWorldPos.xy - vec2(-0.7, -0.15)));
      vec3 blushCol = vec3(1.0, 0.32, 0.52);
      col = mix(col, blushCol, (b1 + b2) * uBlush * 0.75);
    }

    if (shineTotal > 0.01) {
      vec3 glint = mix(vec3(1.0), uHighlight, 0.3);
      col = mix(col, glint, shineTotal * 0.65);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const BLUSH_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLUSH_FRAGMENT_SHADER = `
  uniform float uAlpha;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    float pattern = step(0.3, fract((vUv.x + vUv.y) * 4.0));
    float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                   * smoothstep(0.0, 0.2,  vUv.y) * smoothstep(1.0, 0.8,  vUv.y);
    float a = pattern * edgeFade * uAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;

const SPARK_VERTEX_SHADER = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SPARK_FRAGMENT_SHADER = `
  uniform float uAlpha;
  uniform vec3  uColor;
  void main() {
    gl_FragColor = vec4(uColor, uAlpha);
  }
`;

const STEAM_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STEAM_FRAGMENT_SHADER = `
  uniform float uAlpha;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    float dist = length(vUv - 0.5);
    float a = smoothstep(0.48, 0.05, dist) * uAlpha * 0.42;
    gl_FragColor = vec4(uColor, a);
  }
`;

export const Logo: React.FC<LogoProps> = ({ size = 280, className = '' }) => {
  const tMount = performance.now();
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

  const is2DMode = false; // 3D logo is the only logo representation per strict user requirement
  const useAntialias = (logoCfg.logoSharpness ?? 'smooth') === 'smooth';

  useLayoutEffect(() => {
    if (is2DMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tLayoutStart = performance.now();
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
    const tRendererInit = performance.now();

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

    /* Reuse module-level precomputed geometry (0ms mount overhead) */
    const geo = SHARED_ANVIL_GEO;
    const tGeomInit = performance.now();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uShadow:         { value: new THREE.Vector3(...targetColorsRef.current.shadow) },
        uHighlight:      { value: new THREE.Vector3(...targetColorsRef.current.highlight) },
        uLightMode:      { value: targetColorsRef.current.lightMode },
        uDitherMode:     { value: mapDitherStyleToInt(settingsRef.current.logoDitherStyle) },
        uSteps:          { value: settingsRef.current.logoColorSteps ?? 16 },
        uDitherStrength: { value: settingsRef.current.logoDitherStrength ?? 2.0 },
        uLight:          { value: new THREE.Vector3(0.4, 0.75, 0.6) },
        uShine:          { value: 0.0 },
        uShineW:         { value: 0.25 },
        uAxis:           { value: new THREE.Vector2(0.8, 0.6) },
        uShinePos:       { value: -2.0 },
        uShine2Pos:      { value: -2.0 },
        uSparkTime:      { value: -100.0 },
        uSparkPos:       { value: new THREE.Vector3(0, 0, 0.8) },
        uBlush:          { value: 0.0 },
        uSteamTime:      { value: -100.0 }
      },
      vertexShader: MAIN_VERTEX_SHADER,
      fragmentShader: MAIN_FRAGMENT_SHADER
    });

    const mesh = new THREE.Mesh(geo, material);
    rootGroup.add(mesh);
    const tMatInit = performance.now();

    /* Blush overlay geometry */
    const blushGroup = new THREE.Group();
    rootGroup.add(blushGroup);

    const blushMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uAlpha:    { value: 0.0 },
        uColor:    { value: new THREE.Vector3(1.0, 0.38, 0.55) },
        uLight:    { value: new THREE.Vector3(0.4, 0.75, 0.6) }
      },
      vertexShader: BLUSH_VERTEX_SHADER,
      fragmentShader: BLUSH_FRAGMENT_SHADER
    });

    const leftCheekAnchor = new THREE.Vector2(-0.48, 0.32);
    const rightCheekAnchor = new THREE.Vector2(0.96, 0.32);
    const cheekZ = DEPTH * 0.5 + 0.19 + 0.02;
    const slashDisposableGeos: THREE.BufferGeometry[] = [];

    function makeCheekPair(baseX: number, baseY: number, mirror: boolean) {
      const slCount = 3;
      const quadW = 0.045;
      const quadH = 0.26;
      const pitch = 0.085;
      const sign = mirror ? -1 : 1;
      for (let s = 0; s < slCount; s++) {
        const planeGeo = new THREE.PlaneGeometry(quadW, quadH);
        slashDisposableGeos.push(planeGeo);
        planeGeo.rotateZ(sign * 0.52);
        const slashMesh = new THREE.Mesh(planeGeo, blushMaterial);
        slashMesh.position.set(baseX + (s - 1) * pitch, baseY, cheekZ);
        blushGroup.add(slashMesh);
      }
    }
    makeCheekPair(leftCheekAnchor.x, leftCheekAnchor.y, false);
    makeCheekPair(rightCheekAnchor.x, rightCheekAnchor.y, true);

    /* Click Spark particle pool: deferred until first click */
    const SPARK_MAX = 20;
    const sparkGroup = new THREE.Group();
    scene.add(sparkGroup);

    let sparkGeo: THREE.OctahedronGeometry | null = null;
    interface SparkParticle {
      alive: boolean;
      p: THREE.Vector3;
      v: THREE.Vector3;
      mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.ShaderMaterial>;
      birth: number;
      life: number;
    }
    const SPARK_POOL: SparkParticle[] = [];

    function initSparkPool() {
      if (SPARK_POOL.length > 0) return;
      sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
      for (let i = 0; i < SPARK_MAX; i++) {
        const sMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: {
            uAlpha: { value: 1.0 },
            uColor: { value: new THREE.Vector3(1.0, 0.94, 0.55) }
          },
          vertexShader: SPARK_VERTEX_SHADER,
          fragmentShader: SPARK_FRAGMENT_SHADER
        });
        const sMesh = new THREE.Mesh(sparkGeo, sMat);
        sMesh.visible = false;
        sparkGroup.add(sMesh);
        SPARK_POOL.push({
          alive: false,
          p: new THREE.Vector3(),
          v: new THREE.Vector3(),
          mesh: sMesh,
          birth: 0,
          life: 0.5
        });
      }
    }

    /* Steam Puffs: deferred until first rapid-click */
    const STEAM_MAX = 12;
    const steamGroup = new THREE.Group();
    scene.add(steamGroup);

    let steamPlaneGeo: THREE.PlaneGeometry | null = null;
    interface SteamPuff {
      alive: boolean;
      p: THREE.Vector3;
      v: THREE.Vector3;
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
      birth: number;
      life: number;
      initScale: number;
      rotSpeed: number;
    }
    const STEAM_PUFFS: SteamPuff[] = [];

    function initSteamPool() {
      if (STEAM_PUFFS.length > 0) return;
      steamPlaneGeo = new THREE.PlaneGeometry(1.45, 1.45);
      for (let i = 0; i < STEAM_MAX; i++) {
        const mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uAlpha: { value: 1.0 },
            uColor: { value: new THREE.Vector3(0.92, 0.95, 1.0) }
          },
          vertexShader: STEAM_VERTEX_SHADER,
          fragmentShader: STEAM_FRAGMENT_SHADER
        });
        const puff = new THREE.Mesh(steamPlaneGeo, mat);
        puff.visible = false;
        steamGroup.add(puff);
        STEAM_PUFFS.push({
          alive: false,
          p: new THREE.Vector3(),
          v: new THREE.Vector3(),
          mesh: puff,
          birth: 0,
          life: 0.9,
          initScale: 0.5,
          rotSpeed: 0
        });
      }
    }

    function isPointInAnvilPolygon(px: number, py: number): boolean {
      let inside = false;
      const len = OUTLINE.length;
      for (let i = 0, j = len - 2; i < len; i += 2) {
        const xi = OUTLINE[i];
        const yi = OUTLINE[i + 1];
        const xj = OUTLINE[j];
        const yj = OUTLINE[j + 1];
        const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
        if (intersect) inside = !inside;
        j = i;
      }
      return inside;
    }

    const localHit = new THREE.Vector3();
    function getFastAnvilClickPoint(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      const halfHeightWorld = Math.tan(THREE.MathUtils.degToRad(32 * 0.5)) * 9.4;
      const halfWidthWorld = halfHeightWorld * ASPECT;
      const worldX = ndcX * halfWidthWorld;
      const worldY = ndcY * halfHeightWorld + 0.22;

      const localX = worldX - rootGroup.position.x;
      const localY = worldY - rootGroup.position.y;

      if (!isPointInAnvilPolygon(localX, localY)) {
        return null;
      }
      localHit.set(localX, localY, DEPTH * 0.5 + 0.19);
      return localHit;
    }

    function spawnClickSparks(localOrigin: THREE.Vector3, clickMeter: number) {
      initSparkPool();
      const worldOrigin = localOrigin.clone().applyMatrix4(rootGroup.matrixWorld);
      const count = Math.min(SPARK_MAX, Math.floor(4 + clickMeter * 5));
      const now = (performance.now() - start) / 1000;

      let spawned = 0;
      for (const sp of SPARK_POOL) {
        if (!sp.alive) {
          sp.alive = true;
          sp.birth = now;
          sp.life = rnd(0.35, 0.65);
          sp.p.copy(worldOrigin);
          const angle = rnd(0, Math.PI * 2);
          const elevation = rnd(0.2, 1.2);
          const speed = rnd(2.5, 5.0) + clickMeter * 2.0;
          sp.v.set(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed * 0.5 + elevation * 1.5,
            rnd(-1, 2) * speed * 0.5
          );
          sp.mesh.visible = true;
          sp.mesh.position.copy(sp.p);
          spawned++;
          if (spawned >= count) break;
        }
      }
    }

    function spawnSteamPuffs(localOrigin: THREE.Vector3) {
      initSteamPool();
      const worldOrigin = localOrigin.clone().applyMatrix4(rootGroup.matrixWorld);
      const now = (performance.now() - start) / 1000;
      let spawned = 0;
      for (const st of STEAM_PUFFS) {
        if (!st.alive) {
          st.alive = true;
          st.birth = now;
          st.life = rnd(0.7, 1.2);
          st.p.copy(worldOrigin).add(new THREE.Vector3(rnd(-0.2, 0.2), rnd(0, 0.2), rnd(-0.2, 0.2)));
          st.v.set(rnd(-0.35, 0.35), rnd(1.1, 2.2), rnd(-0.2, 0.2));
          st.initScale = rnd(0.35, 0.65);
          st.rotSpeed = rnd(-2, 2);
          st.mesh.visible = true;
          st.mesh.position.copy(st.p);
          st.mesh.scale.setScalar(st.initScale);
          spawned++;
          if (spawned >= 3) break;
        }
      }
    }

    /* Motion & physics tracking */
    const cur = {
      rotX: 0.12,
      rotY: -0.28,
      rotZ: 0.0,
      s: [...targetColorsRef.current.shadow] as [number, number, number],
      h: [...targetColorsRef.current.highlight] as [number, number, number],
      lm: targetColorsRef.current.lightMode
    };

    const HOVER = {
      targetRotX: 0.12,
      targetRotY: -0.28,
      wiggleTime: 0,
      active: false,
      clickMeter: 0,
      clickVelY: 0,
      clickVelZ: 0,
      blushAlpha: 0,
      lastClickTime: -100
    };

    let shineActive = false;
    let shineProgress = 0;
    let nextAutoShineS = 6.0;

    triggerThemeShineRef.current = () => {
      shineActive = true;
      shineProgress = -2.2;
    };

    const hoverContainer = canvas.closest('.sidebar-brand') || canvas.parentElement || canvas;

    const handlePointerMove = (e: PointerEvent) => {
      const cfg = settingsRef.current;
      const reactMode = cfg.logoCursorReact ?? 'sidebar';
      if (reactMode === 'off') {
        HOVER.active = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const sens = cfg.logoCursorSensitivity ?? 0.4;

      const isDirectlyOverLogo =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (reactMode === 'direct') {
        if (!isDirectlyOverLogo) {
          HOVER.active = false;
          return;
        }
        HOVER.active = true;
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const nx = (e.clientX - cx) / (rect.width * 0.5);
        const ny = (e.clientY - cy) / (rect.height * 0.5);
        HOVER.targetRotY = -0.28 + nx * (0.35 * sens);
        HOVER.targetRotX =  0.12 + ny * (0.28 * sens);
        return;
      }

      if (reactMode === 'sidebar') {
        const sidebar = canvas.closest('.right-sidebar');
        if (!sidebar) {
          HOVER.active = isDirectlyOverLogo;
          return;
        }
        const sRect = sidebar.getBoundingClientRect();
        const insideSidebar =
          e.clientX >= sRect.left &&
          e.clientX <= sRect.right &&
          e.clientY >= sRect.top &&
          e.clientY <= sRect.bottom;

        if (!insideSidebar) {
          HOVER.active = false;
          return;
        }
        HOVER.active = true;
        const cx = sRect.left + sRect.width * 0.5;
        const cy = sRect.top + sRect.height * 0.3;
        const nx = (e.clientX - cx) / (sRect.width * 0.5);
        const ny = (e.clientY - cy) / (sRect.height * 0.5);
        HOVER.targetRotY = -0.28 + nx * (0.42 * sens);
        HOVER.targetRotX =  0.12 + ny * (0.32 * sens);
        return;
      }

      if (reactMode === 'global') {
        HOVER.active = true;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        HOVER.targetRotY = -0.28 + nx * (0.45 * sens);
        HOVER.targetRotX =  0.12 + ny * (0.35 * sens);
      }
    };

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (settingsRef.current.logoInteractiveClick === false) return;
      const hitLocal = getFastAnvilClickPoint(e.clientX, e.clientY);
      if (!hitLocal) return;

      e.stopPropagation();
      const now = (performance.now() - start) / 1000;
      HOVER.clickMeter = Math.min(3.0, HOVER.clickMeter + 0.65);
      HOVER.clickVelY = -0.42;
      HOVER.clickVelZ = -0.25;
      HOVER.blushAlpha = 1.0;
      HOVER.lastClickTime = now;

      material.uniforms.uSparkTime.value = 0.0;
      material.uniforms.uSparkPos.value.copy(hitLocal);
      spawnClickSparks(hitLocal, HOVER.clickMeter);

      if (HOVER.clickMeter > 1.8) {
        spawnSteamPuffs(hitLocal);
      }
    };

    const handleWindowLeave = () => {
      HOVER.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    hoverContainer.addEventListener('pointerdown', handleCanvasPointerDown);
    document.addEventListener('mouseleave', handleWindowLeave);
    window.addEventListener('blur', handleWindowLeave);

    const start = performance.now();
    let lastWallS = 0;

    function stepMotion(wallS: number) {
      const dt = Math.min(0.06, wallS - lastWallS || 0.016);
      lastWallS = wallS;
      const cfg = settingsRef.current;
      const speedMult = cfg.logoSpeed ?? 0.05;
      const idleWiggle = cfg.logoWiggle ?? 0.0;

      if (!HOVER.active) {
        HOVER.wiggleTime += dt * (1.2 * speedMult * 20.0);
        HOVER.targetRotY = -0.28 + Math.sin(HOVER.wiggleTime) * (0.05 * idleWiggle);
        HOVER.targetRotX =  0.12 + Math.cos(HOVER.wiggleTime * 0.8) * (0.03 * idleWiggle);
      }

      cur.rotX += (HOVER.targetRotX - cur.rotX) * 0.12;
      cur.rotY += (HOVER.targetRotY - cur.rotY) * 0.12;

      HOVER.clickMeter = Math.max(0, HOVER.clickMeter - dt * 1.5);
      HOVER.blushAlpha = Math.max(0, HOVER.blushAlpha - dt * 1.2);
      HOVER.clickVelY += (-cur.rotY * 4.0 - HOVER.clickVelY * 3.0) * dt;
      HOVER.clickVelZ += (-cur.rotZ * 4.0 - HOVER.clickVelZ * 3.0) * dt;

      const m = cfg.logoInteractiveClick === false ? 0 : HOVER.clickMeter;
      const recoilTilt = Math.sin(wallS * 28.0) * 0.03 * m;

      rootGroup.rotation.x = cur.rotX + recoilTilt;
      rootGroup.rotation.y = cur.rotY + Math.sin(wallS * 24.0) * 0.04 * m;
      rootGroup.rotation.z = Math.cos(wallS * 22.0) * 0.03 * m;
      rootGroup.position.y = -0.06 - m * 0.04;

      material.uniforms.uBlush.value = HOVER.blushAlpha;
      blushMaterial.uniforms.uAlpha.value = HOVER.blushAlpha;

      if (material.uniforms.uSparkTime.value >= 0.0) {
        material.uniforms.uSparkTime.value += dt;
        if (material.uniforms.uSparkTime.value > 0.8) {
          material.uniforms.uSparkTime.value = -100.0;
        }
      }

      for (const sp of SPARK_POOL) {
        if (sp.alive) {
          const age = wallS - sp.birth;
          if (age > sp.life) {
            sp.alive = false;
            sp.mesh.visible = false;
          } else {
            sp.p.addScaledVector(sp.v, dt);
            sp.v.y -= 9.8 * dt;
            sp.mesh.position.copy(sp.p);
            const fade = 1.0 - age / sp.life;
            sp.mesh.material.uniforms.uAlpha.value = fade;
            sp.mesh.scale.setScalar(fade);
          }
        }
      }

      for (const st of STEAM_PUFFS) {
        if (st.alive) {
          const age = wallS - st.birth;
          if (age > st.life) {
            st.alive = false;
            st.mesh.visible = false;
          } else {
            st.p.addScaledVector(st.v, dt);
            st.v.y += 0.3 * dt;
            st.mesh.position.copy(st.p);
            st.mesh.rotation.z += st.rotSpeed * dt;
            const progress = age / st.life;
            const currentScale = st.initScale * (1.0 + progress * 1.5);
            st.mesh.scale.setScalar(currentScale);
            st.mesh.material.uniforms.uAlpha.value = (1.0 - progress) * 0.65;
          }
        }
      }
    }

    function stepLight() {
      const L = material.uniforms.uLight.value;
      const lx = 0.4 + cur.rotY * 0.45;
      const ly = 0.75 - cur.rotX * 0.35;
      L.set(lx, ly, 0.6).normalize();
    }

    function stepShine(wallS: number) {
      if (shineActive) {
        shineProgress += 0.055;
        material.uniforms.uShine.value = 1.0;
        material.uniforms.uShinePos.value = shineProgress;
        material.uniforms.uShine2Pos.value = shineProgress - 0.28;
        if (shineProgress > 2.6) {
          shineActive = false;
          material.uniforms.uShine.value = 0.0;
          material.uniforms.uShinePos.value = -2.0;
          material.uniforms.uShine2Pos.value = -2.0;
        }
        return;
      }

      if (wallS > nextAutoShineS) {
        const idleWiggle = settingsRef.current.logoWiggle ?? 0.0;
        if (settingsRef.current.logoPeriodicShine !== false && idleWiggle > 0.01) {
          shineActive = true;
          shineProgress = -2.2;
        }
        nextAutoShineS = wallS + rnd(6.0, 11.0);
      }
    }

    let rafId: number | null = null;
    let contextLost = false;
    let disposed = false;

    function renderCurrentFrame(wallS: number) {
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
    }

    function frame() {
      if (disposed || contextLost || document.hidden) return;
      const wallS = (performance.now() - start) / 1000;
      renderCurrentFrame(wallS);
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

    /* Render initial frame synchronously BEFORE initial browser paint */
    renderCurrentFrame(0);
    const tFirstRenderSync = performance.now();

    /* Start requestAnimationFrame animation loop */
    rafId = requestAnimationFrame(frame);

    /* Measure visibly painted frame */
    requestAnimationFrame(() => {
      const tFirstPaint = performance.now();
      (window as any).__logoPerformance = {
        mountTime: tMount,
        layoutEffectStart: tLayoutStart - tMount,
        rendererInit: tRendererInit - tLayoutStart,
        geomCreation: tGeomInit - tRendererInit,
        matCreation: tMatInit - tGeomInit,
        firstRenderSync: tFirstRenderSync - tMount,
        firstPaint: tFirstPaint - tMount,
        totalFromNav: tFirstPaint
      };
      console.log('[Logo Timings]', JSON.stringify((window as any).__logoPerformance));
    });

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

      material.dispose();
      blushMaterial.dispose();
      slashDisposableGeos.forEach((g) => g.dispose());
      if (sparkGeo) (sparkGeo as THREE.BufferGeometry).dispose();
      SPARK_POOL.forEach((sp) => sp.mesh.material.dispose());
      if (steamPlaneGeo) (steamPlaneGeo as THREE.BufferGeometry).dispose();
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

  const isLightTheme = activeTheme === 'light_pro';
  const fallback = isLightTheme
    ? `${BASE}assets/themes/light_pro.webp`
    : `${BASE}assets/themes/dark.webp`;
  const themeLogo = THEME_LOGO_MAP[activeTheme] || fallback;

  const targetVisibleWidth = widthPx * 0.718;
  const imgWidth = Math.round(
    isLightTheme ? targetVisibleWidth / 0.8227 : targetVisibleWidth / 0.9266
  );
  const offsetY = Math.round(heightPx * 0.06);

  if (is2DMode) {
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
        <img
          src={themeLogo}
          alt="DitherForge"
          draggable={false}
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
