import assert from 'node:assert/strict';
import {
  algorithmIdToSnake,
  algorithmIdToKebab,
  normalizeAlgorithmId,
  KEBAB_TO_SNAKE_EXCEPTIONS,
  SNAKE_TO_KEBAB_EXCEPTIONS,
} from '../src/utils/algorithm-ids.js';

// Import the real registry to validate normalization against it.
import { ALGORITHM_REGISTRY } from '../src/dither-engine/algorithms.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (e) { failures++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

// Naive kebab <-> snake conversion works for the majority of ids.
check("kebab -> snake for ordinary ids", () => {
  assert.equal(algorithmIdToSnake("floyd-steinberg"), "floyd_steinberg");
  assert.equal(algorithmIdToSnake("jarvis-judice-ninke"), "jarvis_judice_ninke");
  assert.equal(algorithmIdToSnake("bayer-2x2"), "bayer_2x2");
});
check("snake -> kebab for ordinary ids", () => {
  assert.equal(algorithmIdToKebab("floyd_steinberg"), "floyd-steinberg");
  assert.equal(algorithmIdToKebab("jarvis_judice_ninke"), "jarvis-judice-ninke");
  assert.equal(algorithmIdToKebab("bayer_2x2"), "bayer-2x2");
});

// Exceptions map correctly.
check("sierra / two-row-sierra -> sierra_2", () => {
  assert.equal(algorithmIdToSnake("sierra"), "sierra_2");
  assert.equal(algorithmIdToSnake("two-row-sierra"), "sierra_2");
});
check("ostromukhov -> ostromoukhov", () => {
  assert.equal(algorithmIdToSnake("ostromukhov"), "ostromoukhov");
});
check("sierra_2 -> sierra (canonical frontend id)", () => {
  assert.equal(algorithmIdToKebab("sierra_2"), "sierra");
});
check("ostromoukhov -> ostromukhov", () => {
  assert.equal(algorithmIdToKebab("ostromoukhov"), "ostromukhov");
});

// Round-trip for ordinary ids.
check("round-trip kebab->snake->kebab", () => {
  const ids = ["floyd-steinberg","atkinson","stucki","burkes","bayer-4x4","clustered-dot","scanline_jitter".replace('_','-')];
  for (const kebab of ids) {
    assert.equal(algorithmIdToKebab(algorithmIdToSnake(kebab)), kebab);
  }
});

// normalizeAlgorithmId returns the canonical frontend id for both formats.
check("normalizeAlgorithmId accepts snake and returns kebab", () => {
  assert.equal(normalizeAlgorithmId("floyd_steinberg", ALGORITHM_REGISTRY), "floyd-steinberg");
  assert.equal(normalizeAlgorithmId("floyd-steinberg", ALGORITHM_REGISTRY), "floyd-steinberg");
  assert.equal(normalizeAlgorithmId("sierra_2", ALGORITHM_REGISTRY), "sierra");
  assert.equal(normalizeAlgorithmId("sierra", ALGORITHM_REGISTRY), "sierra");
});

// Unknown ids pass through unchanged.
check("unknown id passes through unchanged", () => {
  assert.equal(normalizeAlgorithmId("not-an-algorithm", ALGORITHM_REGISTRY), "not-an-algorithm");
});

// Every registered kebab id normalizes to itself.
check("all registered ids normalize to themselves", () => {
  for (const entry of ALGORITHM_REGISTRY) {
    assert.equal(normalizeAlgorithmId(entry.id, ALGORITHM_REGISTRY), entry.id);
  }
});

// Non-string inputs pass through.
check("non-string inputs pass through", () => {
  assert.equal(algorithmIdToSnake(null), null);
  assert.equal(algorithmIdToKebab(undefined), undefined);
});

console.log(`\n${failures === 0 ? "ALL IDENTIFIER CONVERSION TESTS PASSED" : failures + " TEST(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
