// Default setting and built-in palettes.

function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") deepFreeze(value);
  }
  return Object.freeze(obj);
}

/** The picture shown on first load (FR-001). */
export const DEFAULT_SETTING = deepFreeze({
  schemaVersion: 1,
  type: "mandelbrot",
  julia: { re: -0.8, im: 0.156 },
  view: { cx: -0.6, cy: 0, width: 3.2 },
  detail: 1,
  maxIter: null, // null = Auto
  color: { paletteId: "ocean", shift: 0, density: 2, smooth: true, inside: "#000000" },
});

const palette = (id, name, stops) => ({ id, name, stops, builtIn: true });

/** Built-in palettes: 2–8 evenly spaced, cyclic color stops (FR-013). */
export const BUILTIN_PALETTES = deepFreeze([
  palette("ocean", "Ocean", ["#000764", "#206bcb", "#edffff", "#ffaa00", "#000200"]),
  palette("fire", "Fire", ["#000000", "#5c0000", "#d42a00", "#ff9a00", "#fff3a8"]),
  palette("rainbow", "Rainbow",
    ["#ff0000", "#ff9900", "#ffee00", "#33dd00", "#0099ff", "#6633ff", "#cc00cc"]),
  palette("sunset", "Sunset", ["#1a0533", "#6b1d5c", "#d94f3d", "#ffa646", "#ffe8a3"]),
  palette("forest", "Forest", ["#06140b", "#1d4d2b", "#4f8a3c", "#b5c85a", "#f2e9b8"]),
  palette("ice", "Ice", ["#020c1b", "#0f3b66", "#3f8fcf", "#bfe6ff", "#ffffff"]),
  palette("grayscale", "Grayscale", ["#000000", "#ffffff"]),
  palette("neon", "Neon", ["#0a0014", "#ff00aa", "#00f0ff", "#faff00"]),
  palette("candy", "Candy", ["#ff7eb6", "#ffd1e8", "#8fd3ff", "#c3a6ff"]),
  palette("gold", "Gold", ["#140a00", "#6e4100", "#d4a017", "#fff1b0", "#8a5a00"]),
]);

/** Returns the palette with the given id, falling back to the default palette. */
export function getPalette(id) {
  return BUILTIN_PALETTES.find((p) => p.id === id) ?? BUILTIN_PALETTES[0];
}
