import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ditherforge-hqzoom-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9777',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1600,1000',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://127.0.0.1:5173/app.html'
], { stdio: 'ignore' });

async function waitForCdp(port = 9777, retries = 30) {
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
    console.log('       TESTING: HIGH-QUALITY ZOOM RENDERING & BEHAVIOR             ');
    console.log('==================================================================');

    // 1. Wait for store and canvas
    let ready = false;
    for (let i = 0; i < 30; i++) {
      ready = await evalInPage(cdp, 'Boolean(window.__DITHERFORGE_STORE__ && document.querySelector("#mainViewportCanvas"))');
      if (ready) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!ready) throw new Error('DitherForge failed to initialize in page');

    // Load calibration pattern and set algorithm
    await evalInPage(cdp, `
      (() => {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.loadSampleImage();
        store.setAlgorithmId('floyd-steinberg');
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    // Verify initial canvas dimensions and styles
    const initialInfo = await evalInPage(cdp, `
      (() => {
        const canvas = document.querySelector('#mainViewportCanvas');
        const docAttr = document.documentElement.getAttribute('data-high-quality-zoom');
        return {
          width: canvas.width,
          height: canvas.height,
          docAttr,
          computedImageRendering: getComputedStyle(canvas).imageRendering,
          inlineImageRendering: canvas.style.imageRendering,
          classList: Array.from(canvas.classList)
        };
      })()
    `);
    console.log('[TEST 1] Initial state (zoom=100%):', initialInfo);
    if (initialInfo.width !== 400 || initialInfo.height !== 300) {
      throw new Error(`Expected 400x300, got ${initialInfo.width}x${initialInfo.height}`);
    }
    if (initialInfo.computedImageRendering !== 'pixelated') {
      throw new Error(`Expected pixelated at 100%, got ${initialInfo.computedImageRendering}`);
    }
    console.log('  PASS: Initial 100% zoom correctly renders pixelated.');

    const outDir = 'scratch/hq_zoom_verified';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // 2. Test High-Quality Zoom Enabled at zoom levels [100, 75, 50, 25, 10]
    console.log('\n[TEST 2] Verifying High-Quality Zoom ENABLED at [100, 75, 50, 25, 10]%');
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

    const testZooms = [100, 75, 50, 25, 10];
    for (const z of testZooms) {
      await evalInPage(cdp, `
        (() => {
          const store = window.__DITHERFORGE_STORE__.getState();
          store.setZoom(${z});
        })()
      `);
      await new Promise((r) => setTimeout(r, 150));

      const zoomState = await evalInPage(cdp, `
        (() => {
          const canvas = document.querySelector('#mainViewportCanvas');
          const stage = document.querySelector('.canvas-unframed-stage');
          return {
            zoom: ${z},
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasImageRendering: getComputedStyle(canvas).imageRendering,
            stageImageRendering: getComputedStyle(stage).imageRendering,
            hasSmoothClass: canvas.classList.contains('smooth-downscale'),
            transform: stage.style.transform
          };
        })()
      `);

      const expectedRendering = z < 100 ? 'auto' : 'pixelated';
      const expectedSmooth = z < 100;

      console.log(`  Zoom ${z}%: canvas rendering="${zoomState.canvasImageRendering}", smoothClass=${zoomState.hasSmoothClass}`);

      if (zoomState.canvasImageRendering !== expectedRendering) {
        throw new Error(`Zoom ${z}% expected ${expectedRendering}, got ${zoomState.canvasImageRendering}`);
      }
      if (zoomState.hasSmoothClass !== expectedSmooth) {
        throw new Error(`Zoom ${z}% expected smoothClass=${expectedSmooth}, got ${zoomState.hasSmoothClass}`);
      }
      if (zoomState.canvasWidth !== 400 || zoomState.canvasHeight !== 300) {
        throw new Error(`Canvas backing buffer corrupted: ${zoomState.canvasWidth}x${zoomState.canvasHeight}`);
      }

      // Capture screenshot
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`${outDir}/hq_enabled_zoom_${z}.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log('  PASS: All zoom levels correctly toggle between auto (<100%) and pixelated (>=100%).');

    // 3. Test High-Quality Zoom DISABLED at zoom levels [100, 75, 50, 25, 10]
    console.log('\n[TEST 3] Verifying High-Quality Zoom DISABLED at [100, 75, 50, 25, 10]%');
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

    for (const z of testZooms) {
      await evalInPage(cdp, `
        (() => {
          const store = window.__DITHERFORGE_STORE__.getState();
          store.setZoom(${z});
        })()
      `);
      await new Promise((r) => setTimeout(r, 150));

      const zoomState = await evalInPage(cdp, `
        (() => {
          const canvas = document.querySelector('#mainViewportCanvas');
          return {
            zoom: ${z},
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasImageRendering: getComputedStyle(canvas).imageRendering,
            hasSmoothClass: canvas.classList.contains('smooth-downscale')
          };
        })()
      `);

      console.log(`  Zoom ${z}% (disabled): canvas rendering="${zoomState.canvasImageRendering}", smoothClass=${zoomState.hasSmoothClass}`);

      if (zoomState.canvasImageRendering !== 'pixelated') {
        throw new Error(`When disabled, zoom ${z}% expected pixelated, got ${zoomState.canvasImageRendering}`);
      }
      if (zoomState.hasSmoothClass) {
        throw new Error(`When disabled, zoom ${z}% should NOT have smooth-downscale class`);
      }
      if (zoomState.canvasWidth !== 400 || zoomState.canvasHeight !== 300) {
        throw new Error(`Canvas backing buffer corrupted: ${zoomState.canvasWidth}x${zoomState.canvasHeight}`);
      }

      // Capture screenshot
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`${outDir}/hq_disabled_zoom_${z}.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log('  PASS: When disabled, all zoom levels strictly retain original pixelated rendering.');

    // 4. Test Settings UI Dialog DOM & Persistence
    console.log('\n[TEST 4] Verifying Settings Dialog DOM and setting persistence');
    const settingsUiCheck = await evalInPage(cdp, `
      (() => {
        // Open Settings Dialog via header/button or window trigger
        const settingsBtn = document.querySelector('button[aria-label="Settings"]') ||
                            Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
        if (settingsBtn) settingsBtn.click();
        return Boolean(document.querySelector('.settings-dialog'));
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const hqSettingFound = await evalInPage(cdp, `
      (() => {
        const rows = Array.from(document.querySelectorAll('.settings-row'));
        const hqRow = rows.find(r => r.textContent.includes('High-quality zoom'));
        return Boolean(hqRow);
      })()
    `);
    console.log('  Settings Dialog opened:', settingsUiCheck, '| High-quality zoom row exists:', hqSettingFound);
    if (!hqSettingFound) {
      throw new Error('High-quality zoom option not found in Settings Dialog UI');
    }
    console.log('  PASS: High-quality zoom option verified in Settings Dialog UI.');

    // Reset settings to default
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

    console.log('\n==================================================================');
    console.log('✅ ALL HIGH-QUALITY ZOOM VERIFICATION TESTS PASSED SUCCESSFULLY!  ');
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
