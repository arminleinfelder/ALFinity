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
