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
