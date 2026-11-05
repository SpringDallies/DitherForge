// DitherForge Presets Engine
// User JSON Export/Import & Parameter Shuffle

export const PREMADE_PRESET_IDS = new Set([
  'preset_trinitron_1994',
  'preset_photocopy_zine',
  'preset_super_8',
  'preset_gameboy_pocket',
  'preset_vhs_rental',
  'mac_1984',
  'gameboy_classic',
  'cyberpunk_terminal',
  'c64_nostalgia',
  'amber_crt_monitor',
  'vhs_tape_decay',
  'newsprint_halftone',
  'vaporwave_sunset',
  'nordic_deep_frost',
  'pico_pixel_fantasy',
  'glitch_matrix',
  'newspaper_print',
  'synthwave_sunset',
  'newspaper_newsprint',
  'gameboy_dmg',
  'vcr_sp_mode',
  'lofi_security_cam'
]);

export const BUILTIN_PRESETS = [];

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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(p => p && !PREMADE_PRESET_IDS.has(p.id));
  } catch (e) {
    return [];
  }
}
