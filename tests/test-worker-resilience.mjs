// Worker Communication & Error Handling Verification
import { DitherWorkerClient } from '../src/workers/ditherWorkerClient.ts';

// Mock Worker implementation for node testing environment
class MockWorker {
  constructor(behavior = 'normal') {
    this.behavior = behavior;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.terminated = false;
  }

  postMessage(message, transfer) {
    if (this.terminated) {
      throw new Error('Cannot postMessage on terminated worker');
    }

    if (this.behavior === 'crash') {
      setTimeout(() => {
        if (this.onerror) {
          this.onerror({ message: 'Out of memory / Uncaught worker crash' });
        }
      }, 10);
      return;
    }

    if (this.behavior === 'error-response') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: message.requestId,
              success: false,
              error: 'Invalid algorithm ID specified'
            }
          });
        }
      }, 10);
      return;
    }

    if (this.behavior === 'hang') {
      // Do not respond; test timeout
      return;
    }

    // Normal response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            requestId: message.requestId,
            success: true,
            buffer: message.buffer,
            width: message.width,
            height: message.height,
            elapsedMs: 12.5
          }
        });
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }
}

async function runTests() {
  console.log('==================================================================');
  console.log('       TESTING WORKER ERROR HANDLING & RESILIENCE                ');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Successful execution
  try {
    const client = new DitherWorkerClient(() => new MockWorker('normal'));
    const dummyBuf = new ArrayBuffer(16);
    const res = await client.execute({
      buffer: dummyBuf,
      width: 2,
      height: 2,
      tweaks: { brightness: 0, contrast: 0, saturation: 0, gamma: 1 },
      algorithmId: 'floyd-steinberg',
      palette: [[0, 0, 0], [255, 255, 255]],
      params: {},
      effects: []
    });
    assert(res.success === true, 'Successful execution returns success: true');
    assert(res.requestId === 1, 'Response includes correct requestId');
    assert(res.width === 2 && res.height === 2, 'Response returns correct dimensions');
    client.terminate();
  } catch (err) {
    assert(false, `Normal execution threw error: ${err.message}`);
  }

  // 2. Structured error response with matching requestId
  try {
    const client = new DitherWorkerClient(() => new MockWorker('error-response'));
    const dummyBuf = new ArrayBuffer(16);
    let caught = false;
    try {
      await client.execute({
        buffer: dummyBuf,
        width: 2,
        height: 2,
        tweaks: { brightness: 0, contrast: 0, saturation: 0, gamma: 1 },
        algorithmId: 'invalid-algo',
        palette: [],
        params: {},
        effects: []
      });
    } catch (e) {
      caught = true;
      assert(e.message.includes('Invalid algorithm ID specified'), 'Reject includes structured worker error message');
    }
    assert(caught, 'Promise correctly rejected on worker error response');
    assert(client.getPendingCount() === 0, 'No pending requests left hanging after error response');
    client.terminate();
  } catch (err) {
    assert(false, `Error test failure: ${err.message}`);
  }

  // 3. Unexpected worker crash / termination
  try {
    let mockWorkerInstance;
    const client = new DitherWorkerClient(() => {
      mockWorkerInstance = new MockWorker('crash');
      return mockWorkerInstance;
    });
    const dummyBuf = new ArrayBuffer(16);
    let caughtCrash = false;
    try {
      await client.execute({
        buffer: dummyBuf,
        width: 2,
        height: 2,
        tweaks: { brightness: 0, contrast: 0, saturation: 0, gamma: 1 },
        algorithmId: 'floyd-steinberg',
        palette: [],
        params: {},
        effects: []
      });
    } catch (e) {
      caughtCrash = true;
      assert(e.message.includes('Worker terminated unexpectedly'), 'Crash error message propagated cleanly');
    }
    assert(caughtCrash, 'Pending request rejected on unexpected worker crash');
    assert(client.getPendingCount() === 0, 'Pending map cleared on crash');
    client.terminate();
  } catch (err) {
    assert(false, `Crash test failure: ${err.message}`);
  }

  // 4. Request timeout prevents infinite hang
  try {
    const client = new DitherWorkerClient(() => new MockWorker('hang'), 50);
    const dummyBuf = new ArrayBuffer(16);
    let timedOut = false;
    try {
      await client.execute({
        buffer: dummyBuf,
        width: 2,
        height: 2,
        tweaks: { brightness: 0, contrast: 0, saturation: 0, gamma: 1 },
        algorithmId: 'floyd-steinberg',
        palette: [],
        params: {},
        effects: []
      }, 50);
    } catch (e) {
      timedOut = true;
      assert(e.message.includes('timed out after 50ms'), 'Timeout error generated correctly');
    }
    assert(timedOut, 'Hanging request aborted by timeout');
    assert(client.getPendingCount() === 0, 'Pending map cleared after timeout');
    client.terminate();
  } catch (err) {
    assert(false, `Timeout test failure: ${err.message}`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
