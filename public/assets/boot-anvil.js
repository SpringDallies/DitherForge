(function () {
  const canvas = document.getElementById('boot-anvil-3d');
  if (!canvas) return;

  window.__DF_BOOT_STATE__ = { status: 'pending' };

  const storedTheme = (function() {
    try { return localStorage.getItem('ditherforge_theme') || 'dark_pro'; } catch(e) { return 'dark_pro'; }
  })();

  const THEMES = {
    'light_pro':        { bg:'#DDDDE3', shadow:[0.54,0.56,0.59], highlight:[1.00,1.00,1.00] },
    'dark':         { bg:'#333333', shadow:[0.34,0.35,0.45], highlight:[0.96,0.98,1.00] },
    'dark_pro':    { bg:'#0D0E11', shadow:[0.32,0.34,0.41], highlight:[0.96,0.96,0.97] },
    'nord':             { bg:'#2E3440', shadow:[0.37,0.51,0.67], highlight:[0.93,0.94,0.96] },
    'evergreen':        { bg:'#1B2A23', shadow:[0.31,0.46,0.39], highlight:[0.90,0.95,0.90] },
    'gruvbox':          { bg:'#282828', shadow:[0.84,0.36,0.05], highlight:[0.98,0.95,0.78] },
    'catppuccin_mocha': { bg:'#1E1E2E', shadow:[0.54,0.71,0.98], highlight:[0.80,0.84,0.96] },
    'tokyo_night':      { bg:'#1A1B26', shadow:[0.48,0.64,0.97], highlight:[0.75,0.79,0.96] },
    'kanagawa_wave':    { bg:'#1F1F28', shadow:[0.49,0.61,0.85], highlight:[0.86,0.84,0.73] },
    'rose_pine':        { bg:'#191724', shadow:[0.92,0.44,0.57], highlight:[0.88,0.87,0.96] },
    'dracula':          { bg:'#1E1F29', shadow:[0.74,0.58,0.98], highlight:[0.97,0.97,0.95] },
    'monokai_pro':      { bg:'#221F22', shadow:[0.99,0.60,0.40], highlight:[0.99,0.99,0.98] },
    'solarized_dark':   { bg:'#002B36', shadow:[0.16,0.63,0.60], highlight:[0.99,0.96,0.89] },
    'one_dark':         { bg:'#21252B', shadow:[0.38,0.69,0.94], highlight:[0.93,0.94,0.96] }
  };

  const activePal = THEMES[storedTheme] || THEMES.dark_pro;
  try {
    document.documentElement.style.setProperty('--bg', activePal.bg);
    document.body.style.backgroundColor = activePal.bg;
  } catch (e) {}

  const canUseWorker = typeof canvas.transferControlToOffscreen === 'function' && typeof Worker !== 'undefined';

  if (canUseWorker) {
    try {
      const offscreen = canvas.transferControlToOffscreen();
      const bootScriptUrl =
        (document.currentScript && document.currentScript.src) || window.location.href;
      const workerUrl = new URL('./boot-anvil-worker.js', bootScriptUrl).href;
      const worker = new Worker(workerUrl);

      worker.postMessage({
        type: 'init',
        canvas: offscreen,
        theme: storedTheme
      }, [offscreen]);

      const sendRect = () => {
        const r = canvas.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      };

      const onPointerMove = (e) => {
        worker.postMessage({
          type: 'pointermove',
          clientX: e.clientX,
          clientY: e.clientY,
          rect: sendRect()
        });
      };

      const onPointerDown = (e) => {
        worker.postMessage({
          type: 'pointerdown',
          clientX: e.clientX,
          clientY: e.clientY,
          rect: sendRect()
        });
      };

      const onPointerLeave = () => {
        worker.postMessage({ type: 'pointerleave' });
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      canvas.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('mouseleave', onPointerLeave);
      window.addEventListener('blur', onPointerLeave);

      const onVisibilityChange = () => {
        worker.postMessage({ type: 'visibility', hidden: document.hidden });
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      window.__dismissBootAnvil = function() {
        window.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('mouseleave', onPointerLeave);
        window.removeEventListener('blur', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);

        const container = document.getElementById('boot-loader');
        if (container) {
          container.style.transition = 'opacity 180ms ease-out';
          container.style.opacity = '0';
          setTimeout(() => {
            try {
              worker.postMessage({ type: 'dispose' });
            } catch (err) {}
            container.remove();
          }, 200);
        } else {
          try { worker.postMessage({ type: 'dispose' }); } catch (err) {}
        }
      };
      return;
    } catch (e) {
      console.warn('OffscreenCanvas worker initialization fallback:', e);
    }
  }

  // Fallback: If Web Worker or OffscreenCanvas is unavailable
  runMainThreadAnvil();

  function runMainThreadAnvil() {
    const renderer = new THREE.WebGLRenderer({
    
        canvas,
    
        alpha: true,
    
        antialias: false,
    
        depth: true,
    
        stencil: false,
    
        powerPreference: 'default',
    
        preserveDrawingBuffer: false
    
      });
    
      renderer.setPixelRatio(1);

      renderer.setSize(128, 128, false);

      renderer.setClearColor(0x000000, 0);

      const gl = renderer.getContext();
      if (!gl || gl.isContextLost()) {
        window.__DF_BOOT_STATE__ = { status: 'failed', reason: 'WebGL context unavailable or lost' };
        console.error('[BootAnvil] WebGL context unavailable or lost');
        return;
      }
    
    
    
      const scene  = new THREE.Scene();
    
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    
      camera.position.set(0, 2.0, 10);
    
      camera.lookAt(0, 0, 0);
    
    
    
      const rootGroup = new THREE.Group();
    
      scene.add(rootGroup);
    
    
    
      /* Geometry: extrude the traced outline with a rounded forged-iron bevel[cite: 1] */
    
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
    
    
    
      /* Smooth the normals on the sides and bevels while keeping front/back caps crisp[cite: 1] */
    
      (function smoothWalls(g) {
    
        const p = g.attributes.position, out = new Float32Array(p.count * 3);
    
        const key = i => p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    
        const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    
        const acc = new Map(), tris = [];
    
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
    
              acc.get(kk).add(f);
    
            }
    
          }
    
        }
    
        tris.forEach((t, ti) => {
    
          for (let k = 0; k < 3; k++) {
    
            let n = t.cap ? t.f.clone() : acc.get(key(ti * 3 + k)).clone();
    
            n = n.length() > 1e-9 ? n.normalize() : new THREE.Vector3(0, 0, 1);
    
            out.set([n.x, n.y, n.z], (ti * 3 + k) * 3);
    
          }
    
        });
    
        g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    
      })(geo);
    
    
    
      /* High-contrast Chrome/Steel Shader + Raytraced 3D Blush + Click Spark Glow + Red Heat */
    
      const material = new THREE.ShaderMaterial({
    
        uniforms: {
    
          uShadow:     { value: new THREE.Vector3() },
    
          uHighlight:  { value: new THREE.Vector3() },
    
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
    
    
    
          // 3D Capsule Area-Light Raytracer onto the metal surface
    
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
    
            chrome += 0.42 * fresnel * (0.35 + 0.65 * smoothstep(-0.3, 0.5, R.y));
    
    
    
            float frontGleam = vCap * pow(max(n.z, 0.0), 1.3);
    
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
    
    
    
            // Shift the entire anvil's metal palette toward heated crimson-red iron when uHeat > 0
    
            vec3 heatShadow = mix(uShadow, vec3(0.88, 0.16, 0.24), uHeat * 0.72);
    
            vec3 heatMid    = mix(mix(uShadow, uHighlight, 0.62), vec3(0.98, 0.36, 0.42), uHeat * 0.62);
    
            vec3 heatHi     = mix(mix(uHighlight, vec3(1.0), 0.45), vec3(1.00, 0.78, 0.76), uHeat * 0.55);
    
    
    
            vec3 lo  = heatShadow * (0.34 + 0.14 * uHeat);
    
            vec3 mid = heatMid;
    
            vec3 hi  = heatHi;
    
    
    
            vec3 col = q < 0.42
    
              ? mix(lo, mid, q / 0.42)
    
              : mix(mid, hi, pow((q - 0.42) / 0.58, 0.85));
    
    
    
            // Subtle internal forge-ember glow in the core of the anvil when heated
    
            if (uHeat > 0.01) {
    
              float coreHeat = exp(-dot(vP * vec2(0.45, 0.65), vP * vec2(0.45, 0.65))) * uHeat;
    
              float heatQuant = clamp(floor(coreHeat * 4.0 + 0.4 + b4 * 0.35) / 4.0, 0.0, 1.0);
    
              col += vec3(0.45, 0.06, 0.08) * heatQuant;
    
            }
    
    
    
            // Localized spark glow on the metal where the anvil was clicked
    
            if (uSparkLight > 0.01) {
    
              float sDist = length(vLocalPos - uSparkPos);
    
              float sGlow = (1.0 / (1.0 + sDist * sDist * 4.5)) * uSparkLight;
    
              float sQuant = clamp(floor(sGlow * 4.0 + 0.35 + b4 * 0.4) / 4.0, 0.0, 1.0);
    
              col = mix(col, vec3(1.0, 0.90, 0.72), clamp(sQuant * 0.75, 0.0, 1.0));
    
            }
    
    
    
            // Raytraced 3D Area-Light Glow from the Floating '// //' Blush Rods onto the Metal
    
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
    
    
    
            // Dynamic metallic glint sweep
    
            float t = (dot(vP, uAxis) - (uShine * 2.0 - 1.0) * 4.4) / 0.46;
    
            float band = uShine < 0.0 ? 0.0 : exp(-t * t);
    
            col = mix(col, vec3(1.0), step(0.56, band + b4 * 0.30));
    
    
    
            gl_FragColor = vec4(col, 1.0);
    
          }`
    
      });
    
    
    
      const mesh = new THREE.Mesh(geo, material);
    
      rootGroup.add(mesh);
    
    
    
      /* ---------- Constant-Size 3D Floating '// //' Blush Rods (Only Light Emission Changes) ---------- */
    
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
    
            float spec = pow(max(dot(n, H), 0.0), 14.0);
    
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
    
            float highlightStrength = clamp((spec * 0.9 + pow(ndotv, 3.5) * 0.65) * (0.35 + 0.85 * em), 0.0, 1.0);
    
            col = mix(col, hiWhite, highlightStrength);
    
    
    
            gl_FragColor = vec4(col, clamp(uOpacity, 0.0, 1.0));
    
          }`
    
      });
    
    
    
      function create3DSlash(x1, y1, x2, y2, radius) {
    
        const slashGroup = new THREE.Group();
    
        const dx = x2 - x1, dy = y2 - y1;
    
        const len = Math.hypot(dx, dy);
    
        const angle = Math.atan2(dy, dx) - Math.PI * 0.5;
    
    
    
        const cylGeo = new THREE.CylinderGeometry(radius, radius, len, 12, 1);
    
        const capGeo = new THREE.SphereGeometry(radius, 12, 8);
    
    
    
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
    
      blushGroup.scale.setScalar(1.0);
    
      blushGroup.visible = false;
    
    
    
      /* ---------- Restored 3D Diamond/Streak Forge Sparks (Strictly On-Anvil, Glow Scales with Clicks) ---------- */
    
      const sparkGroup = new THREE.Group();
    
      rootGroup.add(sparkGroup);
    
    
    
      const sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
    
      sparkGeo.scale(0.65, 2.6, 0.65);
    
    
    
      const SPARK_POOL = [];
    
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
    
              // Warm golden-orange spark at low clicks -> brighter white-hot core as click count climbs
    
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
    
    
    
      const raycaster = new THREE.Raycaster();
    
      const ndcClick  = new THREE.Vector2();
    
      const localHit  = new THREE.Vector3();
    
    
    
      // Strictly raycast against the anvil mesh ONLY (returns null if clicked outside the anvil)
    
      function getStrictAnvilClickPoint(clientX, clientY) {
    
        const rect = canvas.getBoundingClientRect();
    
        ndcClick.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    
        ndcClick.y = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    
    
    
        rootGroup.updateMatrixWorld(true);
    
        raycaster.setFromCamera(ndcClick, camera);
    
    
    
        const hits = raycaster.intersectObject(mesh, false);
    
        if (hits.length === 0) return null;
    
    
    
        localHit.copy(hits[0].point);
    
        rootGroup.worldToLocal(localHit);
    
        localHit.z += 0.14;
    
        return localHit;
    
      }
    
    
    
      function spawnClickSparks(localOrigin, clickMeter) {
    
        // Glow intensity scales slightly with how much the anvil is clicked
    
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
    
    
    
      function stepSparks(dt) {
    
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
    
          sp.vx *= (1.0 - 1.5 * dt);
    
          sp.mesh.position.x += sp.vx * dt;
    
          sp.mesh.position.y += sp.vy * dt;
    
          sp.mesh.position.z += sp.vz * dt;
    
    
    
          sp.mesh.rotation.z = Math.atan2(sp.vy, sp.vx) - Math.PI * 0.5;
    
          sp.mesh.scale.setScalar(sp.scale * (1.0 - 0.55 * progress));
    
          sp.mesh.material.uniforms.uLife.value = progress;
    
        }
    
      }
    
    
    
      /* ---------- 3D Pixel-Dithered Steam Puffs (Released at Max Blush/Heat Tier) ---------- */
    
      const steamGroup = new THREE.Group();
    
      scene.add(steamGroup);
    
    
    
      const steamBaseGeo = new THREE.IcosahedronGeometry(0.32, 1);
    
      const STEAM_PUFFS = [];
    
    
    
      function makeSteamMaterial() {
    
        return new THREE.ShaderMaterial({
    
          transparent: true,
    
          depthWrite: false,
    
          uniforms: {
    
            uLife: { value: 0.0 }
    
          },
    
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
    
      }
    
    
    
      for (let i = 0; i < 10; i++) {
    
        const mat = makeSteamMaterial();
    
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
    
    
    
      let steamSpawnTimer = 0;
    
      function spawnSteamPuff() {
    
        const p = STEAM_PUFFS.find(x => !x.active);
    
        if (!p) return;
    
        p.active = true;
    
        p.age = 0;
    
        p.maxAge = rnd(0.95, 1.45);
    
        const spawnX = rootGroup.position.x + rnd(-1.85, 1.85);
    
        const spawnY = rootGroup.position.y + rnd(1.05, 1.45);
    
        const spawnZ = rnd(-0.25, 0.45);
    
        p.mesh.position.set(spawnX, spawnY, spawnZ);
    
        p.vx = rnd(-0.45, 0.45);
    
        p.vy = rnd(1.35, 2.05);
    
        p.rx = rnd(-2.5, 2.5);
    
        p.ry = rnd(-2.5, 2.5);
    
        p.baseScale = rnd(0.55, 1.05);
    
        p.mesh.scale.setScalar(p.baseScale * 0.5);
    
        p.mesh.visible = true;
    
      }
    
    
    
      function stepSteam(dt, shouldEmit) {
    
        if (shouldEmit) {
    
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
    
      }
    
    
    
      /* ---------- Continuous Organic Drift + Floating Breath (No Pose System)[cite: 1] ---------- */
    
      const makeNoise = () => {
    
        const g = Array.from({ length: 256 }, () => rnd(-1, 1));
    
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    
        return x => {
    
          const i = Math.floor(x), f = x - i, u = fade(f);
    
          const a = g[i & 255] * f, b = g[(i + 1) & 255] * (f - 1);
    
          return (a + (b - a) * u) * 2;
    
        };
    
      };
    
    
    
      const chan = (amp, hz) => ({
    
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
    
    
    
      /* ---------- Wide Distance-Falloff Cursor Attraction + 5-Click Minimum Blush ---------- */
    
      const HOVER = {
    
        tx: 0, ty: 0,
    
        x: 0, y: 0,
    
        vx: 0, vy: 0,
    
        influence: 0,
    
        smoothedInfluence: 0,
    
        energy: 0,
    
        lastPx: 0,
    
        lastPy: 0,
    
        // Dynamic click recoil springs
    
        clickPosY: 0,
    
        clickVelY: 0,
    
        clickRotZ: 0,
    
        clickVelRotZ: 0,
    
        clickPitch: 0,
    
        clickVelPitch: 0,
    
        // Tiered Click Blush & Heat state (Minimum 5 clicks to activate blush)
    
        clickMeter: 0,
    
        lastClickTime: -999,
    
        rodOpacity: 0,
    
        rodEmission: 0,
    
        anvilHeat: 0,
    
        steaming: false
    
      };
    
    
    
      function updateHoverFromWindow(clientX, clientY) {
    
        const rect = canvas.getBoundingClientRect();
    
        const cx = rect.left + rect.width * 0.5;
    
        const cy = rect.top + rect.height * 0.5;
    
        const halfW = Math.max(rect.width * 0.5, 1);
    
        const halfH = Math.max(rect.height * 0.5, 1);
    
    
    
        const rawX = (clientX - cx) / halfW;
    
        const rawY = (clientY - cy) / halfH;
    
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
    
      }
    
    
    
      window.addEventListener('pointermove', e => updateHoverFromWindow(e.clientX, e.clientY));
    
    
    
      const handleWindowLeave = () => {
    
        HOVER.tx = 0;
    
        HOVER.ty = 0;
    
        HOVER.influence = 0;
    
      };
    
    
    
      document.addEventListener('mouseleave', handleWindowLeave);
    
      window.addEventListener('blur', handleWindowLeave);
    
    
    
      // Strictly triggers ONLY when clicking directly ON the 3D anvil mesh
    
      canvas.addEventListener('pointerdown', e => {
    
        const hitLocal = getStrictAnvilClickPoint(e.clientX, e.clientY);
    
        if (!hitLocal) return; // Ignore clicks outside the anvil
    
    
    
        const now = (performance.now() - start) / 1000;
    
        HOVER.lastClickTime = now;
    
        HOVER.clickMeter = Math.min(14.0, HOVER.clickMeter + 1.0);
    
    
    
        // Spawn 3D streak sparks at the exact clicked spot on the anvil
    
        spawnClickSparks(hitLocal, HOVER.clickMeter);
    
    
    
        // Apply physical click recoil scaled by click count
    
        const intensity = 0.40 + 0.60 * Math.min(1.0, HOVER.clickMeter / 11.0);
    
        HOVER.clickVelY -= (1.0 + 1.3 * intensity);
    
        const sideSign = Math.abs(hitLocal.x) > 0.15 ? Math.sign(hitLocal.x) : (Math.random() < 0.5 ? -1 : 1);
    
        HOVER.clickVelRotZ += -sideSign * (0.75 + 1.15 * intensity);
    
        HOVER.clickVelPitch += (0.60 + 0.90 * intensity);
    
    
    
        if (HOVER.clickMeter >= 10.5) {
    
          spawnSteamPuff();
    
        }
    
      });
    
    
    
      let gainNow = 1;
    
      let lastS = 0;
    
    
    
      function stepMotion(s) {
    
        const dt = Math.max(0.001, Math.min(s - lastS, 0.05));
    
        lastS = s;
    
    
    
        // 1. Continuous Organic Noise Drift[cite: 1]
    
        for (const c of Object.values(MOTION)) {
    
          const x = s * c.hz + c.off;
    
          c.v = c.amp * (0.85 + 0.3 * c.nm(x * 0.2)) * (c.n1(x) + 0.3 * c.n2(x * 2.7));
    
        }
    
        MOTION.rz.v -= MOTION.ry.v * 0.10;
    
        MOTION.px.v += MOTION.ry.v * 0.12;
    
        MOTION.py.v += MOTION.rx.v * 0.15;
    
    
    
        HOVER.smoothedInfluence += (HOVER.influence - HOVER.smoothedInfluence) * (1 - Math.exp(-5.0 * dt));
    
        const wanderWeight = 1.0 - 0.72 * HOVER.smoothedInfluence;
    
    
    
        // 2. Continuous Floating & Breathing
    
        const breathMain  = Math.sin(s * 2.05);
    
        const floatY      = 0.24 * breathMain + MOTION.py.v * wanderWeight;
    
        const floatX      = MOTION.px.v * wanderWeight;
    
        const breathPitch = 0.055 * Math.cos(s * 2.05 - 0.4);
    
        const breathScale = 1.0 + 0.022 * breathMain;
    
    
    
        // 3. Fast Post-Click Blush & Heat Decay
    
        const timeSinceClick = s - HOVER.lastClickTime;
    
        if (timeSinceClick > 0.65) {
    
          const coolRate = HOVER.clickMeter >= 10.5 ? 3.5 : 2.8;
    
          HOVER.clickMeter = Math.max(0, HOVER.clickMeter - dt * coolRate);
    
        }
    
    
    
        const m = HOVER.clickMeter;
    
    
    
        // Minimum 5 clicks required to activate the blush rods
    
        const targetOpacity = m >= 5.0 ? Math.min(1.0, (m - 4.5) / 1.5) : 0.0;
    
        const targetEmission = m >= 5.0
    
          ? 0.28 + 1.02 * Math.pow(Math.min(1.0, Math.max(0.0, (m - 5.0) / 6.0)), 1.15)
    
          : 0.0;
    
    
    
        // 7.5+ clicks -> 11+ clicks: Entire anvil heats up and turns forged red
    
        const targetHeat = m >= 7.5 ? Math.min(1.0, (m - 7.5) / 3.5) : 0.0;
    
    
    
        // 10.5+ clicks: Steam releases from the red-hot anvil
    
        HOVER.steaming = m >= 10.5;
    
    
    
        const opRate   = targetOpacity < HOVER.rodOpacity ? 9.5 : 6.5;
    
        const emRate   = targetEmission < HOVER.rodEmission ? 8.5 : 5.5;
    
        const heatRate = targetHeat < HOVER.anvilHeat ? 6.0 : 3.8;
    
    
    
        HOVER.rodOpacity  += (targetOpacity  - HOVER.rodOpacity)  * (1 - Math.exp(-opRate * dt));
    
        HOVER.rodEmission += (targetEmission - HOVER.rodEmission) * (1 - Math.exp(-emRate * dt));
    
        HOVER.anvilHeat   += (targetHeat     - HOVER.anvilHeat)   * (1 - Math.exp(-heatRate * dt));
    
    
    
        blushGroup.visible = HOVER.rodOpacity > 0.01;
    
        const emissionPulse = HOVER.rodEmission * (0.93 + 0.07 * Math.sin(s * 7.0));
    
    
    
        blushMaterial.uniforms.uOpacity.value  = HOVER.rodOpacity;
    
        blushMaterial.uniforms.uEmission.value = emissionPulse;
    
        material.uniforms.uBlush.value         = emissionPulse * HOVER.rodOpacity;
    
        material.uniforms.uHeat.value          = HOVER.anvilHeat;
    
    
    
        material.uniforms.uSparkLight.value = Math.max(0.0, material.uniforms.uSparkLight.value - dt * 5.5);
    
    
    
        stepSteam(dt, HOVER.steaming);
    
        stepSparks(dt);
    
    
    
        // 4. Dynamic Click Recoil Spring
    
        HOVER.clickVelY     += (-HOVER.clickPosY  * 65.0 - HOVER.clickVelY     * 10.5) * dt;
    
        HOVER.clickPosY     += HOVER.clickVelY * dt;
    
    
    
        HOVER.clickVelRotZ  += (-HOVER.clickRotZ  * 58.0 - HOVER.clickVelRotZ  * 9.5) * dt;
    
        HOVER.clickRotZ     += HOVER.clickVelRotZ * dt;
    
    
    
        HOVER.clickVelPitch += (-HOVER.clickPitch * 60.0 - HOVER.clickVelPitch * 10.0) * dt;
    
        HOVER.clickPitch    += HOVER.clickVelPitch * dt;
    
    
    
        // 5. Cursor Hover Spring
    
        const stiffness = 24.0;
    
        const damping = 7.2;
    
        HOVER.vx += ((HOVER.tx - HOVER.x) * stiffness - HOVER.vx * damping) * dt;
    
        HOVER.vy += ((HOVER.ty - HOVER.y) * stiffness - HOVER.vy * damping) * dt;
    
        HOVER.x += HOVER.vx * dt;
    
        HOVER.y += HOVER.vy * dt;
    
        HOVER.energy = Math.max(0, HOVER.energy - dt * 1.15);
    
    
    
        const bankZ = -HOVER.y * 0.14;
    
        rootGroup.rotation.set(
    
          MOTION.rx.v * wanderWeight + breathPitch + HOVER.x + HOVER.clickPitch,
    
          MOTION.ry.v * wanderWeight + HOVER.y,
    
          MOTION.rz.v * wanderWeight + bankZ + HOVER.clickRotZ
    
        );
    
        rootGroup.position.set(
    
          floatX + HOVER.y * 0.22,
    
          floatY - HOVER.x * 0.18 + HOVER.clickPosY,
    
          0
    
        );
    
        rootGroup.scale.setScalar(breathScale);
    
      }
    
    
    
      /* ---------- Light: bends around the anvil ---------- */
    
      const L = {
    
        a: rnd(0, 6.28), b: rnd(0, 6.28), c: rnd(0, 6.28),
    
        s1: rnd(0.05, 0.09), s2: rnd(0.09, 0.14), s3: rnd(0.07, 0.11)
    
      };
    
    
    
      function stepLight(s) {
    
        const az = 0.20 + 0.45 * Math.sin(s * L.s1 + L.a) + 0.25 * Math.sin(s * L.s2 + L.b);
    
        const el = 0.78 + 0.18 * Math.sin(s * L.s3 + L.c) + 0.08 * Math.sin(s * 2.05);
    
        const azA = az + rootGroup.rotation.y * 0.75 - HOVER.y * 0.55;
    
        const elA = el - rootGroup.rotation.x * 0.75 + HOVER.x * 0.45;
    
    
    
        material.uniforms.uLight.value.set(
    
          Math.sin(azA) * Math.cos(elA),
    
          Math.sin(elA),
    
          Math.cos(azA) * Math.cos(elA)
    
        );
    
        blushMaterial.uniforms.uLight.value.copy(material.uniforms.uLight.value);
    
    
    
        const facing = Math.max(0, Math.cos(rootGroup.rotation.y) * Math.cos(rootGroup.rotation.x));
    
        gainNow += ((1.02 + 0.28 * (1 - facing)) - gainNow) * 0.06;
    
        material.uniforms.uGain.value = gainNow;
    
      }
    
    
    
      /* ---------- Less Frequent, Subtle Dynamic Shine[cite: 1] ---------- */
    
      const SHINE = {
    
        on: false,
    
        t0: 0,
    
        dur: 1.1,
    
        next: rnd(6.0, 11.0),
    
        cooldownUntil: 0
    
      };
    
    
    
      function triggerShineSweep(dx, dy, dur) {
    
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
    
    
    
      function triggerInteractiveShine(dx, dy) {
    
        const now = (performance.now() - start) / 1000;
    
        if (SHINE.on || now < SHINE.cooldownUntil) return;
    
        if (HOVER.energy < 0.75) return;
    
        HOVER.energy = 0;
    
        triggerShineSweep(dx, dy, rnd(0.85, 1.15));
    
      }
    
    
    
      function stepShine(s) {
    
        if (!SHINE.on && s >= SHINE.next && s >= SHINE.cooldownUntil) {
    
          const a = rnd(0.45, 1.15), flip = Math.random() < 0.5 ? -1 : 1;
    
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
    
      }
    
    
    
      /* ---------- Themes ---------- */
      const activePal = THEMES[storedTheme] || THEMES.dark_pro;
      let cur = { s: [...activePal.shadow], h: [...activePal.highlight] };
      let tgt = { s: [...activePal.shadow], h: [...activePal.highlight] };
      document.documentElement.style.setProperty('--bg', activePal.bg);
      document.body.style.backgroundColor = activePal.bg;
    
      /* ---------- Render loop with visibility & context-loss handling ---------- */
    
      const start = performance.now();
    
      let rafId = null;
    
      let contextLost = false;
    
    
    
      canvas.addEventListener('webglcontextlost', e => {
    
        e.preventDefault();
    
        contextLost = true;
    
        if (rafId !== null) cancelAnimationFrame(rafId);
    
      });
    
    
    
      canvas.addEventListener('webglcontextrestored', () => {
    
        contextLost = false;
    
        frame();
    
      });
    
    
    
      document.addEventListener('visibilitychange', () => {
    
        if (document.hidden) {
    
          if (rafId !== null) {
    
            cancelAnimationFrame(rafId);
    
            rafId = null;
    
          }
    
        } else if (!contextLost && rafId === null) {
    
          lastS = (performance.now() - start) / 1000;
    
          frame();
    
        }
    
      });
    
    
    
      let bootFirstFrameReported = false;
      function frame() {
    
        if (contextLost || document.hidden) return;
    
        const s = (performance.now() - start) / 1000;
    
        stepMotion(s);
    
        stepLight(s);
    
        stepShine(s);
    
        for (let i = 0; i < 3; i++) {
    
          cur.s[i] += (tgt.s[i] - cur.s[i]) * 0.08;
    
          cur.h[i] += (tgt.h[i] - cur.h[i]) * 0.08;
    
        }
    
        material.uniforms.uShadow.value.set(...cur.s);
    
        material.uniforms.uHighlight.value.set(...cur.h);
    
        renderer.render(scene, camera);
    
        if (!bootFirstFrameReported) {
          bootFirstFrameReported = true;
          const glErr = gl.getError();
          if (glErr !== gl.NO_ERROR) {
            window.__DF_BOOT_STATE__ = { status: 'failed', reason: `WebGL error 0x${glErr.toString(16)}` };
            console.error('[BootAnvil]', window.__DF_BOOT_STATE__.reason);
          } else {
            window.__DF_BOOT_STATE__ = { status: 'first-frame' };
          }
        }

        rafId = requestAnimationFrame(frame);
    
      }
    
    
    
      frame();
    
      window.__dismissBootAnvil = function() {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        const container = document.getElementById('boot-loader');
        if (container) {
          container.style.transition = 'opacity 180ms ease-out';
          container.style.opacity = '0';
          setTimeout(() => {
            try { renderer.dispose(); } catch(e) {}
            container.remove();
          }, 200);
        }
      };
  }
})();
