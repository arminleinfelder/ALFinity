import { test } from "node:test";
import assert from "node:assert/strict";
import { valueAt, autoMaxIter, effectiveMaxIter } from "../js/fractal.js";
import { DEFAULT_SETTING } from "../js/defaults.js";

test("points inside the Mandelbrot set return −1", () => {
  assert.equal(valueAt("mandelbrot", 0, 0, 0, 0, 500), -1);
  assert.equal(valueAt("mandelbrot", -1, 0, 0, 0, 500), -1);
});

test("points far outside escape quickly with a positive value", () => {
  const v = valueAt("mandelbrot", 2, 2, 0, 0, 500);
  assert.ok(v > 0 && v < 10, `got ${v}`);
});

test("smooth values are continuous between neighboring points", () => {
  for (const [re, im] of [[-0.75, 0.1], [0.3, 0.5], [-1.5, 0.02], [0.4, -0.3]]) {
    const a = valueAt("mandelbrot", re, im, 0, 0, 2000);
    const b = valueAt("mandelbrot", re + 1e-6, im, 0, 0, 2000);
    if (a >= 0 && b >= 0) assert.ok(Math.abs(a - b) < 1, `jump at ${re},${im}: ${a} vs ${b}`);
  }
});

test("Julia uses the pixel as starting point", () => {
  // c = 0 gives the unit circle: |z| < 1 stays, |z| > 1 escapes.
  assert.equal(valueAt("julia", 0.5, 0, 0, 0, 500), -1);
  assert.ok(valueAt("julia", 1.5, 0, 0, 0, 500) > 0);
});

/** The plain iteration, as a reference: any speed-up of valueAt must give exactly these values. */
function reference(zx, zy, cx, cy, maxIter) {
  for (let n = 0; n < maxIter; n++) {
    const x2 = zx * zx;
    const y2 = zy * zy;
    if (x2 + y2 > 65536) return Math.max(0, n + 1 - Math.log2(0.5 * Math.log(x2 + y2)));
    zy = 2 * zx * zy + cy;
    zx = x2 - y2 + cx;
  }
  return -1;
}

const GRIDS = [
  { name: "whole Mandelbrot set", type: "mandelbrot", cx: -0.6, cy: 0, width: 3.2, maxIter: 500, minInside: 1000 },
  { name: "seahorse valley 10⁴×", type: "mandelbrot", cx: -0.743643887037151, cy: 0.13182590420533, width: 3.2e-4, maxIter: 2120 },
  { name: "deep view 10⁶×", type: "mandelbrot", cx: -0.743643887037151, cy: 0.13182590420533, width: 3.2e-6, maxIter: 4520, minInside: 5000 },
  { name: "deep view 10⁷×", type: "mandelbrot", cx: -0.743643887037151, cy: 0.13182590420533, width: 3.2e-7, maxIter: 6080, minInside: 5000 },
  { name: "Julia dragon", type: "julia", jre: -0.8, jim: 0.156, cx: 0, cy: 0, width: 3.2, maxIter: 1000 },
  { name: "Julia with a large interior", type: "julia", jre: -0.3448, jim: 0.3828, cx: 0, cy: 0, width: 3.2, maxIter: 1000, minInside: 1000 },
];

test("valueAt matches the plain reference iteration bit for bit", () => {
  for (const g of GRIDS) {
    const N = 120;
    let inside = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const re = g.cx + ((i + 0.5) / N - 0.5) * g.width;
        const im = g.cy + ((j + 0.5) / N - 0.5) * g.width;
        const got = valueAt(g.type, re, im, g.jre ?? 0, g.jim ?? 0, g.maxIter);
        const want = g.type === "julia"
          ? reference(re, im, g.jre, g.jim, g.maxIter)
          : reference(0, 0, re, im, g.maxIter);
        if (!Object.is(got, want)) assert.fail(`${g.name}: (${re}, ${im}) gave ${got}, expected ${want}`);
        if (want === -1) inside++;
      }
    }
    assert.ok(inside >= (g.minInside ?? 0), `${g.name}: expected at least ${g.minInside} inside points, got ${inside}`);
  }
});

test("automatic iteration depth", () => {
  assert.equal(autoMaxIter(1, 1), 200);
  assert.ok(autoMaxIter(1e6, 1) > autoMaxIter(1e3, 1));
  assert.equal(autoMaxIter(1e15, 4), 10000);
  assert.equal(autoMaxIter(1, 0.1), 50);
  assert.equal(autoMaxIter(0.5, 1), 200);
});

test("effectiveMaxIter uses Auto unless a manual value is set", () => {
  assert.equal(effectiveMaxIter(DEFAULT_SETTING), 200);
  assert.equal(effectiveMaxIter({ ...DEFAULT_SETTING, maxIter: 777 }), 777);
});
