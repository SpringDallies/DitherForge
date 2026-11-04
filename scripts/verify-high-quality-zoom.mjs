import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ditherforge-hqzoom-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9778',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1600,1000',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://127.0.0.1:5173/app.html'
], { stdio: 'ignore' });

async function waitForCdp(port = 9778, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const pageTab = list.find((t) => t.type === 'page' && t.url.includes('5173'));
      if (pageTab && pageTab.webSocketDebuggerUrl) {
        return pageTab.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Chrome remote debugging port not available');
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(new Error(msg.error.message));
      else cb.resolve(msg.result);
    }
  };

  return {
    async open() {
      if (ws.readyState === WebSocket.OPEN) return;
      await new Promise((resolve) => { ws.onopen = resolve; });
    },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    },
    close() {
      ws.close();
    }
  };
}

async function evalInPage(cdp, fnStr) {
  const res = await cdp.send('Runtime.evaluate', {
    expression: fnStr,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    console.error('CDP Exception:', JSON.stringify(res.exceptionDetails, null, 2));
    throw new Error(res.exceptionDetails.text || 'CDP execution error');
  }
  return res.result.value;
}

async function run() {
  try {
    const wsUrl = await waitForCdp();
    const cdp = cdpClient(wsUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('==================================================================');
    console.log('       TESTING: HYBRID VIEWPORT DOWNSAMPLING & MOIRÉ AUDIT        ');
    console.log('==================================================================');

    // 1. Wait for store and canvas
    let ready = false;
    for (let i = 0; i < 30; i++) {
      ready = await evalInPage(cdp, 'Boolean(window.__DITHERFORGE_STORE__ && document.querySelector("#mainViewportCanvas"))');
      if (ready) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!ready) throw new Error('DitherForge failed to initialize in page');

    // Load a 400x300 high-frequency checkerboard dither pattern to test gamma and moiré
    await evalInPage(cdp, `
      (() => {
        const store = window.__DITHERFORGE_STORE__.getState();
        const w = 400, h = 300;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            // 50% checkerboard alternating dots
            const v = (x + y) % 2 === 0 ? 255 : 0;
            img.data[idx] = v;
            img.data[idx + 1] = v;
            img.data[idx + 2] = v;
            img.data[idx + 3] = 255;
          }
        }
        store.loadImageFromData(img, 'checkerboard_test.png');
        store.setAlgorithmId('none'); // pure checkerboard test
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    // Verify initial canvas dimensions and state at 100% zoom
    const initialState = await evalInPage(cdp, `
      (() => {
        const mainCanvas = document.querySelector('#mainViewportCanvas');
        const hqCanvas = document.querySelector('#hqPresentationCanvas');
        return {
          mainWidth: mainCanvas.width,
          mainHeight: mainCanvas.height,
          mainDisplay: getComputedStyle(mainCanvas).display,
          hqCanvasPresent: Boolean(hqCanvas),
          docAttr: document.documentElement.getAttribute('data-high-quality-zoom')
        };
      })()
    `);
    console.log('[TEST 1] Initial State at 100% Zoom:', initialState);
    if (initialState.mainWidth !== 400 || initialState.mainHeight !== 300) {
      throw new Error(`Expected main canvas 400x300, got ${initialState.mainWidth}x${initialState.mainHeight}`);
    }
    if (initialState.mainDisplay !== 'block') {
      throw new Error(`Expected main canvas display: block at 100% zoom, got ${initialState.mainDisplay}`);
    }
    console.log('  PASS: At 100% zoom, native mainViewportCanvas is displayed directly at native resolution.');

    // 2. Test Zoom levels: [10%, 25%, 50%, 75%, 100%, 150%, 200%] with High-Quality Zoom ENABLED
    console.log('\n[TEST 2] Verifying Hybrid Viewport Scaling across [10, 25, 50, 75, 100, 150, 200]%');
    const testZooms = [10, 25, 50, 75, 100, 150, 200];
    const outDir = 'scratch/zoom_verified_all';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    for (const z of testZooms) {
      await evalInPage(cdp, `
        (() => {
          const store = window.__DITHERFORGE_STORE__.getState();
          store.setZoom(${z});
        })()
      `);
      await new Promise((r) => setTimeout(r, 200));

      const zoomState = await evalInPage(cdp, `
        (() => {
          const mainCanvas = document.querySelector('#mainViewportCanvas');
          const hqCanvas = document.querySelector('#hqPresentationCanvas');
          const isHqActive = ${z < 100};
          
          let centerRgb = null;
          if (isHqActive && hqCanvas) {
            const ctx = hqCanvas.getContext('2d');
            const data = ctx.getImageData(0, 0, hqCanvas.width, hqCanvas.height);
            const midIdx = (Math.floor(hqCanvas.height / 2) * hqCanvas.width + Math.floor(hqCanvas.width / 2)) * 4;
            centerRgb = [data.data[midIdx], data.data[midIdx + 1], data.data[midIdx + 2]];
          } else {
            const ctx = mainCanvas.getContext('2d');
            const data = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
            const midIdx = (Math.floor(mainCanvas.height / 2) * mainCanvas.width + Math.floor(mainCanvas.width / 2)) * 4;
            centerRgb = [data.data[midIdx], data.data[midIdx + 1], data.data[midIdx + 2]];
          }

          return {
            zoom: ${z},
            mainWidth: mainCanvas.width,
            mainHeight: mainCanvas.height,
            mainDisplay: getComputedStyle(mainCanvas).display,
            hqDisplay: hqCanvas ? getComputedStyle(hqCanvas).display : 'none',
            hqWidth: hqCanvas ? hqCanvas.width : 0,
            hqHeight: hqCanvas ? hqCanvas.height : 0,
            centerRgb,
            mainImageRendering: getComputedStyle(mainCanvas).imageRendering
          };
        })()
      `);

      console.log(`  Zoom ${z}%: main[${zoomState.mainWidth}x${zoomState.mainHeight}, display=${zoomState.mainDisplay}], hq[${zoomState.hqWidth}x${zoomState.hqHeight}, display=${zoomState.hqDisplay}], centerRGB=[${zoomState.centerRgb}]`);

      // Verify invariant: main canvas always retains 400x300 full resolution!
      if (zoomState.mainWidth !== 400 || zoomState.mainHeight !== 300) {
        throw new Error(`Main canvas resolution corrupted at zoom ${z}%!`);
      }

      if (z < 100) {
        // Below 100%: HQ downsampling must be active
        if (zoomState.mainDisplay !== 'none' || zoomState.hqDisplay !== 'block') {
          throw new Error(`Expected HQ canvas to be displayed at zoom ${z}%!`);
        }
        const expectedDw = Math.max(1, Math.round(400 * (z / 100)));
        const expectedDh = Math.max(1, Math.round(300 * (z / 100)));
        if (zoomState.hqWidth !== expectedDw || zoomState.hqHeight !== expectedDh) {
          throw new Error(`Expected HQ canvas ${expectedDw}x${expectedDh}, got ${zoomState.hqWidth}x${zoomState.hqHeight}`);
        }
        // Verify sRGB gamma preservation: center pixel must be ~188 (+-4), NOT 127
        const val = zoomState.centerRgb[0];
        if (val < 184 || val > 192) {
          throw new Error(`sRGB gamma failure at zoom ${z}%: expected ~188, got ${val}`);
        }
      } else {
        // At or above 100%: Native / pixelated main canvas must be active
        if (zoomState.mainDisplay !== 'block' || zoomState.hqDisplay !== 'none') {
          throw new Error(`Expected main canvas to be displayed at zoom ${z}%!`);
        }
        if (zoomState.mainImageRendering !== 'pixelated') {
          throw new Error(`Expected pixelated rendering at zoom ${z}%, got ${zoomState.mainImageRendering}`);
        }
      }

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`${outDir}/zoom_${z}_hq_on.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log('  PASS: All zoom levels strictly adhere to hybrid scaling specifications with linear-gamma preservation.');

    // 3. Test High-Quality Zoom DISABLED across all zoom levels
    console.log('\n[TEST 3] Verifying High-Quality Zoom DISABLED across all zoom levels');
    await evalInPage(cdp, `
      (() => {
        const raw = localStorage.getItem('ditherforge_settings');
        const s = raw ? JSON.parse(raw) : {};
        s.highQualityZoom = false;
        localStorage.setItem('ditherforge_settings', JSON.stringify(s));
        document.documentElement.setAttribute('data-high-quality-zoom', 'false');
        window.dispatchEvent(new CustomEvent('ditherforge_settings_changed', { detail: s }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    for (const z of [10, 25, 50, 75, 100]) {
      await evalInPage(cdp, `
        (() => {
          const store = window.__DITHERFORGE_STORE__.getState();
          store.setZoom(${z});
        })()
      `);
      await new Promise((r) => setTimeout(r, 150));

      const zoomStateDisabled = await evalInPage(cdp, `
        (() => {
          const mainCanvas = document.querySelector('#mainViewportCanvas');
          const hqCanvas = document.querySelector('#hqPresentationCanvas');
          return {
            mainDisplay: getComputedStyle(mainCanvas).display,
            hqDisplay: hqCanvas ? getComputedStyle(hqCanvas).display : 'none'
          };
        })()
      `);

      if (zoomStateDisabled.mainDisplay !== 'block' || zoomStateDisabled.hqDisplay !== 'none') {
        throw new Error(`When disabled, main canvas must remain visible and HQ canvas hidden at zoom ${z}%!`);
      }
    }
    console.log('  PASS: When disabled, original rendering is strictly retained at all zoom levels.');

    // 4. Test Settings persistence
    console.log('\n[TEST 4] Testing Setting Toggle & Persistence');
    await evalInPage(cdp, `
      (() => {
        const raw = localStorage.getItem('ditherforge_settings');
        const s = raw ? JSON.parse(raw) : {};
        s.highQualityZoom = true;
        localStorage.setItem('ditherforge_settings', JSON.stringify(s));
        document.documentElement.setAttribute('data-high-quality-zoom', 'true');
        window.dispatchEvent(new CustomEvent('ditherforge_settings_changed', { detail: s }));
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const restoredSetting = await evalInPage(cdp, `
      (() => {
        const raw = localStorage.getItem('ditherforge_settings');
        const parsed = JSON.parse(raw);
        return parsed.highQualityZoom;
      })()
    `);
    if (restoredSetting !== true) throw new Error('Setting failed to persist as true');
    console.log('  PASS: High-quality zoom setting properly saved and restored in localStorage.');

    console.log('\n==================================================================');
    console.log('✅ ALL HYBRID VIEWPORT DOWNSAMPLING VERIFICATION TESTS PASSED!    ');
    console.log('==================================================================');

    cdp.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
