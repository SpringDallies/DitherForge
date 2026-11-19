import type { AsciiCharsetCategory, AsciiCharsetDefinition, AsciiInjectMode } from './types';

export const ASCII_CHARSET_CATEGORIES: Array<{ id: AsciiCharsetCategory; label: string }> = [
  { id: 'classic_ascii', label: 'Classic ASCII' },
  { id: 'extended_ascii', label: 'Extended ASCII' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'blocks_shades', label: 'Blocks & Shades' },
  { id: 'braille', label: 'Braille' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'directional', label: 'Directional' },
  { id: 'languages', label: 'Languages' },
  { id: 'playing_cards', label: 'Playing Cards' },
  { id: 'decorative_unicode', label: 'Decorative Unicode' },
  { id: 'custom', label: 'Custom' }
];

function generateBraille256String(): string {
  const out: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    out[i] = String.fromCharCode(0x2800 + i);
  }
  return out.join('');
}

export const BRAILLE_FULL_256 = generateBraille256String();

export const BUILTIN_ASCII_CHARSETS: AsciiCharsetDefinition[] = [
  // 1. Classic ASCII (5)
  {
    id: 'classic_standard',
    name: 'Standard 10-Step',
    category: 'classic_ascii',
    chars: ' .:-=+*#%@',
    ordering: 'sparse-to-dense',
    description: 'Balanced 10-character ramp suitable for photos and live video.',
    compatibilityNotes: '100% 7-bit ASCII; universal font support.',
    builtin: true
  },
  {
    id: 'classic_dense_70',
    name: 'Detailed 70-Step',
    category: 'classic_ascii',
    chars: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    ordering: 'sparse-to-dense',
    description: 'High-precision 70-glyph grayscale ramp for detailed still images.',
    compatibilityNotes: '100% 7-bit ASCII; universal font support.',
    builtin: true
  },
  {
    id: 'classic_minimal_5',
    name: 'Minimal 5-Tone',
    category: 'classic_ascii',
    chars: ' .:+@',
    ordering: 'sparse-to-dense',
    description: 'Punchy 5-glyph ramp ideal for low-res art and fast video previews.',
    compatibilityNotes: '100% 7-bit ASCII; universal font support.',
    builtin: true
  },
  {
    id: 'classic_typewriter',
    name: 'Vintage Typewriter',
    category: 'classic_ascii',
    chars: ' ,.-~:;+=xX#M',
    ordering: 'sparse-to-dense',
    description: 'Warm mechanical typewriter stroke density ramp.',
    compatibilityNotes: '100% 7-bit ASCII; pairs well with Courier/monospace.',
    builtin: true
  },
  {
    id: 'classic_terminal',
    name: 'Retro Terminal',
    category: 'classic_ascii',
    chars: ' ._:-=+|#W@',
    ordering: 'sparse-to-dense',
    description: 'Crisp phosphor CRT terminal character ramp.',
    compatibilityNotes: '100% 7-bit ASCII; universal font support.',
    builtin: true
  },

  // 2. Extended ASCII (4)
  {
    id: 'ext_cp437_shades',
    name: 'DOS CP437 Shades',
    category: 'extended_ascii',
    chars: ' ·°±²³░▒▓█',
    ordering: 'sparse-to-dense',
    description: 'Classic MS-DOS / ANSI BBS shading ramp.',
    compatibilityNotes: 'Latin-1 + Block Elements; wide monospace support.',
    builtin: true
  },
  {
    id: 'ext_latin_accents',
    name: 'Latin Typographic',
    category: 'extended_ascii',
    chars: ' ·¸¨´°¬¦§±µ¶ÆØßÐ',
    ordering: 'sparse-to-dense',
    description: 'Extended Latin diacritics and typographic marks.',
    compatibilityNotes: 'Latin-1 Supplement (U+00A0–00FF); universal.',
    builtin: true
  },
  {
    id: 'ext_box_light',
    name: 'Box Drawing Light',
    category: 'extended_ascii',
    chars: ' ─│┌┐└┘├┤┬┴┼',
    ordering: 'structural',
    description: 'Single-line box drawing characters for structural grids and outlines.',
    compatibilityNotes: 'U+2500–253C; universal monospace support.',
    builtin: true
  },
  {
    id: 'ext_box_heavy',
    name: 'Box Drawing Double',
    category: 'extended_ascii',
    chars: ' ═║╔╗╚╝╠╣╦╩╬█',
    ordering: 'structural',
    description: 'Double-line ANSI border glyphs for bold architectural graphics.',
    compatibilityNotes: 'U+2550–256C; universal monospace support.',
    builtin: true
  },

  // 3. Numbers (4)
  {
    id: 'num_decimal',
    name: 'Decimal Density',
    category: 'numbers',
    chars: ' 1723546908',
    ordering: 'calibrated',
    description: 'Digits 0–9 ordered by visual ink weight.',
    compatibilityNotes: '100% ASCII digits; universal.',
    builtin: true
  },
  {
    id: 'num_binary',
    name: 'Binary Stream',
    category: 'numbers',
    chars: ' 01',
    ordering: 'sparse-to-dense',
    description: 'Minimal binary 0/1 coding aesthetic.',
    compatibilityNotes: '100% ASCII digits; universal.',
    builtin: true
  },
  {
    id: 'num_hex',
    name: 'Hexadecimal Dump',
    category: 'numbers',
    chars: ' 174235C69A0FDE8B',
    ordering: 'calibrated',
    description: 'Hexadecimal 0–F characters ordered by optical density.',
    compatibilityNotes: '100% ASCII; universal.',
    builtin: true
  },
  {
    id: 'num_roman',
    name: 'Roman Numerals',
    category: 'numbers',
    chars: ' IiVvXxLlCcDdMm',
    ordering: 'sparse-to-dense',
    description: 'Classical uppercase/lowercase Roman numeral ramp.',
    compatibilityNotes: '100% ASCII letters; universal.',
    builtin: true
  },

  // 4. Symbols (5)
  {
    id: 'sym_punctuation',
    name: 'Punctuation Minimal',
    category: 'symbols',
    chars: " .,`'\"^:;!~-_",
    ordering: 'sparse-to-dense',
    description: 'Delicate low-ink punctuation marks for airy tonal stippling.',
    compatibilityNotes: '100% ASCII; universal.',
    builtin: true
  },
  {
    id: 'sym_code',
    name: 'Code Operators',
    category: 'symbols',
    chars: ' .:-=<>?!/*&%$#@',
    ordering: 'sparse-to-dense',
    description: 'Programming syntax symbols with crisp mechanical contrast.',
    compatibilityNotes: '100% ASCII; universal.',
    builtin: true
  },
  {
    id: 'sym_math',
    name: 'Mathematical Ops',
    category: 'symbols',
    chars: ' ·−±×÷≈≠≡≤≥∑∏∞∫',
    ordering: 'sparse-to-dense',
    description: 'Mathematical operators for scientific and technical renders.',
    compatibilityNotes: 'U+2200–22FF; good monospace support, fallback safe.',
    builtin: true
  },
  {
    id: 'sym_currency',
    name: 'Currency & Finance',
    category: 'symbols',
    chars: ' ·¢£¥€$§¤',
    ordering: 'sparse-to-dense',
    description: 'International currency glyphs for pop-art posters.',
    compatibilityNotes: 'Latin-1 + Euro U+20AC; universal.',
    builtin: true
  },
  {
    id: 'sym_slashes',
    name: 'Slash & Hatch',
    category: 'symbols',
    chars: ' .-/|\\+xX#',
    ordering: 'sparse-to-dense',
    description: 'Diagonal and orthogonal hatching symbols.',
    compatibilityNotes: '100% ASCII; universal.',
    builtin: true
  },

  // 5. Blocks & Shades (5)
  {
    id: 'blk_shades',
    name: 'Classic Shades',
    category: 'blocks_shades',
    chars: ' ░▒▓█',
    ordering: 'sparse-to-dense',
    description: 'Iconic 5-level ANSI shade block progression.',
    compatibilityNotes: 'U+2588, U+2591–2593; universal.',
    builtin: true
  },
  {
    id: 'blk_vertical',
    name: 'Vertical Bars (Eighths)',
    category: 'blocks_shades',
    chars: ' ▁▂▃▄▅▆▇█',
    ordering: 'sparse-to-dense',
    description: 'Bottom-to-top fractional bars evoking audio equalizers.',
    compatibilityNotes: 'U+2581–2588; universal.',
    builtin: true
  },
  {
    id: 'blk_horizontal',
    name: 'Horizontal Bars (Eighths)',
    category: 'blocks_shades',
    chars: ' ▏▎▍▌▋▊▉█',
    ordering: 'sparse-to-dense',
    description: 'Left-to-right fractional bars for vertical grating aesthetics.',
    compatibilityNotes: 'U+2588–258F; universal.',
    builtin: true
  },
  {
    id: 'blk_quadrants',
    name: 'Quadrant Blocks (2x2)',
    category: 'blocks_shades',
    chars: ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█',
    ordering: 'bitmask',
    description: '16 sub-cell 2×2 quadrant bitmask glyphs.',
    compatibilityNotes: 'U+2580–259F; universal monospace support.',
    builtin: true
  },
  {
    id: 'blk_half',
    name: 'Half & Solid Blocks',
    category: 'blocks_shades',
    chars: ' ▀▄▌▐█',
    ordering: 'structural',
    description: 'Bold half-cell and solid geometric block set.',
    compatibilityNotes: 'U+2580–258C; universal.',
    builtin: true
  },

  // 6. Braille (4)
  {
    id: 'brl_ramp',
    name: 'Braille 9-Step Density',
    category: 'braille',
    chars: ' ⠁⠃⠇⠏⠟⠿⡿⣿',
    ordering: 'sparse-to-dense',
    description: 'Progressive 0-to-8 dot Braille ramp for fine photographic grain.',
    compatibilityNotes: 'U+2800–28FF; supported by DejaVu/Segoe/Menlo + built-in fallback.',
    builtin: true
  },
  {
    id: 'brl_vertical',
    name: 'Braille Vertical Fill',
    category: 'braille',
    chars: ' ⡀⡄⡆⡇⣇⣧⣷⣿',
    ordering: 'sparse-to-dense',
    description: 'Bottom-up dot accumulation in Braille cells.',
    compatibilityNotes: 'U+2800–28FF; built-in fallback renderer guarantees visibility.',
    builtin: true
  },
  {
    id: 'brl_diagonal',
    name: 'Braille Diagonal Hatch',
    category: 'braille',
    chars: ' ⠁⠑⠱⠹⠻⠿⣿',
    ordering: 'sparse-to-dense',
    description: 'Diagonal Braille dot progression for textured shading.',
    compatibilityNotes: 'U+2800–28FF; built-in fallback supported.',
    builtin: true
  },
  {
    id: 'brl_full_256',
    name: 'Braille Full 2x4 (256)',
    category: 'braille',
    chars: BRAILLE_FULL_256,
    ordering: 'bitmask',
    description: 'Complete 256-glyph 2×4 Braille bitmask block (U+2800..U+28FF).',
    compatibilityNotes: 'Used natively by Braille 2×4 and Error-Diffusion Braille.',
    builtin: true
  },

  // 7. Geometric (5)
  {
    id: 'geo_circles',
    name: 'Circles & Halftone Dots',
    category: 'geometric',
    chars: ' ·•◦○◌◎◉●',
    ordering: 'sparse-to-dense',
    description: 'Progressive circular dot glyphs ideal for Halftone Glyphs.',
    compatibilityNotes: 'U+25CB–25CF; universal.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'geo_squares',
    name: 'Squares & Tiles',
    category: 'geometric',
    chars: ' ·▪▫□▢▣▤▥▦■',
    ordering: 'sparse-to-dense',
    description: 'Geometric square fills and crosshatch box patterns.',
    compatibilityNotes: 'U+25A0–25AA; high monospace support.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'geo_triangles',
    name: 'Triangles & Wedges',
    category: 'geometric',
    chars: ' ·▵▴▹▸△▲▽▼◆',
    ordering: 'sparse-to-dense',
    description: 'Angular triangular glyphs for low-poly typographic art.',
    compatibilityNotes: 'U+25B2–25C6; high support.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'geo_diamonds',
    name: 'Diamonds & Lozenges',
    category: 'geometric',
    chars: ' ·⋄◇◈◊◆❖█',
    ordering: 'sparse-to-dense',
    description: 'Faceted diamond motifs for crystalline retro graphics.',
    compatibilityNotes: 'U+25C6–25CA; high support.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'geo_stars',
    name: 'Stars & Asterisks',
    category: 'geometric',
    chars: ' ·*✢✣✤✥✦✧★',
    ordering: 'sparse-to-dense',
    description: 'Sparkling star glyphs for celestial and poster graphics.',
    compatibilityNotes: 'Dingbats U+2722–2727; missing glyphs auto-fallback.',
    builtin: true,
    forceTextPresentation: true
  },

  // 8. Directional (4)
  {
    id: 'dir_arrows_4',
    name: 'Cardinal Arrows',
    category: 'directional',
    chars: ' →↑←↓↔↕',
    ordering: 'directional',
    description: 'Four-way and bidirectional arrows for flow visualizations.',
    compatibilityNotes: 'U+2190–2195; universal.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'dir_arrows_8',
    name: '8-Way Compass Arrows',
    category: 'directional',
    chars: ' →↗↑↖←↙↓↘',
    ordering: 'directional',
    description: '8-sector directional arrows for gradient-aligned ASCII.',
    compatibilityNotes: 'U+2190–2199; universal.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'dir_chevrons',
    name: 'Chevrons & Pointers',
    category: 'directional',
    chars: ' .<>^v«»‹›▲▼',
    ordering: 'sparse-to-dense',
    description: 'Directional chevrons and pointer brackets.',
    compatibilityNotes: 'Latin-1 + Geometric; high support.',
    builtin: true
  },
  {
    id: 'dir_diagonals',
    name: 'Box Diagonals & Cross',
    category: 'directional',
    chars: ' ─│╱╲╳┼█',
    ordering: 'directional',
    description: 'Crisp orthogonal and 45° line drawing strokes.',
    compatibilityNotes: 'U+2571–2573; high monospace support.',
    builtin: true
  },

  // 9. Languages (5)
  {
    id: 'lang_katakana',
    name: 'Half-Width Katakana',
    category: 'languages',
    chars: ' ･ｰｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
    ordering: 'calibrated',
    description: 'Half-width Japanese Katakana preserving strict single-cell width.',
    compatibilityNotes: 'U+FF65–FF9D half-width forms avoid double-width drift.',
    builtin: true
  },
  {
    id: 'lang_greek',
    name: 'Greek Alphabet',
    category: 'languages',
    chars: ' ·ιτνυοεαπδλΣΩΦΨΘ',
    ordering: 'sparse-to-dense',
    description: 'Greek script characters arranged by visual weight.',
    compatibilityNotes: 'U+0391–03C9; universal.',
    builtin: true
  },
  {
    id: 'lang_cyrillic',
    name: 'Cyrillic Script',
    category: 'languages',
    chars: ' ·глтсиоеавдкжшщф',
    ordering: 'sparse-to-dense',
    description: 'Cyrillic lowercase characters for constructivist poster looks.',
    compatibilityNotes: 'U+0430–044F; universal.',
    builtin: true
  },
  {
    id: 'lang_runic',
    name: 'Elder Futhark Runes',
    category: 'languages',
    chars: ' ·ᛁᛚᛏᚲᚢᚱᚨᚠᚦᚹᚺᚾᛃᛇᛉᛊᛒᛖᛗᛟᛞ',
    ordering: 'sparse-to-dense',
    description: 'Angular Norse runic glyphs for fantasy and dark-art renders.',
    compatibilityNotes: 'U+16A0–16F0; auto-substitutes if OS font lacks Runic block.',
    builtin: true
  },
  {
    id: 'lang_hebrew',
    name: 'Hebrew Block Marks',
    category: 'languages',
    chars: ' ·יורדכחנמםש',
    ordering: 'sparse-to-dense',
    description: 'Geometric Hebrew letterforms rendered per-cell in LTR grid.',
    compatibilityNotes: 'U+05D0–05EA; rendered cell-by-cell so BiDi reordering cannot break alignment.',
    builtin: true
  },

  // 10. Playing Cards (3)
  {
    id: 'card_suits_solid',
    name: 'Card Suits Ramp',
    category: 'playing_cards',
    chars: ' ·♡♢♤♧♥♦♠♣',
    ordering: 'sparse-to-dense',
    description: 'Hollow-to-solid playing card suits.',
    compatibilityNotes: 'U+2660–2667 with text presentation selector.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'card_ranks',
    name: 'Deck Ranks & Suits',
    category: 'playing_cards',
    chars: ' .23456789TJQKA♠♥♦♣',
    ordering: 'sparse-to-dense',
    description: 'Full playing card ranks paired with solid suits.',
    compatibilityNotes: 'ASCII + U+2660–2666; universal.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'card_chess',
    name: 'Chess Pieces',
    category: 'playing_cards',
    chars: ' ·♙♘♗♖♕♔♟♞♝♜♛♚',
    ordering: 'sparse-to-dense',
    description: 'Outline-to-filled chess piece progression.',
    compatibilityNotes: 'U+2654–265F; high support, text presentation forced.',
    builtin: true,
    forceTextPresentation: true
  },

  // 11. Decorative Unicode (4)
  {
    id: 'dec_medieval',
    name: 'Medieval Heraldic',
    category: 'decorative_unicode',
    chars: ' ·†‡§¤✠✚❖♛♚█',
    ordering: 'sparse-to-dense',
    description: 'Illuminated manuscript daggers, crosses, and crowns.',
    compatibilityNotes: 'Mixed Unicode symbols; text presentation + fallback safe.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'dec_music',
    name: 'Musical Notation',
    category: 'decorative_unicode',
    chars: ' ·♩♪♫♬♭♮♯',
    ordering: 'sparse-to-dense',
    description: 'Musical notes and accidentals for album art and audio visuals.',
    compatibilityNotes: 'U+2669–266F; high support.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'dec_weather_astro',
    name: 'Celestial & Weather',
    category: 'decorative_unicode',
    chars: ' ·°⋆☾☼☁☂☄★☀',
    ordering: 'sparse-to-dense',
    description: 'Astronomical and weather glyphs for surreal illustrations.',
    compatibilityNotes: 'U+2600–263E; uses text-presentation selector to prevent emoji fallback.',
    builtin: true,
    forceTextPresentation: true
  },
  {
    id: 'dec_circuit',
    name: 'Circuit & Traces',
    category: 'decorative_unicode',
    chars: ' ·╵╶└│├┬┼╋╬▓█',
    ordering: 'sparse-to-dense',
    description: 'PCB trace segments and heavy junction nodes.',
    compatibilityNotes: 'U+2500–257F; high monospace support.',
    builtin: true
  }
];

const CUSTOM_CHARSETS_STORAGE_KEY = 'ditherforge_custom_ascii_charsets_v1';

export function loadCustomCharsets(): AsciiCharsetDefinition[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_CHARSETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCharsetDefinition).map((c) => ({ ...c, builtin: false, category: 'custom' as const }));
  } catch {
    return [];
  }
}

export function saveCustomCharsets(sets: AsciiCharsetDefinition[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const safe = sets.filter(isValidCharsetDefinition).map((c) => ({
      ...c,
      builtin: false,
      category: 'custom' as const
    }));
    localStorage.setItem(CUSTOM_CHARSETS_STORAGE_KEY, JSON.stringify(safe));
  } catch (e) {
    console.error('[ASCII] Failed to persist custom character sets:', e);
  }
}

export function isValidCharsetDefinition(obj: unknown): obj is AsciiCharsetDefinition {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    o.id.trim().length > 0 &&
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    typeof o.chars === 'string' &&
    Array.from(o.chars).length >= 2
  );
}

export function exportCharsetJson(def: AsciiCharsetDefinition): string {
  return JSON.stringify(
    {
      version: 1,
      id: def.id,
      name: def.name,
      category: 'custom',
      chars: def.chars,
      ordering: def.ordering || 'sparse-to-dense',
      description: def.description || ''
    },
    null,
    2
  );
}

export function parseImportedCharsetJson(jsonText: string): AsciiCharsetDefinition | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') return null;
    const chars = typeof parsed.chars === 'string' ? parsed.chars : '';
    if (Array.from(chars).length < 2) return null;
    return {
      id: typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : `custom_${Date.now()}`,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Imported Set',
      category: 'custom',
      chars,
      ordering: parsed.ordering || 'sparse-to-dense',
      description: typeof parsed.description === 'string' ? parsed.description : 'User imported character set',
      compatibilityNotes: 'Custom user character set.',
      builtin: false
    };
  } catch {
    return null;
  }
}

export function getAllCharsets(customSets?: AsciiCharsetDefinition[]): AsciiCharsetDefinition[] {
  const custom = customSets ?? loadCustomCharsets();
  return [...BUILTIN_ASCII_CHARSETS, ...custom];
}

export function findCharsetById(id: string, customSets?: AsciiCharsetDefinition[]): AsciiCharsetDefinition {
  const all = getAllCharsets(customSets);
  return all.find((c) => c.id === id) ?? BUILTIN_ASCII_CHARSETS[0];
}

/**
 * Resolves the final ordered glyph array for rendering:
 * 1. Base charset or customCharsetChars
 * 2. Up to 10 injected characters (prepend / append / interleave / replace)
 * 3. Optional reverse
 * 4. Character depth decimation (evenly samples `depth` stops preserving endpoints)
 * 5. Circular character offset
 */
export function resolveActiveChars(options: {
  charsetId: string;
  customCharsetChars?: string;
  injectedChars?: string[];
  injectMode?: AsciiInjectMode;
  reverseCharset?: boolean;
  characterDepth?: number;
  characterOffset?: number;
  customSets?: AsciiCharsetDefinition[];
}): string[] {
  const {
    charsetId,
    customCharsetChars = '',
    injectedChars = [],
    injectMode = 'interleave',
    reverseCharset = false,
    characterDepth = 16,
    characterOffset = 0,
    customSets
  } = options;

  let baseChars: string[];
  if (charsetId === 'custom_inline' && Array.from(customCharsetChars).length >= 2) {
    baseChars = Array.from(customCharsetChars);
  } else {
    const def = findCharsetById(charsetId, customSets);
    baseChars = Array.from(def.chars);
  }

  // Up to 10 injected custom characters (sanitized to single codepoints)
  const cleanInjected = injectedChars
    .map((s) => Array.from(String(s || ''))[0] || '')
    .filter((ch) => ch.length > 0)
    .slice(0, 10);

  let combined = baseChars.slice();
  if (cleanInjected.length > 0) {
    if (injectMode === 'prepend') {
      combined = [...cleanInjected, ...combined];
    } else if (injectMode === 'append') {
      combined = [...combined, ...cleanInjected];
    } else if (injectMode === 'replace') {
      combined = cleanInjected.length >= 2 ? cleanInjected : [...cleanInjected, ' '];
    } else {
      // interleave evenly across ramp
      const result: string[] = [];
      const stride = Math.max(1, Math.floor(combined.length / cleanInjected.length));
      let injIdx = 0;
      for (let i = 0; i < combined.length; i++) {
        result.push(combined[i]);
        if (injIdx < cleanInjected.length && (i + 1) % stride === 0) {
          result.push(cleanInjected[injIdx++]);
        }
      }
      while (injIdx < cleanInjected.length) {
        result.push(cleanInjected[injIdx++]);
      }
      combined = result;
    }
  }

  if (reverseCharset) {
    combined.reverse();
  }

  // Depth decimation (preserve first and last anchor glyphs)
  const targetDepth = Math.max(2, Math.min(256, Math.round(characterDepth)));
  if (combined.length > targetDepth) {
    const sampled: string[] = new Array(targetDepth);
    const maxSrc = combined.length - 1;
    const maxDst = targetDepth - 1;
    for (let i = 0; i < targetDepth; i++) {
      sampled[i] = combined[Math.round((i / maxDst) * maxSrc)];
    }
    combined = sampled;
  }

  // Circular offset
  const len = combined.length;
  const shift = ((Math.round(characterOffset) % len) + len) % len;
  if (shift !== 0) {
    combined = [...combined.slice(shift), ...combined.slice(0, shift)];
  }

  return combined.length >= 2 ? combined : [' ', '@'];
}
