import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs', 'screenshots', 'polish');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ditherforge-polish-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1400,900',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:4173/'
], { stdio: 'ignore' });

async function waitForCdp(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const list = await res.json();
      const pageTab = list.find((t) => t.type === 'page' && t.url.includes('localhost:4173'));
      if (pageTab && pageTab.webSocketDebuggerUrl) {
        return pageTab.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
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

async function run() {
  try {
    const wsUrl = await waitForCdp();
    const client = cdpClient(wsUrl);
    await client.open();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Wait 2.5s for initial render
    await new Promise((r) => setTimeout(r, 2500));

    // SCREENSHOT 1: Lenis sidebar scroll
    console.log('Capturing Screenshot 1: lenis-sidebar-scroll.png ...');
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const scrollable = document.querySelector('.sidebar-scrollable-content');
          if (scrollable) {
            scrollable.scrollTop = 380;
          }
        })();
      `
    });
    await new Promise((r) => setTimeout(r, 1000));
    const snap1 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'lenis-sidebar-scroll.png'), Buffer.from(snap1.data, 'base64'));
    console.log('Saved lenis-sidebar-scroll.png (1400x900)');

    // SCREENSHOT 2: Transparent import
    console.log('Capturing Screenshot 2: transparent-import.png ...');
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const w = 480;
          const h = 480;
          const off = document.createElement('canvas');
          off.width = w;
          off.height = h;
          const ctx = off.getContext('2d');

          // Transparent background with a distinct circle graphic
          const grad = ctx.createRadialGradient(240, 240, 30, 240, 240, 210);
          grad.addColorStop(0, '#f43f5e');
          grad.addColorStop(0.5, '#8b5cf6');
          grad.addColorStop(1, '#06b6d4');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(240, 240, 210, 0, Math.PI * 2);
          ctx.fill();

          // Cut out transparent center hole
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(240, 240, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';

          const imgData = ctx.getImageData(0, 0, w, h);
          if (window.useAppStore) {
            window.useAppStore.getState().loadImageFromData(imgData, 'transparent_emblem.png');
            window.useAppStore.getState().setShowBeforeAfter(true);
            window.useAppStore.getState().setSplitRatio(0.5);
          }
        })();
      `
    });
    await new Promise((r) => setTimeout(r, 1200));
    const snap2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'transparent-import.png'), Buffer.from(snap2.data, 'base64'));
    console.log('Saved transparent-import.png (1400x900)');

    // SCREENSHOT 3: Bayer 8x8 preset (amber_crt_monitor)
    console.log('Capturing Screenshot 3: bayer-8x8-preset.png ...');
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.useAppStore) {
            const store = window.useAppStore.getState();
            store.setShowBeforeAfter(false);
            store.setAlgorithmId('bayer-8x8');
            store.setActivePaletteId('phosphor_amber');
            store.updateCurrentAlgoParam('threshold', 0.5);
            store.updateCurrentAlgoParam('scale', 1.0);
            store.setContrast(20);
            store.setGamma(1.1);
            store.setEffects([
              { id: 'scanlines', type: 'scanlines', enabled: true, params: { thickness: 1, intensity: 0.35 } },
              { id: 'glow', type: 'glow', enabled: true, params: { radius: 2, intensity: 0.5 } }
            ]);
            store.loadSampleImage();
          }
          const scrollable = document.querySelector('.sidebar-scrollable-content');
          if (scrollable) {
            scrollable.scrollTop = 0;
          }
        })();
      `
    });
    await new Promise((r) => setTimeout(r, 1500));
    const snap3 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'bayer-8x8-preset.png'), Buffer.from(snap3.data, 'base64'));
    console.log('Saved bayer-8x8-preset.png (1400x900)');

    client.close();
    console.log('All 3 screenshots successfully generated!');
  } finally {
    try { chromeProc.kill(); } catch {}
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  try { chromeProc.kill(); } catch {}
  process.exit(1);
});
