export interface AnvilShaderPalette {
  shadow: [number, number, number];
  highlight: [number, number, number];
}

const hexToVec3 = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const THEME_ANVIL_PALETTES: Record<string, AnvilShaderPalette> = {
  light_pro:        { shadow: hexToVec3('#8A8E96'), highlight: hexToVec3('#FFFFFF') },
  dark_pro:         { shadow: [0.34, 0.35, 0.45],   highlight: [0.96, 0.98, 1.00] },
  obsidian_oled:    { shadow: hexToVec3('#525769'), highlight: hexToVec3('#F4F5F8') },
  nord:             { shadow: hexToVec3('#5E81AC'), highlight: hexToVec3('#ECEFF4') },
  evergreen:        { shadow: hexToVec3('#4E7564'), highlight: hexToVec3('#E6F2E6') },
  gruvbox:          { shadow: hexToVec3('#D65D0E'), highlight: hexToVec3('#FBF1C7') },
  catppuccin_mocha: { shadow: hexToVec3('#89B4FA'), highlight: hexToVec3('#CDD6F4') },
  tokyo_night:      { shadow: hexToVec3('#7AA2F7'), highlight: hexToVec3('#C0CAF5') },
  kanagawa_wave:    { shadow: hexToVec3('#7E9CD8'), highlight: hexToVec3('#DCD7BA') },
  rose_pine:        { shadow: hexToVec3('#EB6F92'), highlight: hexToVec3('#E0DEF4') },
  dracula:          { shadow: hexToVec3('#BD93F9'), highlight: hexToVec3('#F8F8F2') },
  monokai_pro:      { shadow: hexToVec3('#FC9867'), highlight: hexToVec3('#FCFCFA') },
  solarized_dark:   { shadow: hexToVec3('#2AA198'), highlight: hexToVec3('#FDF6E3') },
  one_dark:         { shadow: hexToVec3('#61AFEF'), highlight: hexToVec3('#ECEFF4') },
};

export function getAnvilPaletteForTheme(themeId: string): AnvilShaderPalette {
  return THEME_ANVIL_PALETTES[themeId] || THEME_ANVIL_PALETTES.dark_pro;
}
