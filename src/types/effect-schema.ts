// DitherForge TypeScript <-> Rust Effect schema alignment.
//
// Rust reference (src-tauri/src/effects.rs):
//   pub enum PostEffectType {
//       Glow { radius: f32, intensity: f32 },
//       BlurSharpen { amount: f32 },
//       ChromaticAberration { offset_x: f32, offset_y: f32 },
//       JpegArtifacts { quality: f32 },
//       Halftone { dot_size: f32, angle: f32, shape: String },
//       Scanlines { thickness: f32, intensity: f32 },
//       Pixelate { block_size: u32 },
//       CurvesLevels { black_point: f32, white_point: f32, gamma: f32 },
//       Vignette { radius: f32, softness: f32 },
//   }
//   pub struct PostEffect { pub id: String, pub enabled: bool, pub effect: PostEffectType }
//
// This module mirrors the Rust Serde schema in TypeScript so the frontend data
// contract stays consistent with the parked Rust implementation. It does NOT
// change the active frontend EffectItem or AVAILABLE_EFFECT_TYPES; it is a
// read-only alignment layer for future Rust integration.

export type RustEffectTypeKind =
  | "Glow"
  | "BlurSharpen"
  | "ChromaticAberration"
  | "JpegArtifacts"
  | "Halftone"
  | "Scanlines"
  | "Pixelate"
  | "CurvesLevels"
  | "Vignette";

// Mirror of Rust PostEffectType using Rust's serde field names (snake_case).
export interface RustGlow { radius: number; intensity: number }
export interface RustBlurSharpen { amount: number }
export interface RustChromaticAberration { offset_x: number; offset_y: number }
export interface RustJpegArtifacts { quality: number }
export interface RustHalftone { dot_size: number; angle: number; shape: string }
export interface RustScanlines { thickness: number; intensity: number }
export interface RustPixelate { block_size: number }
export interface RustCurvesLevels { black_point: number; white_point: number; gamma: number }
export interface RustVignette { radius: number; softness: number }

export type RustEffectPayload =
  | { kind: "Glow"; payload: RustGlow }
  | { kind: "BlurSharpen"; payload: RustBlurSharpen }
  | { kind: "ChromaticAberration"; payload: RustChromaticAberration }
  | { kind: "JpegArtifacts"; payload: RustJpegArtifacts }
  | { kind: "Halftone"; payload: RustHalftone }
  | { kind: "Scanlines"; payload: RustScanlines }
  | { kind: "Pixelate"; payload: RustPixelate }
  | { kind: "CurvesLevels"; payload: RustCurvesLevels }
  | { kind: "Vignette"; payload: RustVignette }

export interface RustPostEffect {
  id: string;
  enabled: boolean;
  effect: RustEffectPayload;
}

// Map each AVAILABLE_EFFECT_TYPES id to its canonical Rust kind. Effects that
// have no Rust counterpart (inverse_glow, inverse_vignette) are omitted.
export const EFFECT_ID_TO_RUST_KIND: Record<string, RustEffectTypeKind | null> = {
  glow: "Glow",
  inverse_glow: null,
  blur_sharpen: "BlurSharpen",
  chromatic_aberration: "ChromaticAberration",
  jpeg_artifacts: "JpegArtifacts",
  halftone: "Halftone",
  scanlines: "Scanlines",
  pixelate: "Pixelate",
  curves_levels: "CurvesLevels",
  vignette: "Vignette",
  inverse_vignette: null,
};

// Convert a frontend EffectItem's camelCase params to the Rust snake_case payload.
// Returns null when the effect has no Rust counterpart.
export function effectItemToRustPayload(
  type: string,
  params: Record<string, any>,
): RustEffectPayload | null {
  const kind = EFFECT_ID_TO_RUST_KIND[type];
  if (!kind) return null;

  const p = params || {};
  switch (kind) {
    case "Glow":
      return { kind: "Glow", payload: { radius: Number(p.radius ?? 3), intensity: Number(p.intensity ?? 0.6) } };
    case "BlurSharpen":
      return { kind: "BlurSharpen", payload: { amount: Number(p.amount ?? 0.8) } };
    case "ChromaticAberration":
      return {
        kind: "ChromaticAberration",
        payload: { offset_x: Number(p.offsetX ?? 4), offset_y: Number(p.offsetY ?? 0) },
      };
    case "JpegArtifacts":
      return { kind: "JpegArtifacts", payload: { quality: Number(p.quality ?? 0.3) } };
    case "Halftone":
      return {
        kind: "Halftone",
        payload: { dot_size: Number(p.dotSize ?? 5), angle: Number(p.angle ?? 45), shape: String(p.shape ?? "circle") },
      };
    case "Scanlines":
      return { kind: "Scanlines", payload: { thickness: Number(p.thickness ?? 2), intensity: Number(p.intensity ?? 0.4) } };
    case "Pixelate":
      return { kind: "Pixelate", payload: { block_size: Number(p.blockSize ?? 4) } };
    case "CurvesLevels":
      return {
        kind: "CurvesLevels",
        payload: {
          black_point: Number(p.blackPoint ?? 0.05),
          white_point: Number(p.whitePoint ?? 0.95),
          gamma: Number(p.gamma ?? 1.1),
        },
      };
    case "Vignette":
      return { kind: "Vignette", payload: { radius: Number(p.radius ?? 0.8), softness: Number(p.softness ?? 0.4) } };
    default:
      return null;
  }
}

// Convert a Rust snake_case payload back to frontend camelCase params.
export function rustPayloadToEffectParams(kind: RustEffectTypeKind, payload: any): Record<string, any> {
  switch (kind) {
    case "Glow": return { radius: payload.radius, intensity: payload.intensity };
    case "BlurSharpen": return { amount: payload.amount };
    case "ChromaticAberration": return { offsetX: payload.offset_x, offsetY: payload.offset_y };
    case "JpegArtifacts": return { quality: payload.quality };
    case "Halftone": return { dotSize: payload.dot_size, angle: payload.angle, shape: payload.shape };
    case "Scanlines": return { thickness: payload.thickness, intensity: payload.intensity };
    case "Pixelate": return { blockSize: payload.block_size };
    case "CurvesLevels": return { blackPoint: payload.black_point, whitePoint: payload.white_point, gamma: payload.gamma };
    case "Vignette": return { radius: payload.radius, softness: payload.softness };
    default: return {};
  }
}

// Serialize a RustPostEffect to the JSON shape Rust would emit (snake_case keys,
// nested "effect" object with a "kind"/payload structure matching serde tagging).
export function serializeRustEffect(effect: RustPostEffect): string {
  return JSON.stringify({
    id: effect.id,
    enabled: effect.enabled,
    effect: effect.effect,
  });
}

// Deserialize a JSON string produced by Rust's serde into a RustPostEffect.
export function deserializeRustEffect(json: string): RustPostEffect | null {
  try {
    const parsed = JSON.parse(json) as RustPostEffect;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.enabled !== "boolean") return null;
    if (!parsed.effect || typeof parsed.effect.kind !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
