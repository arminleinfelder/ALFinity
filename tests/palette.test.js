import { test } from "node:test";
import assert from "node:assert/strict";
import { buildColorTable, hexToRgb, TABLE_SIZE } from "../js/palette.js";

test("hexToRgb parses colors and rejects bad input", () => {
  assert.deepEqual(hexToRgb("#ff8000"), [255, 128, 0]);
  assert.throws(() => hexToRgb("red"));
});

test("table has 1024 RGBA entries and starts with the first stop", () => {
  const t = buildColorTable(["#102030", "#ffffff", "#000000"]);
  assert.equal(t.length, TABLE_SIZE * 4);
  assert.deepEqual([...t.slice(0, 4)], [0x10, 0x20, 0x30, 255]);
});

test("table is cyclic: the last entry blends back to the first stop", () => {
  const t = buildColorTable(["#ff0000", "#00ff00", "#0000ff"]);
  const last = t.slice((TABLE_SIZE - 1) * 4, TABLE_SIZE * 4);
  assert.ok(last[0] > 250 && last[2] < 5, `last entry ${[...last]}`);
});

test("2-stop and 8-stop palettes work", () => {
  assert.equal(buildColorTable(["#000000", "#ffffff"]).length, TABLE_SIZE * 4);
  const eight = ["#000000", "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"];
  const t = buildColorTable(eight);
  assert.deepEqual([...t.slice(128 * 4, 128 * 4 + 3)], [0x11, 0x11, 0x11]);
  assert.throws(() => buildColorTable(["#000000"]));
});
