import assert from 'node:assert/strict';
import {
  EFFECT_ID_TO_RUST_KIND,
  effectItemToRustPayload,
  rustPayloadToEffectParams,
  serializeRustEffect,
  deserializeRustEffect,
} from '../.dsh-effect-schema-build/effect-schema.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (e) { failures++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

// 1. Canonical Rust kinds present for the 9 shared effects
check("Rust kind map covers all 9 shared effects", () => {
  const expected = ["glow","blur_sharpen","chromatic_aberration","jpeg_artifacts","halftone","scanlines","pixelate","curves_levels","vignette"];
  for (const id of expected) {
    if (EFFECT_ID_TO_RUST_KIND[id] === null) throw new Error(`${id} should map to a Rust kind`);
  }
  if (Object.keys(EFFECT_ID_TO_RUST_KIND).filter(k => EFFECT_ID_TO_RUST_KIND[k] !== null).length !== 9) {
    throw new Error("expected exactly 9 effects mapped to Rust kinds");
  }
});

// 2. Effects without a Rust counterpart map to null
check("inverse_glow and inverse_vignette have no Rust counterpart", () => {
  if (EFFECT_ID_TO_RUST_KIND.inverse_glow !== null) throw new Error("inverse_glow should be null");
  if (EFFECT_ID_TO_RUST_KIND.inverse_vignette !== null) throw new Error("inverse_vignette should be null");
});

// 3. camelCase params -> Rust snake_case payload (halftone as representative)
check("halftone camelCase -> Rust snake_case payload", () => {
  const r = effectItemToRustPayload("halftone", { dotSize: 7, angle: 30, shape: "diamond" });
  assert.deepStrictEqual(r, { kind: "Halftone", payload: { dot_size: 7, angle: 30, shape: "diamond" } });
});

// 4. chromatic_aberration offsetX/offsetY -> offset_x/offset_y
check("chromatic_aberration camelCase -> Rust snake_case", () => {
  const r = effectItemToRustPayload("chromatic_aberration", { offsetX: 8, offsetY: 2 });
  assert.deepStrictEqual(r, { kind: "ChromaticAberration", payload: { offset_x: 8, offset_y: 2 } });
});

// 5. curves_levels blackPoint/whitePoint/gamma -> snake_case
check("curves_levels camelCase -> Rust snake_case", () => {
  const r = effectItemToRustPayload("curves_levels", { blackPoint: 0.1, whitePoint: 0.9, gamma: 1.2 });
  assert.deepStrictEqual(r, { kind: "CurvesLevels", payload: { black_point: 0.1, white_point: 0.9, gamma: 1.2 } });
});

// 6. defaults applied when params missing
check("defaults applied for missing params", () => {
  const r = effectItemToRustPayload("glow", {});
  assert.deepStrictEqual(r, { kind: "Glow", payload: { radius: 3, intensity: 0.6 } });
});

// 7. unknown effect returns null
check("unknown effect type returns null", () => {
  if (effectItemToRustPayload("nonexistent", {}) !== null) throw new Error("expected null");
});

// 8. Rust snake_case payload -> frontend camelCase params round-trip
check("Rust payload -> camelCase params round-trip", () => {
  const rust = { kind: "Vignette", payload: { radius: 0.9, softness: 0.5 } };
  const params = rustPayloadToEffectParams("Vignette", rust.payload);
  assert.deepStrictEqual(params, { radius: 0.9, softness: 0.5 });
  const back = effectItemToRustPayload("vignette", params);
  assert.deepStrictEqual(back, rust);
});

// 9. serializeRustEffect produces snake_case JSON
check("serializeRustEffect emits snake_case JSON", () => {
  const json = serializeRustEffect({ id: "fx_1", enabled: true, effect: { kind: "Pixelate", payload: { block_size: 6 } } });
  const parsed = JSON.parse(json);
  assert.deepStrictEqual(parsed, { id: "fx_1", enabled: true, effect: { kind: "Pixelate", payload: { block_size: 6 } } });
});

// 10. deserializeRustEffect round-trip
check("deserializeRustEffect round-trips valid JSON", () => {
  const json = serializeRustEffect({ id: "fx_2", enabled: false, effect: { kind: "Scanlines", payload: { thickness: 3, intensity: 0.7 } } });
  const out = deserializeRustEffect(json);
  assert.deepStrictEqual(out, { id: "fx_2", enabled: false, effect: { kind: "Scanlines", payload: { thickness: 3, intensity: 0.7 } } });
});

// 11. deserializeRustEffect rejects malformed JSON
check("deserializeRustEffect rejects malformed input", () => {
  if (deserializeRustEffect("{not json") !== null) throw new Error("expected null for malformed JSON");
  if (deserializeRustEffect('{"id":1}') !== null) throw new Error("expected null for missing effect");
});

console.log(`\n${failures === 0 ? "ALL EFFECT SCHEMA TESTS PASSED" : failures + " TEST(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
