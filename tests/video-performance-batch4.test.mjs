import assert from 'node:assert/strict';
import { packFfmpegStreamFramePacket } from '../src/services/ffmpegService.ts';
import { computeFrameFingerprint } from '../src/services/EngineBridge.ts';
import { applyTweaksFast } from '../src/utils/fastTweaks.ts';
import { DitherWorkerClient } from '../src/workers/ditherWorkerClient.ts';

console.log('==================================================================');
console.log('       BATCH 4: VIDEO PERFORMANCE & CROSS-PLATFORM TESTS          ');
console.log('==================================================================');

// 1. Test packFfmpegStreamFramePacket
{
  const sessionId = 'ff_stream_123456';
  const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
  const packet = packFfmpegStreamFramePacket(sessionId, rgba);

  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  const idLen = view.getUint32(0, true);
  const decodedId = new TextDecoder().decode(packet.subarray(4, 4 + idLen));
  const decodedRgba = packet.subarray(4 + idLen);

  assert.equal(decodedId, sessionId, 'Session ID matches packet header');
  assert.deepEqual(Array.from(decodedRgba), Array.from(rgba), 'RGBA frame bytes match payload');
  console.log('  PASS: packFfmpegStreamFramePacket encodes zero-copy binary IPC packet');
}

// 2. Test computeFrameFingerprint
{
  const w = 16;
  const h = 16;
  const frameA = new Uint8ClampedArray(w * h * 4);
  const frameB = new Uint8ClampedArray(w * h * 4);

  // Both frames have identical black letterbox bars at top and bottom (corners = 0,0,0,255)
  for (let i = 3; i < frameA.length; i += 4) {
    frameA[i] = 255;
    frameB[i] = 255;
  }
  // Only center pixels differ
  const midByte = ((w * h) >>> 1) * 4;
  frameA[midByte] = 25;
  frameB[midByte] = 220;

  const fpA = computeFrameFingerprint(frameA, w, h);
  const fpB = computeFrameFingerprint(frameB, w, h);

  assert.equal(fpA.s0, fpB.s0, 'Corner s0 matches');
  assert.equal(fpA.s4, fpB.s4, 'Corner s4 matches');
  assert.notEqual(fpA.s2, fpB.s2, 'Center s2 detects difference despite black borders');
  console.log('  PASS: computeFrameFingerprint distinguishes letterboxed video frames');
}

// 3. Test applyTweaksFast cached LUT
{
  const src = new Uint8ClampedArray([10, 80, 200, 255, 128, 128, 128, 255]);
  const a = src.slice();
  const b = src.slice();
  const tweaks = { brightness: 0.2, contrast: 0.35, saturation: 0.4, gamma: 1.4, hue: 0 };

  applyTweaksFast(a, 2, 1, tweaks);
  applyTweaksFast(b, 2, 1, tweaks);
  assert.deepEqual(Array.from(a), Array.from(b), 'Repeated frames produce identical output from LUT');

  // Verify cache invalidates cleanly when parameters change
  const c = src.slice();
  applyTweaksFast(c, 2, 1, { ...tweaks, brightness: -0.3 });
  assert.notDeepEqual(Array.from(c), Array.from(a), 'LUT cache refreshes on parameter change');
  console.log('  PASS: applyTweaksFast preallocated cached LUTs are fast and deterministic');
}

// 4. Test DitherWorkerClient latest-wins coalescing
{
  const dispatchedIds = [];
  const pendingResolvers = [];

  const mockWorker = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage(req) {
      dispatchedIds.push(req.requestId);
      pendingResolvers.push(() => {
        mockWorker.onmessage?.({
          data: {
            requestId: req.requestId,
            success: true,
            buffer: req.buffer,
            width: req.width,
            height: req.height,
            elapsedMs: 5
          }
        });
      });
    },
    terminate() {}
  };

  const client = new DitherWorkerClient(() => mockWorker, 5000);
  const makeReq = (tag) => {
    const buf = new Uint8ClampedArray(16).fill(tag);
    return {
      buffer: buf.buffer,
      width: 2,
      height: 2,
      algorithmId: 'floyd-steinberg',
      palette: [[0, 0, 0, 255], [255, 255, 255, 255]],
      params: {},
      tweaks: { brightness: 0, contrast: 0, saturation: 0, gamma: 1 },
      effects: [],
      coalesce: true
    };
  };

  const p1 = client.execute(makeReq(1)); // Dispatched immediately
  const p2 = client.execute(makeReq(2)); // Queued, then superseded by p3
  const p3 = client.execute(makeReq(3)); // Replaces p2 as latest queued

  assert.equal(dispatchedIds.length, 1, 'Only first frame dispatched while in flight');

  const r2 = await p2;
  assert.equal(r2.dropped, true, 'Superseded frame 2 marked dropped=true');

  // Finish frame 1 -> should dispatch frame 3 directly (frame 2 never sent to worker)
  pendingResolvers.shift()();
  const r1 = await p1;
  assert.equal(r1.dropped, undefined, 'Frame 1 completed normally');
  assert.equal(dispatchedIds.length, 2, 'Frame 3 dispatched immediately after frame 1');

  pendingResolvers.shift()();
  const r3 = await p3;
  assert.equal(r3.dropped, undefined, 'Frame 3 completed normally');
  assert.equal(new Uint8ClampedArray(r3.buffer)[0], 3, 'Frame 3 output buffer matches latest request');

  client.terminate();
  console.log('  PASS: DitherWorkerClient latest-wins coalescing drops superseded frames');
}

console.log('==================================================================');
console.log('✅ ALL BATCH 4 VIDEO PERFORMANCE TESTS PASSED                    ');
console.log('==================================================================');
