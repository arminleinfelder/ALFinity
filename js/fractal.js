// PURE: fractal iteration and the "smooth iteration value" both render engines produce.
// The GPU shader in render/shaders.js MUST use exactly the same formulas
// (contracts/render-engine.md).

import { zoomFactor } from "./view.js";

export const ESCAPE_RADIUS = 256;
const R2 = ESCAPE_RADIUS * ESCAPE_RADIUS;

/**
 * Iterates z → z² + c starting at z and returns the smooth iteration value
 * ν = n + 1 − log₂(ln|zₙ|), or −1 if the point does not escape within maxIter.
 */
export function smoothIterations(zx, zy, cx, cy, maxIter) {
  for (let n = 0; n < maxIter; n++) {
    const x2 = zx * zx;
    const y2 = zy * zy;
    if (x2 + y2 > R2) {
      return Math.max(0, n + 1 - Math.log2(0.5 * Math.log(x2 + y2)));
    }
    zy = 2 * zx * zy + cy;
    zx = x2 - y2 + cx;
  }
  return -1;
}

/** Smooth value at complex point (re, im) for "mandelbrot" or "julia" (with c = jre + jim·i). */
export function valueAt(type, re, im, jre, jim, maxIter) {
  return type === "julia"
    ? smoothIterations(re, im, jre, jim, maxIter)
    : smoothIterations(0, 0, re, im, maxIter);
}

/** Automatic iteration depth: deeper views need more iterations (research.md R6). */
export function autoMaxIter(zoom, detail = 1) {
  const l = Math.log10(Math.max(zoom, 1));
  const n = (200 + 120 * l * l) * detail;
  return Math.round(Math.min(10000, Math.max(50, n)));
}

/** Iteration depth for a setting: manual value if set, otherwise Auto. */
export function effectiveMaxIter(setting) {
  return setting.maxIter ?? autoMaxIter(zoomFactor(setting.view), setting.detail);
}
