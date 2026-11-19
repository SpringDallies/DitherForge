import type { AsciiExportOptions, AsciiGridFrame } from './types';

/**
 * Converts an AsciiGridFrame directly into a true character-grid text string.
 * Preserves exact rows, columns, direct Unicode glyphs (Braille/Quadrant/Sextant),
 * and configured line endings.
 */
export function gridFrameToText(
  grid: AsciiGridFrame,
  lineEnding: '\n' | '\r\n' = '\n'
): string {
  const { cols, rows, chars, charIndices, directChars } = grid;
  const lines: string[] = new Array(rows);
  const maxIdx = Math.max(0, chars.length - 1);

  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    const rowChars: string[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const idx = rowOff + c;
      if (directChars) {
        rowChars[c] = directChars[idx] ?? ' ';
      } else {
        const gIdx = charIndices[idx];
        rowChars[c] = chars[gIdx <= maxIdx ? gIdx : maxIdx] ?? ' ';
      }
    }
    lines[r] = rowChars.join('');
  }

  return lines.join(lineEnding) + lineEnding;
}

/** Downloads an AsciiGridFrame as a UTF-8 .txt file in browser/Tauri webview. */
export function downloadAsciiGridText(
  grid: AsciiGridFrame,
  options: Pick<AsciiExportOptions, 'filename' | 'lineEnding'> = {}
): string {
  const text = gridFrameToText(grid, options.lineEnding ?? '\n');
  const rawName = (options.filename || 'ditherforge_ascii').trim();
  const finalName = rawName.toLowerCase().endsWith('.txt') ? rawName : `${rawName}.txt`;

  if (typeof Blob !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return text;
}

/** Copies true character-grid text directly to system clipboard. */
export async function copyAsciiGridText(
  grid: AsciiGridFrame,
  lineEnding: '\n' | '\r\n' = '\n'
): Promise<string> {
  const text = gridFrameToText(grid, lineEnding);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
  return text;
}
