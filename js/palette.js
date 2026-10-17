// PURE: turns a palette's color stops into a lookup table for the coloring shader.

export const TABLE_SIZE = 1024;

/** "#rrggbb" → [r, g, b] (0–255). */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Invalid color: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Builds a cyclic RGBA table: stops are evenly spaced, colors blend linearly
 * between neighbors, and the last stop blends back into the first.
 */
export function buildColorTable(stops, size = TABLE_SIZE) {
  if (stops.length < 2) throw new Error("A palette needs at least 2 colors");
  const rgb = stops.map(hexToRgb);
  const k = rgb.length;
  const table = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const pos = (i / size) * k;
    const a = Math.floor(pos);
    const f = pos - a;
    const c0 = rgb[a];
    const c1 = rgb[(a + 1) % k];
    for (let ch = 0; ch < 3; ch++) {
      table[i * 4 + ch] = Math.round(c0[ch] + (c1[ch] - c0[ch]) * f);
    }
    table[i * 4 + 3] = 255;
  }
  return table;
}
