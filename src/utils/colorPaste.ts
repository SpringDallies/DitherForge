/**
 * Safe color clipboard parser supporting Hex (#RGB, #RRGGBB, RRGGBB, 0xRRGGBB),
 * HCL/LCH (hcl(h, c, l), lch(l, c, h)), and HSL (hsl(h, s%, l%)).
 * Rejects arbitrary / overly long / non-color text safely.
 */

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const toHexByte = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase();

export const rgbToHexString = (r: number, g: number, b: number): string =>
  `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;

/** Converts CIE L*C*h° (L: 0..100, C: 0..200, H: 0..360) to clamped sRGB 0..255. */
export function lchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = (((H % 360) + 360) % 360) * (Math.PI / 180);
  const a = C * Math.cos(hRad);
  const bStar = C * Math.sin(hRad);

  // CIE Lab -> XYZ (D65)
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bStar / 200;

  const labInv = (t: number) => (t > 6 / 29 ? t * t * t : 3 * (6 / 29) * (6 / 29) * (t - 4 / 29));
  const X = 0.95047 * labInv(fx);
  const Y = 1.0 * labInv(fy);
  const Z = 1.08883 * labInv(fz);

  // XYZ -> linear sRGB
  const rLin = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const gLin = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  const bLin = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  const gamma = (u: number) => {
    const cu = clamp(u, 0, 1);
    return cu <= 0.0031308 ? 12.92 * cu : 1.055 * Math.pow(cu, 1 / 2.4) - 0.055;
  };

  return [
    Math.round(gamma(rLin) * 255),
    Math.round(gamma(gLin) * 255),
    Math.round(gamma(bLin) * 255)
  ];
}

/** Converts HSL (H: 0..360, S: 0..100, L: 0..100) to sRGB 0..255. */
export function hslToRgbBytes(h: number, s: number, l: number): [number, number, number] {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = clamp(s, 0, 100) / 100;
  const lNorm = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rP = 0;
  let gP = 0;
  let bP = 0;
  if (hNorm < 60) [rP, gP, bP] = [c, x, 0];
  else if (hNorm < 120) [rP, gP, bP] = [x, c, 0];
  else if (hNorm < 180) [rP, gP, bP] = [0, c, x];
  else if (hNorm < 240) [rP, gP, bP] = [0, x, c];
  else if (hNorm < 300) [rP, gP, bP] = [x, 0, c];
  else [rP, gP, bP] = [c, 0, x];

  return [
    clamp(Math.round((rP + m) * 255), 0, 255),
    clamp(Math.round((gP + m) * 255), 0, 255),
    clamp(Math.round((bP + m) * 255), 0, 255)
  ];
}

/**
 * Parses clipboard text strictly for Hex codes or HCL / LCH / HSL color specs.
 * Returns null if the clipboard does not contain a valid color value.
 */
export function parseColorFromClipboard(raw: string): ParsedColor | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 80 || /[\r\n]/.test(trimmed)) return null;

  // 1. Hex: #RGB, 0xRGB, #RRGGBB, 0xRRGGBB, RRGGBB, #RRGGBBAA
  const prefixedHex = /^(?:#|0x)([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(trimmed);
  const bareHex = !prefixedHex ? /^([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(trimmed) : null;
  const hexMatch = prefixedHex || bareHex;
  if (hexMatch) {
    const code = hexMatch[1];
    const hex6 =
      code.length === 3
        ? code[0] + code[0] + code[1] + code[1] + code[2] + code[2]
        : code.slice(0, 6);
    const r = parseInt(hex6.slice(0, 2), 16);
    const g = parseInt(hex6.slice(2, 4), 16);
    const b = parseInt(hex6.slice(4, 6), 16);
    return { r, g, b, hex: rgbToHexString(r, g, b) };
  }

  // 2. hcl(h, c, l) or lch(l, c, h) or hsl(h, s, l)
  const fnMatch = /^(hcl|lch|hsla?)\s*\(([^)]+)\)$/i.exec(trimmed);
  if (!fnMatch) return null;

  const fn = fnMatch[1].toLowerCase();
  const body = fnMatch[2].split('/')[0]; // ignore optional CSS Color 4 alpha after '/'
  const tokens = body
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length < 3) return null;

  const parseNum = (tok: string): { val: number; isPct: boolean } | null => {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(deg|rad|turn|%)?$/i.exec(tok);
    if (!m) return null;
    let val = parseFloat(m[1]);
    if (!Number.isFinite(val)) return null;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'rad') val = (val * 180) / Math.PI;
    else if (unit === 'turn') val = val * 360;
    return { val, isPct: unit === '%' };
  };

  const p0 = parseNum(tokens[0]);
  const p1 = parseNum(tokens[1]);
  const p2 = parseNum(tokens[2]);
  if (!p0 || !p1 || !p2) return null;

  let r = 0;
  let g = 0;
  let b = 0;

  if (fn === 'hcl') {
    const h = p0.val;
    const c = clamp(p1.isPct ? (p1.val / 100) * 150 : p1.val, 0, 200);
    const l = clamp(p2.val, 0, 100);
    [r, g, b] = lchToRgb(l, c, h);
  } else if (fn === 'lch') {
    const l = clamp(p0.val, 0, 100);
    const c = clamp(p1.isPct ? (p1.val / 100) * 150 : p1.val, 0, 200);
    const h = p2.val;
    [r, g, b] = lchToRgb(l, c, h);
  } else {
    // hsl / hsla
    const h = p0.val;
    const s = clamp(p1.isPct || p1.val > 1 ? p1.val : p1.val * 100, 0, 100);
    const l = clamp(p2.isPct || p2.val > 1 ? p2.val : p2.val * 100, 0, 100);
    [r, g, b] = hslToRgbBytes(h, s, l);
  }

  return { r, g, b, hex: rgbToHexString(r, g, b) };
}
