import assert from 'node:assert';

console.log('==================================================================');
console.log('       REORDERING LOGIC RIGOROUS BIDIRECTIONAL SIMULATION         ');
console.log('==================================================================\n');

function simulateDragDrop(initialArray: string[], fromIndex: number, insertionSlot: number): string[] {
  let targetIndex = insertionSlot;
  if (fromIndex < targetIndex) {
    targetIndex -= 1;
  }
  if (fromIndex === targetIndex) {
    return [...initialArray];
  }
  const nextArr = [...initialArray];
  const [movedItem] = nextArr.splice(fromIndex, 1);
  nextArr.splice(targetIndex, 0, movedItem);
  return nextArr;
}

const arr = ['A', 'B', 'C', 'D', 'E'];

// 1. Drag forward: move 'A' (index 0) to after 'B' (slot 2)
{
  const res = simulateDragDrop(arr, 0, 2);
  assert.deepStrictEqual(res, ['B', 'A', 'C', 'D', 'E']);
  console.log('  PASS: Drag forward by 1 (A from 0 -> slot 2):', res.join(''));
}

// 2. Drag forward to very end: move 'A' (index 0) to end (slot 5)
{
  const res = simulateDragDrop(arr, 0, 5);
  assert.deepStrictEqual(res, ['B', 'C', 'D', 'E', 'A']);
  console.log('  PASS: Drag forward to end (A from 0 -> slot 5):', res.join(''));
}

// 3. Drag forward: move 'B' (index 1) to after 'D' (slot 4)
{
  const res = simulateDragDrop(arr, 1, 4);
  assert.deepStrictEqual(res, ['A', 'C', 'D', 'B', 'E']);
  console.log('  PASS: Drag forward across multiple (B from 1 -> slot 4):', res.join(''));
}

// 4. Drag backward: move 'E' (index 4) to start (slot 0)
{
  const res = simulateDragDrop(arr, 4, 0);
  assert.deepStrictEqual(res, ['E', 'A', 'B', 'C', 'D']);
  console.log('  PASS: Drag backward to start (E from 4 -> slot 0):', res.join(''));
}

// 5. Drag backward: move 'D' (index 3) to between 'A' and 'B' (slot 1)
{
  const res = simulateDragDrop(arr, 3, 1);
  assert.deepStrictEqual(res, ['A', 'D', 'B', 'C', 'E']);
  console.log('  PASS: Drag backward across multiple (D from 3 -> slot 1):', res.join(''));
}

// 6. No-op drops: drop on own boundaries
{
  const resBefore = simulateDragDrop(arr, 2, 2);
  const resAfter = simulateDragDrop(arr, 2, 3);
  assert.deepStrictEqual(resBefore, arr);
  assert.deepStrictEqual(resAfter, arr);
  console.log('  PASS: Drop on self boundaries leaves array unchanged');
}

// 7. Comprehensive test across all combinations of fromIndex and insertionSlot
{
  for (let from = 0; from < arr.length; from++) {
    for (let slot = 0; slot <= arr.length; slot++) {
      const res = simulateDragDrop(arr, from, slot);
      assert.strictEqual(res.length, arr.length, 'Length must be preserved');
      assert.deepStrictEqual([...res].sort(), [...arr].sort(), 'All elements must be preserved');
    }
  }
  console.log('  PASS: All 30 permutations of from & slot verified strictly');
}

console.log('\n==================================================================');
console.log('✅ REORDERING LOGIC RIGOROUS BIDIRECTIONAL SIMULATION PASSED');
console.log('==================================================================\n');
