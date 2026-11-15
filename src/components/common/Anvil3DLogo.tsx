import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../state/useAppStore';
import { getAnvilPaletteForTheme } from '../../utils/anvilThemeColors';

// Exact 1:1 outline coordinates from logo.html
const OUTLINE = [
  2.123,-1.578,2.156,-1.577,2.195,-1.567,2.228,-1.554,2.257,-1.538,2.287,-1.515,2.314,-1.488,2.326,-1.472,2.342,-1.447,2.362,-1.403,2.369,-1.383,2.376,-1.344,2.376,-1.295,2.373,-1.272,2.366,-1.243,2.346,-1.194,2.329,-1.167,2.300,-1.130,2.210,-1.040,2.197,-1.031,2.118,-0.952,2.105,-0.942,1.939,-0.779,1.924,-0.768,1.805,-0.648,1.754,-0.587,1.711,-0.528,1.655,-0.433,1.610,-0.335,1.580,-0.250,1.563,-0.188,1.547,-0.106,1.546,-0.090,1.540,-0.054,1.540,-0.028,1.537,-0.015,1.537,0.113,1.537,0.126,1.540,0.139,1.540,0.165,1.554,0.253,1.574,0.338,1.593,0.400,1.626,0.482,1.663,0.555,1.691,0.606,1.731,0.666,1.795,0.746,1.842,0.797,1.857,0.808,1.891,0.843,1.931,0.875,1.996,0.923,2.064,0.966,2.133,1.002,2.218,1.038,2.287,1.061,2.349,1.077,2.417,1.091,2.456,1.095,2.466,1.097,2.486,1.098,2.496,1.101,2.558,1.104,2.567,1.107,2.594,1.108,2.616,1.111,2.656,1.118,2.711,1.135,2.745,1.148,2.783,1.167,2.817,1.187,2.875,1.232,2.912,1.269,2.950,1.318,2.976,1.360,2.999,1.409,3.000,1.452,2.992,1.476,2.986,1.488,2.973,1.506,2.946,1.524,2.917,1.535,2.868,1.535,2.852,1.538,2.620,1.539,2.600,1.542,2.368,1.542,2.349,1.545,2.117,1.545,2.100,1.548,1.868,1.548,1.849,1.552,1.617,1.552,1.597,1.555,1.365,1.555,1.346,1.558,1.114,1.558,1.094,1.561,0.862,1.561,0.843,1.565,0.611,1.565,0.591,1.568,0.363,1.568,0.343,1.571,0.111,1.571,0.091,1.574,-0.140,1.574,-0.160,1.578,-0.392,1.578,-0.412,1.581,-0.614,1.581,-0.653,1.573,-0.692,1.560,-0.784,1.507,-0.823,1.487,-0.862,1.471,-0.908,1.458,-0.973,1.447,-1.316,1.447,-1.333,1.440,-1.378,1.412,-1.424,1.389,-1.486,1.363,-1.545,1.344,-1.610,1.327,-1.672,1.317,-1.695,1.316,-1.708,1.313,-1.748,1.313,-1.764,1.310,-2.956,1.310,-2.969,1.306,-2.986,1.296,-2.996,1.282,-3.000,1.269,-3.000,1.246,-2.996,1.233,-2.984,1.217,-2.969,1.205,-2.845,1.081,-2.830,1.070,-2.705,0.944,-2.690,0.933,-2.564,0.807,-2.550,0.795,-2.512,0.758,-2.469,0.722,-2.408,0.675,-2.316,0.612,-2.247,0.572,-2.162,0.530,-2.110,0.507,-1.999,0.468,-1.944,0.452,-1.819,0.425,-1.751,0.415,-1.692,0.411,-1.679,0.408,-1.653,0.408,-1.643,0.405,-1.614,0.405,-1.604,0.402,-1.574,0.401,-1.565,0.399,-1.535,0.398,-1.525,0.396,-1.496,0.395,-1.486,0.392,-1.457,0.392,-1.447,0.389,-1.418,0.388,-1.408,0.386,-1.378,0.385,-1.369,0.382,-1.339,0.382,-1.329,0.379,-1.300,0.379,-1.290,0.376,-1.261,0.375,-1.251,0.373,-1.222,0.372,-1.212,0.369,-1.182,0.369,-1.173,0.366,-1.143,0.366,-1.133,0.363,-1.104,0.362,-1.094,0.360,-1.065,0.359,-1.055,0.356,-1.026,0.356,-1.016,0.353,-0.986,0.352,-0.977,0.350,-0.947,0.349,-0.937,0.347,-0.908,0.346,-0.898,0.343,-0.869,0.343,-0.859,0.340,-0.830,0.339,-0.820,0.337,-0.790,0.336,-0.781,0.333,-0.751,0.333,-0.741,0.330,-0.712,0.330,-0.702,0.327,-0.673,0.326,-0.663,0.324,-0.634,0.323,-0.624,0.320,-0.595,0.320,-0.585,0.317,-0.562,0.317,-0.503,0.307,-0.438,0.286,-0.415,0.277,-0.382,0.260,-0.350,0.241,-0.310,0.212,-0.286,0.191,-0.263,0.168,-0.231,0.129,-0.192,0.067,-0.173,0.024,-0.156,-0.021,-0.142,-0.083,-0.142,-0.100,-0.139,-0.113,-0.139,-0.198,-0.150,-0.260,-0.159,-0.296,-0.173,-0.333,-0.202,-0.390,-0.225,-0.427,-0.250,-0.459,-0.301,-0.509,-0.931,-0.996,-0.977,-1.039,-1.020,-1.093,-1.033,-1.112,-1.056,-1.155,-1.079,-1.210,-1.092,-1.259,-1.099,-1.298,-1.102,-1.370,-1.099,-1.396,-1.092,-1.426,-1.075,-1.465,-1.052,-1.499,-1.019,-1.532,-0.996,-1.547,-0.947,-1.570,-0.915,-1.577,-0.892,-1.578,-0.879,-1.581,-0.291,-1.581,-0.274,-1.578,-0.219,-1.577,-0.209,-1.575,-0.183,-1.574,-0.160,-1.571,-0.105,-1.561,-0.059,-1.551,-0.003,-1.534,0.059,-1.511,0.114,-1.487,0.173,-1.456,0.284,-1.393,0.356,-1.356,0.408,-1.334,0.464,-1.314,0.536,-1.294,0.640,-1.274,0.692,-1.270,0.706,-1.267,0.820,-1.267,0.836,-1.270,0.862,-1.271,0.875,-1.274,0.892,-1.274,0.983,-1.291,1.049,-1.308,1.107,-1.327,1.166,-1.352,1.274,-1.405,1.512,-1.531,1.542,-1.544,1.591,-1.560,1.617,-1.567,1.679,-1.577,1.718,-1.578,1.735,-1.581,2.117,-1.580
];

interface Anvil3DLogoProps {
  size?: number | string;
  resolution?: number;
  interactive?: boolean;
  className?: string;
}

export const Anvil3DLogo: React.FC<Anvil3DLogoProps> = ({
  size = 180,
  resolution = 128,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTheme = useAppStore((s) => s.activeTheme);
  const targetPaletteRef = useRef(getAnvilPaletteForTheme(activeTheme));
  const shineTriggerRef = useRef<(() => void) | null>(null);

  // Smoothly interpolate shader shadow/highlight colors whenever activeTheme changes
  useEffect(() => {
    targetPaletteRef.current = getAnvilPaletteForTheme(activeTheme);
    shineTriggerRef.current?.();
  }, [activeTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: 'default',
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(resolution, resolution, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.0, 10);
    camera.lookAt(0, 0, 0);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const shape = new THREE.Shape();
    for (let i = 0; i < OUTLINE.length; i += 2) {
      if (i === 0) shape.moveTo(OUTLINE[i], OUTLINE[i + 1]);
      else shape.lineTo(OUTLINE[i], OUTLINE[i + 1]);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.1,
      curveSegments: 1,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.19,
      bevelSize: 0.085,
      bevelSegments: 5,
    });
    geo.center();

    // Smooth side & bevel normals while keeping front/back caps crisp
    const p = geo.attributes.position;
    const out = new Float32Array(p.count * 3);
    const key = (i: number) =>
      `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
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
        let n = t.cap ? t.f.clone() : acc.get(key(ti * 3 + k))!.clone();
        n = n.length() > 1e-9 ? n.normalize() : new THREE.Vector3(0, 0, 1);
        out.set([n.x, n.y, n.z], (ti * 3 + k) * 3);
      }
    });
    geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));

    const initPal = targetPaletteRef.current;
    const curShadow = [...initPal.shadow];
    const curHighlight = [...initPal.highlight];

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uShadow:     { value: new THREE.Vector3(...curShadow) },
        uHighlight:  { value: new THREE.Vector3(...curHighlight) },
        uLight:      { value: new THREE.Vector3(0.4, 0.75, 0.6) },
        uGain:       { value: 1 },
        uShine:      { value: -1 },
        uAxis:       { value: new THREE.Vector2(0.8, 0.6) },
        uBlush:      { value: 0.0 },
        uHeat:       { value: 0.0 },
        uBlushZ:     { value: 0.92 },
        uSparkPos:   { value: new THREE.Vector3(0, 0, 0.8) },
        uSparkLight: { value: 0.0 },
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
          float x = c.x, y = c.y, b = 0.0;
          if (y < 0.5) b = (x < 0.5) ? 0.0 : (x < 1.5) ? 8.0 : (x < 2.5) ? 2.0 : 10.0;
          else if (y < 1.5) b = (x < 0.5) ? 12.0 : (x < 1.5) ? 4.0 : (x < 2.5) ? 14.0 : 6.0;
          else if (y < 2.5) b = (x < 0.5) ? 3.0 : (x < 1.5) ? 11.0 : (x < 2.5) ? 1.0 : 9.0;
          else b = (x < 0.5) ? 15.0 : (x < 1.5) ? 7.0 : (x < 2.5) ? 13.0 : 5.0;
          return (b + 0.5) / 16.0;
        }

        float traceCapsuleLight(vec3 P, vec3 N, vec3 R, vec3 A, vec3 B) {
          vec3 AB = B - A;
          float tSurf = clamp(dot(P - A, AB) / dot(AB, AB), 0.0, 1.0);
          vec3 toLight = (A + AB * tSurf) - P;
          float dist = length(toLight);
          vec3 Ldir = toLight / max(dist, 0.001);
          float ndotl = max(dot(N, Ldir), 0.0) * 0.75 + 0.25;
          float bounce = ndotl / (1.0 + dist * dist * 2.1);
          float specRay = pow(max(dot(R, Ldir), 0.0), 7.0) / (0.55 + dist * 0.85);
          return bounce * 0.65 + specRay * 0.90;
        }

        void main() {
          vec3 n = normalize(vNormal);
          vec3 V = normalize(vViewPos);
          vec3 Lk = normalize(uLight);
          vec3 R = reflect(-V, n);

          float ry = R.y + R.x * 0.24 + (Lk.y - 0.65) * 0.45 + (Lk.x * R.x) * 0.35;
          float upperSky = smoothstep(-0.08, 0.38, ry);
          float zenithGlint = smoothstep(0.42, 0.88, ry);
          float lowerBounce = smoothstep(-0.22, -0.72, ry) * 0.42;
          float darkCore = exp(-pow((ry + 0.16) * 4.2, 2.0));

          float chrome = 0.18 + 0.64 * upperSky + 0.24 * zenithGlint + lowerBounce - 0.22 * darkCore;
          chrome += 0.32 * pow(max(dot(R, Lk), 0.0), 3.5);
          float fresnel = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.4);
          chrome += 0.42 * fresnel * (0.35 + 0.65 * smoothstep(-0.3, 0.5, R.y));

          float frontGleam = vCap * pow(max(n.z, 0.0), 1.3);
          chrome = mix(chrome, max(chrome, 0.66 + 0.24 * upperSky), frontGleam * 0.72);

          float lit = smoothstep(0.04, 0.96, clamp(chrome * 0.94 * uGain, 0.0, 1.0));
          float steps = 5.0;
          float scaled = lit * steps;
          float fracPart = fract(scaled);
          float ditherMask = smoothstep(0.14, 0.30, fracPart) * (1.0 - smoothstep(0.70, 0.86, fracPart));
          float b4 = bayer4(gl_FragCoord.xy) - 0.5;
          float q = clamp(floor(scaled + 0.5 + b4 * ditherMask) / steps, 0.0, 1.0);

          vec3 heatShadow = mix(uShadow, vec3(0.88, 0.16, 0.24), uHeat * 0.72);
          vec3 heatMid = mix(mix(uShadow, uHighlight, 0.62), vec3(0.98, 0.36, 0.42), uHeat * 0.62);
          vec3 heatHi = mix(mix(uHighlight, vec3(1.0), 0.45), vec3(1.00, 0.78, 0.76), uHeat * 0.55);

          vec3 lo = heatShadow * (0.34 + 0.14 * uHeat);
          vec3 col = q < 0.42
            ? mix(lo, heatMid, q / 0.42)
            : mix(heatMid, heatHi, pow((q - 0.42) / 0.58, 0.85));

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
            vec3 Rloc = reflect(-normalize(vec3(0.0, 0.18, 1.0)), N);
            float bz = uBlushZ;
            float totalRayGlow = (
              traceCapsuleLight(P, N, Rloc, vec3(-1.62, 0.36, bz), vec3(-1.30, 1.12, bz)) +
              traceCapsuleLight(P, N, Rloc, vec3(-1.12, 0.36, bz), vec3(-0.80, 1.12, bz)) +
              traceCapsuleLight(P, N, Rloc, vec3( 0.80, 0.36, bz), vec3( 1.12, 1.12, bz)) +
              traceCapsuleLight(P, N, Rloc, vec3( 1.30, 0.36, bz), vec3( 1.62, 1.12, bz))
            ) * uBlush;
            float glowLevel = clamp(floor(totalRayGlow * 4.2 + 0.35 + b4 * 0.45) / 4.0, 0.0, 1.0);
            vec3 pinkBounce = vec3(1.0, 0.20, 0.50);
            vec3 rayColor = mix(pinkBounce, vec3(1.0, 0.76, 0.90), clamp(totalRayGlow * 0.65, 0.0, 1.0));
            col = mix(col, rayColor, clamp(glowLevel * 0.76, 0.0, 1.0)) + pinkBounce * (glowLevel * 0.28);
          }

          col = clamp(col, 0.0, 1.0);
          float t = (dot(vP, uAxis) - (uShine * 2.0 - 1.0) * 4.4) / 0.46;
          float band = uShine < 0.0 ? 0.0 : exp(-t * t);
          col = mix(col, vec3(1.0), step(0.56, band + b4 * 0.30));

          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    const mesh = new THREE.Mesh(geo, material);
    rootGroup.add(mesh);

    // Organic Noise Drift + Hover/Click Physics
    const makeNoise = () => {
      const g = Array.from({ length: 256 }, () => rnd(-1, 1));
      const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
      return (x: number) => {
        const i = Math.floor(x), f = x - i, u = fade(f);
        return (g[i & 255] * f + g[(i + 1) & 255] * (f - 1) * u) * 2;
      };
    };
    const chan = (amp: number, hz: number) => ({
      v: 0, amp, hz: hz * rnd(0.85, 1.2), off: rnd(0, 500), n1: makeNoise(), n2: makeNoise(), nm: makeNoise(),
    });
    const MOTION = {
      ry: chan(0.68, 0.11), rx: chan(0.20, 0.15), rz: chan(0.09, 0.19),
      px: chan(0.22, 0.09), py: chan(0.26, 0.14),
    };

    const HOVER = {
      tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0,
      influence: 0, smoothedInfluence: 0,
      clickPosY: 0, clickVelY: 0, clickRotZ: 0, clickVelRotZ: 0, clickPitch: 0, clickVelPitch: 0,
    };

    const SHINE = { on: false, t0: 0, dur: 1.1, next: rnd(4.0, 8.0), cooldownUntil: 0 };
    const start = performance.now();

    const triggerShineSweep = (dx = 1, dy = 0.5, dur = 0.95) => {
      const now = (performance.now() - start) / 1000;
      SHINE.on = true;
      SHINE.t0 = now;
      SHINE.dur = dur;
      SHINE.cooldownUntil = now + dur + 3.0;
      SHINE.next = now + rnd(8.0, 14.0);
      const sweepAngle = Math.atan2(dy, dx) * 0.5 + 0.65;
      material.uniforms.uAxis.value.set(Math.cos(sweepAngle) * (dx >= 0 ? 1 : -1), Math.sin(sweepAngle));
    };
    shineTriggerRef.current = () => triggerShineSweep(1, 0.5, 0.95);

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const rawX = (e.clientX - (rect.left + rect.width * 0.5)) / Math.max(rect.width * 0.5, 1);
      const rawY = (e.clientY - (rect.top + rect.height * 0.5)) / Math.max(rect.height * 0.5, 1);
      const dist = Math.hypot(rawX, rawY);
      const falloff = Math.exp(-dist * dist * 0.42);
      HOVER.influence = falloff;
      HOVER.ty = (rawX / Math.max(1.0, dist * 0.65)) * 0.58 * falloff;
      HOVER.tx = (rawY / Math.max(1.0, dist * 0.65)) * 0.38 * falloff;
    };

    const raycaster = new THREE.Raycaster();
    const ndcClick = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      ndcClick.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      ndcClick.y = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      rootGroup.updateMatrixWorld(true);
      raycaster.setFromCamera(ndcClick, camera);
      const hits = raycaster.intersectObject(mesh, false);
      if (hits.length === 0) return;

      const hitLocal = hits[0].point.clone();
      rootGroup.worldToLocal(hitLocal);
      hitLocal.z += 0.14;
      material.uniforms.uSparkPos.value.copy(hitLocal);
      material.uniforms.uSparkLight.value = 0.85;
      HOVER.clickVelY -= 1.6;
      HOVER.clickVelRotZ += -(Math.sign(hitLocal.x) || 1) * 1.1;
      HOVER.clickVelPitch += 0.9;
    };

    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);

    const L = { a: rnd(0, 6.28), b: rnd(0, 6.28), c: rnd(0, 6.28), s1: rnd(0.05, 0.09), s2: rnd(0.09, 0.14), s3: rnd(0.07, 0.11) };
    let gainNow = 1;
    let lastS = 0;
    let rafId: number | null = null;
    let disposed = false;

    const frame = () => {
      if (disposed) return;
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

      HOVER.smoothedInfluence += (HOVER.influence - HOVER.smoothedInfluence) * (1 - Math.exp(-5.0 * dt));
      const wanderWeight = 1.0 - 0.72 * HOVER.smoothedInfluence;
      const breathMain = Math.sin(s * 2.05);

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

      rootGroup.rotation.set(
        MOTION.rx.v * wanderWeight + 0.055 * Math.cos(s * 2.05 - 0.4) + HOVER.x + HOVER.clickPitch,
        MOTION.ry.v * wanderWeight + HOVER.y,
        MOTION.rz.v * wanderWeight - HOVER.y * 0.14 + HOVER.clickRotZ
      );
      rootGroup.position.set(
        MOTION.px.v * wanderWeight + HOVER.y * 0.22,
        0.24 * breathMain + MOTION.py.v * wanderWeight - HOVER.x * 0.18 + HOVER.clickPosY,
        0
      );
      rootGroup.scale.setScalar(1.0 + 0.022 * breathMain);

      const az = 0.20 + 0.45 * Math.sin(s * L.s1 + L.a) + 0.25 * Math.sin(s * L.s2 + L.b);
      const el = 0.78 + 0.18 * Math.sin(s * L.s3 + L.c) + 0.08 * Math.sin(s * 2.05);
      const azA = az + rootGroup.rotation.y * 0.75 - HOVER.y * 0.55;
      const elA = el - rootGroup.rotation.x * 0.75 + HOVER.x * 0.45;
      material.uniforms.uLight.value.set(
        Math.sin(azA) * Math.cos(elA),
        Math.sin(elA),
        Math.cos(azA) * Math.cos(elA)
      );

      const facing = Math.max(0, Math.cos(rootGroup.rotation.y) * Math.cos(rootGroup.rotation.x));
      gainNow += (1.02 + 0.28 * (1 - facing) - gainNow) * 0.06;
      material.uniforms.uGain.value = gainNow;
      material.uniforms.uSparkLight.value = Math.max(0.0, material.uniforms.uSparkLight.value - dt * 5.5);

      if (!SHINE.on && s >= SHINE.next && s >= SHINE.cooldownUntil) {
        const a = rnd(0.45, 1.15);
        triggerShineSweep(Math.cos(a) * (Math.random() < 0.5 ? -1 : 1), Math.sin(a), rnd(1.0, 1.4));
      }
      if (SHINE.on) {
        const pShine = (s - SHINE.t0) / SHINE.dur;
        if (pShine >= 1) {
          SHINE.on = false;
          SHINE.next = s + rnd(10.0, 18.0);
          material.uniforms.uShine.value = -1;
        } else {
          material.uniforms.uShine.value = pShine * pShine * (3 - 2 * pShine);
        }
      }

      // Smoothly transition theme shadow & highlight colors
      const tgt = targetPaletteRef.current;
      for (let i = 0; i < 3; i++) {
        curShadow[i] += (tgt.shadow[i] - curShadow[i]) * 0.08;
        curHighlight[i] += (tgt.highlight[i] - curHighlight[i]) * 0.08;
      }
      material.uniforms.uShadow.value.set(curShadow[0], curShadow[1], curShadow[2]);
      material.uniforms.uHighlight.value.set(curHighlight[0], curHighlight[1], curHighlight[2]);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    };

    frame();

    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      geo.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [resolution, interactive]);

  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <canvas
      ref={canvasRef}
      width={resolution}
      height={resolution}
      className={`df-anvil-3d-logo sharpness-pixelated ${className}`}
      style={{
        width: dim,
        height: dim,
        aspectRatio: '1 / 1',
        display: 'block',
        cursor: interactive ? 'pointer' : 'default',
      }}
    />
  );
};
