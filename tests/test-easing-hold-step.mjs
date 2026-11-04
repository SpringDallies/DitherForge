import assert from 'assert';

// Test applyEasing directly
function applyEasing(t, mode) {
  const clamped = Math.max(0, Math.min(1, t));
  switch (mode) {
    case 'easeIn':
      return clamped * clamped;
    case 'easeOut':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'easeInOut':
      return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'pulse':
      return Math.sin(clamped * Math.PI);
    case 'step':
      return clamped < 0.5 ? 0 : 1;
    default:
      return clamped;
  }
}

function evaluateTrack(track, currentTime) {
  if (currentTime < track.startTime || currentTime > track.endTime) return null;
  const span = Math.max(0.001, track.endTime - track.startTime);
  const rawProgress = (currentTime - track.startTime) / span;
  const eased = applyEasing(rawProgress, track.easing);
  return track.fromValue + (track.toValue - track.fromValue) * eased;
}

console.log('Testing Easing: Hold (Step)...');

// 1. Normalized values
assert.strictEqual(applyEasing(0.0, 'step'), 0, 't=0 should be 0 (fromValue)');
assert.strictEqual(applyEasing(0.25, 'step'), 0, 't=0.25 should be 0 (fromValue)');
assert.strictEqual(applyEasing(0.499, 'step'), 0, 't=0.499 should be 0 (fromValue)');
assert.strictEqual(applyEasing(0.5, 'step'), 1, 't=0.5 should step to 1 (toValue)');
assert.strictEqual(applyEasing(0.75, 'step'), 1, 't=0.75 should be 1 (toValue)');
assert.strictEqual(applyEasing(1.0, 'step'), 1, 't=1.0 should be 1 (toValue)');

console.log('  PASS: Normalized step values hold 0 for first half and step to 1 for second half.');

// 2. Track evaluation
const track = {
  startTime: 2.0,
  endTime: 6.0,
  fromValue: 10,
  toValue: 90,
  easing: 'step'
};

assert.strictEqual(evaluateTrack(track, 2.0), 10, 'At startTime (2.0s), value is 10');
assert.strictEqual(evaluateTrack(track, 3.0), 10, 'At 25% duration (3.0s), value holds 10');
assert.strictEqual(evaluateTrack(track, 3.99), 10, 'Just before midpoint (3.99s), value holds 10');
assert.strictEqual(evaluateTrack(track, 4.0), 90, 'At midpoint (4.0s, 50%), value steps to 90');
assert.strictEqual(evaluateTrack(track, 5.0), 90, 'At 75% duration (5.0s), value holds 90');
assert.strictEqual(evaluateTrack(track, 6.0), 90, 'At endTime (6.0s), value holds 90');

console.log('  PASS: Track with Hold (Step) holds fromValue for first half and steps to toValue for second half.');
console.log('All Hold (Step) tests passed successfully!');

