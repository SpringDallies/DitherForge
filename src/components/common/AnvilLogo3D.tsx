import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../state/useAppStore';
import { getAnvilPaletteForTheme } from '../../utils/anvilThemeColors';

/* Anvil outline traced from the PNG (x,y pairs, 6 units wide, CCW) — 1:1 from logo.html */
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

let cachedAnvilGeo: THREE.ExtrudeGeometry | null = null;
let cachedSparkGeo: THREE.OctahedronGeometry | null = null;
let cachedSteamGeo: THREE.IcosahedronGeometry | null = null;

function getSharedAnvilGeometry(): THREE.ExtrudeGeometry {
  if (cachedAnvilGeo) return cachedAnvilGeo;

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
    bevelSize: 0.085,
    bevelSegments: 5
  });
  geo.center();

  const p = geo.attributes.position as THREE.BufferAttribute;
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
        let vec = acc.get(kk);
        if (!vec) {
          vec = new THREE.Vector3();
          acc.set(kk, vec);
        }
        vec.add(f);
      }
    }
  }

  tris.forEach((t, ti) => {
    for (let k = 0; k < 3; k++) {
      const accVec = acc.get(key(ti * 3 + k));
      let n = t.cap ? t.f.clone() : (accVec ? accVec.clone() : new THREE.Vector3(0, 0, 1));
      n = n.length() > 1e-9 ? n.normalize() : new THREE.Vector3(0, 0, 1);
      out.set([n.x, n.y, n.z], (ti * 3 + k) * 3);
    }
  });

  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  cachedAnvilGeo = geo;
  return geo;
}

function getSharedSparkGeometry(): THREE.OctahedronGeometry {
  if (cachedSparkGeo) return cachedSparkGeo;
  const g = new THREE.OctahedronGeometry(0.08, 0);
  g.scale(0.65, 2.6, 0.65);
  cachedSparkGeo = g;
  return g;
}

function getSharedSteamGeometry(): THREE.IcosahedronGeometry {
  if (cachedSteamGeo) return cachedSteamGeo;
  cachedSteamGeo = new THREE.IcosahedronGeometry(0.32, 1);
  return cachedSteamGeo;
}

export interface AnvilLogo3DProps {
  size?: number | string;
  className?: string;
  interactive?: boolean;
  sharpness?: 'pixelated' | 'crisp' | 'smooth';
  themeOverride?: string;
  onFirstFrame?: () => void;
  onError?: (reason: string) => void;
}

export const AnvilLogo3D: React.FC<AnvilLogo3DProps> = ({
  size = 128,
  className = '',
  interactive = true,
  sharpness = 'pixelated',
  themeOverride,
  onFirstFrame,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFirstFrameRef = useRef(onFirstFrame);
  onFirstFrameRef.current = onFirstFrame;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const activeTheme = useAppStore((s) => s.activeTheme);
  const effectiveTheme = themeOverride || activeTheme || 'dark_pro';

  const tgtColorsRef = useRef<{ s: [number, number, number]; h: [number, number, number] }>({
    s: [...getAnvilPaletteForTheme(effectiveTheme).shadow],
    h: [...getAnvilPaletteForTheme(effectiveTheme).highlight]
  });
  const triggerShineRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const pal = getAnvilPaletteForTheme(effectiveTheme);
    tgtColorsRef.current = {
      s: [...pal.shadow],
      h: [...pal.highlight]
    };
    if (triggerShineRef.current) {
      triggerShineRef.current();
    }
  }, [effectiveTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let reportedError = false;
    const reportError = (reason: string, detail?: unknown) => {
      console.error('[AnvilLogo3D]', reason, detail ?? '');
      if (!reportedError) {
        reportedError = true;
        if (onErrorRef.current) {
          onErrorRef.current(reason);
        } else if (onFirstFrameRef.current) {
          onFirstFrameRef.current();
        }
      }
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        depth: true,
        stencil: false,
        powerPreference: 'default',
        preserveDrawingBuffer: false
      });
    } catch (e) {
      reportError(`WebGLRenderer initialization failed: ${e instanceof Error ? e.message : String(e)}`, e);
      return;
    }

    const gl = renderer.getContext();
    if (!gl || gl.isContextLost()) {
      reportError('WebGL context is unavailable or lost immediately after creation.');
      renderer.dispose();
      return;
    }

    renderer.debug.checkShaderErrors = true;
    const debugAny = renderer.debug as any;
    if (debugAny.onShaderError) {
      debugAny.onShaderError = (
        glCtx: WebGLRenderingContext,
        program: WebGLProgram,
        vs: WebGLShader,
        fs: WebGLShader
      ) => {
        const progLog = glCtx.getProgramInfoLog(program) || '';
        const vsLog = glCtx.getShaderInfoLog(vs) || '';
        const fsLog = glCtx.getShaderInfoLog(fs) || '';
        reportError(
          `Shader compile/link failed: ${[progLog, vsLog, fsLog].filter(Boolean).join(' | ') || 'unknown GLSL error'}`
        );
      };
    }

    renderer.setPixelRatio(1);
    renderer.setSize(128, 128, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.0, 10);
    camera.lookAt(0, 0, 0);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const geo = getSharedAnvilGeometry();
    const initPal = getAnvilPaletteForTheme(effectiveTheme);
    const cur = {
      s: [...initPal.shadow] as [number, number, number],
      h: [...initPal.highlight] as [number, number, number]
    };

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uShadow:     { value: new THREE.Vector3(...cur.s) },
        uHighlight:  { value: new THREE.Vector3(...cur.h) },
        uLight:      { value: new THREE.Vector3(0.4, 0.75, 0.6) },
        uGain:       { value: 1 },
        uShine:      { value: -1 },
        uAxis:       { value: new THREE.Vector2(0.8, 0.6) },
        uBlush:      { value: 0.0 },
        uHeat:       { value: 0.0 },
        uBlushZ:     { value: 0.92 },
        uSparkPos:   { value: new THREE.Vector3(0, 0, 0.8) },
        uSparkLight: { value: 0.0 }
      },
      vertexShader: `
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
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
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
        uniform vec3 uLight;
        uniform float uGain;
        uniform float uBlush;
        uniform float uHeat;
        uniform float uBlushZ;
        uniform vec3 uSparkPos;
        uniform float uSparkLight;

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
          float specRay = pow(max(rDotL, 1e-4), 7.0) / (0.55 + dist * 0.85);
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
          chrome += 0.32 * pow(max(ribbon, 1e-4), 3.5);
          float ndotv = clamp(dot(n, V), 0.0, 1.0);
          float fresnel = pow(max(1.0 - ndotv, 1e-4), 2.4);
          chrome += 0.42 * fresnel * (0.35 + 0.65 * smoothstep(-0.3, 0.5, R.y));
          float frontGleam = vCap * pow(max(n.z, 1e-4), 1.3);
          chrome = mix(chrome, max(chrome, 0.66 + 0.24 * upperSky), frontGleam * 0.72);
          float rawLit = clamp(chrome * 0.94 * uGain, 0.0, 1.0);
          float lit = smoothstep(0.04, 0.96, rawLit);
          float steps = 5.0;
          float scaled = lit * steps;
          float fracPart = fract(scaled);
          float ditherMask = smoothstep(0.14, 0.30, fracPart) * (1.0 - smoothstep(0.70, 0.86, fracPart));
          float b4 = bayer4(gl_FragCoord.xy) - 0.5;
          float d = b4 * ditherMask;
          float q = clamp(floor(scaled + 0.5 + d) / steps, 0.0, 1.0);
          vec3 heatShadow = mix(uShadow, vec3(0.88, 0.16, 0.24), uHeat * 0.72);
          vec3 heatMid    = mix(mix(uShadow, uHighlight, 0.62), vec3(0.98, 0.36, 0.42), uHeat * 0.62);
          vec3 heatHi     = mix(mix(uHighlight, vec3(1.0), 0.45), vec3(1.00, 0.78, 0.76), uHeat * 0.55);
          vec3 lo  = heatShadow * (0.34 + 0.14 * uHeat);
          vec3 mid = heatMid;
          vec3 hi  = heatHi;
          vec3 col = q < 0.42
            ? mix(lo, mid, q / 0.42)
            : mix(mid, hi, pow(max((q - 0.42) / 0.58, 1e-4), 0.85));
          if (uHeat > 0.01) {
            float coreHeat = exp(-dot(vP * vec2(0.45, 0.65), vP * vec2(0.45, 0.65))) * uHeat;
            float heatQuant = clamp(floor(coreHeat * 4.0 + 0.4 + b4 * 0.35) / 4.0, 0.0, 1.0);
            col += vec3(0.45, 0.06, 0.08) * heatQuant;
          }
          if (uSparkLight > 0.01) {
            float sDist = length(vLocalPos - uSparkPos);
            float sGlow = (1.0 / (1.0 + sDist * sDist * 4.5)) * uSparkLight;
            float sQuant = clamp(floor(sGlow * 4.0 + 0.35 + b4 * 0.4) / 4.0, 0.0, 1.0);
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
            float glowLevel = clamp(floor(totalRayGlow * 4.2 + 0.35 + b4 * 0.45) / 4.0, 0.0, 1.0);
            vec3 pinkBounce = vec3(1.0, 0.20, 0.50);
            vec3 pinkSpec   = vec3(1.0, 0.76, 0.90);
            vec3 rayColor   = mix(pinkBounce, pinkSpec, clamp(totalRayGlow * 0.65, 0.0, 1.0));
            col = mix(col, rayColor, clamp(glowLevel * 0.76, 0.0, 1.0));
            col += pinkBounce * (glowLevel * 0.28);
          }
          col = clamp(col, 0.0, 1.0);
          float t = (dot(vP, uAxis) - (uShine * 2.0 - 1.0) * 4.4) / 0.46;
          float band = uShine < 0.0 ? 0.0 : exp(-t * t);
          col = mix(col, vec3(1.0), step(0.56, band + b4 * 0.30));
          gl_FragColor = vec4(col, 1.0);
        }`
    });

    const mesh = new THREE.Mesh(geo, material);
    rootGroup.add(mesh);

    const blushGroup = new THREE.Group();
    rootGroup.add(blushGroup);

    const blushMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: {
        uEmission: { value: 0.0 },
        uOpacity:  { value: 0.0 },
        uLight:    { value: new THREE.Vector3(0.4, 0.75, 0.6) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }`,
      fragmentShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
        varying vec3 vNormal;
        varying vec3 vViewPos;
        uniform float uEmission;
        uniform float uOpacity;
        uniform vec3 uLight;
        void main() {
          if (uOpacity <= 0.01) discard;
          vec3 n = normalize(vNormal);
          vec3 V = normalize(vViewPos);
          vec3 L = normalize(uLight);
          float ndotv = clamp(dot(n, V), 0.0, 1.0);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(n, H), 1e-4), 14.0);
          float core = smoothstep(0.10, 0.85, ndotv);
          vec3 dimRim   = vec3(0.68, 0.12, 0.32);
          vec3 dimCore  = vec3(0.88, 0.28, 0.48);
          vec3 glowRim  = vec3(1.00, 0.18, 0.48);
          vec3 glowCore = vec3(1.00, 0.62, 0.82);
          vec3 hiWhite  = vec3(1.00, 0.96, 0.98);
          float em = clamp(uEmission, 0.0, 1.35);
          vec3 rimCol  = mix(dimRim, glowRim, clamp(em, 0.0, 1.0));
          vec3 bodyCol = mix(dimCore, glowCore, clamp(em, 0.0, 1.0));
          vec3 col = mix(rimCol, bodyCol, core);
          float highlightStrength = clamp((spec * 0.9 + pow(max(ndotv, 1e-4), 3.5) * 0.65) * (0.35 + 0.85 * em), 0.0, 1.0);
          col = mix(col, hiWhite, highlightStrength);
          gl_FragColor = vec4(col, clamp(uOpacity, 0.0, 1.0));
        }`
    });

    const disposableGeos: THREE.BufferGeometry[] = [];
    function create3DSlash(x1: number, y1: number, x2: number, y2: number, radius: number) {
      const slashGroup = new THREE.Group();
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - Math.PI * 0.5;
      const cylGeo = new THREE.CylinderGeometry(radius, radius, len, 12, 1);
      const capGeo = new THREE.SphereGeometry(radius, 12, 8);
      disposableGeos.push(cylGeo, capGeo);
      const cyl = new THREE.Mesh(cylGeo, blushMaterial);
      const topCap = new THREE.Mesh(capGeo, blushMaterial);
      const botCap = new THREE.Mesh(capGeo, blushMaterial);
      topCap.position.y = len * 0.5;
      botCap.position.y = -len * 0.5;
      slashGroup.add(cyl, topCap, botCap);
      slashGroup.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, 0);
      slashGroup.rotation.z = angle;
      return slashGroup;
    }

    const SLASH_RADIUS = 0.105;
    const slashL1 = create3DSlash(-1.62, 0.36, -1.30, 1.12, SLASH_RADIUS);
    const slashL2 = create3DSlash(-1.12, 0.36, -0.80, 1.12, SLASH_RADIUS);
    const slashR1 = create3DSlash( 0.80, 0.36,  1.12, 1.12, SLASH_RADIUS);
    const slashR2 = create3DSlash( 1.30, 0.36,  1.62, 1.12, SLASH_RADIUS);
    slashL1.rotation.y =  0.16;
    slashL2.rotation.y =  0.10;
    slashR1.rotation.y = -0.10;
    slashR2.rotation.y = -0.16;
    blushGroup.add(slashL1, slashL2, slashR1, slashR2);
    blushGroup.position.set(0, 0, 0.92);
    blushGroup.visible = false;

    const sparkGroup = new THREE.Group();
    rootGroup.add(sparkGroup);
    const sparkGeo = getSharedSparkGeometry();

    const SPARK_POOL: {
      mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.ShaderMaterial>;
      active: boolean;
      age: number;
      maxAge: number;
      vx: number;
      vy: number;
      vz: number;
      scale: number;
    }[] = [];

    for (let i = 0; i < 28; i++) {
      const sMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uLife: { value: 0.0 }, uGlow: { value: 0.0 } },
        vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
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
            vec3 col = t < 0.45 ? mix(birthCol, midCol, t / 0.45) : mix(midCol, tailCol, (t - 0.45) / 0.55);
            float alpha = (1.0 - pow(max(t, 1e-4), 2.2)) * (0.80 + 0.20 * uGlow);
            gl_FragColor = vec4(col, alpha);
          }`
      });
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

    const steamGroup = new THREE.Group();
    scene.add(steamGroup);
    const steamBaseGeo = getSharedSteamGeometry();
    const STEAM_PUFFS: {
      mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>;
      active: boolean;
      age: number;
      maxAge: number;
      vx: number;
      vy: number;
      rx: number;
      ry: number;
      baseScale: number;
    }[] = [];

    for (let i = 0; i < 10; i++) {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uLife: { value: 0.0 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
          #else
            precision mediump float;
          #endif
          varying vec3 vNormal;
          uniform float uLife;
          float bayer4(vec2 p) {
            vec2 c = mod(floor(p), 4.0);
            float x = c.x, y = c.y, b = 0.0;
            if (y < 0.5) b = (x < 0.5) ? 0.0 : (x < 1.5) ? 8.0 : (x < 2.5) ? 2.0 : 10.0;
            else if (y < 1.5) b = (x < 0.5) ? 12.0 : (x < 1.5) ? 4.0 : (x < 2.5) ? 14.0 : 6.0;
            else if (y < 2.5) b = (x < 0.5) ? 3.0 : (x < 1.5) ? 11.0 : (x < 2.5) ? 1.0 : 9.0;
            else b = (x < 0.5) ? 15.0 : (x < 1.5) ? 7.0 : (x < 2.5) ? 13.0 : 5.0;
            return (b + 0.5) / 16.0;
          }
          void main() {
            vec3 n = normalize(vNormal);
            float fade = sin(clamp(uLife, 0.0, 1.0) * 3.14159);
            float rim = clamp(n.z * 0.6 + 0.4, 0.0, 1.0);
            float density = fade * rim;
            if (density < bayer4(gl_FragCoord.xy)) discard;
            float shade = step(0.35, n.y);
            vec3 steamCol = mix(vec3(0.78, 0.80, 0.86), vec3(0.98, 0.96, 0.99), shade);
            gl_FragColor = vec4(steamCol, 0.9);
          }`
      });
      const puff = new THREE.Mesh(steamBaseGeo, mat);
      puff.visible = false;
      steamGroup.add(puff);
      STEAM_PUFFS.push({
        mesh: puff,
        active: false,
        age: 0,
        maxAge: 1.2,
        vx: 0,
        vy: 0,
        rx: 0,
        ry: 0,
        baseScale: 1
      });
    }

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
      clickMeter: 0,
      lastClickTime: -999,
      rodOpacity: 0,
      rodEmission: 0,
      anvilHeat: 0,
      steaming: false
    };

    const start = performance.now();
    let gainNow = 1;
    let lastS = 0;
    let steamSpawnTimer = 0;

    const SHINE = {
      on: false,
      t0: 0,
      dur: 1.1,
      next: rnd(6.0, 11.0),
      cooldownUntil: 0
    };

    function triggerShineSweep(dx: number, dy: number, dur: number) {
      const now = (performance.now() - start) / 1000;
      SHINE.on = true;
      SHINE.t0 = now;
      SHINE.dur = dur;
      SHINE.cooldownUntil = now + dur + rnd(5.0, 8.0);
      SHINE.next = now + rnd(10.0, 18.0);
      const angle = Math.atan2(dy || 0.5, dx || 0.8);
      const sweepAngle = angle * 0.5 + 0.65;
      const flip = dx >= 0 ? 1 : -1;
      material.uniforms.uAxis.value.set(Math.cos(sweepAngle) * flip, Math.sin(sweepAngle));
    }

    triggerShineRef.current = () => triggerShineSweep(1, 0.5, 0.95);

    function triggerInteractiveShine(dx: number, dy: number) {
      const now = (performance.now() - start) / 1000;
      if (SHINE.on || now < SHINE.cooldownUntil) return;
      if (HOVER.energy < 0.75) return;
      HOVER.energy = 0;
      triggerShineSweep(dx, dy, rnd(0.85, 1.15));
    }

    const raycaster = new THREE.Raycaster();
    const ndcClick = new THREE.Vector2();
    const localHit = new THREE.Vector3();

    function spawnSteamPuff() {
      const p = STEAM_PUFFS.find((x) => !x.active);
      if (!p) return;
      p.active = true;
      p.age = 0;
      p.maxAge = rnd(0.95, 1.45);
      p.mesh.position.set(
        rootGroup.position.x + rnd(-1.85, 1.85),
        rootGroup.position.y + rnd(1.05, 1.45),
        rnd(-0.25, 0.45)
      );
      p.vx = rnd(-0.45, 0.45);
      p.vy = rnd(1.35, 2.05);
      p.rx = rnd(-2.5, 2.5);
      p.ry = rnd(-2.5, 2.5);
      p.baseScale = rnd(0.55, 1.05);
      p.mesh.scale.setScalar(p.baseScale * 0.5);
      p.mesh.visible = true;
    }

    let cachedRect: DOMRect | null = canvas.getBoundingClientRect();
    const updateCachedRect = () => {
      if (canvas) cachedRect = canvas.getBoundingClientRect();
    };
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCachedRect) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', updateCachedRect, { passive: true });
    window.addEventListener('scroll', updateCachedRect, { passive: true, capture: true });

    const onPointerMove = (e: PointerEvent) => {
      if (!canvas || !interactive) return;
      if (!cachedRect || cachedRect.width <= 0 || cachedRect.height <= 0) {
        updateCachedRect();
      }
      const rect = cachedRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const halfW = Math.max(rect.width * 0.5, 1);
      const halfH = Math.max(rect.height * 0.5, 1);
      const rawX = (e.clientX - cx) / halfW;
      const rawY = (e.clientY - cy) / halfH;
      const dist = Math.hypot(rawX, rawY);
      const falloff = Math.exp(-dist * dist * 0.42);
      HOVER.influence = falloff;
      const dirX = rawX / Math.max(1.0, dist * 0.65);
      const dirY = rawY / Math.max(1.0, dist * 0.65);
      HOVER.ty = dirX * 0.58 * falloff;
      HOVER.tx = dirY * 0.38 * falloff;
      const dx = rawX - HOVER.lastPx;
      const dy = rawY - HOVER.lastPy;
      const stepDist = Math.hypot(dx, dy);
      if (stepDist > 0.006 && falloff > 0.25) {
        HOVER.energy = Math.min(1.5, HOVER.energy + stepDist * 1.15 * falloff);
        if (stepDist * falloff > 0.065) {
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

    const onPointerDown = (e: PointerEvent) => {
      if (!canvas || !interactive) return;
      const rect = canvas.getBoundingClientRect();
      ndcClick.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      ndcClick.y = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      rootGroup.updateMatrixWorld(true);
      raycaster.setFromCamera(ndcClick, camera);
      const hits = raycaster.intersectObject(mesh, false);
      if (hits.length === 0) return;
      localHit.copy(hits[0].point);
      rootGroup.worldToLocal(localHit);
      localHit.z += 0.14;
      const now = (performance.now() - start) / 1000;
      HOVER.lastClickTime = now;
      HOVER.clickMeter = Math.min(14.0, HOVER.clickMeter + 1.0);
      const glowLevel = Math.min(1.0, Math.max(0.1, (HOVER.clickMeter - 1.0) / 10.0));
      material.uniforms.uSparkPos.value.copy(localHit);
      material.uniforms.uSparkLight.value = 0.50 + 0.70 * glowLevel;
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
        sp.mesh.position.set(localHit.x + rnd(-0.05, 0.05), localHit.y + rnd(-0.05, 0.05), localHit.z);
        sp.mesh.scale.setScalar(sp.scale);
        sp.mesh.material.uniforms.uLife.value = 0.0;
        sp.mesh.material.uniforms.uGlow.value = glowLevel;
        sp.mesh.visible = true;
        if (++spawned >= 6) break;
      }
      const intensity = 0.40 + 0.60 * Math.min(1.0, HOVER.clickMeter / 11.0);
      HOVER.clickVelY -= 1.0 + 1.3 * intensity;
      const sideSign = Math.abs(localHit.x) > 0.15 ? Math.sign(localHit.x) : Math.random() < 0.5 ? -1 : 1;
      HOVER.clickVelRotZ += -sideSign * (0.75 + 1.15 * intensity);
      HOVER.clickVelPitch += 0.60 + 0.90 * intensity;
      if (HOVER.clickMeter >= 10.5) {
        spawnSteamPuff();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', handleWindowLeave);
    window.addEventListener('blur', handleWindowLeave);
    canvas.addEventListener('pointerdown', onPointerDown);

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      reportError('WebGL context lost.');
    };
    const onContextRestored = () => {
      contextLost = false;
      lastS = (performance.now() - start) / 1000;
      if (!disposed && rafId === null) {
        rafId = requestAnimationFrame(frame);
      }
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    const L = {
      a: rnd(0, 6.28),
      b: rnd(0, 6.28),
      c: rnd(0, 6.28),
      s1: rnd(0.05, 0.09),
      s2: rnd(0.09, 0.14),
      s3: rnd(0.07, 0.11)
    };

    let rafId: number | null = null;
    let disposed = false;
    let firedFirstFrame = false;

    let isDocVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let isInView = true;

    const syncLoopState = () => {
      const shouldRun = !disposed && !contextLost && isDocVisible && isInView;
      if (shouldRun && rafId === null) {
        lastS = (performance.now() - start) / 1000;
        rafId = requestAnimationFrame(frame);
      } else if (!shouldRun && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const onVisibilityChange = () => {
      isDocVisible = !document.hidden;
      syncLoopState();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              isInView = entries.some((entry) => entry.isIntersecting);
              syncLoopState();
            },
            { threshold: 0.01 }
          )
        : null;
    intersectionObserver?.observe(canvas);

    function frame() {
      if (disposed || contextLost) return;
      const s = (performance.now() - start) / 1000;
      const dt = Math.max(0.001, Math.min(s - lastS, 0.05));
      lastS = s;

      for (const c of Object.values(MOTION)) {
        const x = s * c.hz + c.off;
        c.v = c.amp * (0.85 + 0.3 * c.nm(x * 0.2)) * (c.n1(x) + 0.3 * c.n2(x * 2.7));
      }
      MOTION.rz.v -= MOTION.ry.v * 0.10;
      MOTION.px.v += MOTION.ry.v * 0.12;
      MOTION.py.v += MOTION.rx.v * 0.15;

      HOVER.smoothedInfluence +=
        (HOVER.influence - HOVER.smoothedInfluence) * (1 - Math.exp(-5.0 * dt));
      const wanderWeight = 1.0 - 0.72 * HOVER.smoothedInfluence;

      const breathMain = Math.sin(s * 2.05);
      const floatY = 0.24 * breathMain + MOTION.py.v * wanderWeight;
      const floatX = MOTION.px.v * wanderWeight;
      const breathPitch = 0.055 * Math.cos(s * 2.05 - 0.4);
      const breathScale = 1.0 + 0.022 * breathMain;

      if (s - HOVER.lastClickTime > 0.65) {
        const coolRate = HOVER.clickMeter >= 10.5 ? 3.5 : 2.8;
        HOVER.clickMeter = Math.max(0, HOVER.clickMeter - dt * coolRate);
      }

      const m = HOVER.clickMeter;
      const targetOpacity = m >= 5.0 ? Math.min(1.0, (m - 4.5) / 1.5) : 0.0;
      const targetEmission =
        m >= 5.0
          ? 0.28 + 1.02 * Math.pow(Math.min(1.0, Math.max(0.0, (m - 5.0) / 6.0)), 1.15)
          : 0.0;
      const targetHeat = m >= 7.5 ? Math.min(1.0, (m - 7.5) / 3.5) : 0.0;
      HOVER.steaming = m >= 10.5;

      const opRate = targetOpacity < HOVER.rodOpacity ? 9.5 : 6.5;
      const emRate = targetEmission < HOVER.rodEmission ? 8.5 : 5.5;
      const heatRate = targetHeat < HOVER.anvilHeat ? 6.0 : 3.8;

      HOVER.rodOpacity += (targetOpacity - HOVER.rodOpacity) * (1 - Math.exp(-opRate * dt));
      HOVER.rodEmission += (targetEmission - HOVER.rodEmission) * (1 - Math.exp(-emRate * dt));
      HOVER.anvilHeat += (targetHeat - HOVER.anvilHeat) * (1 - Math.exp(-heatRate * dt));

      blushGroup.visible = HOVER.rodOpacity > 0.01;
      const emissionPulse = HOVER.rodEmission * (0.93 + 0.07 * Math.sin(s * 7.0));

      blushMaterial.uniforms.uOpacity.value = HOVER.rodOpacity;
      blushMaterial.uniforms.uEmission.value = emissionPulse;
      material.uniforms.uBlush.value = emissionPulse * HOVER.rodOpacity;
      material.uniforms.uHeat.value = HOVER.anvilHeat;
      material.uniforms.uSparkLight.value = Math.max(0.0, material.uniforms.uSparkLight.value - dt * 5.5);

      if (HOVER.steaming) {
        steamSpawnTimer -= dt;
        if (steamSpawnTimer <= 0) {
          spawnSteamPuff();
          steamSpawnTimer = rnd(0.11, 0.20);
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
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.x += p.rx * dt;
        p.mesh.rotation.y += p.ry * dt;
        p.mesh.scale.setScalar(p.baseScale * (0.65 + 0.95 * progress));
        p.mesh.material.uniforms.uLife.value = progress;
      }

      for (const sp of SPARK_POOL) {
        if (!sp.active) continue;
        sp.age += dt;
        const progress = sp.age / sp.maxAge;
        if (progress >= 1.0) {
          sp.active = false;
          sp.mesh.visible = false;
          continue;
        }
        sp.vy -= 15.5 * dt;
        sp.vx *= 1.0 - 1.5 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.mesh.rotation.z = Math.atan2(sp.vy, sp.vx) - Math.PI * 0.5;
        sp.mesh.scale.setScalar(sp.scale * (1.0 - 0.55 * progress));
        sp.mesh.material.uniforms.uLife.value = progress;
      }

      HOVER.clickVelY += (-HOVER.clickPosY * 65.0 - HOVER.clickVelY * 10.5) * dt;
      HOVER.clickPosY += HOVER.clickVelY * dt;
      HOVER.clickVelRotZ += (-HOVER.clickRotZ * 58.0 - HOVER.clickVelRotZ * 9.5) * dt;
      HOVER.clickRotZ += HOVER.clickVelRotZ * dt;
      HOVER.clickVelPitch += (-HOVER.clickPitch * 60.0 - HOVER.clickVelPitch * 10.0) * dt;
      HOVER.clickPitch += HOVER.clickVelPitch * dt;

      HOVER.vx += ((HOVER.tx - HOVER.x) * 24.0 - HOVER.vx * 7.2) * dt;
      HOVER.vy += ((HOVER.ty - HOVER.y) * 24.0 - HOVER.vy * 7.2) * dt;
      HOVER.x += HOVER.vx * dt;
      HOVER.y += HOVER.vy * dt;
      HOVER.energy = Math.max(0, HOVER.energy - dt * 1.15);

      const bankZ = -HOVER.y * 0.14;
      rootGroup.rotation.set(
        MOTION.rx.v * wanderWeight + breathPitch + HOVER.x + HOVER.clickPitch,
        MOTION.ry.v * wanderWeight + HOVER.y,
        MOTION.rz.v * wanderWeight + bankZ + HOVER.clickRotZ
      );
      rootGroup.position.set(floatX + HOVER.y * 0.22, floatY - HOVER.x * 0.18 + HOVER.clickPosY, 0);
      rootGroup.scale.setScalar(breathScale);

      const az = 0.20 + 0.45 * Math.sin(s * L.s1 + L.a) + 0.25 * Math.sin(s * L.s2 + L.b);
      const el = 0.78 + 0.18 * Math.sin(s * L.s3 + L.c) + 0.08 * Math.sin(s * 2.05);
      const azA = az + rootGroup.rotation.y * 0.75 - HOVER.y * 0.55;
      const elA = el - rootGroup.rotation.x * 0.75 + HOVER.x * 0.45;
      material.uniforms.uLight.value.set(Math.sin(azA) * Math.cos(elA), Math.sin(elA), Math.cos(azA) * Math.cos(elA));
      blushMaterial.uniforms.uLight.value.copy(material.uniforms.uLight.value);

      const facing = Math.max(0, Math.cos(rootGroup.rotation.y) * Math.cos(rootGroup.rotation.x));
      gainNow += (1.02 + 0.28 * (1 - facing) - gainNow) * 0.06;
      material.uniforms.uGain.value = gainNow;

      if (!SHINE.on && s >= SHINE.next && s >= SHINE.cooldownUntil) {
        const a = rnd(0.45, 1.15);
        const flip = Math.random() < 0.5 ? -1 : 1;
        triggerShineSweep(Math.cos(a) * flip, Math.sin(a), rnd(1.0, 1.4));
      }
      if (SHINE.on) {
        const p = (s - SHINE.t0) / SHINE.dur;
        if (p >= 1) {
          SHINE.on = false;
          SHINE.next = s + rnd(10.0, 18.0);
          material.uniforms.uShine.value = -1;
        } else {
          material.uniforms.uShine.value = p * p * (3 - 2 * p);
        }
      }

      const tgt = tgtColorsRef.current;
      for (let i = 0; i < 3; i++) {
        cur.s[i] += (tgt.s[i] - cur.s[i]) * 0.08;
        cur.h[i] += (tgt.h[i] - cur.h[i]) * 0.08;
      }
      material.uniforms.uShadow.value.set(cur.s[0], cur.s[1], cur.s[2]);
      material.uniforms.uHighlight.value.set(cur.h[0], cur.h[1], cur.h[2]);

      renderer.render(scene, camera);

      if (!firedFirstFrame) {
        const glErr = gl.getError();
        if (glErr !== gl.NO_ERROR) {
          reportError(`WebGL error during initial render (code 0x${glErr.toString(16)})`);
        } else if (!reportedError) {
          firedFirstFrame = true;
          if (onFirstFrameRef.current) onFirstFrameRef.current();
        }
      }

      if (!disposed && !contextLost && isDocVisible && isInView) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = null;
      }
    }

    frame();

    return () => {
      disposed = true;
      triggerShineRef.current = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', handleWindowLeave);
      window.removeEventListener('blur', handleWindowLeave);
      window.removeEventListener('resize', updateCachedRect);
      window.removeEventListener('scroll', updateCachedRect, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('webglcontextlost', onContextLost, false);
      canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      material.dispose();
      blushMaterial.dispose();
      disposableGeos.forEach((g) => g.dispose());
      SPARK_POOL.forEach((sp) => sp.mesh.material.dispose());
      STEAM_PUFFS.forEach((st) => st.mesh.material.dispose());
      renderer.dispose();
    };
  }, [interactive]);

  const resolvedCssSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      className={`df-anvil-3d-logo sharpness-${sharpness} ${className}`.trim()}
      style={{
        width: resolvedCssSize,
        height: resolvedCssSize,
        aspectRatio: '1 / 1',
        cursor: interactive ? 'pointer' : 'default',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    />
  );
};

export default AnvilLogo3D;
