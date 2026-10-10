// DitherForge Presets Engine
// Curated Presets, User JSON Export/Import & Parameter Shuffle

export const BUILTIN_PRESETS = [
  {
    id: "mac_1984",
    name: "Apple Macintosh 1984",
    description: "Atkinson 1-bit monochrome diffusion with crisp voids and authentic early desktop contrast.",
    algorithmId: "atkinson",
    paletteId: "mac_classic_1984",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 8,
    brightness: 0.05,
    contrast: 0.2,
    saturation: 0.0,
    gamma: 1.0,
    effects: []
  },
  {
    id: "gameboy_classic",
    name: "GameBoy Pocket Emerald",
    description: "4-level green LCD handheld palette combined with Bayer 4x4 matrix.",
    algorithmId: "bayer_4x4",
    paletteId: "gameboy_emerald",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 0.9,
    serpentine: true,
    depth: 4,
    brightness: 0.0,
    contrast: 0.15,
    saturation: 0.0,
    gamma: 1.05,
    effects: [
      { id: "scanlines", type: "scanlines", enabled: true, params: { thickness: 1, intensity: 0.25 } }
    ]
  },
  {
    id: "cyberpunk_terminal",
    name: "Cyberpunk 2084 Neon Grid",
    description: "Vibrant multi-color high-energy neon palette with bespoke Ignition Glow bloom.",
    algorithmId: "ignition_glow",
    paletteId: "cyberpunk_2084",
    threshold: 0.45,
    scale: 1.2,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 16,
    brightness: 0.1,
    contrast: 0.3,
    saturation: 0.4,
    gamma: 0.95,
    effects: [
      { id: "glow", type: "glow", enabled: true, params: { radius: 4, intensity: 0.7 } },
      { id: "chromatic_aberration", type: "chromatic_aberration", enabled: true, params: { offsetX: 3, offsetY: 0 } }
    ]
  },
  {
    id: "c64_nostalgia",
    name: "Commodore 64 Arcade",
    description: "Classic 16-color palette rendered via Floyd–Steinberg with serpentine scanlines.",
    algorithmId: "floyd_steinberg",
    paletteId: "c64_heritage",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 16,
    brightness: 0.0,
    contrast: 0.1,
    saturation: 0.1,
    gamma: 1.0,
    effects: [
      { id: "scanlines", type: "scanlines", enabled: true, params: { thickness: 2, intensity: 0.35 } }
    ]
  },
  {
    id: "amber_crt_monitor",
    name: "Phosphor Amber Terminal",
    description: "Glowing monochrome amber CRT with scanlines and slight electron gun bleed.",
    algorithmId: "bayer_8x8",
    paletteId: "phosphor_amber",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 0.85,
    serpentine: true,
    depth: 8,
    brightness: 0.05,
    contrast: 0.25,
    saturation: 0.0,
    gamma: 1.1,
    effects: [
      { id: "scanlines", type: "scanlines", enabled: true, params: { thickness: 2, intensity: 0.4 } },
      { id: "glow", type: "glow", enabled: true, params: { radius: 2, intensity: 0.5 } }
    ]
  },
  {
    id: "vhs_tape_decay",
    name: "VHS Magnetic Glitch Tape",
    description: "Sweeping tracking noise and chromatic degradation evoking worn analog magnetic tape.",
    algorithmId: "vhs_tracking",
    paletteId: "cga_mode_1",
    threshold: 0.5,
    scale: 1.5,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 8,
    brightness: 0.0,
    contrast: 0.2,
    saturation: 0.2,
    gamma: 1.0,
    effects: [
      { id: "chromatic_aberration", type: "chromatic_aberration", enabled: true, params: { offsetX: 5, offsetY: 1 } },
      { id: "scanlines", type: "scanlines", enabled: true, params: { thickness: 1, intensity: 0.3 } }
    ]
  },
  {
    id: "newsprint_halftone",
    name: "CMYK Newspaper Broadside",
    description: "Mechanical angled rotogravure halftone dots on high-contrast black/white newsprint.",
    algorithmId: "clustered_dot",
    paletteId: "monochrome_1bit",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 8,
    brightness: 0.1,
    contrast: 0.35,
    saturation: 0.0,
    gamma: 0.9,
    effects: [
      { id: "halftone", type: "halftone", enabled: true, params: { dotSize: 6, angle: 45, shape: "circle" } }
    ]
  },
  {
    id: "vaporwave_sunset",
    name: "Vaporwave Neon Mall",
    description: "Pastel purple and cyan aesthetic with smooth Blue Noise photographic stipple.",
    algorithmId: "blue_noise",
    paletteId: "vaporwave_neon",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 0.9,
    serpentine: true,
    depth: 16,
    brightness: 0.05,
    contrast: 0.15,
    saturation: 0.3,
    gamma: 1.0,
    effects: [
      { id: "glow", type: "glow", enabled: true, params: { radius: 3, intensity: 0.4 } }
    ]
  },
  {
    id: "nordic_deep_frost",
    name: "Nordic Glacial Frost",
    description: "Atmospheric cobalt and slate blues with Jarvis-Judice-Ninke wide diffusion.",
    algorithmId: "jarvis_judice_ninke",
    paletteId: "nordic_frost",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 16,
    brightness: 0.0,
    contrast: 0.1,
    saturation: 0.1,
    gamma: 1.0,
    effects: [
      { id: "vignette", type: "vignette", enabled: true, params: { radius: 0.85, softness: 0.5 } }
    ]
  },
  {
    id: "pico_pixel_fantasy",
    name: "PICO Fantasy RPG Sprite",
    description: "16-color fantasy pixel art console styling with pixel sorting glitch streak.",
    algorithmId: "bayer_2x2",
    paletteId: "pico_fantasy",
    threshold: 0.5,
    scale: 1.0,
    diffusionStrength: 1.0,
    serpentine: true,
    depth: 16,
    brightness: 0.0,
    contrast: 0.2,
    saturation: 0.1,
    gamma: 1.0,
    effects: [
      { id: "pixelate", type: "pixelate", enabled: true, params: { blockSize: 2 } }
    ]
  }
];

export function saveUserPresets(presets) {
  try {
    localStorage.setItem("ditherforge_user_presets", JSON.stringify(presets));
  } catch (e) {
    console.error("Failed to save presets to localStorage", e);
  }
}

export function loadUserPresets() {
  try {
    const raw = localStorage.getItem("ditherforge_user_presets");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
