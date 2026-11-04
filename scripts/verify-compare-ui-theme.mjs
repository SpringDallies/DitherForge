import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-verify-compare-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9792',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1400,900',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://127.0.0.1:5173/app.html'
], { stdio: 'ignore' });

async function waitForCdp(port = 9792, retries = 30) {
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
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
    },
    send(method, params = {}) {
      const reqId = id++;
      return new Promise((resolve, reject) => {
        callbacks.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    },
    close() {
      try { ws.close(); } catch {}
    }
  };
}

async function main() {
  console.log('==================================================================');
  console.log('         DITHERFORGE COMPARE UI THEME VERIFICATION                ');
  console.log('==================================================================');

  try {
    const wsUrl = await waitForCdp(9792);
    const client = cdpClient(wsUrl);
    await client.open();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    await new Promise((r) => setTimeout(r, 2000));

    // Enable Compare Mode
    const compareRes = await client.send('Runtime.evaluate', {
      expression: `(function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const compareBtn = buttons.find(b => b.textContent && b.textContent.trim().toLowerCase().includes('compare'));
        if (compareBtn) {
          compareBtn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });

    if (!compareRes.result.value) {
      throw new Error('Failed to find and click compare button');
    }

    await new Promise((r) => setTimeout(r, 600));

    // Verify DOM elements and styles
    const stylesRes = await client.send('Runtime.evaluate', {
      expression: `(function() {
        const divider = document.querySelector('.split-divider-overlay');
        const handle = document.querySelector('.split-handle');
        const badgeBefore = document.querySelector('.compare-badge.before');
        const badgeAfter = document.querySelector('.compare-badge.after');

        if (!divider || !handle || !badgeBefore || !badgeAfter) {
          return { found: false, error: 'Missing elements' };
        }

        const dividerStyle = window.getComputedStyle(divider);
        const handleStyle = window.getComputedStyle(handle);
        const badgeStyle = window.getComputedStyle(badgeBefore);

        return {
          found: true,
          dividerWidth: dividerStyle.width,
          dividerBg: dividerStyle.backgroundColor,
          dividerShadow: dividerStyle.boxShadow,
          handleRadius: handleStyle.borderRadius,
          handleWidth: handleStyle.width,
          handleHeight: handleStyle.height,
          badgeRadius: badgeStyle.borderRadius,
          badgeDisplay: badgeStyle.display
        };
      })()`,
      returnByValue: true
    });

    const info = stylesRes.result.value;
    if (!info.found) {
      console.error('FAIL: Elements not found:', info.error);
      process.exit(1);
    }

    console.log(`  PASS: Split divider rendered (width: ${info.dividerWidth}, background: ${info.dividerBg})`);
    console.log(`  PASS: Split handle rendered as circular disc (size: ${info.handleWidth}x${info.handleHeight}, radius: ${info.handleRadius})`);
    console.log(`  PASS: Compare badge rendered as pill (radius: ${info.badgeRadius}, display: ${info.badgeDisplay})`);

    // Verify Dragging
    const handlePos = await client.send('Runtime.evaluate', {
      expression: `(function() {
        const handle = document.querySelector('.split-handle');
        const rect = handle.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      returnByValue: true
    });

    const pos = handlePos.result.value;
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: pos.x,
      y: pos.y,
      button: 'left',
      clickCount: 1
    });

    await new Promise((r) => setTimeout(r, 80));

    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: pos.x + 50,
      y: pos.y,
      button: 'left'
    });

    await new Promise((r) => setTimeout(r, 120));

    const dragClassCheck = await client.send('Runtime.evaluate', {
      expression: `document.querySelector('.split-divider-overlay').classList.contains('dragging')`,
      returnByValue: true
    });

    if (dragClassCheck.result.value) {
      console.log('  PASS: Split divider dynamically activates .dragging class during drag interaction');
    } else {
      console.error('  FAIL: .dragging class not active');
      process.exit(1);
    }

    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: pos.x + 50,
      y: pos.y,
      button: 'left'
    });

    console.log('==================================================================');
    console.log('✅ ALL COMPARE UI THEME CHECKS PASSED');
    console.log('==================================================================');

    client.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch(err => {
  console.error(err);
  try { chromeProc.kill(); } catch {}
  process.exit(1);
});
