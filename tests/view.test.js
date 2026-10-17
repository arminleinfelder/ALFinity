import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pixelToComplex, pointToComplex, complexToPoint, zoomAt, pan,
  isAtMaxZoom, clampView, engineFor, zoomFactor, tileView,
} from "../js/view.js";

const W = 1600, H = 900;
const view = { cx: -0.6, cy: 0, width: 3.2 };

test("pixel ↔ complex round trip", () => {
  const p = pixelToComplex(view, W, H, 123, 456);
  const back = complexToPoint(view, W, H, p.re, p.im);
  assert.ok(Math.abs(back.x - 123.5) < 1e-9);
  assert.ok(Math.abs(back.y - 456.5) < 1e-9);
});

test("screen center maps to view center; y axis points up", () => {
  const c = pointToComplex(view, W, H, W / 2, H / 2);
  assert.equal(c.re, -0.6);
  assert.equal(c.im, 0);
  assert.ok(pointToComplex(view, W, H, W / 2, 0).im > 0);
});

test("zoomAt keeps the point under the cursor fixed", () => {
  const x = 400, y = 250;
  const before = pointToComplex(view, W, H, x, y);
  let v = view;
  for (let i = 0; i < 30; i++) v = zoomAt(v, W, H, x, y, 3);
  const after = pointToComplex(v, W, H, x, y);
  assert.ok(Math.abs(after.re - before.re) <= 1e-12 * Math.abs(before.re));
  assert.ok(Math.abs(after.im - before.im) <= 1e-12 * Math.abs(before.im));
  assert.ok(Math.abs(zoomFactor(v) - 3 ** 30) / 3 ** 30 < 1e-9);
});

test("panning by the shorter side moves the center by one view width", () => {
  const v = pan(view, W, H, H, 0);
  assert.ok(Math.abs(v.cx - (view.cx - view.width)) < 1e-12);
  const u = pan(view, W, H, 0, H);
  assert.ok(Math.abs(u.cy - view.width) < 1e-12);
});

test("max zoom is reached at the 64-bit precision limit", () => {
  assert.equal(isAtMaxZoom({ cx: -0.6, cy: 0, width: 1e-13 }, 3840, 2160), true);
  assert.equal(isAtMaxZoom(view, 3840, 2160), false);
  const { view: v, limited } = clampView({ cx: -0.6, cy: 0, width: 1e-20 }, 3840, 2160);
  assert.equal(limited, true);
  assert.equal(isAtMaxZoom(v, 3840, 2160), true);
});

test("clampView keeps the view inside the allowed area", () => {
  const { view: v, limited } = clampView({ cx: 10, cy: -10, width: 100 }, W, H);
  assert.deepEqual(v, { cx: 4, cy: -4, width: 8 });
  assert.equal(limited, false);
});

test("a tile view maps its pixels to the same points as the full picture", () => {
  const FW = 5000, FH = 3000;
  const tv = tileView(view, FW, FH, 2048, 1024, 2048, 976);
  for (const [px, py] of [[0, 0], [100, 500], [2047, 975]]) {
    const inTile = pixelToComplex(tv, 2048, 976, px, py);
    const inFull = pixelToComplex(view, FW, FH, 2048 + px, 1024 + py);
    assert.ok(Math.abs(inTile.re - inFull.re) < 1e-12);
    assert.ok(Math.abs(inTile.im - inFull.im) < 1e-12);
  }
});

test("engine choice: GPU for shallow views, CPU for deep views", () => {
  assert.equal(engineFor(view, W, H), "gpu");
  assert.equal(engineFor({ cx: -0.6, cy: 0, width: 1e-7 }, W, H), "cpu");
});
