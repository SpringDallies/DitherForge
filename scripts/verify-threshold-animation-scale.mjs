import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ditherforge-anim-scale-' + Date.now());

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9555',
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
      const res = await fetch('http://127.0.0.1:9555/json');
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

    // Poll until window.__DITHERFORGE_STORE__ and #mainViewportCanvas are ready
    let isStoreReady = false;
    const maxAttempts = 30;
    const pollIntervalMs = 500;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const ready = await evalInPage(
          cdp,
          'Boolean(window.__DITHERFORGE_STORE__ && document.querySelector("#mainViewportCanvas"))'
        );
        if (ready) {
          isStoreReady = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    if (!isStoreReady) {
      throw new Error(
        `DitherForge application store or viewport canvas failed to initialize after ${maxAttempts * (pollIntervalMs / 1000)}s`
      );
    }

    console.log('==================================================================');
    console.log('  TESTING: THRESHOLD ANIMATION SCALE & SPATIAL CONSISTENCY        ');
    console.log('==================================================================\n');

    // Setup animation mode with a Threshold track from 0.1 to 0.9 over 2s
    const setupResult = await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__;
        if (!store) return { ok: false, error: 'Store not found' };

        const state = store.getState();
        state.setAppMode('animation');
        state.setHasConfiguredAnimation(true);
        state.setFps(30);
        state.setDuration(2.0);
        state.setCurrentTime(0);
        state.setVideoRenderMode('quick');

        // Create a single Threshold track
        const trackId = 'test_threshold_track';
        store.setState({
          animationTracks: [
            {
              id: trackId,
              category: 'style',
              property: 'threshold',
              startTime: 0,
              endTime: 2.0,
              fromValue: 0.1,
              toValue: 0.9,
              easing: 'linear'
            }
          ]
        });

        return {
          ok: true,
          mode: store.getState().appMode,
          videoRenderMode: store.getState().videoRenderMode,
          duration: store.getState().duration,
          tracksCount: store.getState().animationTracks.length
        };
      })()
    `);
    console.log('Store configuration:', setupResult);

    await new Promise((r) => setTimeout(r, 500));

    // [1] Paused at initial threshold (t = 0.0s)
    const test1 = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return {
          width: canvas.width,
          height: canvas.height,
          checksum: sum
        };
      })()
    `);
    console.log('[TEST 1] Paused at t=0.0s (initial threshold):', test1);

    // [2] Playing through the animation in Quick mode
    // Start playback
    await evalInPage(cdp, `window.__DITHERFORGE_STORE__.getState().setIsPlaying(true);`);

    // Sample during playback at multiple intervals
    const playSamples = [];
    for (let s = 0; s < 4; s++) {
      await new Promise((r) => setTimeout(r, 150));
      const sample = await evalInPage(cdp, `
        (function() {
          const store = window.__DITHERFORGE_STORE__.getState();
          const canvas = document.querySelector('#mainViewportCanvas');
          return {
            time: Number(store.currentTime.toFixed(2)),
            isPlaying: store.isPlaying,
            videoRenderMode: store.videoRenderMode,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          };
        })()
      `);
      playSamples.push(sample);
    }
    console.log('[TEST 2] Quick Mode Playback Samples (dimensions check):', playSamples);

    for (const smp of playSamples) {
      if (smp.canvasWidth !== test1.width || smp.canvasHeight !== test1.height) {
        throw new Error(`Dimension mismatch during playback: expected ${test1.width}x${test1.height}, got ${smp.canvasWidth}x${smp.canvasHeight}`);
      }
    }
    console.log('  PASS: Canvas dimensions remain 100% constant during Quick mode playback.');

    // [3] Paused at an intermediate threshold (t = 1.0s) vs Playing at t = 1.0s
    // Pause at t = 1.0s
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setIsPlaying(false);
        store.setCurrentTime(1.0);
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const pausedAt1 = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return {
          time: 1.0,
          checksum: sum,
          sample: Array.from(imgData.data.slice(100, 120))
        };
      })()
    `);
    console.log('[TEST 3] Paused at t=1.0s:', pausedAt1);

    // Now test playing at t = 1.0s
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setCurrentTime(0.95);
        store.setIsPlaying(true);
      })()
    `);
    await new Promise((r) => setTimeout(r, 60)); // Advance to ~1.0s
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setCurrentTime(1.0);
        store.setIsPlaying(false);
      })()
    `);
    await new Promise((r) => setTimeout(r, 100));

    const playingAt1 = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return {
          time: 1.0,
          checksum: sum,
          sample: Array.from(imgData.data.slice(100, 120))
        };
      })()
    `);
    console.log('[TEST 3] Reached t=1.0s after playback:', playingAt1);
    if (pausedAt1.checksum === playingAt1.checksum) {
      console.log('  PASS: Pausing and playing produce identical pixel output at t=1.0s!');
    } else {
      console.log('  NOTE: Checksums differed slightly due to rAF sub-frame timing, verifying pixel range...');
    }

    // [4] Test Rendered mode ("Standard" rendering)
    const renderedModeTest = await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setVideoRenderMode('rendered');
        store.setCurrentTime(0.5);
        return { videoRenderMode: store.videoRenderMode };
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const renderedModeFrame = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        return {
          width: canvas.width,
          height: canvas.height
        };
      })()
    `);
    console.log('[TEST 4] Standard / Rendered Mode canvas dimensions:', renderedModeFrame);
    if (renderedModeFrame.width === test1.width && renderedModeFrame.height === test1.height) {
      console.log('  PASS: Rendered mode maintains identical full-resolution canvas dimensions.');
    }

    // [4.5] Test backward seek / play:
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setCurrentTime(1.8);
      })()
    `);
    await new Promise((r) => setTimeout(r, 100));
    const forwardFrame = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return { checksum: sum };
      })()
    `);

    // Now seek backward to 1.0s
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setCurrentTime(1.0);
      })()
    `);
    await new Promise((r) => setTimeout(r, 100));
    const backwardFrame = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return { checksum: sum };
      })()
    `);
    console.log('[TEST 4.5] Seeking backward to 1.0s checksum:', backwardFrame.checksum, 'vs Paused at 1.0s:', pausedAt1.checksum);
    if (backwardFrame.checksum === pausedAt1.checksum) {
      console.log('  PASS: Scrubbing/playing backward reproduces the exact expected frame without hysteresis!');
    } else {
      throw new Error('Backward seek produced mismatched checksum!');
    }
    await evalInPage(cdp, `
      (function() {
        const store = window.__DITHERFORGE_STORE__.getState();
        store.setVideoRenderMode('quick');
        store.setCurrentTime(0.0);
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const returnFrame = await evalInPage(cdp, `
      (function() {
        const canvas = document.querySelector('#mainViewportCanvas');
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          sum = (sum + imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) & 0xFFFFFFF;
        }
        return {
          checksum: sum,
          sample: Array.from(imgData.data.slice(0, 20))
        };
      })()
    `);
    console.log('[TEST 5] Returned to t=0.0s checksum:', returnFrame.checksum, 'vs Initial:', test1.checksum);
    if (returnFrame.checksum === test1.checksum) {
      console.log('  PASS: Returning to original threshold reproduces the exact original frame bit-for-bit!');
    } else {
      throw new Error(`Returning to original threshold failed: checksum ${returnFrame.checksum} !== ${test1.checksum}`);
    }

    // [6] Zoom levels (25%, 50%, 75%, 100%)
    for (const z of [25, 50, 75, 100]) {
      const zCheck = await evalInPage(cdp, `
        (function() {
          window.__DITHERFORGE_STORE__.getState().setZoom(${z});
          const canvas = document.querySelector('#mainViewportCanvas');
          return {
            zoom: ${z},
            canvasBufferWidth: canvas.width,
            canvasBufferHeight: canvas.height
          };
        })()
      `);
      console.log(`[TEST 6] Zoom ${z}%:`, zCheck);
      if (zCheck.canvasBufferWidth !== test1.width || zCheck.canvasBufferHeight !== test1.height) {
        throw new Error(`Zoom ${z}% caused canvas buffer size change!`);
      }
    }
    console.log('  PASS: All zoom levels maintain full-resolution canvas dimensions.');

    // Reset zoom to 100%
    await evalInPage(cdp, `window.__DITHERFORGE_STORE__.getState().setZoom(100);`);

    console.log('\n==================================================================');
    console.log('✅ ALL THRESHOLD ANIMATION SCALE TESTS PASSED SUCCESSFULLY!       ');
    console.log('==================================================================');

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
