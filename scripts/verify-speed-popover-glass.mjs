import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ditherforge-speed-glass-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9444',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1400,900',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:5173/app.html'
], { stdio: 'ignore' });

async function waitForCdp(retries = 25) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9444/json');
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

async function run() {
  try {
    const wsUrl = await waitForCdp();
    const cdp = cdpClient(wsUrl);
    await cdp.open();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Wait for the page to initialize
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Toggle Still/Animated mode via the topbar segmented switch button
    const step1 = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const switchButtons = Array.from(document.querySelectorAll('.topbar-viewport-switch .switch-btn'));
          const animBtn = switchButtons.find(b => b.textContent.includes('Still') || b.textContent.includes('Animated'));
          if (animBtn) {
            animBtn.click();
            return { found: true, text: animBtn.textContent.trim() };
          }
          return { found: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Step 1 (Click Mode button):', step1.result.value);

    await new Promise((r) => setTimeout(r, 400));

    // 2. Click "Create" in the Create Animation Popup
    const step2 = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const submitBtn = document.querySelector('.df-create-anim-submit-btn');
          if (submitBtn) {
            submitBtn.click();
            return { found: true };
          }
          return { found: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Step 2 (Click Create Animation submit):', step2.result.value);

    await new Promise((r) => setTimeout(r, 500));

    // 3. Click the speed button (.df-speed-btn) to open the speed popover
    const step3 = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const speedBtn = document.querySelector('.df-speed-btn');
          if (speedBtn) {
            speedBtn.click();
            return { found: true, text: speedBtn.textContent.trim() };
          }
          return { found: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Step 3 (Click Speed button):', step3.result.value);

    await new Promise((r) => setTimeout(r, 300));

    // 4. Inspect computed style of .df-speed-popover
    const styleResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const popover = document.querySelector('.df-speed-popover');
          if (!popover) return { found: false };
          const style = window.getComputedStyle(popover);
          const rootGlass = document.documentElement.getAttribute('data-glass-blur');
          const items = Array.from(popover.querySelectorAll('.df-speed-popover-item')).map(i => i.textContent.trim());
          const rect = popover.getBoundingClientRect();
          return {
            found: true,
            rootGlass,
            backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
            webkitBackdropFilter: style.webkitBackdropFilter,
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            border: style.border,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            items
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Step 4 (Popover computed styles):', JSON.stringify(styleResult.result.value, null, 2));

    // 5. Capture screenshot of the popover region
    const clip = styleResult.result.value?.rect;
    if (clip) {
      const padding = 30;
      const screenshot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: Math.max(0, clip.left - padding),
          y: Math.max(0, clip.top - padding),
          width: clip.width + padding * 2,
          height: clip.height + padding * 2,
          scale: 1
        }
      });
      const buffer = Buffer.from(screenshot.data, 'base64');
      const outPath = path.join(process.cwd(), 'docs', 'screenshots', 'speed-popover-glass-verified.png');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      console.log('Saved clipped screenshot to:', outPath);
    }

    // 6. Test fallback when data-glass-blur is set to "false"
    const fallbackResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          document.documentElement.setAttribute('data-glass-blur', 'false');
          const popover = document.querySelector('.df-speed-popover');
          const style = window.getComputedStyle(popover);
          return {
            backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
            backgroundColor: style.backgroundColor
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Step 6 (Fallback with data-glass-blur="false"):', JSON.stringify(fallbackResult.result.value, null, 2));

    cdp.close();
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  }
}

run();
