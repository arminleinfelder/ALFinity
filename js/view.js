// PURE: mapping between screen pixels and the complex plane, zoom and pan.
// No DOM access, so this module runs in the browser, in workers and in Node tests.
//
// A view is { cx, cy, width }: the center of the picture and the complex-plane width
// of the shorter screen side. Screen coordinates are device pixels, origin top-left.

export const INITIAL_WIDTH = 3.2;
export const MAX_WIDTH = 8;
export const CENTER_LIMIT = 4;

/** The graphics card (32-bit numbers) is used while a pixel is at least this large
 *  relative to the coordinates; deeper views go to the CPU (research.md R3). */
export const GPU_PRECISION = 2 ** -20;

/** Zooming stops when a pixel gets smaller than this (64-bit limit with headroom, FR-012). */
export const CPU_PRECISION = 2 ** -50;

/** Complex-plane size of one pixel. */
export function pixelScale(view, W, H) {
  return view.width / Math.min(W, H);
}

function magnitude(view) {
  return Math.max(Math.abs(view.cx), Math.abs(view.cy), 1);
}

/** Continuous screen point (x, y) → complex number. */
export function pointToComplex(view, W, H, x, y) {
  const s = pixelScale(view, W, H);
  return { re: view.cx + (x - W / 2) * s, im: view.cy - (y - H / 2) * s };
}

/** Center of pixel (px, py) → complex number. */
export function pixelToComplex(view, W, H, px, py) {
  return pointToComplex(view, W, H, px + 0.5, py + 0.5);
}

/** Complex number → continuous screen point. */
export function complexToPoint(view, W, H, re, im) {
  const s = pixelScale(view, W, H);
  return { x: (re - view.cx) / s + W / 2, y: H / 2 - (im - view.cy) / s };
}

/** Zooms by `factor` (> 1 zooms in) keeping the point under (x, y) in place. */
export function zoomAt(view, W, H, x, y, factor) {
  const p = pointToComplex(view, W, H, x, y);
  const width = view.width / factor;
  const s = width / Math.min(W, H);
  return { cx: p.re - (x - W / 2) * s, cy: p.im + (y - H / 2) * s, width };
}

/** Moves the picture by (dx, dy) screen pixels, so the content follows the pointer. */
export function pan(view, W, H, dx, dy) {
  const s = pixelScale(view, W, H);
  return { cx: view.cx - dx * s, cy: view.cy + dy * s, width: view.width };
}

/** How many times the view is magnified compared to the start. */
export function zoomFactor(view) {
  return INITIAL_WIDTH / view.width;
}

/** Smallest allowed view width at this position and screen size. */
export function minWidth(view, W, H) {
  return Math.min(W, H) * magnitude(view) * CPU_PRECISION;
}

export function isAtMaxZoom(view, W, H) {
  return view.width <= minWidth(view, W, H) * (1 + 1e-9);
}

/** Keeps a view inside the allowed area. `limited` is true when the max zoom stopped it. */
export function clampView(view, W, H) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const cx = clamp(view.cx, -CENTER_LIMIT, CENTER_LIMIT);
  const cy = clamp(view.cy, -CENTER_LIMIT, CENTER_LIMIT);
  const min = minWidth({ cx, cy }, W, H);
  const width = clamp(view.width, min, MAX_WIDTH);
  return { view: { cx, cy, width }, limited: view.width < min };
}

/**
 * The view of one tile (x0, y0, tw×th pixels) of a W×H picture: same pixel size, centered
 * on the tile. Rendering every tile with its own view gives the same pixels as one big render.
 */
export function tileView(view, W, H, x0, y0, tw, th) {
  const s = pixelScale(view, W, H);
  const c = pointToComplex(view, W, H, x0 + tw / 2, y0 + th / 2);
  return { cx: c.re, cy: c.im, width: s * Math.min(tw, th) };
}

/** Which render engine can draw this view without visible precision loss. */
export function engineFor(view, W, H) {
  return pixelScale(view, W, H) >= magnitude(view) * GPU_PRECISION ? "gpu" : "cpu";
}
