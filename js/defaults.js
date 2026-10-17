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

/** Built-in palettes: evenly spaced, cyclic color stops. More are added with the color panel. */
export const BUILTIN_PALETTES = deepFreeze([
  {
    id: "ocean",
    name: "Ocean",
    stops: ["#000764", "#206bcb", "#edffff", "#ffaa00", "#000200"],
    builtIn: true,
  },
]);

/** Returns the palette with the given id, falling back to the default palette. */
export function getPalette(id) {
  return BUILTIN_PALETTES.find((p) => p.id === id) ?? BUILTIN_PALETTES[0];
}
